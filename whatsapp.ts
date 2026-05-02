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
        keepAliveIntervalMs: 15000,
        retryRequestDelayMs: 5000,
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
          const errorMessage = lastDisconnect?.error?.message || 'Unknown error';
          
          console.log(`WhatsApp connection closed: ${errorMessage} | Status Code: ${statusCode}`);
          this.connectionStatus = 'disconnected';
          this.qrCode = null;

          // If it's a stream error (515) or other critical errors, we might want to wait longer
          const isStreamError = statusCode === 515;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          if (shouldReconnect) {
            const delay = isStreamError ? 10000 : 5000;
            console.log(`Reconnecting in ${delay/1000} seconds...`);
            setTimeout(() => {
              this.isInitializing = false;
              this.init();
            }, delay);
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
    } catch (err) {
      console.error('Failed to initialize WhatsApp socket:', err);
      this.isInitializing = false;
      setTimeout(() => this.init(), 10000);
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
        throw new Error(`Grupo "${groupName}" não encontrado. O sistema tentou criar mas falhou ou não tem permissão.`);
      }

      // 3. Verificar se o número está no WhatsApp e resolver JID
      let jid = '';
      let onWhatsApp = [];
      try {
        onWhatsApp = await this.socket.onWhatsApp(cleanNumber);
      } catch (err) {
        console.error(`[WhatsApp] Erro ao verificar número ${cleanNumber}:`, err);
      }
      
      if (onWhatsApp && onWhatsApp[0] && onWhatsApp[0].exists) {
        jid = onWhatsApp[0].jid;
      } else {
        // Tentar variação do 9º dígito para números brasileiros
        let alternative = '';
        if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) { // 55 + DDD + 9 + 8 dígitos
          alternative = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
        } else if (cleanNumber.length === 12 && cleanNumber.startsWith('55')) { // 55 + DDD + 8 dígitos
          alternative = cleanNumber.slice(0, 4) + '9' + cleanNumber.slice(4);
        }

        if (alternative) {
          console.log(`[WhatsApp] Tentando número alternativo: ${alternative}`);
          try {
            const altOnWA = await this.socket.onWhatsApp(alternative);
            if (altOnWA && altOnWA[0] && altOnWA[0].exists) {
              jid = altOnWA[0].jid;
            }
          } catch (err) {
            console.error(`[WhatsApp] Erro ao verificar número alternativo ${alternative}:`, err);
          }
        }
      }

      if (!jid) {
        console.warn(`[WhatsApp] Número ${cleanNumber} não encontrado.`);
        throw new Error('Este número não parece estar registrado no WhatsApp.');
      }

      // 4. Tentar adicionar ao grupo
      try {
        console.log(`[WhatsApp] Adicionando ${jid} ao grupo ${currentGroupId}`);
        const response = await this.socket.groupParticipantsUpdate(currentGroupId, [jid], 'add');
        
        // Verificar status da resposta
        const status = response?.[0]?.status;
        if (status === '200') {
          console.log(`[WhatsApp] Sucesso: ${jid} adicionado.`);
          return { success: true, method: 'direct', message: 'Adicionado diretamente' };
        } else if (status === '403') {
          console.log(`[WhatsApp] Privacidade restringiu adição direta. Enviando convite.`);
          
          // Tentar enviar convite
          try {
            const inviteCode = await this.socket.groupInviteCode(currentGroupId);
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            await this.socket.sendMessage(jid, { 
              text: `Olá! Bem-vindo ao *Piruá Esporte Clube*! ⚽\n\nIdentificamos que não foi possível te adicionar diretamente ao grupo devido às suas configurações de privacidade.\n\nPor favor, entre no canal oficial pelo link abaixo:\n${inviteLink}\n\nEste grupo é para: ${groupName === 'Piruá Esporte Clube Atletas' ? 'Atletas' : 'Responsáveis'}.` 
            });
            return { success: true, method: 'invite_link', message: 'Convite enviado via Chat' };
          } catch (invErr) {
            throw new Error(`Privacidade restringiu adição e falhou ao enviar convite (O robô é administrador?)`);
          }
        } else if (status === '409') {
          return { success: true, method: 'already_in', message: 'Já está no grupo' };
        } else {
          console.log(`[WhatsApp] Falha ao adicionar (Status: ${status}).`);
          throw new Error(`Erro do WhatsApp (Status ${status}): O robô talvez precise de permissão de administrador.`);
        }
      } catch (addErr: any) {
        if (addErr.message && (addErr.message.includes('403') || addErr.message.includes('privacidade') || addErr.message.includes('Restrição'))) {
          // Re-tentar envio de convite se o erro veio da tentativa de update
          try {
            const inviteCode = await this.socket.groupInviteCode(currentGroupId);
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            await this.socket.sendMessage(jid, { 
              text: `Olá! Bem-vindo ao *Piruá Esporte Clube*! ⚽\n\nClique para entrar no grupo: ${inviteLink}` 
            });
            return { success: true, method: 'invite_link', message: 'Convite enviado' };
          } catch (e) {
            throw new Error('Falha ao adicionar e falha ao enviar convite por chat.');
          }
        }
        throw addErr;
      }
    } catch (err: any) {
      console.error(`[WhatsApp] Erro fatal: ${err.message}`);
      throw err;
    }
  }
}

export const whatsappService = new WhatsAppService();
