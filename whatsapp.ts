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
  private restartRequiredCount = 0;
  private lastRestartTime = 0;
  private qrTimeoutCount = 0;
  private isHalted = false;
  private haltReason: string | null = null;
  private lastResetTime = 0;
  private connectionWatchdog: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  constructor() {
    // We removed this.init() from here to prevent automatic connection on startup
    // Based on user request to not connect automatically.
  }

  public async connect() {
    console.log('[WhatsApp] Manual connect requested.');
    this.isHalted = false;
    this.haltReason = null;
    this.isInitializing = false; // Force clear any stuck state
    await this.init();
  }

  public async logout(autoReinit = true, resetQrTimeout = true, stayHalted = false) {
    // Prevent overlapping logouts - but allow if specifically requested via autoReinit=true after some delay
    if (!stayHalted && this.lastResetTime && Date.now() - this.lastResetTime < 2000) {
      console.log('WhatsApp: Ignoring redundant logout/reset request');
      return;
    }
    
    this.lastResetTime = Date.now();
    this.isInitializing = true; 
    
    const wasConnected = this.connectionStatus === 'connected';
    this.connectionStatus = 'disconnected'; // Immediately show disconnected in UI
    this.qrCode = null; // Clear QR code
    
    // Clear any pending reconnect or watchdog
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.stopWatchdog();

    console.log(`[WhatsApp] Starting logout/reset. stayHalted: ${stayHalted}, autoReinit: ${autoReinit}`);

    try {
      if (this.socket) {
        // Attempt clean logout but don't hang
        try {
          if (wasConnected) {
            await Promise.race([
              this.socket.logout(),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Logout timeout')), 3000))
            ]).catch(() => {});
          }
        } catch (e) {}
        
        try {
          if (this.socket?.ev) {
            this.socket.ev.removeAllListeners('connection.update');
            this.socket.ev.removeAllListeners('creds.update');
          }
          
          if (this.socket?.end) {
            this.socket.end(undefined);
          }
        } catch (e) {}
      }
    } catch (e) {
      console.error('Error during socket cleanup:', e);
    }
    
    this.socket = null;
    this.jidCache = {};
    
    // Explicitly set halt state
    this.isHalted = stayHalted; 
    if (!stayHalted) this.haltReason = null;

    // Safety delay to ensure file handles are closed
    await new Promise(r => setTimeout(r, 1500));

    if (fs.existsSync(this.authStatePath)) {
      try {
        fs.rmSync(this.authStatePath, { recursive: true, force: true });
        console.log('WhatsApp auth session cleared successfully');
      } catch (err: any) {
        console.error('Failed to delete auth session files:', err.message || err);
        // If it fails, maybe try to rename it as a fallback?
        try {
          const oldPath = `${this.authStatePath}_old_${Date.now()}`;
          fs.renameSync(this.authStatePath, oldPath);
          console.log(`Renamed locked auth folder to ${oldPath}`);
        } catch (e) {}
      }
    }
    
    if (resetQrTimeout) {
      this.qrTimeoutCount = 0;
    }
    
    // Calculate reinit status AFTER flipping isHalted
    const actualAutoReinit = autoReinit && !this.isHalted;
    
    this.isInitializing = false;
    this.reconnectAttempts = 0;
    this.restartRequiredCount = 0;
    
    if (actualAutoReinit) {
      console.log('WhatsApp reset complete. Re-initializing in 8s...');
      setTimeout(() => {
        if (!this.isHalted) this.init();
      }, 8000);
    } else {
      console.log(`WhatsApp reset complete. Auto-reinitialization disabled. (Halted: ${this.isHalted})`);
    }
  }

  private startWatchdog() {
    this.stopWatchdog();
    this.connectionWatchdog = setTimeout(() => {
      if (this.connectionStatus === 'connecting' || (this.connectionStatus === 'disconnected' && !this.isInitializing)) {
        console.warn('WhatsApp: Watchdog triggered. Connection stuck. Resetting...');
        this.logout(true, true, false);
      }
    }, 180000); // 3 minutes timeout is more reasonable
  }

  private stopWatchdog() {
    if (this.connectionWatchdog) {
      clearTimeout(this.connectionWatchdog);
      this.connectionWatchdog = null;
    }
  }

  private async init() {
    if (this.isInitializing) {
      console.log('WhatsApp: Initialization already in progress...');
      return;
    }
    
    if (this.isHalted && this.connectionStatus !== 'connected') {
      console.log('WhatsApp: Initialization blocked - Halted state (manual reset required)');
      return;
    }
    
    // Clear any pending reconnect
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    // Ensure any previously existing socket is cleaned up
    if (this.socket) {
      try {
        console.log('WhatsApp: Cleaning up existing socket before init');
        if (this.socket.ev) {
          this.socket.ev.removeAllListeners('connection.update');
          this.socket.ev.removeAllListeners('creds.update');
        }
        if (this.socket.end) {
          this.socket.end(undefined);
        }
      } catch (e) {}
      this.socket = null;
    }

    this.isInitializing = true;
    this.connectionStatus = 'connecting';
    this.qrCode = null; // Clear old QR code when starting new init
    this.startWatchdog();
    
    console.log(`[WhatsApp] Starting initialization... (Halted: ${this.isHalted})`);
    
    // Ensure cleanup of any previous session artifacts
    await new Promise(r => setTimeout(r, 1000));
    
    try {
      // Ensure path exists
      if (!fs.existsSync(this.authStatePath)) {
        fs.mkdirSync(this.authStatePath, { recursive: true });
        console.log(`[WhatsApp] Created auth state directory: ${this.authStatePath}`);
      }

      console.log(`[WhatsApp] Loading auth state...`);
      const authState = await useMultiFileAuthState(this.authStatePath).catch(err => {
        console.error('[WhatsApp] Failed to load auth state:', err);
        throw err;
      });
      const { state, saveCreds } = authState;
      
      console.log(`[WhatsApp] Fetching latest Baileys version...`);
      const { version } = await fetchLatestBaileysVersion().catch((err) => {
        console.warn('[WhatsApp] fetchLatestBaileysVersion failed, using fallback:', err.message || err);
        return { 
          version: [2, 2413, 51] as [number, number, number], 
          isLatest: false 
        };
      });

      console.log(`[WhatsApp] Using Baileys v${version.join('.')}`);

      this.socket = makeWASocket({
        version,
        logger,
        auth: {
          creds: state.creds,
          keys: makeCacheableSignalKeyStore(state.keys, logger),
        },
        printQRInTerminal: false,
        browser: ['Mac OS', 'Chrome', '121.0.6167.184'],
        syncFullHistory: false,
        qrTimeout: 45000, 
        connectTimeoutMs: 30000, 
        defaultQueryTimeoutMs: 30000,
        keepAliveIntervalMs: 15000, 
        retryRequestDelayMs: 2000,
        markOnlineOnConnect: true, 
        generateHighQualityLinkPreview: false,
        maxMsgRetryCount: 5,
        fireInitQueries: false,
        shouldIgnoreJid: (jid) => jid?.includes('broadcast'),
        getMessage: async (key: WAMessageKey) => {
          return { conversation: 'Piruá Esporte Clube' };
        }
      });
      
      console.log(`[WhatsApp] Socket instance created. Attaching listeners...`);

      this.socket.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            this.qrCode = await QRCode.toDataURL(qr);
            this.connectionStatus = 'connecting';
            console.log(`[WhatsApp] QR Code Ready (Attempt ${this.qrTimeoutCount + 1})`);
            this.startWatchdog();
          } catch (qrErr) {
            console.error('[WhatsApp] Error generating QR Data URL:', qrErr);
          }
        }

        if (connection === 'close') {
          this.stopWatchdog();
          const statusBeforeClose = this.connectionStatus;
          const error = lastDisconnect?.error as Boom;
          const statusCode = error?.output?.statusCode;
          const errorMessage = error?.message || error?.toString() || 'Unknown error';
                   const isRestartRequired = statusCode === DisconnectReason.restartRequired || statusCode === 515 || (error as any)?.fullErrorNode?.attrs?.code === '515';
          const isTimedOut = statusCode === DisconnectReason.timedOut || statusCode === 408 || errorMessage.toLowerCase().includes('qr refs attempts ended');
          const isConnectionLost = (statusCode === DisconnectReason.connectionLost || statusCode === 408) && statusBeforeClose === 'connected';
          const isNetworkError = (isConnectionLost || statusCode === DisconnectReason.connectionClosed || statusCode === 440 || statusCode === 428 || statusCode === 503 || statusCode === 500) && !errorMessage.toLowerCase().includes('qr refs attempts ended');

          console.log(`[WhatsApp] Connection closed: ${errorMessage} | Status: ${statusCode} | Network Error: ${isNetworkError} | Restart Required: ${isRestartRequired}`);

          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401 || statusCode === 411;
          
          // Enhanced device removed / conflict detection
          const fullErrorNode = (error as any)?.fullErrorNode;
          const reasonNode = (error as any)?.reasonNode;
          const errorNode = fullErrorNode || reasonNode;
          const content = errorNode?.content || [];
          
          const hasConflictTag = errorNode?.tag === 'conflict' || 
                                 reasonNode?.tag === 'conflict' ||
                                 (Array.isArray(content) && content.some((c: any) => c?.tag === 'conflict' || c?.attrs?.type === 'device_removed'));
          
          const isDeviceRemoved = hasConflictTag || 
                                  statusCode === 401 || statusCode === 403 || 
                                  errorMessage.toLowerCase().includes('device_removed') || 
                                  errorMessage.toLowerCase().includes('device removed') ||
                                  errorMessage.toLowerCase().includes('conflict') ||
                                  errorMessage.toLowerCase().includes('unauthorized');
          
          if (isRestartRequired && connection === 'close') {
            this.restartRequiredCount++;
            console.log(`[WhatsApp] Restart Required (515) count: ${this.restartRequiredCount}`);
            
            // If we hit too many 515s within a short window, clear session. 
            // Otherwise, just let it reconnect normally.
            const now = Date.now();
            if (this.restartRequiredCount >= 5 && (now - this.lastRestartTime < 60000)) {
              console.warn(`[WhatsApp] 515 loop detected (${this.restartRequiredCount} in <1min). Resetting session.`);
              this.restartRequiredCount = 0;
              this.logout(true, true, false);
              return;
            }
            this.lastRestartTime = now;
          } else if (connection === 'close') {
            // If it closed for other reasons but we were connected, reset the counts
            if (statusBeforeClose === 'connected') {
              this.restartRequiredCount = 0;
            }
          }

          // Crucial: Null the socket instance to allow fresh init
          const oldSocket = this.socket;
          
          this.socket = null;
          this.connectionStatus = 'disconnected';
          this.qrCode = null;
          this.isInitializing = false;

          if (oldSocket) {
            try {
              if (oldSocket.ev) {
                oldSocket.ev.removeAllListeners('connection.update');
                oldSocket.ev.removeAllListeners('creds.update');
              }
              // Aggressive nuke for these codes
              if (isRestartRequired || isLoggedOut || isDeviceRemoved || isTimedOut || hasConflictTag) {
                if (oldSocket.end) oldSocket.end(undefined);
              }
            } catch (e) {}
          }

          // Case 1: Session invalidated - must logout and clear files
          // Also halt if 515 loop detected (more than 50 times)
          if (isLoggedOut || isDeviceRemoved || (hasConflictTag && statusCode === 401) || this.restartRequiredCount > 50) {
            const reason = isLoggedOut ? 'Logged Out' : (isDeviceRemoved ? 'Device Removed / Session Expired' : (hasConflictTag ? 'Connection Conflict' : '515 Loop Detected'));
            console.warn(`[WhatsApp] TERMINAL SESSION ERROR (${reason}). Halting connection.`);
            this.connectionStatus = 'disconnected';
            this.isHalted = true;
            this.haltReason = reason;
            this.logout(false, true, true); // autoReinit=false, resetQrTimeout=true, stayHalted=true
            return;
          }

          // Case 2: QR Expired or Timeout during pairing
          if (isTimedOut && statusBeforeClose !== 'connected') {
            this.qrTimeoutCount++;
            console.log(`[WhatsApp] QR/Pairing timeout (Count: ${this.qrTimeoutCount})`);
            
            // If we've timed out multiple times, try resetting the session files completely
            if (this.qrTimeoutCount > 0 && this.qrTimeoutCount % 3 === 0) {
              console.warn('[WhatsApp] Persistent QR timeouts. Resetting session to try recovery.');
              this.logout(true, false, false); // autoReinit=true, resetQrTimeout=false
              return;
            }

            // If we've timed out way too many times, increase the wait time significantly
            const qrResetDelay = Math.min(15000 * this.qrTimeoutCount, 60000); 

            if (this.qrTimeoutCount >= 10) { 
              console.warn('[WhatsApp] QR threshold reached. Halting auto-reinit.');
              this.isHalted = true;
              return;
            }
            
            this.reconnectTimeout = setTimeout(() => {
              if (!this.isHalted) this.init();
            }, qrResetDelay); 
            return;
          }

          // Standard Reconnect (Network flickers, Stream errors, etc)
          // Only halt if it was disconnected already and not a restart/network error
          if (!isRestartRequired && !isNetworkError && statusBeforeClose !== 'connecting') {
            console.log('[WhatsApp] Non-critical disconnect. Halting auto-reconnect as requested.');
            this.isHalted = true;
            return;
          }

          this.reconnectAttempts++;
          
          // Exponential backoff or progressive delay
          const baseDelay = isRestartRequired ? 5000 : 5000;
          
          // If we get 428 repeatedly, we might have a bad session
          if (statusCode === 428 && this.reconnectAttempts > 3) {
             console.warn('[WhatsApp] Repeated 428 errors. Resetting session.');
             this.logout(true, true, false);
             return;
          }

          const delayTime = isRestartRequired 
            ? Math.min(2000 + (this.restartRequiredCount * 5000), 30000)
            : Math.min(baseDelay + (this.reconnectAttempts * 5000), 120000); 
          
          console.log(`[WhatsApp] Reconnecting in ${delayTime/1000}s... (Attempt ${this.reconnectAttempts} | Restart Count: ${this.restartRequiredCount})`);
          
          this.reconnectTimeout = setTimeout(() => {
            if (!this.isHalted && !this.socket) {
              this.init();
            }
          }, delayTime);
          
        } else if (connection === 'connecting') {
          this.connectionStatus = 'connecting';
        } else if (connection === 'open') {
          this.stopWatchdog();
          this.onWhatsAppFailCount = 0;
          const user = this.socket?.user;
          console.log(`[WhatsApp] Conexão estabelecida com sucesso! (${user?.id || 'ID desconhecido'})`);
          this.connectionStatus = 'connected';
          this.qrCode = null;
          this.isInitializing = false;
          this.reconnectAttempts = 0;
          this.qrTimeoutCount = 0; 
          this.isHalted = false;
          this.restartRequiredCount = 0;
          // Initial setup of groups
          setTimeout(() => this.setupGroups().catch(err => console.error('Delayed group setup failed:', err)), 5000);
        }
      });

      this.socket.ev.on('creds.update', () => {
        console.log('[WhatsApp] Sessão sincronizada/salva.');
        saveCreds();
      });
    } catch (err: any) {
      const errorMessage = err?.message || err?.toString() || '';
      console.error('[WhatsApp] Initialization error:', errorMessage);
      this.isInitializing = false;
      this.connectionStatus = 'disconnected';
      this.qrCode = null;
      
      const isQRExpired = errorMessage.toLowerCase().includes('qr refs attempts ended') || errorMessage.toLowerCase().includes('timed out');
      
      if (isQRExpired) {
        this.qrTimeoutCount++;
        const qrResetDelay = Math.min(10000 * this.qrTimeoutCount, 60000);
        if (this.qrTimeoutCount >= 10) {
          this.isHalted = true;
          console.warn('[WhatsApp] Catch block: QR threshold reached. Halting.');
        } else {
          console.log(`[WhatsApp] QR expired in catch block, retrying in ${qrResetDelay/1000}s...`);
          setTimeout(() => {
            if (!this.isHalted) this.init();
          }, qrResetDelay);
        }
      } else {
        this.reconnectAttempts++;
        const delay = Math.min(this.reconnectAttempts * 5000, 60000);
        console.log(`[WhatsApp] Failed to init, retrying in ${delay/1000}s...`);
        setTimeout(() => {
          if (!this.isHalted) this.init();
        }, delay);
      }
    } finally {
      // We only clear isInitializing if we didn't successfully set up connection.update listeners
      // Actually, it's safer to clear it after a short delay here if the socket creation itself took too long
      // But we usually clear it in connection.update (open) or local catch.
      // Let's ensure it's not stuck.
      setTimeout(() => {
        if (this.connectionStatus === 'disconnected' && this.isInitializing) {
          this.isInitializing = false;
        }
      }, 5000);
    }
  }

  public async syncGroups(retryCount = 0) {
    if (!this.socket || this.connectionStatus !== 'connected') return {};

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
        return this.syncGroups(retryCount + 1);
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
      return this.groupIds;
    } catch (err) {
      console.error('[WhatsApp] Erro em syncGroups:', err);
      return this.groupIds;
    }
  }

  private async setupGroups() {
    return this.syncGroups();
  }

  public getStatus() {
    return {
      status: this.connectionStatus,
      qrCode: this.qrCode,
      qrTimeoutCount: this.qrTimeoutCount,
      isHalted: this.isHalted,
      haltReason: this.haltReason,
      reconnectAttempts: this.reconnectAttempts,
      restartRequiredCount: this.restartRequiredCount,
      isInitializing: this.isInitializing
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

  private normalizeBrazilianNumber(phoneNumber: string): string {
    let clean = phoneNumber.replace(/\D/g, '');
    
    // If it doesn't have country code, add it
    if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
      clean = '55' + clean;
    }

    // Brazilian normalization logic
    // Format: 55 + DDD (2 digits) + NUMBER
    if (clean.startsWith('55') && clean.length >= 12) {
      const ddd = clean.substring(2, 4);
      let number = clean.substring(4);

      // If it's a mobile number (length 8) and missing the 9th digit
      // In Brazil, mobile numbers are 9 digits starting with 9
      // Fixed lines are 8 digits and don't necessarily start with 9
      // However, for WhatsApp, almost everything is mobile or treated as such
      if (number.length === 8) {
        // Add the 9th digit
        number = '9' + number;
      }
      
      clean = '55' + ddd + number;
    }

    return clean;
  }

  private onWhatsAppFailCount = 0;

  private async resolveJid(phoneNumber: string, retryCount = 0): Promise<string | null> {
    const cleanNumber = this.normalizeBrazilianNumber(phoneNumber);
    
    if (cleanNumber.length < 10) return null;
    
    // Check cache
    if (this.jidCache[cleanNumber]) return this.jidCache[cleanNumber];

    try {
      if (!this.socket || this.connectionStatus !== 'connected') {
        if (this.connectionStatus === 'connecting' && retryCount < 3) {
           await new Promise(r => setTimeout(r, 3000));
           return this.resolveJid(phoneNumber, retryCount + 1);
        }
        return null;
      }
      
      const onWhatsApp = await this.socket.onWhatsApp(cleanNumber).catch((err: any) => {
        this.onWhatsAppFailCount++;
        console.warn(`[WhatsApp] onWhatsApp failed (${this.onWhatsAppFailCount}):`, err.message);
        if (this.onWhatsAppFailCount > 10) {
          console.error('[WhatsApp] Excessive onWhatsApp failures. Zombie session suspected. Forcing reset.');
          this.logout(true, true, false);
        }
        throw err;
      });

      this.onWhatsAppFailCount = 0; // Reset on success
      
      if (onWhatsApp && onWhatsApp[0] && onWhatsApp[0].exists) {
        this.jidCache[cleanNumber] = onWhatsApp[0].jid;
        return onWhatsApp[0].jid;
      }

      // Brazilian specific: Try without the 9th digit if it has it
      // Format: 55 + DDD + 9 + NUMBER (13 chars total)
      if (cleanNumber.length === 13 && cleanNumber.startsWith('55')) {
        const withoutNine = cleanNumber.slice(0, 4) + cleanNumber.slice(5);
        if (this.jidCache[withoutNine]) return this.jidCache[withoutNine];
        
        const altOnWA = await this.socket.onWhatsApp(withoutNine);
        if (altOnWA && altOnWA[0] && altOnWA[0].exists) {
          const jid = altOnWA[0].jid;
          this.jidCache[cleanNumber] = jid;
          this.jidCache[withoutNine] = jid;
          return jid;
        }
      }
      
      // Also try ADDING the 9th digit if it has 12 chars
      if (cleanNumber.length === 12 && cleanNumber.startsWith('55')) {
        const withNine = cleanNumber.slice(0, 4) + '9' + cleanNumber.slice(4);
        if (this.jidCache[withNine]) return this.jidCache[withNine];
        
        const altOnWAData = await this.socket.onWhatsApp(withNine);
        if (altOnWAData && altOnWAData[0] && altOnWAData[0].exists) {
          const jid = altOnWAData[0].jid;
          this.jidCache[cleanNumber] = jid;
          this.jidCache[withNine] = jid;
          return jid;
        }
      }
    } catch (err: any) {
      console.warn(`[WhatsApp] Error resolving JID for ${cleanNumber} (Attempt ${retryCount + 1}):`, err.message || err);
      // If we got a transient error, retry
      const isTransient = err.message?.includes('515') || err.message?.includes('socket hang up') || err.message?.includes('timed out');
      if (isTransient && retryCount < 2) {
        await new Promise(r => setTimeout(r, 2000));
        return this.resolveJid(phoneNumber, retryCount + 1);
      }
    }

    return null;
  }

  public async addParticipant(groupId: string, phoneNumber: string, welcomeMessage?: string, retryCount = 0): Promise<any> {
    // If we're not connected, wait up to 15 seconds if we are "connecting"
    if (this.connectionStatus === 'connecting' && retryCount === 0) {
      console.log(`[WhatsApp] Status is connecting... waiting up to 15s for ${phoneNumber}`);
      let waitTime = 0;
      while (this.connectionStatus === 'connecting' && waitTime < 15000) {
        await new Promise(r => setTimeout(r, 1000));
        waitTime += 1000;
      }
    }

    if (this.connectionStatus !== 'connected' || !this.socket) {
      const currentStatus = this.connectionStatus;
      const error = new Error(`WhatsApp não está conectado (Estado atual: ${currentStatus}). Por favor, verifique o QR Code ou aguarde a reconexão.`);
      (error as any).noConnection = true;
      (error as any).status = currentStatus;
      throw error;
    }

    let jid = '';
    try {
      const resolvedJid = await this.resolveJid(phoneNumber);
      if (!resolvedJid) {
        throw new Error(`O número ${phoneNumber} não parece estar registrado no WhatsApp.`);
      }
      jid = resolvedJid;

      console.log(`[WhatsApp] Adicionando ${jid} ao grupo ${groupId}...`);
      
      // Delay to avoid rapid requests - increased for safety
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const response = await this.socket.groupParticipantsUpdate(groupId, [jid], 'add');
      
      // The response is an array of objects: { jid: string, status: string }
      const status = response?.[0]?.status;

      if (status === '200') {
        if (welcomeMessage && this.socket && this.connectionStatus === 'connected') {
          try {
            await this.socket.sendMessage(jid, { text: welcomeMessage });
          } catch (msgErr: any) {
            console.warn('[WhatsApp] Erro ao enviar mensagem de boas-vindas:', msgErr.message);
          }
        }
        return { success: true, method: 'direct', message: 'Adicionado diretamente' };
      } else if (status === '403') {
        if (!this.socket || this.connectionStatus !== 'connected') {
          return { success: true, method: 'direct', message: 'Adicionado (privacidade impediu PV)' };
        }
        const inviteCode = await this.socket.groupInviteCode(groupId);
        const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
        
        const message = welcomeMessage 
          ? `${welcomeMessage}\n\nClique para entrar: ${inviteLink}`
          : `Olá! Identificamos que não foi possível te adicionar diretamente devido às suas configurações de privacidade. Por favor, entre pelo link: ${inviteLink}`;

        try {
          await this.socket.sendMessage(jid, { text: message });
          return { success: true, method: 'invite_link', message: 'Convite enviado via PV' };
        } catch (msgErr) {
          return { success: true, method: 'invite_link', message: 'Convite necessário (falha ao enviar PV)' };
        }
      } else if (status === '409') {
        return { success: true, method: 'already_in', message: 'Já está no grupo' };
      } else if (status === '429') {
        throw new Error('Muitas tentativas em pouco tempo (Rate Limit). Aguarde alguns minutos.');
      } else if (status === '500') {
        throw new Error('Erro interno do servidor da Meta/WhatsApp (500). Tente novamente mais tarde.');
      } else {
        throw new Error(`Erro do WhatsApp (Status ${status})`);
      }
    } catch (err: any) {
      const errorMessage = err.message || '';
      const isRateLimit = errorMessage.includes('rate-overlimit') || err.output?.payload?.error === 'Rate Overlimit' || errorMessage.includes('429');
      const isIntegrityBlocked = errorMessage.includes('integrity-enforcement');
      const isTimeout = errorMessage.toLowerCase().includes('timed out') || errorMessage.toLowerCase().includes('timeout');
      
      if (isIntegrityBlocked) {
        throw new Error('Sincronização pausada preventivamente pelo WhatsApp por segurança. Tente novamente em 20 minutos.');
      }
      
      if ((isRateLimit || isTimeout) && retryCount < 3) {
        const delayMs = isTimeout ? 5000 : (retryCount + 1) * 10000;
        console.log(`[WhatsApp] ${isTimeout ? 'Timeout' : 'Rate limit'} for ${jid || phoneNumber}, retry ${retryCount + 1} in ${delayMs/1000}s...`);
        await new Promise(r => setTimeout(r, delayMs));
        return this.addParticipant(groupId, phoneNumber, welcomeMessage, retryCount + 1);
      }

      console.error(`[WhatsApp] Erro fatal ao adicionar ${phoneNumber}:`, err);
      throw err;
    }
  }

  public async addToGroup(groupName: 'Piruá Esporte Clube Responsáveis' | 'Piruá Esporte Clube Atletas', phoneNumber: string, retryAttempt = 0): Promise<any> {
    // If we are connecting, or disconnected but NOT halted (meaning reconnection is pending)
    const isRecovering = this.connectionStatus === 'connecting' || (this.connectionStatus === 'disconnected' && !this.isHalted);
    
    if (isRecovering && retryAttempt < 5) {
      console.log(`[WhatsApp] addToGroup: Waiting for connection recovery (Attempt ${retryAttempt + 1}, Status: ${this.connectionStatus})...`);
      
      // Wait progressively longer on each attempt: 5s, 10s, 15s, 20s, 25s
      const waitMs = (retryAttempt + 1) * 5000;
      await new Promise(r => setTimeout(r, waitMs));
      return this.addToGroup(groupName, phoneNumber, retryAttempt + 1);
    }

    if (this.connectionStatus !== 'connected' || !this.socket) {
      const error = new Error(`WhatsApp não está conectado (Estado: ${this.connectionStatus}). Por favor, aguarde a reconexão automática ou escaneie o QR Code novamente.`);
      (error as any).noConnection = true;
      (error as any).status = this.connectionStatus;
      throw error;
    }

    try {
      const cleanNumber = this.normalizeBrazilianNumber(phoneNumber);

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
}

export const whatsappService = new WhatsAppService();
