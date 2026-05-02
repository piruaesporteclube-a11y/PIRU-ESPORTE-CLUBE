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

  private isInitializing = false;

  constructor() {
    this.init();
  }

  public async logout() {
    this.isInitializing = true; // Block init while logging out
    try {
      if (this.socket) {
        // Only try to logout if socket exists. 
        // If connection is already closed, this might throw, which we catch.
        await this.socket.logout().catch(() => {});
        this.socket.ev.removeAllListeners('connection.update');
        this.socket.end();
      }
    } catch (e) {
      console.error('Error during socket cleanup:', e);
    }
    
    this.socket = null;
    this.qrCode = null;
    this.connectionStatus = 'disconnected';
    
    // Safety delay to ensure file handles are closed
    await new Promise(r => setTimeout(r, 1000));

    if (fs.existsSync(this.authStatePath)) {
      try {
        fs.rmSync(this.authStatePath, { recursive: true, force: true });
        console.log('WhatsApp auth session cleared');
      } catch (err) {
        console.error('Failed to delete auth session files:', err);
      }
    }
    
    this.isInitializing = false;
    console.log('WhatsApp reset complete. Re-initializing...');
    return this.init();
  }

  private async init() {
    if (this.isInitializing) return;
    this.isInitializing = true;
    
    try {
      // Ensure path exists
      if (!fs.existsSync(this.authStatePath)) {
        fs.mkdirSync(this.authStatePath, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(this.authStatePath);
      const { version } = await fetchLatestBaileysVersion();

      console.log(`Initializing WhatsApp with Baileys v${version}`);

      this.socket = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: true,
        connectTimeoutMs: 60000,
        defaultQueryTimeoutMs: 0,
        keepAliveIntervalMs: 30000,
        retryRequestDelayMs: 5000,
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
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
          const errorMessage = lastDisconnect?.error?.message || lastDisconnect?.error?.toString() || 'Unknown error';
          const isQRExpired = errorMessage.includes('QR refs attempts ended');
          const isDeviceRemoved = statusCode === 401 || statusCode === 403 || errorMessage.includes('device_removed') || errorMessage.includes('Conflict');
          
          console.log(`WhatsApp connection closed: ${errorMessage} | Status Code: ${statusCode}`);
          this.connectionStatus = 'disconnected';
          this.qrCode = null;
          this.isInitializing = false;

          // If device was removed or QR expired after too many attempts, we must clear credentials
          if (isDeviceRemoved || isQRExpired) {
            console.log(`WhatsApp: ${isDeviceRemoved ? 'Device removed/Unauthorised' : 'QR expired'}. Clearing session...`);
            this.logout();
            return;
          }

          // If it's a stream error (515) or other critical errors, we must reconnect
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            const delayTime = (statusCode === 515 || statusCode === 411) ? 15000 : 5000;
            console.log(`Reconnecting WhatsApp after ${errorMessage}... in ${delayTime/1000} seconds.`);
            setTimeout(() => {
              this.isInitializing = false;
              this.init();
            }, delayTime);
          } else {
            console.log('WhatsApp: Logged out or manual disconnect. Re-init blocked.');
            this.isInitializing = false;
          }
        } else if (connection === 'connecting') {
          this.connectionStatus = 'connecting';
        } else if (connection === 'open') {
          console.log('WhatsApp connection established');
          this.connectionStatus = 'connected';
          this.qrCode = null;
          this.isInitializing = false;
          // Initial setup of groups
          setTimeout(() => this.setupGroups().catch(err => console.error('Delayed group setup failed:', err)), 5000);
        }
      });

      this.socket.ev.on('creds.update', saveCreds);
    } catch (err: any) {
      console.error('Failed to initialize WhatsApp socket:', err);
      this.isInitializing = false;
      const errorMessage = err?.message || '';
      const isQRExpired = errorMessage.includes('QR refs attempts ended');
      const delay = isQRExpired ? 5000 : 15000;
      
      console.log(`WhatsApp init error: ${errorMessage}. Retrying in ${delay/1000}s...`);
      setTimeout(() => this.init(), delay);
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

    let onWhatsApp = await this.socket.onWhatsApp(cleanNumber);
    if (onWhatsApp && onWhatsApp[0] && onWhatsApp[0].exists) {
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
      const altOnWA = await this.socket.onWhatsApp(alternative);
      if (altOnWA && altOnWA[0] && altOnWA[0].exists) {
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
