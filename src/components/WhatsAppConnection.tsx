import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { MessageCircle, RefreshCw, CheckCircle2, AlertCircle, QrCode } from 'lucide-react';
import { cn } from '../utils';

export default function WhatsAppConnection() {
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  const fetchStatus = async () => {
    try {
      const data = await api.whatsapp.getStatus();
      setStatus(data.status);
      setQrCode(data.qrCode);
    } catch (err) {
      console.error('Error fetching WhatsApp status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReconnect = async () => {
    setIsRetrying(true);
    try {
      await api.whatsapp.reset();
      await fetchStatus();
    } catch (err) {
      console.error('Error resetting WhatsApp:', err);
    } finally {
      setTimeout(() => setIsRetrying(false), 2000);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000); // More frequent updates during setup
    return () => clearInterval(interval);
  }, []);

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
          {status !== 'connecting' && (
            <button 
              onClick={handleReconnect}
              disabled={isRetrying}
              className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-lg transition-colors flex items-center gap-2"
              title="Resetar Conexão"
            >
              <RefreshCw className={cn("w-3 h-3", isRetrying && "animate-spin")} />
              <span className="text-[10px] font-black uppercase">Resetar</span>
            </button>
          )}
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
          <div className="bg-green-500/5 border border-green-500/20 rounded-2xl p-6 text-center">
            <CheckCircle2 className="text-green-500 mx-auto mb-3" size={48} />
            <h4 className="text-white font-black uppercase mb-1">Tudo Pronto!</h4>
            <p className="text-zinc-400 text-xs uppercase font-bold leading-relaxed">
              O sistema está sincronizado com seu WhatsApp. <br />
              Grupos de Atletas e Responsáveis serão gerenciados automaticamente.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-400 text-xs uppercase font-bold leading-relaxed">
              Para ativar a automação de grupos, escaneie o QR Code abaixo com seu WhatsApp:
            </p>
            
            <div className="flex justify-center p-4 bg-white rounded-2xl w-fit mx-auto">
              {qrCode ? (
                <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48" />
              ) : (
                <div className="w-48 h-48 flex items-center justify-center bg-zinc-100 rounded-xl">
                  <RefreshCw className="text-zinc-400 animate-spin" size={32} />
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
          <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
            <h5 className="text-zinc-500 text-[10px] font-black uppercase mb-2">Grupo de Atletas</h5>
            <p className="text-white text-xs font-bold uppercase">Piruá Esporte Clube Atletas</p>
          </div>
          <div className="p-4 bg-zinc-800/50 rounded-2xl border border-zinc-700/50">
            <h5 className="text-zinc-500 text-[10px] font-black uppercase mb-2">Grupo de Responsáveis</h5>
            <p className="text-white text-xs font-bold uppercase">Piruá Esporte Clube Responsáveis</p>
          </div>
        </div>
      </div>
    </div>
  );
}
