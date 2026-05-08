import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete } from '../types';
import { MessageCircle, RefreshCw, CheckCircle2, AlertCircle, Users, Loader2 } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';

interface WhatsAppConnectionProps {
  athletes: Athlete[];
}

export default function WhatsAppConnection({ athletes }: WhatsAppConnectionProps) {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrTimeoutCount, setQrTimeoutCount] = useState(0);
  const [isHalted, setIsHalted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });

  const fetchStatus = async () => {
    try {
      const data = await api.whatsapp.getStatus();
      setStatus(data.status);
      setQrCode(data.qrCode);
      setQrTimeoutCount(data.qrTimeoutCount || 0);
      setIsHalted(data.isHalted || false);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async () => {
    setIsRetrying(true);
    const toastId = toast.loading("Reiniciando conexão...");
    try {
      await api.whatsapp.reset();
      await fetchStatus();
      toast.success("Reiniciando em instantes...", { id: toastId });
    } catch (err) {
      console.error('Error resetting WhatsApp:', err);
      toast.error("Falha ao reiniciar.", { id: toastId });
    } finally {
      setTimeout(() => setIsRetrying(false), 2000);
    }
  };

  const handleLogout = async () => {
    setIsRetrying(true);
    const toastId = toast.loading("Desconectando...");
    try {
      await api.whatsapp.logout();
      await fetchStatus();
      toast.success("Desconectado com sucesso.", { id: toastId });
    } catch (err) {
      console.error('Error logging out WhatsApp:', err);
      toast.error("Falha ao desconectar.", { id: toastId });
    } finally {
      setTimeout(() => setIsRetrying(false), 2000);
    }
  };

  const [syncLogs, setSyncLogs] = useState<{name: string, status: 'pending' | 'success' | 'error', message?: string}[]>([]);

  const [isSyncingGroups, setIsSyncingGroups] = useState(false);

  const handleSyncGroups = async () => {
    setIsSyncingGroups(true);
    try {
      const res = await api.whatsapp.syncGroups();
      if (res.success) {
        toast.success("Grupos sincronizados/verificados com sucesso!");
      } else {
        toast.error("Erro ao sincronizar grupos: " + res.error);
      }
    } catch (err) {
      toast.error("Erro de conexão ao sincronizar grupos.");
    } finally {
      setIsSyncingGroups(false);
    }
  };

  const handleSyncAll = async () => {
    if (status !== 'connected') {
      toast.error("WhatsApp não está conectado");
      return;
    }

    // Incluir todos os atletas que estão no sistema e não estão pendentes (mesma lógica da aba 'Ativos')
    const activeAthletes = athletes.filter(a => a.confirmation !== 'Pendente');
    if (activeAthletes.length === 0) {
      toast.info("Nenhum atleta ativo para sincronizar");
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: activeAthletes.length });
    setSyncLogs(activeAthletes.map(a => ({ name: a.name || 'Sem nome', status: 'pending' })));
    
    let successes = 0;
    let errors = 0;

    for (let i = 0; i < activeAthletes.length; i++) {
      // Check for connection status change mid-sync
      const currentStatusData = await api.whatsapp.getStatus();
      if (currentStatusData.status !== 'connected') {
        setIsSyncing(false);
        toast.error("Conexão com WhatsApp interrompida durante a sincronização.");
        return;
      }

      if (errors > 5) {
        setIsSyncing(false);
        toast.error("Muitos erros detectados. Sincronização interrompida para evitar bloqueios.");
        return;
      }

      const athlete = activeAthletes[i];
      const name = athlete.name || "Atleta";
      let lastMessage = 'Sucesso';
      
      try {
        const res = await api.whatsapp.syncAthlete(athlete);
        
        if (res.athlete && !res.athlete.success) throw new Error(res.athlete.error || "Erro no atleta");
        if (res.guardian && !res.guardian.success) throw new Error(res.guardian.error || "Erro no responsável");
        
        lastMessage = res.guardian?.message || res.athlete?.message || 'Sucesso';
        
        successes++;
        setSyncLogs(prev => {
          const newLogs = [...prev];
          newLogs[i] = { name, status: 'success', message: lastMessage };
          return newLogs;
        });
      } catch (err: any) {
        console.error(`Erro ao sincronizar ${name}:`, err);
        errors++;
        setSyncLogs(prev => {
          const newLogs = [...prev];
          newLogs[i] = { name, status: 'error', message: err.message };
          return newLogs;
        });
      }
      
      setSyncProgress(prev => ({ ...prev, current: i + 1 }));
      // Increased delay to 12 seconds to significantly reduce rate-limit risk from WhatsApp platform
      await new Promise(r => setTimeout(r, 12000));
    }

    setIsSyncing(false);
    toast.success(`Sincronização concluída! ${successes} processados.`);
    if (errors > 0) {
      toast.warning(`${errors} contatos tiveram erros. Verifique a lista.`);
    }
  };

  // ... inside return ...
  
  // Replace the progress bar area with something that can show logs
  // (later in the JSX)


  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = athletes.filter(a => a.confirmation !== 'Pendente').length;

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-green-500/10 rounded-2xl">
            <MessageCircle className="text-green-500" size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-white uppercase tracking-widest">Conexão WhatsApp</h3>
            <p className="text-zinc-500 text-xs font-bold uppercase tracking-wider">Integração com grupos automáticos</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {status !== 'disconnected' && (
            <button 
              onClick={handleLogout}
              disabled={isRetrying || isSyncing}
              className="px-3 py-1 bg-zinc-800 hover:bg-red-500/10 text-zinc-400 hover:text-red-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
              title="Desconectar e Parar"
            >
              <AlertCircle className="w-3 h-3" />
              <span className="text-[10px] font-black uppercase">Parar</span>
            </button>
          )}
          <button 
            onClick={handleReconnect}
            disabled={isRetrying || isSyncing}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
            title="Resetar Conexão"
          >
            <RefreshCw className={cn("w-3 h-3", isRetrying && "animate-spin")} />
            <span className="text-[10px] font-black uppercase">Reiniciar</span>
          </button>
          <div className={cn(
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
            status === 'connected' ? "bg-green-500/10 text-green-500" :
            status === 'connecting' ? "bg-amber-500/10 text-amber-500" :
            "bg-zinc-800 text-zinc-500"
          )}>
            <div className={cn(
              "w-1.5 h-1.5 rounded-full animate-pulse",
              status === 'connected' ? "bg-green-500" :
              status === 'connecting' ? "bg-amber-500" :
              "bg-zinc-600"
            )} />
            {status === 'connected' ? 'Conectado' : status === 'connecting' ? 'Conectando...' : 'Desconectado'}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {status === 'connected' ? (
          <div className="space-y-4">
            <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 text-center">
              <CheckCircle2 className="text-green-500 mx-auto mb-3" size={48} />
              <h4 className="text-white font-black uppercase mb-1">Tudo Pronto!</h4>
              <p className="text-zinc-400 text-xs uppercase font-bold leading-relaxed">
                O sistema está sincronizado com seu WhatsApp. <br />
                Novas aprovações entrarão nos grupos automaticamente.
              </p>
            </div>

            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <Users className="text-theme-primary shrink-0" size={24} />
                <div>
                  <h4 className="text-white font-black uppercase text-sm">Sincronização em Massa</h4>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold">Adicione todos os {activeCount} atletas já ativos aos grupos</p>
                </div>
              </div>

              {isSyncing || syncLogs.length > 0 ? (
                <div className="space-y-4">
                  {isSyncing && (
                    <div className="space-y-3">
                      <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-theme-primary transition-all duration-300"
                          style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] font-black uppercase text-zinc-500">
                        <span>Sincronizando contatos...</span>
                        <span>{syncProgress.current} / {syncProgress.total}</span>
                      </div>
                    </div>
                  )}

                  <div className="bg-black/20 rounded-xl p-3 border border-zinc-700/30">
                    <div className="flex justify-between items-center mb-2 px-1">
                      <h5 className="text-[10px] font-black uppercase text-zinc-400">Log de Sincronização</h5>
                      {!isSyncing && (
                        <button 
                          onClick={() => setSyncLogs([])}
                          className="text-[9px] font-black uppercase text-theme-primary hover:underline"
                        >
                          Limpar
                        </button>
                      )}
                    </div>
                    <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar">
                      {syncLogs.length === 0 && (
                        <p className="text-[9px] text-zinc-600 uppercase font-bold text-center py-4">Nenhum log disponível</p>
                      )}
                      {[...syncLogs].reverse().map((log, i) => (
                        <div key={i} className="flex justify-between items-center text-[9px] font-bold uppercase py-1.5 border-b border-zinc-800/50 last:border-0">
                          <span className="text-zinc-300 truncate max-w-[180px]">{log.name}</span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded",
                            log.status === 'success' ? "bg-green-500/10 text-green-500" : 
                            log.status === 'error' ? "bg-red-500/10 text-red-500" : 
                            "bg-zinc-800 text-zinc-500"
                          )}>
                            {log.status === 'success' ? 'Sucesso' : log.status === 'error' ? (log.message || 'Erro') : 'Pendente'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {!isSyncing && (
                    <button
                      onClick={handleSyncAll}
                      className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-black uppercase text-[10px] rounded-lg transition-all border border-zinc-700"
                    >
                      Reiniciar Sincronização
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={handleSyncAll}
                  className="w-full py-3 bg-theme-primary hover:bg-theme-primary/90 text-black font-black uppercase text-xs rounded-xl transition-all shadow-lg active:scale-[0.98]"
                >
                  Sincronizar {activeCount} Contatos Existentes
                </button>
              )}
            </div>
          </div>
        ) : (isHalted || qrTimeoutCount >= 2) ? (
          <div className="space-y-4">
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-6 text-center">
              <AlertCircle className="text-red-500 mx-auto mb-3" size={48} />
              <h4 className="text-white font-black uppercase mb-1">Conexão Pausada</h4>
              <p className="text-zinc-400 text-xs uppercase font-bold leading-relaxed mb-4">
                Por segurança, a geração automática do QR Code foi pausada após várias tentativas sem escaneamento.
              </p>
              <button
                onClick={handleReconnect}
                disabled={isRetrying}
                className="px-6 py-2 bg-theme-primary text-black font-black uppercase text-[10px] rounded-lg transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 mx-auto"
              >
                {isRetrying ? <RefreshCw className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                Tentar Novamente
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-400 text-xs uppercase font-bold leading-relaxed">
              Para ativar a automação de grupos, escaneie o QR Code abaixo com seu WhatsApp:
            </p>
            
            <div className="flex justify-center p-4 bg-white rounded-2xl w-fit mx-auto shadow-2xl">
              {qrCode ? (
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-zinc-100 rounded-xl border-4 border-zinc-200 border-dashed">
                  <Loader2 className="text-zinc-400 animate-spin" size={32} />
                </div>
              )}
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4 flex gap-3 text-amber-500">
              <AlertCircle size={20} className="shrink-0" />
              <div className="text-[10px] font-black uppercase leading-relaxed">
                Importante: Mantenha esta conexão ativa para que novos alunos sejam adicionados aos grupos automaticamente no momento da aprovação.
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 flex flex-col justify-between">
            <div>
              <h5 className="text-zinc-500 text-[10px] font-black uppercase mb-2">Grupo de Atletas</h5>
              <p className="text-white text-xs font-bold uppercase">Piruá Esporte Clube Atletas</p>
            </div>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50 flex flex-col justify-between">
            <div>
              <h5 className="text-zinc-500 text-[10px] font-black uppercase mb-2">Grupo de Responsáveis</h5>
              <p className="text-white text-xs font-bold uppercase">Piruá Esporte Clube Responsáveis</p>
            </div>
          </div>
        </div>

        {status === 'connected' && (
          <button
            onClick={handleSyncGroups}
            disabled={isSyncingGroups || isSyncing}
            className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white font-black uppercase text-[10px] rounded-lg transition-all border border-zinc-700 flex items-center justify-center gap-2"
          >
            {isSyncingGroups ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            Verificar/Criar Grupos no WhatsApp
          </button>
        )}
      </div>
    </div>
  );
}
