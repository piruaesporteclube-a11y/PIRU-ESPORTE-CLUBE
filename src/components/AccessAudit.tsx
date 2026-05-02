import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, ShieldAlert, User, Clock, AlertTriangle, CheckCircle2, Search, XCircle, Filter } from 'lucide-react';
import { cn } from '../utils';

export const AccessAudit: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loginErrors, setLoginErrors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'access' | 'errors'>('access');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAccess = api.subscribeToAccessLogs((logs) => {
      setAccessLogs(logs);
      setLoading(false);
    });

    const unsubErrors = api.subscribeToLoginErrors((errors) => {
      setLoginErrors(errors);
    });

    return () => {
      unsubAccess();
      unsubErrors();
    };
  }, []);

  const filteredAccess = accessLogs.filter(log => 
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredErrors = loginErrors.filter(err => 
    err.doc_attempted?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    err.error_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (date: any) => {
    if (!date) return 'Data desconhecida';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Shield className="text-theme-primary" />
            AUDITORIA DE ACESSO
          </h2>
          <p className="text-zinc-400 text-sm">Monitore logins bem-sucedidos e tentativas de acesso falhas.</p>
        </div>

        <div className="flex bg-zinc-800 rounded-xl p-1 p-1">
          <button
            onClick={() => setActiveTab('access')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'access' ? "bg-theme-primary text-black" : "text-zinc-400 hover:text-white"
            )}
          >
            <CheckCircle2 size={14} />
            ACESSOS ({accessLogs.length})
          </button>
          <button
            onClick={() => setActiveTab('errors')}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'errors' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-zinc-400 hover:text-white"
            )}
          >
            <ShieldAlert size={14} />
            ERROS ({loginErrors.length})
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text"
          placeholder={activeTab === 'access' ? "Buscar por nome ou ID..." : "Buscar por CPF ou mensagem de erro..."}
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <AnimatePresence mode="popLayout">
          {activeTab === 'access' ? (
            filteredAccess.length > 0 ? (
              filteredAccess.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex items-center justify-between group hover:border-theme-primary/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{log.user_name}</h4>
                      <p className="text-zinc-500 text-xs flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px] uppercase font-black tracking-wider">
                          {log.role}
                        </span>
                        • User ID: {log.user_id}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-zinc-400 text-xs flex items-center justify-end gap-1.5 font-medium">
                      <Clock size={12} className="text-theme-primary" />
                      {formatDate(log.created_at)}
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                <Shield className="mx-auto text-zinc-700 mb-4" size={48} />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhum log de acesso encontrado</p>
              </div>
            )
          ) : (
            filteredErrors.length > 0 ? (
              filteredErrors.map((err) => (
                <motion.div
                  key={err.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex items-center justify-between group hover:border-red-500/40 transition-all animate-pulse-slow"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500">
                      <XCircle size={24} />
                    </div>
                    <div className="max-w-md">
                      <h4 className="text-white font-bold">Tentativa falha: {err.doc_attempted}</h4>
                      <p className="text-red-400/80 text-sm font-medium mt-0.5 italic">
                        "{err.error_message}"
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400/60 text-xs flex items-center justify-end gap-1.5 font-bold uppercase tracking-wider">
                      <Clock size={12} />
                      {formatDate(err.created_at)}
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-black uppercase shadow-lg shadow-red-500/20">
                      <AlertTriangle size={10} />
                      LOGIN NEGADO
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                <CheckCircle2 className="mx-auto text-emerald-500/30 mb-4" size={48} />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhum erro de login registrado recentemente</p>
              </div>
            )
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
