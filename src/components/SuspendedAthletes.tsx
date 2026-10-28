import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, getSubCategory } from '../types';
import { 
  Search, UserMinus, AlertCircle, MessageCircle, Plus, X, Save, 
  ShieldAlert, ShieldCheck, Lock, Unlock, Pause, Play, CheckCircle2, 
  XCircle, Filter, RefreshCw, AlertTriangle
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';
import AthleteSearchSelect from './AthleteSearchSelect';
import { toast } from 'sonner';

interface SuspendedAthletesProps {
  athletes?: Athlete[];
}

export default function SuspendedAthletes({ athletes: athletesProp }: SuspendedAthletesProps) {
  const [allAthletes, setAllAthletes] = useState<Athlete[]>(athletesProp || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'suspended' | 'active' | 'inactive'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [savingGlobal, setSavingGlobal] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [globalMessage, setGlobalMessage] = useState('');
  
  const { settings, updateSettings } = useTheme();

  useEffect(() => {
    if (athletesProp && athletesProp.length > 0) {
      setAllAthletes(athletesProp);
    } else {
      loadData();
    }
  }, [athletesProp]);

  useEffect(() => {
    if (settings?.studentAccessPauseMessage) {
      setGlobalMessage(settings.studentAccessPauseMessage);
    }
  }, [settings?.studentAccessPauseMessage]);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getAthletes();
      setAllAthletes(data);
    } catch (error) {
      console.error("Erro ao carregar atletas:", error);
      toast.error("Erro ao carregar lista de atletas.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleGlobalAccess = async () => {
    const newPaused = !settings?.studentAccessPaused;
    setSavingGlobal(true);
    try {
      const updated = {
        ...settings,
        studentAccessPaused: newPaused,
        studentAccessPauseMessage: globalMessage.trim() || settings?.studentAccessPauseMessage || ''
      };
      await api.saveSettings(updated);
      await updateSettings(updated);
      
      if (newPaused) {
        toast.error("Portal dos alunos pausado!", {
          description: "O acesso de todos os alunos ao portal foi bloqueado temporariamente."
        });
      } else {
        toast.success("Portal dos alunos liberado!", {
          description: "O acesso ao portal foi reativado para todos os alunos ativos."
        });
      }
    } catch (error) {
      console.error("Erro ao atualizar acesso geral:", error);
      toast.error("Erro ao salvar configuração do portal.");
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleSaveGlobalMessage = async () => {
    setSavingGlobal(true);
    try {
      const updated = {
        ...settings,
        studentAccessPauseMessage: globalMessage.trim()
      };
      await api.saveSettings(updated);
      await updateSettings(updated);
      toast.success("Mensagem do portal atualizada!");
      setShowGlobalSettings(false);
    } catch (error) {
      toast.error("Erro ao salvar mensagem.");
    } finally {
      setSavingGlobal(false);
    }
  };

  const handleOpenSuspendModal = (athlete?: Athlete) => {
    if (athlete) {
      setSelectedAthlete(athlete);
    } else {
      setSelectedAthlete(null);
    }
    setSuspensionReason(athlete?.suspension_reason || '');
    setIsModalOpen(true);
  };

  const handleSuspend = async () => {
    if (!selectedAthlete) {
      toast.error("Por favor, selecione um atleta.");
      return;
    }
    if (!suspensionReason.trim()) {
      toast.error("Por favor, informe o motivo do bloqueio / suspensão.");
      return;
    }

    setLoading(true);
    try {
      const updatedAthlete: Athlete = {
        ...selectedAthlete,
        status: 'Suspenso',
        suspension_reason: suspensionReason.toUpperCase()
      };
      await api.saveAthlete(updatedAthlete);
      toast.success(`Acesso de ${selectedAthlete.name} foi bloqueado com sucesso.`);
      
      // Update local state
      setAllAthletes(prev => prev.map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
      
      setIsModalOpen(false);
      setSelectedAthlete(null);
      setSuspensionReason('');
    } catch (error) {
      toast.error("Erro ao bloquear atleta.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleReactivate = async (athlete: Athlete) => {
    setLoading(true);
    try {
      const updatedAthlete: Athlete = {
        ...athlete,
        status: 'Ativo',
        suspension_reason: ''
      };
      await api.saveAthlete(updatedAthlete);
      toast.success(`Acesso de ${athlete.name} foi LIBERADO com sucesso!`);
      
      // Update local state
      setAllAthletes(prev => prev.map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
    } catch (error) {
      toast.error("Erro ao liberar atleta.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleInactivate = async (athlete: Athlete) => {
    setLoading(true);
    try {
      const updatedAthlete: Athlete = {
        ...athlete,
        status: 'Inativo'
      };
      await api.saveAthlete(updatedAthlete);
      toast.success(`Status de ${athlete.name} alterado para Inativo.`);
      
      setAllAthletes(prev => prev.map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
    } catch (error) {
      toast.error("Erro ao inativar atleta.");
    } finally {
      setLoading(false);
    }
  };

  // Counts
  const totalCount = allAthletes.length;
  const suspendedCount = allAthletes.filter(a => a.status === 'Suspenso').length;
  const activeCount = allAthletes.filter(a => a.status === 'Ativo' || !a.status).length;
  const inactiveCount = allAthletes.filter(a => a.status === 'Inativo').length;

  // Filtered list
  const filtered = allAthletes.filter(athlete => {
    const matchesSearch = 
      athlete.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.doc?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      athlete.jersey_number?.toLowerCase().includes(searchTerm.toLowerCase());

    const athleteStatus = athlete.status || 'Ativo';
    const matchesStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'suspended' ? athleteStatus === 'Suspenso' :
      statusFilter === 'active' ? athleteStatus === 'Ativo' :
      statusFilter === 'inactive' ? athleteStatus === 'Inativo' : true;

    const sub = getSubCategory(athlete.birth_date);
    const matchesCategory = categoryFilter === 'all' ? true : sub === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const uniqueSubs = Array.from(
    new Set(allAthletes.map(a => getSubCategory(a.birth_date)).filter(Boolean))
  ).sort();

  const isGlobalPaused = !!settings?.studentAccessPaused;

  const quickReasons = [
    "INDISCIPLINA EM TREINO OU JOGO",
    "PENDÊNCIA DE DOCUMENTAÇÃO / MATRÍCULA",
    "SOLICITAÇÃO DOS PAIS / RESPONSÁVEIS",
    "ATRASO DE MENSALIDADE OU TAXA",
    "REAVALIAÇÃO TÉCNICA E CONDUTA",
    "FALTAS REITERADAS SEM JUSTIFICATIVA"
  ];

  return (
    <div className="space-y-6">
      {/* Header Principal */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950/80 p-6 rounded-3xl border border-zinc-800 shadow-xl backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-red-500/10 text-red-400 rounded-2xl border border-red-500/20">
              <ShieldAlert size={26} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase">
                Bloquear e Desbloquear Acesso dos Alunos
              </h2>
              <p className="text-zinc-400 text-xs font-bold uppercase tracking-wider">
                Gestão central de permissões: bloqueie ou desbloqueie o acesso dos atletas ao portal e treinos
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all hover:bg-zinc-800 disabled:opacity-50"
            title="Recarregar lista"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>

          <button 
            onClick={() => handleOpenSuspendModal()}
            className="flex items-center gap-2 px-5 py-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/20 active:scale-95"
          >
            <Lock size={16} />
            <span>Bloquear Aluno</span>
          </button>
        </div>
      </div>

      {/* Card 1: Controle Geral do Portal do Aluno (Global Pause Switch) */}
      <div className={cn(
        "p-6 rounded-3xl border transition-all duration-300 shadow-xl relative overflow-hidden",
        isGlobalPaused 
          ? "bg-gradient-to-br from-red-950/40 via-zinc-950 to-zinc-950 border-red-500/40" 
          : "bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-zinc-950 border-emerald-500/30"
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className={cn(
              "p-3.5 rounded-2xl shrink-0 border",
              isGlobalPaused 
                ? "bg-red-500/10 text-red-400 border-red-500/30" 
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
            )}>
              {isGlobalPaused ? <Pause size={24} /> : <Play size={24} />}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                  Status Geral do Portal
                </span>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border shadow-sm",
                  isGlobalPaused
                    ? "bg-red-500 text-white border-red-400 shadow-red-500/30"
                    : "bg-emerald-500 text-black border-emerald-400 shadow-emerald-500/30"
                )}>
                  {isGlobalPaused ? "PORTAL BLOQUEADO (TODOS OS ALUNOS)" : "PORTAL LIBERADO (ACESSO NORMAL)"}
                </span>
              </div>

              <p className="text-sm text-zinc-300 font-medium">
                {isGlobalPaused ? (
                  <>
                    O portal está <strong className="text-red-400">bloqueado para todos os alunos</strong>. Nenhum aluno conseguirá fazer login ou acessar carteirinhas enquanto o bloqueio global estiver ativado.
                  </>
                ) : (
                  <>
                    O portal está <strong className="text-emerald-400">liberado para acesso</strong>. Todos os alunos com status ativo conseguem entrar pelo CPF normalmente.
                  </>
                )}
              </p>

              {isGlobalPaused && (
                <div className="pt-2">
                  <p className="text-xs text-red-300/90 font-medium italic">
                    Mensagem exibida aos alunos: "{settings?.studentAccessPauseMessage || 'O acesso ao portal está suspenso temporariamente pela administração do clube.'}"
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => setShowGlobalSettings(!showGlobalSettings)}
              className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-bold uppercase rounded-xl transition-all"
            >
              {showGlobalSettings ? "Ocultar Mensagem" : "Personalizar Mensagem"}
            </button>

            <button
              onClick={handleToggleGlobalAccess}
              disabled={savingGlobal}
              className={cn(
                "flex items-center gap-2 px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-lg active:scale-95 disabled:opacity-50",
                isGlobalPaused
                  ? "bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/25"
                  : "bg-red-600 hover:bg-red-700 text-white shadow-red-600/25"
              )}
            >
              {isGlobalPaused ? (
                <>
                  <Unlock size={16} />
                  <span>Liberar Portal para Todos</span>
                </>
              ) : (
                <>
                  <Lock size={16} />
                  <span>Bloquear Portal de Todos</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Global message editor dropdown */}
        {showGlobalSettings && (
          <div className="mt-5 pt-5 border-t border-zinc-800/80 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest">
              Mensagem exibida aos alunos ao tentarem fazer login:
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={globalMessage}
                onChange={e => setGlobalMessage(e.target.value)}
                placeholder="Ex: O acesso ao portal está suspenso temporariamente para manutenção. Voltaremos em breve!"
                className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-xs font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50"
              />
              <button
                onClick={handleSaveGlobalMessage}
                disabled={savingGlobal}
                className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all"
              >
                Salvar Mensagem
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card 2: Filtros de Busca e Status Individual */}
      <div className="bg-zinc-950/80 p-6 rounded-3xl border border-zinc-800 space-y-4 shadow-xl">
        {/* Status Tab Badges */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border",
              statusFilter === 'all'
                ? "bg-theme-primary text-black border-theme-primary shadow-lg shadow-theme-primary/20"
                : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
            )}
          >
            <span>Todos os Alunos</span>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-black",
              statusFilter === 'all' ? "bg-black text-white" : "bg-zinc-800 text-zinc-300"
            )}>
              {totalCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('active')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border",
              statusFilter === 'active'
                ? "bg-emerald-500 text-black border-emerald-500 shadow-lg shadow-emerald-500/20"
                : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
            )}
          >
            <ShieldCheck size={14} className={statusFilter === 'active' ? "text-black" : "text-emerald-400"} />
            <span>Acesso Liberado (Ativos)</span>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-black",
              statusFilter === 'active' ? "bg-black text-white" : "bg-emerald-500/20 text-emerald-300"
            )}>
              {activeCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('suspended')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border",
              statusFilter === 'suspended'
                ? "bg-red-600 text-white border-red-500 shadow-lg shadow-red-600/20"
                : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
            )}
          >
            <Lock size={14} className={statusFilter === 'suspended' ? "text-white" : "text-red-400"} />
            <span>Bloqueados / Suspensos</span>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-black",
              statusFilter === 'suspended' ? "bg-black text-white" : "bg-red-500/20 text-red-300"
            )}>
              {suspendedCount}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter('inactive')}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider transition-all border",
              statusFilter === 'inactive'
                ? "bg-zinc-700 text-white border-zinc-600 shadow-lg"
                : "bg-zinc-900/90 text-zinc-400 border-zinc-800 hover:text-white hover:border-zinc-700"
            )}
          >
            <span>Inativos</span>
            <span className={cn(
              "px-2 py-0.5 rounded-md text-[10px] font-black",
              statusFilter === 'inactive' ? "bg-black text-white" : "bg-zinc-800 text-zinc-300"
            )}>
              {inactiveCount}
            </span>
          </button>
        </div>

        {/* Search Bar & Category Filter */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
            <input
              type="text"
              placeholder="PESQUISAR POR NOME, APELIDO OU CPF..."
              className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all font-bold text-xs uppercase tracking-wider placeholder:text-zinc-600"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {uniqueSubs.length > 0 && (
            <div className="w-full sm:w-48">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white font-bold text-xs uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-theme-primary/50 cursor-pointer"
              >
                <option value="all">TODAS CATEGORIAS</option>
                {uniqueSubs.map(sub => (
                  <option key={sub} value={sub}>{sub}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Grid de Alunos */}
      {filtered.length === 0 ? (
        <div className="bg-zinc-900/40 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-16 h-16 bg-zinc-800/60 rounded-2xl flex items-center justify-center mx-auto text-zinc-600">
            <ShieldAlert size={32} />
          </div>
          <h3 className="text-white font-black uppercase text-base">Nenhum aluno encontrado</h3>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest max-w-md mx-auto">
            {statusFilter === 'suspended' 
              ? "Não há nenhum atleta com o acesso bloqueado ou suspenso no momento."
              : "Nenhum aluno corresponde aos critérios de pesquisa ou filtros selecionados."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((athlete) => {
            const isSuspended = athlete.status === 'Suspenso';
            const isActive = athlete.status === 'Ativo' || !athlete.status;
            const isInactive = athlete.status === 'Inativo';
            const sub = getSubCategory(athlete.birth_date);

            return (
              <div 
                key={athlete.id}
                className={cn(
                  "bg-black border rounded-3xl overflow-hidden transition-all group flex flex-col justify-between shadow-xl",
                  isSuspended 
                    ? "border-red-500/40 hover:border-red-500 shadow-red-500/5" 
                    : isInactive 
                    ? "border-zinc-800 hover:border-zinc-700" 
                    : "border-zinc-800 hover:border-emerald-500/40"
                )}
              >
                <div className="p-5 flex items-start gap-4">
                  {/* Photo with Badge */}
                  <div className="relative shrink-0">
                    <img 
                      src={athlete.photo} 
                      alt={athlete.name}
                      className={cn(
                        "w-20 h-24 object-cover rounded-2xl border transition-all",
                        isSuspended 
                          ? "grayscale border-red-500/40" 
                          : isInactive 
                          ? "grayscale opacity-75 border-zinc-800" 
                          : "border-zinc-800 group-hover:scale-105"
                      )}
                      referrerPolicy="no-referrer"
                    />
                    <div className={cn(
                      "absolute -top-2 -right-2 w-7 h-7 rounded-lg flex items-center justify-center shadow-lg",
                      isSuspended ? "bg-red-500 text-white" : isInactive ? "bg-zinc-700 text-zinc-300" : "bg-emerald-500 text-black font-black"
                    )}>
                      {isSuspended ? <Lock size={14} /> : isInactive ? <XCircle size={14} /> : <Unlock size={14} />}
                    </div>
                  </div>
                  
                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className={cn(
                        "text-[9px] font-black uppercase px-2 py-0.5 rounded-md border",
                        isSuspended 
                          ? "bg-red-500/20 text-red-300 border-red-500/30" 
                          : isInactive 
                          ? "bg-zinc-800 text-zinc-400 border-zinc-700" 
                          : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                      )}>
                        {isSuspended ? "ACESSO BLOQUEADO" : isInactive ? "INATIVO" : "ACESSO LIBERADO"}
                      </span>

                      {sub && (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md">
                          {sub}
                        </span>
                      )}
                    </div>

                    <h3 className="text-white font-black text-sm uppercase truncate leading-tight pt-0.5">
                      {athlete.name}
                    </h3>
                    
                    <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-wider">
                      {athlete.nickname && (
                        <span className="text-theme-primary">"{athlete.nickname}"</span>
                      )}
                      {athlete.jersey_number && (
                        <span className="text-zinc-500">Camisa #{athlete.jersey_number}</span>
                      )}
                    </div>

                    {athlete.doc && (
                      <p className="text-[10px] text-zinc-500 font-mono">
                        CPF/Doc: {athlete.doc}
                      </p>
                    )}

                    {/* Suspension reason banner */}
                    {isSuspended && (
                      <div className="mt-2.5 p-2.5 bg-red-500/10 border border-red-500/25 rounded-xl">
                        <p className="text-[9px] font-black text-red-400 uppercase tracking-widest flex items-center gap-1 mb-0.5">
                          <AlertCircle size={11} /> Motivo do Bloqueio:
                        </p>
                        <p className="text-white text-xs font-bold leading-tight">
                          {athlete.suspension_reason || 'NÃO ESPECIFICADO'}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Action Bar */}
                <div className="p-3.5 bg-zinc-950 border-t border-zinc-900 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isSuspended ? (
                      <button 
                        onClick={() => handleReactivate(athlete)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl transition-all font-black text-[10px] uppercase tracking-wider shadow-md shadow-emerald-500/20 active:scale-95"
                        title="Liberar acesso do aluno"
                      >
                        <Unlock size={13} />
                        <span>Liberar Acesso</span>
                      </button>
                    ) : (
                      <button 
                        onClick={() => handleOpenSuspendModal(athlete)}
                        disabled={loading}
                        className="flex items-center gap-1.5 px-4 py-2 bg-red-600/90 hover:bg-red-600 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-wider shadow-md shadow-red-600/20 active:scale-95"
                        title="Bloquear ou suspender acesso do aluno"
                      >
                        <Lock size={13} />
                        <span>Bloquear</span>
                      </button>
                    )}

                    {isInactive ? (
                      <button 
                        onClick={() => handleReactivate(athlete)}
                        disabled={loading}
                        className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider"
                      >
                        Ativar
                      </button>
                    ) : (
                      !isSuspended && (
                        <button 
                          onClick={() => handleInactivate(athlete)}
                          disabled={loading}
                          className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 rounded-xl transition-all font-bold text-[10px] uppercase tracking-wider"
                          title="Tornar Inativo"
                        >
                          Inativar
                        </button>
                      )
                    )}
                  </div>
                  
                  {athlete.guardian_phone && (
                    <a 
                      href={`https://wa.me/55${athlete.guardian_phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Olá, responsável por ${athlete.name}. Mensagem do Piruá E.C. sobre o acesso do atleta.`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black rounded-xl transition-all font-black text-[10px] uppercase tracking-wider"
                      title="Falar no WhatsApp do Responsável"
                    >
                      <MessageCircle size={14} />
                      <span className="hidden sm:inline">Zap</span>
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Bloquear / Suspender Aluno */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="bg-zinc-950 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-500/10 text-red-500 rounded-xl">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="text-white font-black uppercase tracking-wider text-base">
                    Bloquear Acesso de Aluno
                  </h3>
                  <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">
                    Suspender participação e login no portal
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-zinc-900 text-zinc-400 hover:text-white rounded-xl transition-colors"
                disabled={loading}
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Seleção do Atleta */}
              <div>
                <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest mb-2">
                  Aluno a ser bloqueado
                </label>
                {selectedAthlete ? (
                  <div className="flex items-center justify-between p-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <img 
                        src={selectedAthlete.photo} 
                        alt={selectedAthlete.name} 
                        className="w-12 h-14 object-cover rounded-xl border border-zinc-800"
                        referrerPolicy="no-referrer"
                      />
                      <div>
                        <p className="text-white font-black text-sm uppercase">{selectedAthlete.name}</p>
                        <p className="text-zinc-500 text-[10px] uppercase font-bold">{selectedAthlete.doc || 'Sem CPF cadastrado'}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedAthlete(null)}
                      className="text-xs text-theme-primary font-bold uppercase hover:underline"
                    >
                      Trocar
                    </button>
                  </div>
                ) : (
                  <AthleteSearchSelect 
                    onSelect={(a) => setSelectedAthlete(a)}
                    selectedAthleteId={selectedAthlete?.id}
                    athletes={allAthletes.filter(a => a.status !== 'Suspenso')}
                    className="!bg-zinc-900"
                  />
                )}
              </div>

              {/* Motivo do Bloqueio */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-black text-zinc-400 uppercase tracking-widest">
                    Motivo do Bloqueio / Suspensão
                  </label>
                  <span className="text-[10px] text-red-400 font-bold uppercase">Obrigatório</span>
                </div>
                
                <textarea 
                  className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[100px] font-bold text-xs uppercase tracking-wider placeholder:text-zinc-600"
                  placeholder="EX: INDISCIPLINA NO TREINO, PENDÊNCIA DE DOCUMENTO, ETC..."
                  value={suspensionReason}
                  onChange={(e) => setSuspensionReason(e.target.value)}
                />

                {/* Motivos rápidos */}
                <div className="mt-3 space-y-1.5">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">
                    Sugestões Rápidas de Motivo:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {quickReasons.map((reason, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSuspensionReason(reason)}
                        className="text-[9px] font-bold uppercase px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg transition-all"
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-zinc-900/60 border-t border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all"
                disabled={loading}
              >
                Cancelar
              </button>

              <button 
                onClick={handleSuspend}
                disabled={loading || !selectedAthlete || !suspensionReason.trim()}
                className="flex items-center gap-2 px-7 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-600/30 active:scale-95"
              >
                {loading ? 'Salvando...' : (
                  <>
                    <Lock size={16} />
                    <span>Confirmar Bloqueio</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
