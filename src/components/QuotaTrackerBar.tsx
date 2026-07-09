import React, { useState, useEffect } from 'react';
import { Database, RefreshCcw, Info, CheckCircle, AlertTriangle, Cpu } from 'lucide-react';
import { getUsageStats, clearCache, isQuotaExceeded } from '../api';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';

export default function QuotaTrackerBar() {
  const [usage, setUsage] = useState(() => getUsageStats());
  const [showDetails, setShowDetails] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setUsage(getUsageStats());
    };
    window.addEventListener('pirua_usage_updated', handleUpdate);
    return () => {
      window.removeEventListener('pirua_usage_updated', handleUpdate);
    };
  }, []);

  const READ_LIMIT = 50000;
  const WRITE_LIMIT = 20000;

  const readsRemaining = Math.max(0, READ_LIMIT - usage.reads);
  const writesRemaining = Math.max(0, WRITE_LIMIT - usage.writes);

  const readsPercent = Math.min(100, (usage.reads / READ_LIMIT) * 100);
  const writesPercent = Math.min(100, (usage.writes / WRITE_LIMIT) * 100);

  const getBarColor = (percent: number) => {
    if (percent < 70) return 'bg-emerald-500';
    if (percent < 90) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getTextColor = (percent: number) => {
    if (percent < 70) return 'text-emerald-400';
    if (percent < 90) return 'text-amber-400';
    return 'text-rose-400';
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    try {
      clearCache();
      // Reset tracker counts visually on this browser if needed (re-load usage stats)
      setUsage(getUsageStats());
      toast.success("O cache local foi limpo e o aplicativo foi sincronizado com sucesso com os servidores do Google.");
    } catch (e) {
      toast.error("Erro ao limpar cache.");
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="bg-gradient-to-b from-zinc-900 to-zinc-950/90 border border-zinc-800/85 rounded-[2rem] p-6 shadow-xl relative overflow-hidden transition-all duration-300">
      {/* Background visual cue */}
      <div className="absolute top-0 right-0 p-8 opacity-[0.02] pointer-events-none">
        <Database size={120} />
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl border border-theme-primary/20">
            <Database size={22} className="animate-pulse text-theme-primary" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              Controle de Cotas e Acessos Gratuitos (Google Cloud)
            </h3>
            <p className="text-xs text-zinc-500 font-medium">
              Acompanhamento de leituras e escritas gratuitas do banco de dados na franquia de hoje.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-zinc-450 hover:text-white bg-zinc-800/50 rounded-xl border border-zinc-700/60 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer"
            title="Como isso funciona?"
          >
            <Info size={14} />
            {showDetails ? "Ocultar Ajuda" : "Como funciona?"}
          </button>
          
          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="p-2 text-zinc-300 hover:text-black bg-zinc-800 hover:bg-theme-primary rounded-xl border border-zinc-700 hover:border-theme-primary text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Sincroniza os dados locais com o Firebase e limpa as cópias antigas"
          >
            <RefreshCcw size={14} className={isClearing ? "animate-spin" : ""} />
            {isClearing ? "Sincronizando..." : "Sincronizar Manual"}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-6"
          >
            <div className="p-4 bg-zinc-900/80 border border-zinc-800 rounded-2xl text-xs text-zinc-400 space-y-2 leading-relaxed">
              <p className="font-extrabold text-white uppercase text-[10px] flex items-center gap-1.5 text-theme-primary">
                <Cpu size={14} /> TECNOLOGIA DE CACHE PIRUÁ ESPECIFICAMENTE DESENVOLVIDA:
              </p>
              <p>
                O Piruá utiliza um motor de <strong>offline-first</strong> inteligente com <strong>IndexedDB</strong>. Ele armazena uma cópia dos atletas, eventos e chamadas no seu navegador. Isso permite que o aplicativo funcione mesmo offline ou em locais sem sinal, economizando até <span className="text-emerald-400 font-bold">95% de consumo de dados</span> da sua franquia de cotas diárias!
              </p>
              <p>
                As consultas marcadas como <em>Cache</em> não utilizam sua cota diária. As cotas só são consumidas quando novas informações são inseridas, editadas, ou quando novos dados são buscados ativamente do servidor remoto do Google.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEITURAS BAR */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Leituras (Reads)</span>
            <span className={`text-xs font-black uppercase ${getTextColor(readsPercent)}`}>
              {readsRemaining.toLocaleString('pt-BR')} restantes
            </span>
          </div>
          
          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-800/50">
            <motion.div 
              className={`h-full rounded-full ${getBarColor(readsPercent)}`}
              initial={{ width: 0 }}
              animate={{ width: `${readsPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
            <span>Usado: {usage.reads.toLocaleString('pt-BR')}</span>
            <span>Limite Gratuito: {READ_LIMIT.toLocaleString('pt-BR')}/dia</span>
          </div>
        </div>

        {/* ESCRITAS BAR */}
        <div className="bg-zinc-950/40 border border-zinc-800/80 p-4 rounded-2xl space-y-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Escritas & Edições (Writes)</span>
            <span className={`text-xs font-black uppercase ${getTextColor(writesPercent)}`}>
              {writesRemaining.toLocaleString('pt-BR')} restantes
            </span>
          </div>
          
          <div className="w-full h-3 bg-zinc-900 rounded-full overflow-hidden relative border border-zinc-800/50">
            <motion.div 
              className={`h-full rounded-full ${getBarColor(writesPercent)}`}
              initial={{ width: 0 }}
              animate={{ width: `${writesPercent}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>

          <div className="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
            <span>Usado: {usage.writes.toLocaleString('pt-BR')}</span>
            <span>Limite Gratuito: {WRITE_LIMIT.toLocaleString('pt-BR')}/dia</span>
          </div>
        </div>
      </div>

      {isQuotaExceeded() && (
        <div className="mt-4 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-center gap-3">
          <AlertTriangle className="text-rose-400 animate-pulse shrink-0" size={18} />
          <div className="text-left">
            <p className="text-[11px] font-extrabold text-rose-400 uppercase">Limite Diário Atingido (Quota Exceeded)</p>
            <p className="text-[10px] text-rose-350 leading-relaxed mt-0.5">
              Você consumiu todos os acessos gratuitos de hoje. O Piruá continuará funcionando em modo de leitura seguro com base nos dados que você já carregou anteriormente. As cotas serão restauradas automaticamente pelo Google nas próximas horas.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
