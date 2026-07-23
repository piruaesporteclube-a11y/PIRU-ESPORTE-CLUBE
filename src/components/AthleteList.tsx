import React, { useState, useEffect } from 'react';
import { api, isQuotaExceeded } from '../api';
import { Athlete, getSubCategory, categories } from '../types';
import { Search, Filter, Plus, Trash2, Edit2, FileDown, Printer, UserCircle, Link as LinkIcon, MessageCircle, RefreshCw, Check, XCircle, Clock, AlertTriangle, LayoutGrid, List, Maximize2, Camera } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

interface AthleteListProps {
  athletes: Athlete[];
  onEdit: (athlete: Athlete) => void;
  onAdd: () => void;
  onRefresh?: () => void;
}

// Helper functions for robust date parsing and formatting
const getTimestamp = (created_at: any): number => {
  if (!created_at) return 0;
  if (typeof created_at.toDate === 'function') {
    try {
      return created_at.toDate().getTime();
    } catch (_) {}
  }
  if (typeof created_at.seconds === 'number') {
    return created_at.seconds * 1000;
  }
  if (typeof created_at._seconds === 'number') {
    return created_at._seconds * 1000;
  }
  const parsed = new Date(created_at);
  const time = parsed.getTime();
  return isNaN(time) ? 0 : time;
};

const formatCreatedAt = (created_at: any): string => {
  if (!created_at) return '--';
  const timestamp = getTimestamp(created_at);
  if (timestamp === 0) return '--';
  try {
    return format(new Date(timestamp), 'dd/MM/yyyy HH:mm');
  } catch (e) {
    return '--';
  }
};

const getBirthYear = (birthDate?: string): string => {
  if (!birthDate) return '';
  const trimmed = birthDate.trim();
  if (trimmed.includes('-')) {
    const year = trimmed.split('-')[0];
    if (year.length === 4 && !isNaN(Number(year))) {
      return year;
    }
  }
  if (trimmed.includes('/')) {
    const parts = trimmed.split('/');
    const lastPart = parts[parts.length - 1];
    if (lastPart.length === 4 && !isNaN(Number(lastPart))) {
      return lastPart;
    }
    const firstPart = parts[0];
    if (firstPart.length === 4 && !isNaN(Number(firstPart))) {
      return firstPart;
    }
  }
  try {
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
      return d.getFullYear().toString();
    }
  } catch (_) {}
  return '';
};

export default function AthleteList({ athletes, onEdit, onAdd, onRefresh }: AthleteListProps) {
  const { settings } = useTheme();
  const [search, setSearch] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'active' | 'pending' | 'recent'>('active');
  const [displayMode, setDisplayMode] = useState<'cards' | 'table'>(() => {
    const saved = localStorage.getItem('athlete_display_mode');
    return (saved === 'table' || saved === 'cards') ? saved : 'cards';
  });
  const [previewAthletePhoto, setPreviewAthletePhoto] = useState<Athlete | null>(null);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
      toast.success("Lista atualizada!");
    } catch (err) {
      // Error handled by api.ts
    } finally {
      setIsRefreshing(false);
    }
  };
  const [filterSub, setFilterSub] = useState('Todos');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [filterModality, setFilterModality] = useState('Todos');
  const [filterGender, setFilterGender] = useState('Todos');
  const [filterBirthYear, setFilterBirthYear] = useState('Todos');
  const [sortBy, setSortBy] = useState<'name_asc' | 'name_desc' | 'created_new' | 'created_old'>('name_asc');

  const uniqueModalities = Array.from(
    new Set(
      athletes
        .map(a => a.modality)
        .filter(Boolean)
        .flatMap(m => m!.split(',').map(s => s.trim()))
    )
  ).sort();

  const uniqueBirthYears = Array.from(
    new Set(
      athletes
        .map(a => getBirthYear(a.birth_date))
        .filter(Boolean)
    )
  ).sort((a, b) => b.localeCompare(a));

  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [athleteToDelete, setAthleteToDelete] = useState<string | null>(null);

  const handleDelete = (id: string) => {
    setAthleteToDelete(id);
    setIsDeleteConfirmOpen(true);
  };

  const handleApprove = async (id: string) => {
    const toastId = toast.loading("Aprovando atleta...");
    try {
      await api.approveAthlete(id);
      toast.success("Atleta aprovado com sucesso!", { id: toastId });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      toast.error(`Erro ao aprovar: ${err.message}`, { id: toastId });
    }
  };

  const handleReject = async (id: string) => {
    const toastId = toast.loading("Recusando solicitação...");
    try {
      await api.rejectAthlete(id);
      toast.success("Solicitação recusada.", { id: toastId });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      toast.error(`Erro ao recusar: ${err.message}`, { id: toastId });
    }
  };

  const handleStatusToggle = async (athlete: Athlete) => {
    const newStatus = athlete.status === 'Ativo' ? 'Inativo' : 'Ativo';
    const toastId = toast.loading(`${newStatus === 'Ativo' ? 'Ativando' : 'Desativando'} atleta...`);
    try {
      // If we are activating a pending or rejected athlete, update confirmation to 'Confirmado'
      const newConfirmation = (newStatus === 'Ativo' && (athlete.confirmation === 'Recusado' || athlete.confirmation === 'Pendente')) ? 'Confirmado' : undefined;
      await api.updateAthleteStatus(athlete.id, newStatus, newConfirmation);
      toast.success(`Atleta ${newStatus === 'Ativo' ? 'ativado' : 'desativado'} com sucesso!`, { id: toastId });
      if (onRefresh) await onRefresh();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`, { id: toastId });
    }
  };

  const confirmDelete = async () => {
    if (!athleteToDelete) return;
    try {
      await api.deleteAthlete(athleteToDelete);
      toast.success("Atleta excluído com sucesso!");
      setIsDeleteConfirmOpen(false);
      setAthleteToDelete(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast.error(`Erro ao excluir atleta: ${err.message}`);
    }
  };

  const pendingAthletes = athletes.filter(a => a.confirmation === 'Pendente');
  const activeAthletes = athletes.filter(a => a.confirmation !== 'Pendente');

  const recentAthletes = [...athletes]
    .sort((a, b) => getTimestamp(b.created_at) - getTimestamp(a.created_at))
    .slice(0, 5);

  const currentAthletes = viewMode === 'active' ? activeAthletes : (viewMode === 'recent' ? recentAthletes : pendingAthletes);

  const filteredAthletes = currentAthletes
    .filter(a => {
      const isSearching = search.trim().length > 0;
      const normalizedSearch = search.replace(/\D/g, "");
      const normalizedDoc = a.doc.replace(/\D/g, "");
      
      const matchesSearch = 
        a.name.toLowerCase().includes(search.toLowerCase()) || 
        (normalizedSearch.length > 0 && normalizedDoc.includes(normalizedSearch)) ||
        a.doc.includes(search) ||
        (a.nickname && a.nickname.toLowerCase().includes(search.toLowerCase()));
        
      const matchesSub = filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub;
      const matchesStatus = filterStatus === 'Todos' || a.status === filterStatus;
      const matchesModality = filterModality === 'Todos' || (a.modality && a.modality.split(',').map(s => s.trim().toLowerCase()).includes(filterModality.toLowerCase()));
      const matchesGender = filterGender === 'Todos' || a.gender === filterGender;
      const matchesBirthYear = filterBirthYear === 'Todos' || getBirthYear(a.birth_date) === filterBirthYear;
      return matchesSearch && matchesSub && matchesStatus && matchesModality && matchesGender && matchesBirthYear;
    })
    .sort((a, b) => {
      // Sorting Logic - For "recent" viewMode, if the sort is default 'name_asc', default to 'created_new' (newest first)
      const activeSortBy = viewMode === 'recent' && sortBy === 'name_asc' ? 'created_new' : sortBy;
      if (activeSortBy === 'name_asc') {
        return a.name.localeCompare(b.name);
      } else if (activeSortBy === 'name_desc') {
        return b.name.localeCompare(a.name);
      } else if (activeSortBy === 'created_new' || activeSortBy === 'created_old') {
        const dateA = getTimestamp(a.created_at);
        const dateB = getTimestamp(b.created_at);
        return activeSortBy === 'created_new' ? dateB - dateA : dateA - dateB;
      }
      return 0;
    });

  // Force alphabetical sort logic override if viewMode is 'recent'
  // Actually, 'recent' viewMode usually wants its own fixed sort, 
  // but we can let the user decide if they change the sortBy dropdown.

  const handlePrint = () => {
    window.print();
  };

  const exportToCSV = () => {
    const headers = ['Nome', 'Sexo', 'Categoria', 'Modalidade', 'Status', 'Documento', 'Uniforme'];
    const rows = filteredAthletes.map(a => [
      a.name,
      a.gender || '',
      getSubCategory(a.birth_date),
      a.modality || '',
      a.status,
      a.doc,
      a.jersey_number || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `atletas-pirua-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Lista exportada com sucesso!");
  };

  return (
    <div className="space-y-6">
      {/* Print Header */}
      <div className="hidden print-only mb-8 border-b-2 border-black pb-4">
        <div className="flex items-center gap-4">
          {settings?.schoolCrest && (
            <img src={settings.schoolCrest} alt="Crest" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-2xl font-black uppercase">Piruá Esporte Clube</h1>
            <p className="text-sm font-bold text-zinc-600">Lista Geral de Alunos</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Alunos</h2>
          <p className="text-zinc-400 text-sm">Gerencie todos os atletas da escolinha</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* View Mode Toggler (Ativos, Últimos 5, Pendentes) */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => setViewMode('active')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all",
                viewMode === 'active' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
              )}
            >
              Ativos ({activeAthletes.length})
            </button>
            <button
              onClick={() => setViewMode('recent')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5",
                viewMode === 'recent' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
              )}
            >
              <Clock size={12} />
              Últimos 5
            </button>
            <button
              onClick={() => setViewMode('pending')}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5",
                viewMode === 'pending' ? "bg-amber-500 text-black border-amber-500" : "text-zinc-500 hover:text-white"
              )}
            >
              Pendentes
              {pendingAthletes.length > 0 && (
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  viewMode === 'pending' ? "bg-black text-amber-500" : "bg-amber-500 text-black"
                )}>
                  {pendingAthletes.length}
                </span>
              )}
            </button>
          </div>

          {/* Display Mode Toggler (Galeria de Fotos vs Tabela) */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setDisplayMode('cards');
                localStorage.setItem('athlete_display_mode', 'cards');
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5",
                displayMode === 'cards' ? "bg-theme-primary text-black shadow-md" : "text-zinc-500 hover:text-white"
              )}
              title="Modo Galeria com Fotos em Destaque"
            >
              <LayoutGrid size={14} />
              <span className="hidden sm:inline">Galeria</span>
            </button>
            <button
              onClick={() => {
                setDisplayMode('table');
                localStorage.setItem('athlete_display_mode', 'table');
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-1.5",
                displayMode === 'table' ? "bg-theme-primary text-black shadow-md" : "text-zinc-500 hover:text-white"
              )}
              title="Modo Tabela de Lista"
            >
              <List size={14} />
              <span className="hidden sm:inline">Tabela</span>
            </button>
          </div>
          <button 
            onClick={() => {
              const link = `${window.location.origin}/?register=true`;
              navigator.clipboard.writeText(link);
              toast.success('Link de matrícula copiado para a área de transferência!');
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-theme-primary rounded-xl transition-all border border-zinc-700 hover:border-theme-primary/50"
            title="Copiar link para enviar aos alunos"
          >
            <LinkIcon size={18} />
            <span className="hidden sm:inline">Link de Matrícula</span>
          </button>
          <button 
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
            title="Exportar para Excel/CSV"
          >
            <FileDown size={18} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
          >
            <Printer size={18} />
            Imprimir
          </button>
          {onRefresh && (
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                "p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-all border border-zinc-700",
                isRefreshing && "animate-spin"
              )}
              title="Atualizar lista"
            >
              <RefreshCw size={18} />
            </button>
          )}
          <button 
            onClick={onAdd}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors shadow-lg shadow-theme-primary/20"
          >
            <Plus size={18} />
            Novo Atleta
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4 no-print">
        {viewMode === 'recent' && (
          <div className="sm:col-span-2 md:col-span-3 lg:col-span-4 xl:col-span-7 bg-theme-primary/10 border border-theme-primary/30 p-4 rounded-xl flex items-center gap-4">
            <div className="p-3 bg-theme-primary/20 rounded-full text-theme-primary">
              <Clock size={24} />
            </div>
            <div>
              <h4 className="text-white font-black uppercase text-sm">Últimos 5 Cadastros</h4>
              <p className="text-zinc-400 text-xs">Estes são os atletas que foram registrados mais recentemente no sistema.</p>
            </div>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome ou documento..." 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={filterSub}
            onChange={(e) => setFilterSub(e.target.value)}
          >
            <option value="Todos">Todas as Categorias</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none uppercase font-bold text-xs"
            value={filterModality}
            onChange={(e) => setFilterModality(e.target.value)}
          >
            <option value="Todos">Todas as Modalidades</option>
            {uniqueModalities.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={filterGender}
            onChange={(e) => setFilterGender(e.target.value)}
          >
            <option value="Todos">Todos os Sexos</option>
            <option value="Masculino">Masculino</option>
            <option value="Feminino">Feminino</option>
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={filterBirthYear}
            onChange={(e) => setFilterBirthYear(e.target.value)}
          >
            <option value="Todos">Todos os Anos</option>
            {uniqueBirthYears.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="Todos">Todos os Status</option>
            <option value="Ativo">Ativos</option>
            <option value="Inativo">Inativos</option>
          </select>
        </div>
        <div className="relative">
          <FileDown className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <select 
            className="w-full pl-10 pr-4 py-3 bg-black border border-theme-primary/20 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 appearance-none"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
          >
            <option value="name_asc">Ordem: Nome (A-Z)</option>
            <option value="name_desc">Ordem: Nome (Z-A)</option>
            <option value="created_new">Ordem: Mais Recentes</option>
            <option value="created_old">Ordem: Mais Antigos</option>
          </select>
        </div>
      </div>

      <div className="bg-black border border-theme-primary/20 rounded-2xl overflow-hidden shadow-xl">
        {displayMode === 'cards' ? (
          /* Galeria / Modo Cards com Foto em Destaque */
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredAthletes.map((athlete) => (
              <div key={athlete.id} className="bg-zinc-950 border border-zinc-800/80 hover:border-theme-primary/50 rounded-2xl overflow-hidden shadow-xl transition-all duration-300 flex flex-col justify-between group">
                {/* Top Banner & Photo Frame */}
                <div className="relative bg-zinc-900/60 p-3 flex flex-col items-center">
                  {/* Top Badges */}
                  <div className="w-full flex items-center justify-between mb-2">
                    <span className="px-2 py-0.5 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-[10px] font-black uppercase rounded-md">
                      {getSubCategory(athlete.birth_date)}
                    </span>
                    {athlete.jersey_number ? (
                      <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 font-mono text-[10px] font-bold rounded-md">
                        #{athlete.jersey_number}
                      </span>
                    ) : (
                      <span />
                    )}
                  </div>

                  {/* Big Visible Photo */}
                  <div 
                    onClick={() => setPreviewAthletePhoto(athlete)}
                    className="relative cursor-pointer group/photo w-28 h-28 sm:w-32 sm:h-32 rounded-2xl overflow-hidden border-2 border-zinc-700 hover:border-theme-primary transition-all shadow-lg my-1 bg-zinc-800 flex items-center justify-center"
                    title="Clique para ampliar foto"
                  >
                    {athlete.photo ? (
                      <img 
                        src={athlete.photo} 
                        alt={athlete.name} 
                        className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-300" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-zinc-600">
                        <UserCircle size={44} />
                        <span className="text-[10px] text-zinc-500 font-bold mt-1">Sem Foto</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white gap-1 font-bold text-xs backdrop-blur-[2px]">
                      <Maximize2 size={16} />
                      <span>Ampliar</span>
                    </div>
                  </div>
                </div>

                {/* Info Body */}
                <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
                  <div>
                    <h3 className="font-bold text-white text-sm leading-tight group-hover:text-theme-primary transition-colors line-clamp-2">
                      {athlete.name}
                    </h3>
                    {athlete.nickname && (
                      <p className="text-[11px] text-zinc-400 font-medium truncate">({athlete.nickname})</p>
                    )}
                    <div className="mt-2 space-y-0.5 text-[11px] text-zinc-400">
                      <p className="truncate">
                        <span className="text-zinc-500 font-semibold uppercase text-[9px] mr-1">Doc:</span>
                        <span className="text-zinc-300 font-mono">{athlete.doc || '--'}</span>
                      </p>
                      <p className="truncate">
                        <span className="text-zinc-500 font-semibold uppercase text-[9px] mr-1">Mod:</span>
                        <span className="text-zinc-300 uppercase font-bold text-[10px]">{athlete.modality || '--'}</span>
                      </p>
                    </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between gap-1">
                    <button 
                      onClick={() => handleStatusToggle(athlete)}
                      className={cn(
                        "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all",
                        athlete.status === 'Ativo' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                      )}
                    >
                      {athlete.status}
                    </button>

                    <div className="flex items-center gap-1">
                      {athlete.confirmation === 'Pendente' && (
                        <>
                          <button 
                            onClick={() => handleApprove(athlete.id)}
                            className="p-1.5 hover:bg-green-500/20 text-green-500 bg-green-500/10 rounded-lg transition-colors"
                            title="Aprovar Cadastro"
                          >
                            <Check size={14} />
                          </button>
                          <button 
                            onClick={() => handleReject(athlete.id)}
                            className="p-1.5 hover:bg-red-500/20 text-red-500 bg-red-500/10 rounded-lg transition-colors"
                            title="Recusar Cadastro"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                      {athlete.contact && athlete.contact.replace(/\D/g, '') && (
                        <a 
                          href={`https://wa.me/55${athlete.contact.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 hover:bg-green-500/20 text-green-500 rounded-lg transition-colors"
                          title="WhatsApp Aluno"
                        >
                          <MessageCircle size={14} />
                        </a>
                      )}
                      <button 
                        onClick={() => onEdit(athlete)}
                        className="p-1.5 hover:bg-theme-primary/20 text-theme-primary rounded-lg transition-colors"
                        title="Editar Atleta"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => handleDelete(athlete.id)}
                        className="p-1.5 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Desktop Table View */
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-black/50 border-b border-zinc-800">
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Atleta</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Sexo</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cadastro</th>
                  <th className="px-6 py-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider text-right no-print">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {filteredAthletes.map((athlete) => (
                  <tr key={athlete.id} className="hover:bg-zinc-800/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Enlarged Photo Container */}
                        <div 
                          onClick={() => setPreviewAthletePhoto(athlete)}
                          className="relative cursor-pointer group/photo w-14 h-14 rounded-xl overflow-hidden border-2 border-zinc-700 hover:border-theme-primary transition-all shadow-md bg-zinc-800 flex-shrink-0 flex items-center justify-center"
                          title="Clique para ampliar foto"
                        >
                          {athlete.photo ? (
                            <img 
                              src={athlete.photo} 
                              className="w-full h-full object-cover group-hover/photo:scale-110 transition-transform duration-200" 
                              referrerPolicy="no-referrer" 
                            />
                          ) : (
                            <div className="w-full h-full bg-zinc-800 flex flex-col items-center justify-center text-zinc-500">
                              <UserCircle size={28} />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/photo:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            <Maximize2 size={14} />
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-white flex items-center gap-2">
                            {athlete.name}{athlete.nickname ? ` (${athlete.nickname})` : ''}
                            {athlete.confirmation === 'Pendente' && athlete.created_at && (
                              (() => {
                                const date = new Date(getTimestamp(athlete.created_at));
                                const days = differenceInDays(new Date(), date);
                                if (days >= 10) {
                                  return (
                                    <span className="flex items-center gap-1 text-[10px] font-black bg-red-500 text-white px-1.5 py-0.5 rounded animate-pulse" title="Cadastro pendente há mais de 10 dias!">
                                      <AlertTriangle size={10} />
                                      {days} DIAS
                                    </span>
                                  );
                                }
                                return null;
                              })()
                            )}
                            {athlete.contact && athlete.contact.replace(/\D/g, '') && (
                              <a 
                                href={`https://wa.me/55${athlete.contact.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-green-500 hover:text-green-400 transition-colors"
                                title="Conversar com Aluno"
                              >
                                <MessageCircle size={14} />
                              </a>
                            )}
                          </div>
                          <div className="text-xs text-zinc-500 flex items-center gap-2">
                            {athlete.doc}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-zinc-300 text-xs font-bold uppercase">
                        {athlete.gender || '--'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-theme-primary/10 text-theme-primary text-xs font-bold rounded-md">
                        {getSubCategory(athlete.birth_date)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button 
                        onClick={() => handleStatusToggle(athlete)}
                        className={cn(
                          "px-2 py-1 rounded-md text-xs font-bold uppercase transition-all hover:ring-2 hover:ring-theme-primary/30",
                          athlete.status === 'Ativo' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                        )}
                        title={`Clique para tornar ${athlete.status === 'Ativo' ? 'Inativo' : 'Ativo'}`}
                      >
                        {athlete.status}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-center">
                        <span className="text-zinc-300 text-[10px] font-bold">
                          {formatCreatedAt(athlete.created_at)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right no-print">
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                          {athlete.confirmation === 'Pendente' && (
                            <>
                              <button 
                                onClick={() => handleApprove(athlete.id)}
                                className="p-2 hover:bg-green-500/20 text-green-500 bg-green-500/10 rounded-lg transition-colors"
                                title="Aprovar Cadastro"
                              >
                                <Check size={18} />
                              </button>
                              <button 
                                onClick={() => handleReject(athlete.id)}
                                className="p-2 hover:bg-red-500/20 text-red-500 bg-red-500/10 rounded-lg transition-colors"
                                title="Recusar"
                              >
                                <XCircle size={18} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => onEdit(athlete)}
                            className="p-2 hover:bg-theme-primary/10 text-theme-primary rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(athlete.id)}
                            className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Mobile Card View (shown when displayMode is table) */}
        {displayMode === 'table' && (
          <div className="md:hidden divide-y divide-zinc-800">
            {filteredAthletes.map((athlete) => (
              <div key={athlete.id} className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => setPreviewAthletePhoto(athlete)}
                      className="relative cursor-pointer w-14 h-14 rounded-2xl overflow-hidden border-2 border-zinc-700 bg-zinc-800 flex-shrink-0 flex items-center justify-center"
                    >
                      {athlete.photo ? (
                        <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserCircle size={28} className="text-zinc-500" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2">
                        {athlete.name}{athlete.nickname ? ` (${athlete.nickname})` : ''}
                        {athlete.contact && athlete.contact.replace(/\D/g, '') && (
                          <a 
                            href={`https://wa.me/55${athlete.contact.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-500"
                          >
                            <MessageCircle size={16} />
                          </a>
                        )}
                      </div>
                      <div className="text-xs text-zinc-500 flex items-center gap-2">
                        {athlete.doc}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleStatusToggle(athlete)}
                    className={cn(
                      "px-2 py-1 rounded-md text-[10px] font-bold uppercase border border-transparent hover:border-theme-primary/30",
                      athlete.status === 'Ativo' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                    )}
                  >
                    {athlete.status}
                  </button>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-black tracking-wider">Categoria:</span>
                    <span className="text-theme-primary font-bold">{getSubCategory(athlete.birth_date)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-black tracking-wider">Modalidade:</span>
                    <span className="text-white font-bold text-[10px] uppercase">{athlete.modality || '--'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500 uppercase text-[10px] font-black tracking-wider">UNIFORME:</span>
                    <span className="text-theme-primary font-mono font-bold">#{athlete.jersey_number || '--'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  {viewMode === 'pending' ? (
                    <>
                      <button 
                        onClick={() => handleApprove(athlete.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500/10 hover:bg-green-500/20 text-green-500 rounded-xl transition-colors text-xs font-bold"
                      >
                        <Check size={14} />
                        Aprovar
                      </button>
                      <button 
                        onClick={() => handleReject(athlete.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold"
                      >
                        <XCircle size={14} />
                        Recusar
                      </button>
                    </>
                  ) : (
                    <>
                      <button 
                        onClick={() => onEdit(athlete)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors text-xs font-bold"
                      >
                        <Edit2 size={14} />
                        Editar
                      </button>
                      <button 
                        onClick={() => handleDelete(athlete.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-colors text-xs font-bold"
                      >
                        <Trash2 size={14} />
                        Excluir
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredAthletes.length === 0 && (
          <div className="px-6 py-12 text-center text-zinc-500 space-y-4">
            <div className="flex flex-col items-center gap-3">
              <Search size={32} className="opacity-20" />
              <p>Nenhum atleta encontrado com os filtros selecionados.</p>
              {isQuotaExceeded() && (
                <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl max-w-sm mx-auto">
                  <p className="text-amber-500 text-xs font-bold uppercase tracking-wider">Modo de Economia Ativo</p>
                  <p className="text-[10px] text-zinc-400 mt-1">
                    Como o limite diário do banco de dados foi atingido, novos atletas cadastrados ou alterações feitas em outros aparelhos podem não aparecer até que o limite seja reiniciado.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Print Header (Visible only when printing) */}
      <div className="hidden list-print-only p-8 text-black bg-white">
        <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            {settings.schoolCrest && (
              <img src={settings.schoolCrest} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            )}
            <h1 className="text-3xl font-black uppercase">Piruá Esporte Clube</h1>
          </div>
          <div className="text-right">
            <p className="font-bold">Lista Geral de Atletas</p>
            <p className="text-sm">Data: {new Date().toLocaleDateString()}</p>
          </div>
        </div>
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-zinc-100">
              <th className="border border-black p-2 text-left">Nome</th>
              <th className="border border-black p-2 text-left">Sexo</th>
              <th className="border border-black p-2 text-left">Doc</th>
              <th className="border border-black p-2 text-left">Nasc.</th>
              <th className="border border-black p-2 text-left">Cat.</th>
              <th className="border border-black p-2 text-left">Modalidade</th>
              <th className="border border-black p-2 text-left">UNIFORME</th>
              <th className="border border-black p-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredAthletes.map(a => (
              <tr key={a.id}>
                <td className="border border-black p-2">
                  {a.name}{a.nickname ? ` (${a.nickname})` : ''}
                </td>
                <td className="border border-black p-2">{a.gender}</td>
                <td className="border border-black p-2">{a.doc}</td>
                <td className="border border-black p-2">{a.birth_date}</td>
                <td className="border border-black p-2">{getSubCategory(a.birth_date)}</td>
                <td className="border border-black p-2">{a.modality}</td>
                <td className="border border-black p-2">#{a.jersey_number}</td>
                <td className="border border-black p-2">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-black border border-red-900/30 w-full max-w-md rounded-3xl shadow-2xl p-8 text-center">
            <div className="w-16 h-16 bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase tracking-widest">Excluir Atleta</h3>
            <p className="text-zinc-400 mb-8">Tem certeza que deseja excluir este atleta? Esta ação não pode ser desfeita.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="flex-1 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors uppercase text-xs tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors uppercase text-xs tracking-widest"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Athlete Photo Lightbox Modal */}
      {previewAthletePhoto && (
        <div 
          className="fixed inset-0 bg-black/90 backdrop-blur-md z-[120] flex items-center justify-center p-4 no-print animate-in fade-in duration-200"
          onClick={() => setPreviewAthletePhoto(null)}
        >
          <div 
            className="bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden max-w-md w-full shadow-2xl p-6 flex flex-col items-center relative space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button 
              onClick={() => setPreviewAthletePhoto(null)}
              className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors border border-zinc-800"
              title="Fechar"
            >
              <XCircle size={20} />
            </button>

            {/* Photo Container */}
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-2xl overflow-hidden border-2 border-theme-primary shadow-2xl bg-zinc-900 flex items-center justify-center mt-2">
              {previewAthletePhoto.photo ? (
                <img 
                  src={previewAthletePhoto.photo} 
                  alt={previewAthletePhoto.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-zinc-600 gap-2">
                  <UserCircle size={64} />
                  <span className="text-xs font-bold text-zinc-500">Sem foto cadastrada</span>
                </div>
              )}
            </div>

            {/* Athlete Details */}
            <div className="text-center space-y-1 w-full pt-2">
              <h3 className="text-xl font-black text-white">
                {previewAthletePhoto.name}
              </h3>
              {previewAthletePhoto.nickname && (
                <p className="text-sm font-bold text-theme-primary">
                  "{previewAthletePhoto.nickname}"
                </p>
              )}

              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                <span className="px-3 py-1 bg-theme-primary/10 border border-theme-primary/30 text-theme-primary text-xs font-bold rounded-lg">
                  Categoria: {getSubCategory(previewAthletePhoto.birth_date)}
                </span>
                {previewAthletePhoto.jersey_number && (
                  <span className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono text-xs font-bold rounded-lg">
                    Camisa #{previewAthletePhoto.jersey_number}
                  </span>
                )}
                <span className={cn(
                  "px-3 py-1 text-xs font-bold rounded-lg uppercase",
                  previewAthletePhoto.status === 'Ativo' ? "bg-green-500/10 text-green-500 border border-green-500/30" : "bg-red-500/10 text-red-500 border border-red-500/30"
                )}>
                  {previewAthletePhoto.status}
                </span>
              </div>

              <div className="text-xs text-zinc-400 pt-3 border-t border-zinc-900 grid grid-cols-2 gap-2 text-left">
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Documento</span>
                  <span className="text-zinc-200 font-mono">{previewAthletePhoto.doc || '--'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Nascimento</span>
                  <span className="text-zinc-200">{previewAthletePhoto.birth_date || '--'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Modalidade</span>
                  <span className="text-zinc-200 uppercase">{previewAthletePhoto.modality || '--'}</span>
                </div>
                <div>
                  <span className="text-zinc-500 block text-[10px] font-bold uppercase">Contato</span>
                  <span className="text-zinc-200">{previewAthletePhoto.contact || '--'}</span>
                </div>
              </div>
            </div>

            {/* Quick Edit button */}
            <div className="w-full flex gap-2 pt-2">
              <button 
                onClick={() => {
                  const athleteToEdit = previewAthletePhoto;
                  setPreviewAthletePhoto(null);
                  onEdit(athleteToEdit);
                }}
                className="w-full py-2.5 bg-theme-primary hover:bg-theme-primary/90 text-black font-black uppercase tracking-wider text-xs rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Editar Dados do Atleta
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
