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

  constructor() {
    this.init();
  }

  private async init() {
    const { state, saveCreds } = await useMultiFileAuthState(this.authStatePath);
    const { version } = await fetchLatestBaileysVersion();

    this.socket = makeWASocket({
      version,
      logger,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: true,
    });

    this.socket.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        this.qrCode = await QRCode.toDataURL(qr);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as Boom)?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log('WhatsApp connection closed:', lastDisconnect?.error?.message, '| Status Code:', statusCode);
        this.connectionStatus = 'disconnected';
        this.qrCode = null;

        if (shouldReconnect) {
          console.log('Reconnecting in 5 seconds...');
          setTimeout(() => this.init(), 5000); // 5 second delay before trying again
        } else {
          console.log('Connection closed. User logged out.');
        }
      } else if (connection === 'connecting') {
        this.connectionStatus = 'connecting';
      } else if (connection === 'open') {
        console.log('WhatsApp connection opened successfully');
        this.connectionStatus = 'connected';
        this.qrCode = null;
        // Small delay before setting up groups to avoid race conditions or rate limits
        setTimeout(() => this.setupGroups().catch(err => console.error('Delayed group setup failed:', err)), 3000);
      }
    });

    this.socket.ev.on('creds.update', saveCreds);
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
      throw new Error('WhatsApp not connected');
    }

    const groupId = this.groupIds[groupName];
    if (!groupId) {
      throw new Error(`Group ${groupName} not found or not created yet`);
    }

    // Clean phone number: remove non-digits, ensure country code 55 (Brazil) if missing
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    if (!cleanNumber.startsWith('55')) {
      cleanNumber = '55' + cleanNumber;
    }
    
    const jid = `${cleanNumber}@s.whatsapp.net`;

    try {
      await this.socket.groupParticipantsUpdate(groupId, [jid], 'add');
      console.log(`Added ${jid} to group ${groupName}`);
      return true;
    } catch (err) {
      console.error(`Error adding to group ${groupName}:`, err);
      // Try to send an invite link if direct add fails (often happens with privacy settings)
      try {
        const code = await this.socket.groupInviteCode(groupId);
        const inviteLink = `https://chat.whatsapp.com/${code}`;
        await this.socket.sendMessage(jid, { text: `Olá! Você foi aprovado no Piruá E.C. Entre no grupo oficial: ${inviteLink}` });
        return { invited: true, link: inviteLink };
      } catch (inviteErr) {
        console.error('Failed to even send invite message:', inviteErr);
        throw err;
      }
    }
  }
}

export const whatsappService = new WhatsAppService();
