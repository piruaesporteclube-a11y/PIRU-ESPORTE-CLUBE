import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState, 
  fetchLatestBaileysVersion, 
  makeCacheableSignalKeyStore,
  WAMessageKey,
  delay
} from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import pino from 'pino';
import fs from 'fs';
import path from 'path';
import QRCode from 'qrcode';

const logger = pino({ level: 'info' });

export class WhatsAppService {
  private socket: any = null;
  private qrCode: string | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private authStatePath = './whatsapp_auth_info';
  private groupIds: { [key: string]: string } = {};
  private jidCache: { [key: string]: string } = {};

  private isInitializing = false;
  private reconnectAttempts = 0;
  private lastResetTime = 0;
  private connectionWatchdog: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  public async logout() {
    // Prevent overlapping logouts
    if (this.lastResetTime && Date.now() - this.lastResetTime < 10000) {
      console.log('WhatsApp: Ignoring redundant logout/reset request');
      return;
    }
    
    this.lastResetTime = Date.now();
    this.isInitializing = true; 
    
    try {
      if (this.socket) {
        // Attempt clean logout but don't hang
        try {
          await Promise.race([
            this.socket.logout(),
            new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 5000))
          ]).catch(() => {});
        } catch (e) {}
        
        this.socket.ev.removeAllListeners('connection.update');
        this.socket.end();
      }
    } catch (e) {
      console.error('Error during socket cleanup:', e);
    }
    
    this.socket = null;
    this.qrCode = null;
    this.connectionStatus = 'disconnected';
    this.jidCache = {};
    
    // Safety delay to ensure file handles are closed
    await new Promise(r => setTimeout(r, 2000));

    if (fs.existsSync(this.authStatePath)) {
      try {
        fs.rmSync(this.authStatePath, { recursive: true, force: true });
        console.log('WhatsApp auth session cleared successfully');
      } catch (err) {
        console.error('Failed to delete auth session files:', err);
      }
    }
    
    this.isInitializing = false;
    this.reconnectAttempts = 0;
    console.log('WhatsApp reset complete. Re-initializing in 5s...');
    setTimeout(() => this.init(), 5000);
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.connectionWatchdog = setTimeout(() => {
      if (this.connectionStatus === 'connecting' || (this.connectionStatus === 'disconnected' && !this.isInitializing)) {
        console.warn('WhatsApp: Watchdog triggered. Connection stuck. Resetting...');
        this.logout();
      }
    }, 180000); // 3 minutes timeout
  }

  private stopWatchdog() {
    if (this.connectionWatchdog) {
      clearTimeout(this.connectionWatchdog);
      this.connectionWatchdog = null;
    }
  }

  private async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    this.startWatchdog();
    
    try {
      // Ensure path exists
      if (!fs.existsSync(this.authStatePath)) {
        fs.mkdirSync(this.authStatePath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authStatePath);
      const { version, isLatest } = await fetchLatestBaileysVersion().catch(() => ({ version: [2, 3000, 1017531287] as [number, number, number], isLatest: false }));

      console.log(`Initializing WhatsApp with Baileys v${version.join('.')} (Latest: ${isLatest})`);

      this.socket = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: true,
        connectTimeoutMs: 120000, 
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 60000,
        retryRequestDelayMs: 5000,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        patchMessageBeforeSending: (message) => {
          const requiresPatch = !!(
            message.buttonsMessage ||
            message.templateMessage ||
            message.listMessage
          );
          if (requiresPatch) {
            message = {
              viewOnceMessage: {
                message: {
                  messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2,
                  },
                  ...message,
                },
              },
            };
          }
          return message;
        },
      });

      this.socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr);
          this.connectionStatus = 'connecting';
          console.log('New WhatsApp QR Code generated');
          this.startWatchdog();
        }

        if (connection === 'close') {
          this.stopWatchdog();
          const error = lastDisconnect?.error as Boom;
          const statusCode = error?.output?.statusCode;
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          const isQRExpired = errorMessage.includes('QR refs attempts ended') || errorMessage.includes('timed out');
          const isTerminated = errorMessage.includes('Connection Terminated') || errorMessage.includes('Connection Failure') || errorMessage.includes('stream errored') || errorMessage.includes('Connection Closed');
          const isDeviceRemoved = statusCode === 401 || statusCode === 403 || statusCode === 411 || errorMessage.includes('device_removed') || errorMessage.includes('Conflict');
          
          console.log(`WhatsApp connection closed: ${errorMessage} | Status Code: ${statusCode}`);
          this.connectionStatus = 'disconnected';
          this.qrCode = null;
          this.isInitializing = false;

          // If device was removed or QR expired after too many attempts, we MUST clear credentials
          if (isDeviceRemoved || isQRExpired) {
            console.log(`WhatsApp: ${isDeviceRemoved ? 'Session invalidated' : 'QR expired'}. Clearing session for fresh start...`);
            this.reconnectAttempts = 0;
            this.logout();
            return;
          }

          // Force logout/reset after heavy consecutive failures to fix potentially corrupted sessions
          if (this.reconnectAttempts > 8) {
            console.warn('WhatsApp: Too many consecutive connection failures. Forcing full session reset...');
            this.reconnectAttempts = 0;
            this.logout();
            return;
          }

          // Decide if we should try simple reconnect or full reset
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            this.reconnectAttempts++;
            const backoff = Math.min(this.reconnectAttempts * 2000, 30000); // Progressive backoff
            const isCritical = statusCode === 515 || statusCode === 500 || statusCode === 408 || isTerminated;
            const delayTime = isCritical ? Math.max(backoff, 10000) : Math.max(backoff, 3000);
            
            console.log(`Reconnecting WhatsApp (${errorMessage}) in ${delayTime/1000}s... (Attempt: ${this.reconnectAttempts})`);
            setTimeout(() => {
              this.isInitializing = false;
              this.init();
            }, delayTime);
          } else {
            console.log('WhatsApp: Logged out or manual disconnect. Re-init blocked.');
            this.isInitializing = false;
            this.reconnectAttempts = 0;
          }
        } else if (connection === 'connecting') {
          this.connectionStatus = 'connecting';
        } else if (connection === 'open') {
          this.stopWatchdog();
          console.log('WhatsApp: Connection established successfully');
          this.connectionStatus = 'connected';
          this.qrCode = null;
          this.isInitializing = false;
          this.reconnectAttempts = 0; // Reset attempts on success
          // Initial setup of groups
          setTimeout(() => this.setupGroups().catch(err => console.error('Delayed group setup failed:', err)), 5000);
        }
      });

      this.socket.ev.on('creds.update', saveCreds);
    } catch (err: any) {
      console.error('Failed to initialize WhatsApp socket catch block:', err);
      this.isInitializing = false;
      const errorMessage = err?.message || err?.toString() || '';
      const isQRExpired = errorMessage.includes('QR refs attempts ended');
      
      if (isQRExpired) {
        this.logout();
      } else {
        const delay = 15000;
        console.log(`WhatsApp init error: ${errorMessage}. Retrying in ${delay/1000}s...`);
        setTimeout(() => this.init(), delay);
      }
    }
  }

  private async setupGroups() {
    if (!this.socket || this.connectionStatus !== 'connected') return;

    try {
      // First, get participating groups
      const groups = await this.socket.groupFetchAllParticipating();
      this.groupIds = {}; // Reset local cache

      const targetGroupNames = [
        'Piruá Esporte Clube Responsáveis',
        'Piruá Esporte Clube Atletas'
      ];

      for (const name of targetGroupNames) {
        const existing = Object.values(groups).find((g: any) => g.subject === name);
        if (existing) {
          this.groupIds[name] = (existing as any).id;
          console.log(`Found existing group: ${name} (${this.groupIds[name]})`);
        } else {
          try {
            console.log(`Group ${name} not found. Attemping to create...`);
            const group = await this.socket.groupCreate(name, []);
            this.groupIds[name] = group.id;
            console.log(`Created group: ${name}`);
            // Wait between creations to avoid rate limits
            await new Promise(r => setTimeout(r, 2000));
          } catch (err: any) {
            if (err.message?.includes('rate-overlimit')) {
              console.warn(`Rate limit hit while creating ${name}. Will try again later.`);
            } else {
              console.error(`Error creating group ${name}:`, err);
            }
          }
        }
      }
    } catch (err) {
      console.error('Error in setupGroups:', err);
    }
  }

  public getStatus() {
    return {
      status: this.connectionStatus,
      qrCode: this.qrCode,
    };
  }

  public async createGroup(name: string) {
    if (this.connectionStatus !== 'connected' || !this.socket) {
      throw new Error('WhatsApp não conectado');
    }
    try {
      const group = await this.socket.groupCreate(name, []);
      return group.id;
    } catch (err: any) {
      console.error(`[WhatsApp] Erro ao criar grupo ${name}:`, err);
      throw err;
    }
  }

  public async removeFromGroup(groupId: string, phoneNumber: string) {
    if (this.connectionStatus !== 'connected' || !this.socket) {
      throw new Error('WhatsApp não conectado');
    }

    try {
      const jid = await this.resolveJid(phoneNumber);
      if (!jid) throw new Error('Número não encontrado no WhatsApp');

      await this.socket.groupParticipantsUpdate(groupId, [jid], 'remove');
      return { success: true };
    } catch (err: any) {
      console.error(`[WhatsApp] Erro ao remover do grupo:`, err);
      throw err;
    }
  }

  private async resolveJid(phoneNumber: string): Promise<string | null> {
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber.startsWith('55') && cleanNumber.length >= 10) {
      cleanNumber = '55' + cleanNumber;
    }

    if (cleanNumber.length < 10) return null;
    
    // Check cache
    if (this.jidCache[cleanNumber]) return this.jidCache[cleanNumber];

    let onWhatsApp = await this.socket.onWhatsApp(cleanNumber);
    if (onWhatsApp && onWhatsApp[0] && onWhatsApp[0].exists) {
      this.jidCache[cleanNumber] = onWhatsApp[0].jid;
      return onWhatsApp[0].jid;
    }

    // Try alternative with/without 9th digit
    let alternative = '';
    if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) {
      alternative = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
    } else if (cleanNumber.length === 12 && cleanNumber.startsWith('55')) {
      alternative = cleanNumber.slice(0, 4) + '9' + cleanNumber.slice(4);
    }

    if (alternative) {
      if (this.jidCache[alternative]) return this.jidCache[alternative];
      
      const altOnWA = await this.socket.onWhatsApp(alternative);
      if (altOnWA && altOnWA[0] && altOnWA[0].exists) {
        this.jidCache[cleanNumber] = altOnWA[0].jid;
        this.jidCache[alternative] = altOnWA[0].jid;
        return altOnWA[0].jid;
      }
    }

    return null;
  }

  public async addParticipant(groupId: string, phoneNumber: string, welcomeMessage?: string, retryCount = 0): Promise<any> {
    if (this.connectionStatus !== 'connected' || !this.socket) {
      throw new Error('WhatsApp não conectado');
    }

    try {
      const jid = await this.resolveJid(phoneNumber);
      if (!jid) {
        throw new Error('Este número não parece estar registrado no WhatsApp.');
      }

      const response = await this.socket.groupParticipantsUpdate(groupId, [jid], 'add');
      const status = response?.[0]?.status;

      if (status === '200') {
        if (welcomeMessage) {
          await this.socket.sendMessage(jid, { text: welcomeMessage });
        }
        return { success: true, method: 'direct', message: 'Adicionado diretamente' };
      } else if (status === '403') {
        const inviteCode = await this.socket.groupInviteCode(groupId);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        
        const message = welcomeMessage 
          ? `${welcomeMessage}\n\nClique para entrar: ${inviteLink}`
          : `Olá! Identificamos que não foi possível te adicionar diretamente devido às suas configurações de privacidade. Por favor, entre pelo link: ${inviteLink}`;

        await this.socket.sendMessage(jid, { text: message });
        return { success: true, method: 'invite_link', message: 'Convite enviado' };
      } else if (status === '409') {
        return { success: true, method: 'already_in', message: 'Já está no grupo' };
      } else {
        throw new Error(`Erro do WhatsApp (Status ${status})`);
      }
    } catch (err: any) {
      const isRateLimit = err.message?.includes('rate-overlimit') || err.output?.payload?.error === 'Rate Overlimit';
      
      if (isRateLimit && retryCount < 3) {
        console.log(`[WhatsApp] Rate limit hit for ${phoneNumber}, retrying in ${(retryCount + 1) * 5}s...`);
        await new Promise(r => setTimeout(r, (retryCount + 1) * 5000));
        return this.addParticipant(groupId, phoneNumber, welcomeMessage, retryCount + 1);
      }

      console.error(`[WhatsApp] Erro ao adicionar participante:`, err);
      throw err;
    }
  }

  public async addToGroup(groupName: 'Piruá Esporte Clube Responsáveis' | 'Piruá Esporte Clube Atletas', phoneNumber: string) {
    if (this.connectionStatus !== 'connected' || !this.socket) {
      throw new Error('WhatsApp não conectado');
    }

    try {
      // 1. Limpar número: apenas dígitos
      let cleanNumber = phoneNumber.replace(/\D/g, '');
      if (!cleanNumber.startsWith('55') && cleanNumber.length >= 10) {
        cleanNumber = '55' + cleanNumber;
      }

      if (cleanNumber.length < 10) {
        throw new Error('Número de telefone inválido ou incompleto');
      }

      console.log(`[WhatsApp] Processando: ${cleanNumber} para o grupo ${groupName}`);

      // 2. Garantir que temos o ID do grupo
      if (!this.groupIds[groupName]) {
        await this.setupGroups();
      }

      const currentGroupId = this.groupIds[groupName];
      if (!currentGroupId) {
        throw new Error(`Grupo "${groupName}" não encontrado.`);
      }

      const welcomeMessage = `Olá! Bem-vindo ao *Piruá Esporte Clube*! ⚽ Este grupo é para: ${groupName === 'Piruá Esporte Clube Atletas' ? 'Atletas' : 'Responsáveis'}.`;
      return this.addParticipant(currentGroupId, phoneNumber, welcomeMessage);
    } catch (err: any) {
      console.error(`[WhatsApp] Erro fatal: ${err.message}`);
      throw err;
    }
  }
}

export const whatsappService = new WhatsAppService();
