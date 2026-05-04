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

const logger = pino({ level: 'warn' });

export class WhatsAppService {
  private socket: any = null;
  private qrCode: string | null = null;
  private connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private authStatePath = './whatsapp_auth_info';
  private groupIds: { [key: string]: string } = {};
  private jidCache: { [key: string]: string } = {};

  private isInitializing = false;
  private reconnectAttempts = 0;
  private qrTimeoutCount = 0;
  private isHalted = false;
  private lastResetTime = 0;
  private connectionWatchdog: NodeJS.Timeout | null = null;

  constructor() {
    this.init();
  }

  public async logout(autoReinit = true, resetQrTimeout = true) {
    // If we are halting, we should not auto-reinit
    const actualAutoReinit = autoReinit && !this.isHalted;

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
        this.socket.ev.removeAllListeners('creds.update');
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
    if (resetQrTimeout) {
      this.qrTimeoutCount = 0;
      this.isHalted = false; // Reset halt when explicitly resetting
    }
    
    if (actualAutoReinit) {
      console.log('WhatsApp reset complete. Re-initializing in 10s...');
      setTimeout(() => this.init(), 10000);
    } else {
      console.log(`WhatsApp reset complete. Auto-reinitialization disabled. (Halted: ${this.isHalted})`);
    }
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.connectionWatchdog = setTimeout(() => {
      if (this.connectionStatus === 'connecting' || (this.connectionStatus === 'disconnected' && !this.isInitializing)) {
        console.warn('WhatsApp: Watchdog triggered. Connection stuck. Resetting...');
        this.logout();
      }
    }, 300000); // 5 minutes timeout
  }

  private stopWatchdog() {
    if (this.connectionWatchdog) {
      clearTimeout(this.connectionWatchdog);
      this.connectionWatchdog = null;
    }
  }

  private async init() {
    if (this.isInitializing || (this.isHalted && this.connectionStatus !== 'connected')) {
      if (this.isHalted) console.log('WhatsApp: Initialization blocked - Halted state (manual reset required)');
      return;
    }
    
    // Ensure any previously existing socket is cleaned up
    if (this.socket) {
      try {
        console.log('WhatsApp: Cleaning up existing socket before init');
        this.socket.ev.removeAllListeners('connection.update');
        this.socket.ev.removeAllListeners('creds.update');
        this.socket.end(new Error('Re-initializing'));
      } catch (e) {}
      this.socket = null;
    }

    this.isInitializing = true;
    this.startWatchdog();
    
    // Ensure cleanup of any previous session artifacts
    await new Promise(r => setTimeout(r, 1000));
    
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
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '110.0.5481.177'], // More standard browser ID
        syncFullHistory: false,
        connectTimeoutMs: 90000, // 90s
        defaultQueryTimeoutMs: 60000,
        keepAliveIntervalMs: 15000, // Frequent keepalives
        retryRequestDelayMs: 5000,
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: false,
        // Add robust reconnect options if available in this version
        getMessage: async (key: WAMessageKey) => {
          return { conversation: 'historical message' };
        }
      });

      this.socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = await QRCode.toDataURL(qr);
          this.connectionStatus = 'connecting';
          console.log(`[WhatsApp] QR Code Ready (Attempt ${this.qrTimeoutCount + 1})`);
          this.startWatchdog();
        }

        if (connection === 'close') {
          this.stopWatchdog();
          const error = lastDisconnect?.error as Boom;
          const statusCode = error?.output?.statusCode;
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
          
          console.log(`[WhatsApp] Connection closed: ${errorMessage} | Status: ${statusCode}`);

          const isQRExpired = statusCode === DisconnectReason.timedOut || 
                              statusCode === 408 ||
                              errorMessage.toLowerCase().includes('qr refs attempts ended') ||
                              errorMessage.toLowerCase().includes('timed out');
          
          const isLoggedOut = statusCode === DisconnectReason.loggedOut;
          
          const isDeviceRemoved = statusCode === 401 || statusCode === 403 || statusCode === 411 || 
                                  errorMessage.toLowerCase().includes('device_removed') || 
                                  errorMessage.toLowerCase().includes('conflict') ||
                                  errorMessage.toLowerCase().includes('unauthorized');
          
          const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515;

          // Decide if we should try simple reconnect or full reset
          this.connectionStatus = 'disconnected';
          this.qrCode = null;
          this.isInitializing = false;

          // If session is invalidated, we must logout and clear files
          if (isLoggedOut || isDeviceRemoved) {
            console.warn(`[WhatsApp] Session invalidated (${isLoggedOut ? 'Logged Out' : 'Device Removed'}). Clearing session...`);
            this.socket = null;
            this.logout(false, true); // Don't auto-reinit to avoid loops, wait for user
            return;
          }

          if (isQRExpired) {
            this.qrTimeoutCount++;
            console.log(`[WhatsApp] QR Timeout count: ${this.qrTimeoutCount}`);
            if (this.qrTimeoutCount >= 5) { // Increased from 2 to 5
              console.warn('[WhatsApp] QR threshold reached. Halting auto-reinit.');
              this.isHalted = true;
            }
            this.socket = null;
            // Short delay before re-init to get a new QR
            setTimeout(() => {
              if (!this.isHalted) this.init();
            }, 5000);
            return;
          }

          // Recovery for other errors (network, stream, etc)
          this.reconnectAttempts++;
          const shouldHalt = this.reconnectAttempts > 50; // Increased from 10 to 50
          
          if (shouldHalt) {
            console.error('[WhatsApp] Max reconnection attempts reached. Halting.');
            this.isHalted = true;
            this.socket = null;
            return;
          }

          const backoff = Math.min(this.reconnectAttempts * 2000, 20000); 
          const delayTime = isRestartRequired ? 2000 : backoff + 3000;
          
          console.log(`[WhatsApp] Attempting reconnect in ${delayTime/1000}s... (Attempt ${this.reconnectAttempts})`);
          
          setTimeout(() => {
            // Only re-init if still disconnected and not halted
            if (this.connectionStatus === 'disconnected' && !this.isHalted && !this.socket) {
              this.init();
            }
          }, delayTime);
          
        } else if (connection === 'connecting') {
          this.connectionStatus = 'connecting';
        } else if (connection === 'open') {
          this.stopWatchdog();
          console.log('[WhatsApp] Connection established successfully!');
          this.connectionStatus = 'connected';
          this.qrCode = null;
          this.isInitializing = false;
          this.reconnectAttempts = 0;
          this.qrTimeoutCount = 0; 
          this.isHalted = false;
          // Initial setup of groups
          setTimeout(() => this.setupGroups().catch(err => console.error('Delayed group setup failed:', err)), 5000);
        }
      });

      this.socket.ev.on('creds.update', saveCreds);
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || '';
      console.error('[WhatsApp] Initialization error:', errorMessage);
      this.isInitializing = false;
      this.connectionStatus = 'disconnected';
      
      const isQRExpired = errorMessage.toLowerCase().includes('qr refs attempts ended') || errorMessage.toLowerCase().includes('timed out');
      
      if (isQRExpired) {
        this.qrTimeoutCount++;
        if (this.qrTimeoutCount >= 5) {
          this.isHalted = true;
          console.warn('[WhatsApp] Catch block: QR threshold reached. Halting.');
        } else {
          setTimeout(() => this.init(), 5000);
        }
      } else {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectAttempts * 5000, 60000);
        console.log(`[WhatsApp] Failed to init, retrying in ${delay/1000}s...`);
        setTimeout(() => {
          if (!this.isHalted) this.init();
        }, delay);
      }
    }
  }

  private async setupGroups(retryCount = 0) {
    if (!this.socket || this.connectionStatus !== 'connected') return;

    try {
      console.log(`[WhatsApp] Sincronizando grupos (Tentativa ${retryCount + 1})...`);
      // Fetch all groups we are part of
      const groups = await this.socket.groupFetchAllParticipating();
      this.groupIds = {}; // Reset local cache

      const targetGroupNames = [
        'Piruá Esporte Clube Atletas',
        'Piruá Esporte Clube Responsáveis'
      ];

      // If we got an empty object but we expect to be in groups, maybe wait and retry
      if (Object.keys(groups).length === 0 && retryCount < 2) {
        console.log('[WhatsApp] Nenhum grupo retornado, tentando novamente em 5s...');
        await new Promise(r => setTimeout(r, 5000));
        return this.setupGroups(retryCount + 1);
      }

      for (const name of targetGroupNames) {
        // Find existing group by subject
        const existing = Object.values(groups).find((g: any) => g.subject === name);
        
        if (existing) {
          const gid = (existing as any).id;
          this.groupIds[name] = gid;
          console.log(`[WhatsApp] Grupo mapeado: ${name} (${gid})`);
        } else {
          try {
            console.log(`[WhatsApp] Criando grupo: "${name}"...`);
            // Standard group creation. Participants list is mandatory, can be empty []
            const group = await this.socket.groupCreate(name, []);
            this.groupIds[name] = group.id;
            console.log(`[WhatsApp] Grupo criado: ${name} (ID: ${group.id})`);
            // Wait between actions to minimize rate limit risks
            await new Promise(r => setTimeout(r, 8000));
          } catch (err: any) {
            const errorMsg = err.message || '';
            console.error(`[WhatsApp] Falha ao criar "${name}":`, err);
            
            if (errorMsg.includes('rate-overlimit')) {
              console.warn(`[WhatsApp] Bloqueio temporário (rate-limit) ao criar "${name}".`);
            } else if (errorMsg.includes('not-authorized')) {
              console.error(`[WhatsApp] Sem permissão para criar grupos nesta conta.`);
            }
          }
        }
      }
    } catch (err) {
      console.error('[WhatsApp] Erro em setupGroups:', err);
    }
  }

  public getStatus() {
    return {
      status: this.connectionStatus,
      qrCode: this.qrCode,
      qrTimeoutCount: this.qrTimeoutCount,
      isHalted: this.isHalted,
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

    let jid = '';
    try {
      const resolvedJid = await this.resolveJid(phoneNumber);
      if (!resolvedJid) {
        throw new Error(`O número ${phoneNumber} não parece estar registrado no WhatsApp.`);
      }
      jid = resolvedJid;

      console.log(`[WhatsApp] Adicionando ${jid} ao grupo ${groupId}...`);
      const response = await this.socket.groupParticipantsUpdate(groupId, [jid], 'add');
      
      // The response is an array of objects: { jid: string, status: string }
      const status = response?.[0]?.status;

      if (status === '200') {
        if (welcomeMessage) {
          try {
            await this.socket.sendMessage(jid, { text: welcomeMessage });
          } catch (msgErr) {
            console.warn('[WhatsApp] Erro ao enviar mensagem de boas-vindas:', msgErr);
          }
        }
        return { success: true, method: 'direct', message: 'Adicionado diretamente' };
      } else if (status === '403') {
        const inviteCode = await this.socket.groupInviteCode(groupId);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        
        const message = welcomeMessage 
          ? `${welcomeMessage}\n\nClique para entrar: ${inviteLink}`
          : `Olá! Identificamos que não foi possível te adicionar diretamente devido às suas configurações de privacidade. Por favor, entre pelo link: ${inviteLink}`;

        await this.socket.sendMessage(jid, { text: message });
        return { success: true, method: 'invite_link', message: 'Convite enviado via PV' };
      } else if (status === '409') {
        return { success: true, method: 'already_in', message: 'Já está no grupo' };
      } else if (status === '429') {
        throw new Error('Muitas tentativas em pouco tempo. Aguarde alguns minutos.');
      } else {
        throw new Error(`Erro do WhatsApp (Status ${status})`);
      }
    } catch (err: any) {
      const errorMessage = err.message || '';
      const isRateLimit = errorMessage.includes('rate-overlimit') || err.output?.payload?.error === 'Rate Overlimit' || errorMessage.includes('429');
      const isIntegrityBlocked = errorMessage.includes('integrity-enforcement');
      
      if (isIntegrityBlocked) {
        throw new Error('Sincronização pausada preventivamente pelo WhatsApp por segurança. Tente novamente em 20 minutos.');
      }
      
      if (isRateLimit && retryCount < 3) {
        const delayMs = (retryCount + 1) * 10000;
        console.log(`[WhatsApp] Rate limit for ${jid}, retry ${retryCount + 1} in ${delayMs/1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
        return this.addParticipant(groupId, jid, welcomeMessage, retryCount + 1);
      }

      console.error(`[WhatsApp] Erro ao adicionar ${phoneNumber}:`, err);
      throw err;
    }
  }

  public async addToGroup(groupName: 'Piruá Esporte Clube Responsáveis' | 'Piruá Esporte Clube Atletas', phoneNumber: string) {
    if (this.connectionStatus !== 'connected' || !this.socket) {
      const error = new Error('WhatsApp não conectado. Por favor, verifique o QR Code.');
      (error as any).noConnection = true;
      throw error;
    }

    try {
      let cleanNumber = phoneNumber.replace(/\D/g, '');
      if (!cleanNumber.startsWith('55') && cleanNumber.length >= 10) {
        cleanNumber = '55' + cleanNumber;
      }

      if (cleanNumber.length < 10) {
        throw new Error('Número de telefone inválido.');
      }

      // Ensure groups are cached
      if (!this.groupIds[groupName]) {
        await this.setupGroups();
      }

      const currentGroupId = this.groupIds[groupName];
      if (!currentGroupId) {
        // One last attempt to find/create if not in cache
        await this.setupGroups();
        const retryGroupId = this.groupIds[groupName];
        if (!retryGroupId) {
          throw new Error(`Não foi possível localizar ou criar o grupo "${groupName}".`);
        }
      }

      const finalGroupId = this.groupIds[groupName];
      const welcomeMessage = `Olá! Bem-vindo ao *Piruá Esporte Clube*! ⚽ Você foi adicionado ao grupo de ${groupName === 'Piruá Esporte Clube Atletas' ? 'Atletas' : 'Responsáveis'}.`;
      
      return await this.addParticipant(finalGroupId, phoneNumber, welcomeMessage);
    } catch (err: any) {
      console.error(`[WhatsApp] Erro em addToGroup para ${phoneNumber}:`, err.message);
      throw err;
    }
  }
  public async syncGroups() {
    await this.setupGroups();
    return this.groupIds;
  }
}

export const whatsappService = new WhatsAppService();
