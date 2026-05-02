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

    const groupId = this.groupIds[groupName];
    if (!groupId) {
      // Tentar re-mapear grupos se não estiver cacheado
      await this.setupGroups();
      const retryGroupId = this.groupIds[groupName];
      if (!retryGroupId) {
        throw new Error(`Grupo ${groupName} não encontrado. Por favor, verifique se o bot criou os grupos.`);
      }
    }

    const currentGroupId = this.groupIds[groupName];

    // Limpar número: apenas dígitos
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber.startsWith('55')) {
      cleanNumber = '55' + cleanNumber;
    }

    try {
      // 1. Limpar número: apenas dígitos
      let cleanNumber = phoneNumber.replace(/\D/g, '');
      if (!cleanNumber.startsWith('55') && cleanNumber.length >= 10) {
        cleanNumber = '55' + cleanNumber;
      }

      console.log(`Tentando adicionar/convidar: ${cleanNumber} para ${groupName}`);

      // 2. Garantir que temos o ID do grupo
      if (!this.groupIds[groupName]) {
        await this.setupGroups();
      }

      const currentGroupId = this.groupIds[groupName];
      if (!currentGroupId) {
        throw new Error(`Grupo "${groupName}" não encontrado no WhatsApp. Certifique-se de que o Bot tem permissão para criar/ver grupos.`);
      }

      // 3. Verificar se o número está no WhatsApp e resolver JID
      let jid = '';
      const onWhatsApp = await this.socket.onWhatsApp(cleanNumber);
      
      if (onWhatsApp && onWhatsApp[0] && onWhatsApp[0].exists) {
        jid = onWhatsApp[0].jid;
      } else {
        // Tentar variação do 9º dígito (se tem 13, tenta com 12. Se tem 12, tenta com 13)
        // Isso é comum em números brasileiros (DDD + 8 ou 9 dígitos)
        let alternative = '';
        if (cleanNumber.length === 13) { // 55 + DDD + 9 + 8 dígitos
          alternative = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
        } else if (cleanNumber.length === 12) { // 55 + DDD + 8 dígitos
          alternative = cleanNumber.slice(0, 4) + '9' + cleanNumber.slice(4);
        }

        if (alternative) {
          const altOnWA = await this.socket.onWhatsApp(alternative);
          if (altOnWA && altOnWA[0] && altOnWA[0].exists) {
            jid = altOnWA[0].jid;
          }
        }
      }

      if (!jid) {
        console.warn(`Número ${cleanNumber} não encontrado no WhatsApp.`);
        throw new Error('Este número não parece estar cadastrado no WhatsApp.');
      }

      // 4. Tentar adicionar ao grupo
      try {
        const response = await this.socket.groupParticipantsUpdate(currentGroupId, [jid], 'add');
        
        // Verificar status da resposta (200 = sucesso)
        const status = response?.[0]?.status;
        if (status === '200') {
          console.log(`Sucesso: ${jid} adicionado diretamente ao ${groupName}`);
          return { success: true, method: 'direct' };
        } else {
          console.log(`Add direto falhou (status ${status}). Enviando convite...`);
          throw new Error('Privacidade restringiu adição direta');
        }
      } catch (addErr) {
        // 5. Fallback: Enviar link de convite
        const inviteCode = await this.socket.groupInviteCode(currentGroupId);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        
        await this.socket.sendMessage(jid, { 
          text: `Olá! Bem-vindo ao *Piruá Esporte Clube*! ⚽\n\nNotamos que você não pôde ser adicionado automaticamente aos nossos grupos informativos.\n\nPor favor, entre no grupo oficial clicando no link abaixo:\n${inviteLink}\n\nEste é o canal oficial de comunicação para ${groupName === 'Piruá Esporte Clube Atletas' ? 'atletas' : 'responsáveis'}.` 
        });
        
        console.log(`Link de convite enviado para ${jid}`);
        return { success: true, method: 'invite_link', link: inviteLink };
      }
    } catch (err: any) {
      console.error(`Erro ao processar WhatsApp para ${phoneNumber}:`, err.message);
      throw err;
    }
  }
}

export const whatsappService = new WhatsAppService();
