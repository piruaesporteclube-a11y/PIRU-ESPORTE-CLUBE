import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Attendance, Athlete, getSubCategory } from '../types';
import { Calendar, Search, Filter, User, ChevronLeft, ChevronRight, FileText, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../utils';
import { useTheme } from '../contexts/ThemeContext';

interface AttendanceHistoryProps {
  athletes: Athlete[];
  trainingId?: string;
  eventId?: string;
}

export default function AttendanceHistory({ athletes, trainingId, eventId }: AttendanceHistoryProps) {
  const { settings } = useTheme();
  const [history, setHistory] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfMonth(new Date()), 'yyyy-MM-dd')
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSub, setSelectedSub] = useState('Todos');
  const [filterMode, setFilterMode] = useState<'all' | 'present' | 'absent' | 'observation'>('all');

  const categories = Array.from(new Set(athletes.map(a => getSubCategory(a.birth_date))));

  useEffect(() => {
    loadHistory();
  }, [trainingId, eventId, dateRange]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await api.getAttendance(undefined, undefined, trainingId, eventId);
      const filtered = data.filter(a => {
        if (trainingId || eventId) return true;
        return a.date >= dateRange.start && a.date <= dateRange.end;
      });
      setHistory(filtered.sort((a, b) => b.date.localeCompare(a.date)));
    } catch (err) {
      console.error("Error loading attendance history:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAttendance = async (athleteId: string, date: string, status: 'Presente' | 'Faltou') => {
    try {
      const existing = history.find(h => h.athlete_id === athleteId && h.date === date);
      
      const attendanceData: Partial<Attendance> = {
        athlete_id: athleteId,
        date,
        status,
        arrival_time: status === 'Presente' ? format(new Date(), 'HH:mm') : undefined,
        training_id: trainingId,
        event_id: eventId,
      };

      if (existing?.id) {
        attendanceData.id = existing.id;
      }

      await api.saveAttendance(attendanceData);
      
      loadHistory();
    } catch (err) {
      console.error("Error marking attendance:", err);
    }
  };

  const filteredAthletes = athletes.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         a.doc.includes(searchTerm);
    const matchesSub = selectedSub === 'Todos' || getSubCategory(a.birth_date) === selectedSub;
    return matchesSearch && matchesSub;
  });

  // Unique dates in history
  const dates = Array.from(new Set(history.map(h => h.date))).sort((a, b) => b.localeCompare(a));

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar size={20} className="text-theme-primary" />
            Presenças
          </h3>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
              <button 
                onClick={() => setFilterMode('all')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  filterMode === 'all' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
                )}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterMode('present')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  filterMode === 'present' ? "bg-green-500 text-white" : "text-zinc-500 hover:text-white"
                )}
              >
                Presentes
              </button>
              <button 
                onClick={() => setFilterMode('absent')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  filterMode === 'absent' ? "bg-red-500 text-white" : "text-zinc-500 hover:text-white"
                )}
              >
                Ausentes
              </button>
              <button 
                onClick={() => setFilterMode('observation')}
                className={cn(
                  "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
                  filterMode === 'observation' ? "bg-amber-500 text-white" : "text-zinc-500 hover:text-white"
                )}
              >
                Observação
              </button>
            </div>

            {!trainingId && !eventId && (
              <div className="flex items-center gap-2">
                <input 
                  type="date" 
                  className="bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
                <span className="text-zinc-500 text-xs">até</span>
                <input 
                  type="date" 
                  className="bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
            )}
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={14} />
              <input 
                type="text" 
                placeholder="Buscar atleta..." 
                className="bg-black border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white w-48"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <select 
              className="bg-black border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white appearance-none"
              value={selectedSub}
              onChange={(e) => setSelectedSub(e.target.value)}
            >
              <option value="Todos">Categorias</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <div className="w-10 h-10 border-4 border-theme-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-zinc-500 text-sm animate-pulse">Carregando histórico...</p>
          </div>
        ) : history.length === 0 ? (
          <div className="py-20 text-center bg-black/20 rounded-2xl border border-dashed border-zinc-800">
            <Calendar size={48} className="mx-auto text-zinc-700 mb-4 opacity-20" />
            <p className="text-zinc-500 font-medium">Nenhum registro encontrado para este período.</p>
          </div>
        ) : (
          <div className="space-y-8">
            {dates.map(date => {
              const dateHistory = history.filter(h => h.date === date);
              const presentCount = dateHistory.filter(h => h.status === 'Presente').length;
              const absentCount = dateHistory.filter(h => h.status === 'Faltou').length;
              
              return (
                <div key={date} className="animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="flex items-center justify-between mb-4 pb-2 border-b border-zinc-800/50">
                    <div className="flex items-center gap-3">
                      <div className="bg-theme-primary/10 text-theme-primary p-2 rounded-xl">
                        <Calendar size={16} />
                      </div>
                      <div>
                        <h4 className="text-sm font-black text-white uppercase tracking-tight">
                          {format(new Date(date + 'T12:00:00'), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </h4>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] font-bold text-green-500 flex items-center gap-1 uppercase">
                            <CheckCircle2 size={10} /> {presentCount} Presentes
                          </span>
                          <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 uppercase">
                            <XCircle size={10} /> {absentCount} Ausentes
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredAthletes.map(athlete => {
                      const record = dateHistory.find(h => h.athlete_id === athlete.id);
                      
                      // Apply filter mode
                      if (filterMode === 'present' && record?.status !== 'Presente') return null;
                      if (filterMode === 'absent' && record?.status !== 'Faltou') return null;
                      if (filterMode === 'observation' && record) return null; // Observation only shows UNMARKED
                      if (filterMode === 'all' && !record && searchTerm === '') return null; // Default view only shows MARKED unless searching

                      const isUnmarked = !record;

                      return (
                        <div key={athlete.id} className={cn(
                          "p-3 rounded-2xl border transition-all flex items-center gap-3 group",
                          record?.status === 'Presente' ? "bg-green-500/5 border-green-500/20" : 
                          record?.status === 'Faltou' ? "bg-red-500/5 border-red-500/20" :
                          "bg-zinc-900/40 border-zinc-800"
                        )}>
                          <div className="w-8 h-8 rounded-full bg-zinc-800 overflow-hidden flex-shrink-0 border border-zinc-700">
                            {athlete.photo ? (
                              <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                <User size={14} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold text-white truncate uppercase">{athlete.name}</p>
                            <div className="flex items-center justify-between mt-1">
                              <span className={cn(
                                "text-[8px] font-black uppercase tracking-widest",
                                record?.status === 'Presente' ? "text-green-500" : 
                                record?.status === 'Faltou' ? "text-red-500" :
                                "text-zinc-600"
                              )}>
                                {record?.status || 'Não Marcado'}
                              </span>
                              
                              {isUnmarked || filterMode === 'observation' ? (
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                    onClick={() => handleMarkAttendance(athlete.id, date, 'Presente')}
                                    className="p-1 rounded bg-green-500 text-white hover:bg-green-600 transition-colors"
                                    title="Marcar Presente"
                                  >
                                    <CheckCircle2 size={10} />
                                  </button>
                                  <button 
                                    onClick={() => handleMarkAttendance(athlete.id, date, 'Faltou')}
                                    className="p-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
                                    title="Marcar Falta"
                                  >
                                    <XCircle size={10} />
                                  </button>
                                </div>
                              ) : (
                                record?.arrival_time && (
                                  <div className="flex items-center gap-1 text-zinc-500">
                                    <Clock size={10} />
                                    <span className="text-[9px] font-black">{record.arrival_time}</span>
                                  </div>
                                )
                              )}
                            </div>
                            {record?.justification && (
                              <p className="text-[8px] text-zinc-500 italic truncate mt-1 border-t border-zinc-800 pt-1">
                                {record.justification}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )
      }
      </div>
    </div>
  );
}
