import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldAlert, 
  User, 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  XCircle, 
  Filter, 
  Database, 
  Lock, 
  Unlock, 
  Check, 
  Ban, 
  Sliders, 
  Users,
  RefreshCw
} from 'lucide-react';
import { cn } from '../utils';

export const AccessAudit: React.FC = () => {
  const [accessLogs, setAccessLogs] = useState<any[]>([]);
  const [loginErrors, setLoginErrors] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'access' | 'errors' | 'portal'>('access');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Portal Control States
  const [studentReads, setStudentReads] = useState<any[]>([]);
  const [adminReads, setAdminReads] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<any[]>([]);
  const [studentReadsLimit, setStudentReadsLimit] = useState(20000);
  const [adminReadsLimit, setAdminReadsLimit] = useState(30000);
  const [studentAccessPaused, setStudentAccessPaused] = useState(false);
  const [studentAccessPauseMessage, setStudentAccessPauseMessage] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [approvalFilter, setApprovalFilter] = useState<'all' | 'pending' | 'approved' | 'blocked'>('all');

  useEffect(() => {
    // 1. Subscribe to basic logs
    const unsubAccess = api.subscribeToAccessLogs((logs) => {
      setAccessLogs(logs);
      setLoading(false);
    });

    const unsubErrors = api.subscribeToLoginErrors((errors) => {
      setLoginErrors(errors);
    });

    // 2. Fetch global settings for student/admin access
    api.getSettings().then((s) => {
      if (s) {
        setStudentReadsLimit(s.studentReadsLimit !== undefined ? s.studentReadsLimit : 20000);
        setAdminReadsLimit((s as any).adminReadsLimit !== undefined ? (s as any).adminReadsLimit : 30000);
        setStudentAccessPaused(!!s.studentAccessPaused);
        setStudentAccessPauseMessage(s.studentAccessPauseMessage || '');
      }
    });

    const today = new Date().toISOString().split('T')[0];

    // 3. Subscribe to student reads today
    const unsubReads = api.subscribeToStudentDailyReads(today, (reads) => {
      const sorted = [...reads].sort((a, b) => (b.reads || 0) - (a.reads || 0));
      setStudentReads(sorted);
    });

    // 3b. Subscribe to admin reads today
    const unsubAdminReads = api.subscribeToAdminDailyReads(today, (reads) => {
      const sorted = [...reads].sort((a, b) => (b.reads || 0) - (a.reads || 0));
      setAdminReads(sorted);
    });

    // 4. Subscribe to athletes for the approval directory
    const unsubAthletes = api.subscribeToAthletes((list) => {
      setAthletes(list);
    });

    return () => {
      unsubAccess();
      unsubErrors();
      unsubReads();
      unsubAdminReads();
      unsubAthletes();
    };
  }, []);

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setSuccessMsg('');
    try {
      await api.saveSettings({
        studentReadsLimit,
        adminReadsLimit,
        studentAccessPaused,
        studentAccessPauseMessage
      });
      setSuccessMsg('Configurações do Portal salvas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleUpdateStudentStatus = async (athleteId: string, currentStatus: any, confirmation: 'Confirmado' | 'Recusado' | 'Pendente') => {
    try {
      await api.updateAthleteStatus(athleteId, currentStatus || 'Ativo', confirmation);
    } catch (err) {
      console.error("Failed to update student portal access", err);
    }
  };

  const filteredAccess = accessLogs.filter(log => 
    log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredErrors = loginErrors.filter(err => 
    err.doc_attempted?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    err.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    err.error_message?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filter athletes directory specifically for the portal manager
  const filteredAthletes = athletes.filter(athlete => {
    // 1. Filter by search term (name, doc)
    const matchesSearch = 
      athlete.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.doc?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    // 2. Filter by confirmation category
    if (approvalFilter === 'pending') return athlete.confirmation === 'Pendente';
    if (approvalFilter === 'approved') return athlete.confirmation === 'Confirmado' || !athlete.confirmation;
    if (approvalFilter === 'blocked') return athlete.confirmation === 'Recusado';
    
    return true;
  });

  const formatDate = (date: any) => {
    if (!date) return 'Data desconhecida';
    const d = date.toDate ? date.toDate() : new Date(date);
    return format(d, "dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
  };

  // Calculate stats
  const totalStudentReadsToday = studentReads.reduce((sum, item) => sum + (item.reads || 0), 0);
  const percentUsed = studentReadsLimit > 0 ? Math.min(100, Math.round((totalStudentReadsToday / studentReadsLimit) * 100)) : 0;
  const totalAdminReadsToday = adminReads.reduce((sum, item) => sum + (item.reads || 0), 0);
  const percentAdminUsed = adminReadsLimit > 0 ? Math.min(100, Math.round((totalAdminReadsToday / adminReadsLimit) * 100)) : 0;
  const pendingCount = athletes.filter(a => a.confirmation === 'Pendente').length;

  const studentAccesses = accessLogs
    .filter(log => log.role === 'student')
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <Shield className="text-theme-primary" />
            AUDITORIA E CONTROLE DO PORTAL
          </h2>
          <p className="text-zinc-400 text-sm">Controle acessos, gerencie quotas de alunos e aprove cadastros no portal.</p>
        </div>

        <div className="flex bg-zinc-800 rounded-xl p-1 overflow-x-auto whitespace-nowrap self-start lg:self-center">
          <button
            onClick={() => { setActiveTab('access'); setSearchTerm(''); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'access' ? "bg-theme-primary text-black" : "text-zinc-400 hover:text-white"
            )}
          >
            <CheckCircle2 size={14} />
            LOGINS ({accessLogs.length})
          </button>
          <button
            onClick={() => { setActiveTab('errors'); setSearchTerm(''); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2",
              activeTab === 'errors' ? "bg-red-500 text-white shadow-lg shadow-red-500/20" : "text-zinc-400 hover:text-white"
            )}
          >
            <ShieldAlert size={14} />
            ERROS ({loginErrors.length})
          </button>
          <button
            onClick={() => { setActiveTab('portal'); setSearchTerm(''); }}
            className={cn(
              "px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 relative",
              activeTab === 'portal' ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" : "text-zinc-400 hover:text-white"
            )}
          >
            <Sliders size={14} />
            QUOTAS E PORTAL DO ALUNO
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input 
          type="text"
          placeholder={
            activeTab === 'access' 
              ? "Buscar log por nome ou ID..." 
              : activeTab === 'errors' 
              ? "Buscar erro por CPF ou mensagem..." 
              : "Buscar aluno por nome ou CPF..."
          }
          className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-12 pr-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all font-medium"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
          {activeTab === 'access' && (
            filteredAccess.length > 0 ? (
              filteredAccess.map((log) => (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-theme-primary/30 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-theme-primary/10 flex items-center justify-center text-theme-primary shrink-0">
                      <User size={24} />
                    </div>
                    <div>
                      <h4 className="text-white font-bold">{log.user_name}</h4>
                      <p className="text-zinc-500 text-xs flex items-center gap-1.5 flex-wrap mt-0.5">
                        <span className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px] uppercase font-black tracking-wider">
                          {log.role}
                        </span>
                        <span>•</span>
                        <span>User ID: {log.user_id}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-zinc-400 text-xs flex items-center sm:justify-end gap-1.5 font-medium">
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
          )}

          {activeTab === 'errors' && (
            filteredErrors.length > 0 ? (
              filteredErrors.map((err) => (
                <motion.div
                  key={err.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-red-500/5 border border-red-500/20 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-red-500/40 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 shrink-0">
                      <XCircle size={24} />
                    </div>
                    <div className="max-w-md">
                      <h4 className="text-white font-bold">
                        Tentativa falha: {err.user_name ? `${err.user_name} (${err.doc_attempted})` : err.doc_attempted}
                      </h4>
                      <p className="text-red-400/80 text-sm font-medium mt-0.5 italic">
                        "{err.error_message}"
                      </p>
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex flex-col sm:items-end gap-2 shrink-0">
                    <div className="text-red-400/60 text-xs flex items-center gap-1.5 font-bold uppercase tracking-wider">
                      <Clock size={12} />
                      {formatDate(err.created_at)}
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-red-500 text-white rounded text-[10px] font-black uppercase shadow-lg shadow-red-500/20 self-start sm:self-auto">
                      <AlertTriangle size={10} />
                      LOGIN NEGADO
                    </div>
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="text-center py-20 bg-zinc-900/30 rounded-3xl border border-dashed border-zinc-800">
                <CheckCircle2 className="mx-auto text-emerald-500/30 mb-4" size={48} />
                <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhum erro de login registrado</p>
              </div>
            )
          )}

          {activeTab === 'portal' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Quota and Pause Dashboard Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                {/* Reads Quota Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Leituras de Alunos Hoje</span>
                      <Database size={18} className="text-emerald-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-white">{totalStudentReadsToday.toLocaleString('pt-BR')}</span>
                      <span className="text-xs text-zinc-500">/ {studentReadsLimit.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          percentUsed > 85 ? "bg-red-500" : percentUsed > 50 ? "bg-amber-500" : "bg-emerald-500"
                        )}
                        style={{ width: `${percentUsed}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium mt-1.5 flex justify-between">
                      <span>{percentUsed}% da quota do aluno consumida</span>
                      <span>Restam {(studentReadsLimit - totalStudentReadsToday).toLocaleString('pt-BR')}</span>
                    </p>
                  </div>
                </div>

                {/* Admin Reads Quota Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Leituras de Admins Hoje</span>
                      <Database size={18} className="text-blue-500" />
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <span className="text-3xl font-black text-white">{totalAdminReadsToday.toLocaleString('pt-BR')}</span>
                      <span className="text-xs text-zinc-500">/ {adminReadsLimit.toLocaleString('pt-BR')}</span>
                    </div>
                  </div>
                  <div className="mt-4">
                    <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                      <div 
                        className={cn(
                          "h-full transition-all duration-500",
                          percentAdminUsed > 85 ? "bg-red-500" : percentAdminUsed > 50 ? "bg-amber-500" : "bg-blue-500"
                        )}
                        style={{ width: `${percentAdminUsed}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-zinc-500 font-medium mt-1.5 flex justify-between">
                      <span>{percentAdminUsed}% da quota admin consumida</span>
                      <span>Restam {(adminReadsLimit - totalAdminReadsToday).toLocaleString('pt-BR')}</span>
                    </p>
                  </div>
                </div>

                {/* Status Switch Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Status Geral do Portal</span>
                      {studentAccessPaused ? (
                        <Lock size={18} className="text-red-500" />
                      ) : (
                        <Unlock size={18} className="text-emerald-500" />
                      )}
                    </div>
                    <div className="mt-1">
                      <span className={cn(
                        "text-xl font-black block",
                        studentAccessPaused ? "text-red-500" : "text-emerald-500"
                      )}>
                        {studentAccessPaused ? "ACESSO SUSPENSO" : "ACESSO ATIVO"}
                      </span>
                      <p className="text-xs text-zinc-500 mt-1">
                        {studentAccessPaused 
                          ? "Nenhum aluno consegue fazer login no portal."
                          : "Alunos aprovados conseguem acessar seus dados normalmente."
                        }
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => setStudentAccessPaused(!studentAccessPaused)}
                      className={cn(
                        "w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all",
                        studentAccessPaused 
                          ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-lg shadow-emerald-500/10" 
                          : "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/10"
                      )}
                    >
                      {studentAccessPaused ? "Ativar Acesso" : "Suspender Acesso de Alunos"}
                    </button>
                  </div>
                </div>

                {/* Quick Stats Card */}
                <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wider text-zinc-400">Cadastros em Análise</span>
                      <Users size={18} className="text-amber-500" />
                    </div>
                    <div className="mt-1">
                      <span className="text-3xl font-black text-white">{pendingCount}</span>
                      <p className="text-xs text-zinc-500 mt-1">
                        Alunos aguardando liberação manual para acessar o portal.
                      </p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <button
                      onClick={() => setApprovalFilter(approvalFilter === 'pending' ? 'all' : 'pending')}
                      className={cn(
                        "w-full py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all border",
                        approvalFilter === 'pending'
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-500"
                          : "bg-zinc-800 border-zinc-700 text-zinc-300 hover:text-white"
                      )}
                    >
                      {approvalFilter === 'pending' ? "Mostrar Todos" : "Ver Apenas Pendentes"}
                    </button>
                  </div>
                </div>

              </div>

              {/* Configurations Form */}
              <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-2xl">
                <h3 className="text-white font-black text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  <Sliders size={16} className="text-theme-primary" />
                  AJUSTAR PARÂMETROS DO PORTAL DO ALUNO
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Limite Diário de Leituras para Alunos</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        min="1000"
                        step="5000"
                        value={studentReadsLimit}
                        onChange={(e) => setStudentReadsLimit(Number(e.target.value))}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white font-bold w-full focus:outline-none focus:ring-1 focus:ring-theme-primary"
                      />
                      <span className="text-xs text-zinc-500 shrink-0">leituras/dia</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Evita que os alunos estourem os limites de leitura do Firebase. Valor sugerido: 20.000.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Limite Diário de Leituras para Admins</label>
                    <div className="flex items-center gap-2">
                      <input 
                        type="number"
                        min="1000"
                        step="5000"
                        value={adminReadsLimit}
                        onChange={(e) => setAdminReadsLimit(Number(e.target.value))}
                        className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white font-bold w-full focus:outline-none focus:ring-1 focus:ring-theme-primary"
                      />
                      <span className="text-xs text-zinc-500 shrink-0">leituras/dia</span>
                    </div>
                    <p className="text-[10px] text-zinc-500">
                      Controle de leituras para administradores e professores. Valor sugerido: 30.000.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-400 block uppercase tracking-wider">Mensagem de Suspensão de Acesso</label>
                    <input 
                      type="text"
                      placeholder="Ex: O portal está em manutenção temporária..."
                      value={studentAccessPauseMessage}
                      onChange={(e) => setStudentAccessPauseMessage(e.target.value)}
                      className="bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 text-white w-full focus:outline-none focus:ring-1 focus:ring-theme-primary text-sm"
                    />
                    <p className="text-[10px] text-zinc-500">
                      Esta mensagem será exibida na tela de login caso o aluno tente entrar com acesso suspenso.
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    {successMsg && (
                      <span className="text-emerald-500 text-xs font-bold flex items-center gap-1">
                        <CheckCircle2 size={14} />
                        {successMsg}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={handleSaveSettings}
                    disabled={savingSettings}
                    className="bg-theme-primary text-black font-black uppercase text-xs tracking-wider px-6 py-2.5 rounded-lg hover:bg-theme-primary/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {savingSettings ? (
                      <RefreshCw size={14} className="animate-spin" />
                    ) : (
                      <Check size={14} />
                    )}
                    Salvar Parâmetros
                  </button>
                </div>
              </div>

              {/* Student Portal approvals and read directory */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="p-6 border-b border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                      <Users size={16} className="text-theme-primary" />
                      GERENCIAMENTO DE ACESSO E LEITURAS DE ALUNOS
                    </h3>
                    <p className="text-zinc-500 text-xs mt-0.5">Autorize ou rejeite o acesso individual dos alunos e acompanhe seu consumo.</p>
                  </div>

                  <div className="flex bg-zinc-950 p-1 rounded-lg border border-zinc-800 shrink-0">
                    {(['all', 'pending', 'approved', 'blocked'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setApprovalFilter(mode)}
                        className={cn(
                          "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all",
                          approvalFilter === mode 
                            ? "bg-zinc-800 text-white" 
                            : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {mode === 'all' && "Todos"}
                        {mode === 'pending' && "Pendentes"}
                        {mode === 'approved' && "Aprovados"}
                        {mode === 'blocked' && "Bloqueados"}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="divide-y divide-zinc-800 max-h-[450px] overflow-y-auto">
                  {filteredAthletes.length > 0 ? (
                    filteredAthletes.map((athlete) => {
                      // Find student's reads today
                      const todayRecord = studentReads.find(r => r.athlete_id === athlete.id);
                      const readsToday = todayRecord ? todayRecord.reads : 0;
                      
                      const isPending = athlete.confirmation === 'Pendente';
                      const isBlocked = athlete.confirmation === 'Recusado';
                      const isApproved = athlete.confirmation === 'Confirmado' || !athlete.confirmation;

                      return (
                        <div key={athlete.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-900/50 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-zinc-800 text-zinc-400 font-bold flex items-center justify-center uppercase border border-zinc-700">
                              {athlete.name?.substring(0, 2) || "AL"}
                            </div>
                            <div>
                              <h4 className="text-white font-bold text-sm">{athlete.name}</h4>
                              <p className="text-zinc-500 text-xs mt-0.5">
                                CPF: {athlete.doc || "Sem CPF"} • {athlete.category || "Geral"}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-6 flex-wrap md:flex-nowrap">
                            {/* Usage indicator */}
                            <div className="text-left md:text-right shrink-0">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Consumo Hoje</span>
                              <span className={cn(
                                "font-mono font-bold text-sm",
                                readsToday > 500 ? "text-amber-500" : readsToday > 0 ? "text-emerald-500" : "text-zinc-500"
                              )}>
                                {readsToday.toLocaleString('pt-BR')} leituras
                              </span>
                            </div>

                            {/* Status badge */}
                            <div className="shrink-0">
                              <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block mb-0.5">Status Portal</span>
                              {isPending && (
                                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded text-[10px] font-black uppercase tracking-wider">
                                  PENDENTE DE LIBERAÇÃO
                                </span>
                              )}
                              {isBlocked && (
                                <span className="px-2 py-0.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-[10px] font-black uppercase tracking-wider">
                                  BLOQUEADO
                                </span>
                              )}
                              {isApproved && (
                                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-[10px] font-black uppercase tracking-wider">
                                  APROVADO / ATIVO
                                </span>
                              )}
                            </div>

                            {/* Quick Action Buttons */}
                            <div className="flex items-center gap-2 self-end md:self-center">
                              {/* Approve Button */}
                              {!isApproved && (
                                <button
                                  onClick={() => handleUpdateStudentStatus(athlete.id, athlete.status, 'Confirmado')}
                                  title="Liberar Acesso"
                                  className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-black border border-emerald-500/20 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5"
                                >
                                  <Check size={14} />
                                  <span>Aceitar</span>
                                </button>
                              )}

                              {/* Reject/Block Button */}
                              {!isBlocked && (
                                <button
                                  onClick={() => handleUpdateStudentStatus(athlete.id, athlete.status, 'Recusado')}
                                  title="Bloquear Acesso"
                                  className="p-1.5 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 rounded-lg transition-all flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-1.5"
                                >
                                  <Ban size={14} />
                                  <span>Bloquear</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12 text-zinc-500">
                      Nenhum aluno encontrado correspondente ao filtro.
                    </div>
                  )}
                </div>
              </div>

              {/* Admin Daily Reads Directory */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-6">
                <div className="p-6 border-b border-zinc-800">
                  <h3 className="text-white font-black text-sm uppercase tracking-wider flex items-center gap-2">
                    <Database size={16} className="text-blue-500" />
                    CONSUMO E LEITURAS DE ADMINISTRADORES E PROFESSORES
                  </h3>
                  <p className="text-zinc-500 text-xs mt-0.5">Acompanhe em tempo real as leituras consumidas por administradores, professores e coordenadores hoje.</p>
                </div>

                <div className="divide-y divide-zinc-800 max-h-[300px] overflow-y-auto">
                  {adminReads.length > 0 ? (
                    adminReads.map((admin) => (
                      <div key={admin.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-zinc-900/50 transition-all">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 font-bold flex items-center justify-center uppercase border border-blue-500/20">
                            {admin.user_name?.substring(0, 2) || "AD"}
                          </div>
                          <div>
                            <h4 className="text-white font-bold text-sm">{admin.user_name || "Administrador / Professor"}</h4>
                            <p className="text-zinc-500 text-xs mt-0.5">
                              ID do Usuário: {admin.user_id}
                            </p>
                          </div>
                        </div>

                        <div className="text-left md:text-right shrink-0">
                          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500 block">Consumo Hoje</span>
                          <span className={cn(
                            "font-mono font-bold text-sm",
                            admin.reads > 1000 ? "text-amber-500" : "text-blue-400"
                          )}>
                            {(admin.reads || 0).toLocaleString('pt-BR')} leituras
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-8 text-zinc-500 text-sm">
                      Nenhum administrador ou professor consumiu leituras hoje.
                    </div>
                  )}
                </div>
              </div>

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>

    {/* Sidebar: Últimos 10 Acessos de Alunos */}
    <div className="space-y-6 lg:col-span-1">
      <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-2xl shadow-xl h-fit">
        <div className="flex items-center gap-2.5 mb-4 border-b border-zinc-800 pb-3">
          <Users size={18} className="text-emerald-400" />
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-white">
              Últimos 10 Acessos
            </h3>
            <p className="text-[10px] text-zinc-500 font-medium">Acessos mais recentes de alunos</p>
          </div>
        </div>

        {studentAccesses.length > 0 ? (
          <div className="space-y-2.5">
            {studentAccesses.map((log) => (
              <div 
                key={log.id} 
                className="p-3 bg-zinc-950/40 border border-zinc-850 rounded-xl hover:border-emerald-500/20 transition-all flex flex-col gap-1"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 text-[10px] font-black shrink-0">
                    {log.user_name?.substring(0, 2).toUpperCase() || "AL"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-zinc-200 font-bold text-xs truncate" title={log.user_name}>
                      {log.user_name}
                    </h4>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 text-[10px] text-zinc-500 font-medium">
                  <span className="truncate max-w-[120px]">
                    {log.doc ? `CPF: ${log.doc}` : `ID: ${log.user_id?.substring(0, 8)}...`}
                  </span>
                  <span className="shrink-0 flex items-center gap-1 font-mono text-[9px] text-zinc-400">
                    <Clock size={10} className="text-emerald-500/50" />
                    {formatDate(log.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-zinc-500 text-xs">
            Nenhum acesso de aluno registrado recentemente.
          </div>
        )}
      </div>
    </div>
  </div>
</div>
  );
};
