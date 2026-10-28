import React from 'react';
import { AlertTriangle, ExternalLink, RefreshCcw, Wifi } from 'lucide-react';
import { isQuotaExceeded, api } from '../api';
import { motion, AnimatePresence } from 'motion/react';

const UPGRADE_URL = "https://console.firebase.google.com/project/gen-lang-client-0796288532/firestore/databases/ai-studio-f6a99652-8f1f-4d40-b0f0-d1ad882fcd59/data?openUpgradeDialog=true";

export default function QuotaBanner() {
  const [show, setShow] = React.useState(isQuotaExceeded());

  // Periodically check if quota status changed in this session or on event
  React.useEffect(() => {
    const check = () => setShow(isQuotaExceeded());
    const interval = setInterval(check, 3000);
    window.addEventListener('pirua_usage_updated', check);
    return () => {
      clearInterval(interval);
      window.removeEventListener('pirua_usage_updated', check);
    };
  }, []);

  if (!show) return null;

  const handleReconnect = () => {
    api.clearQuota();
    window.location.reload();
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-amber-500 text-black px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 font-bold text-xs shadow-md border-b border-amber-600/30"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={18} className="shrink-0 text-amber-950 animate-pulse" />
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
            <span className="font-black uppercase tracking-wider text-[11px] text-amber-950">
              Modo Offline / Cota do Banco Atingida (Quota Exceeded)
            </span>
            <span className="text-[11px] font-medium text-amber-900">
              O limite diário de leituras foi atingido e reinicia a cada 24 horas. Os dados salvos localmente continuam disponíveis.
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-auto">
          <a
            href={UPGRADE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1 bg-black text-white text-[10px] uppercase tracking-wider font-black rounded-full hover:bg-zinc-800 transition-colors shadow-sm"
          >
            <ExternalLink size={12} />
            Aumentar Cota
          </a>
          <button 
            onClick={handleReconnect}
            className="flex items-center gap-1.5 px-3 py-1 bg-amber-900/10 hover:bg-amber-900/20 text-black border border-black/20 text-[10px] uppercase tracking-wider font-bold rounded-full transition-colors"
          >
            <Wifi size={12} />
            Reconectar
          </button>
          <button 
            onClick={() => api.clearPersistence()}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-900/10 hover:bg-amber-900/20 text-black border border-black/20 text-[10px] uppercase tracking-wider font-bold rounded-full transition-colors"
          >
            <RefreshCcw size={12} />
            Limpar Cache
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
