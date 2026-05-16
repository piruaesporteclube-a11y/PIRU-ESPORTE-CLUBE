import React from 'react';
import { AlertTriangle, CloudOff, RefreshCcw } from 'lucide-react';
import { isQuotaExceeded, api } from '../api';
import { motion, AnimatePresence } from 'motion/react';

export default function QuotaBanner() {
  const [show, setShow] = React.useState(isQuotaExceeded());

  // Periodically check if quota status changed in this session
  React.useEffect(() => {
    const interval = setInterval(() => {
      setShow(isQuotaExceeded());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: 'auto', opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        className="bg-amber-500 text-black px-4 py-2 flex items-center justify-between gap-4 font-black uppercase text-[10px] tracking-widest overflow-hidden"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>Modo de Economia: Limite diário do banco de dados atingido (Quota Exceeded).</span>
          <span className="hidden md:inline opacity-70">O sistema está funcionando com dados salvos no seu navegador para evitar interrupções.</span>
        </div>
        <button 
          onClick={() => api.clearPersistence()}
          className="flex items-center gap-1.5 px-3 py-1 bg-black text-white rounded-full hover:bg-zinc-800 transition-colors"
        >
          <RefreshCcw size={12} />
          Limpar Cache
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
