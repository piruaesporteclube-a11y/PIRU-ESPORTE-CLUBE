import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Attendance, Training, Event, Athlete, getSubCategory } from '../types';
import { ClipboardCheck, Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle, MessageSquare, X } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../utils';
import { toast } from 'sonner';

const hasScheduledTrainingOrEventForAthlete = (
  athlete: Athlete,
  dateStr: string,
  allTrainings: Training[],
  allEvents: Event[]
): boolean => {
  const athleteMods = (athlete.modality || '')
    .split(',')
    .map(m => m.trim().toLowerCase())
    .filter(Boolean);
  
  const athleteSub = getSubCategory(athlete.birth_date);

  // Check if there is any training on this date matching the athlete's modality and category
  const hasMatchingTraining = allTrainings.some(t => {
    if (t.date !== dateStr) return false;

    // Check Modality: if training has a modality specified, it must match one of the athlete's modalities
    if (t.modality) {
      const trainingMod = t.modality.trim().toLowerCase();
      const matchesModality = athleteMods.some(m => 
        m === trainingMod || trainingMod.includes(m) || m.includes(trainingMod)
      );
      if (!matchesModality) return false;
    }

    // Check Category: if training has a category, it must match the athlete's sub-category or be "Todos"
    const isCategoryEligible = t.category === 'Todos' || t.category === athleteSub;
    if (isCategoryEligible) return true;

    // If training has schedules, check if any schedule category matches
    if (t.schedules && t.schedules.length > 0) {
      return t.schedules.some(s => s.categories.includes('Todos') || s.categories.includes(athleteSub));
    }

    return false;
  });

  if (hasMatchingTraining) return true;

  // Check if there is any event on this date matching the athlete's modality
  const hasMatchingEvent = allEvents.some(e => {
    if (dateStr < e.start_date || dateStr > e.end_date) return false;

    if (e.modality) {
      const eventMod = e.modality.trim().toLowerCase();
      const matchesModality = athleteMods.some(m => 
        m === eventMod || eventMod.includes(m) || m.includes(eventMod)
      );
      return matchesModality;
    }

    return true;
  });

  return hasMatchingEvent;
};

const isWithinJustificationTimeframe = (dateStr: string, startTimeStr?: string): boolean => {
  const now = new Date();
  
  // Format current date in YYYY-MM-DD
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const todayStr = `${year}-${month}-${day}`;

  // If scheduled for today or in the future, it's always allowed ("antes do treino")
  if (dateStr >= todayStr) {
    return true;
  }

  // If in the past, let's check if it is within 24 hours of the training start time.
  const startTime = startTimeStr || '08:00';
  const trainingDateTime = new Date(`${dateStr}T${startTime}:00`);
  
  const elapsedMs = now.getTime() - trainingDateTime.getTime();
  const twentyFourHoursMs = 24 * 60 * 60 * 1000;
  
  return elapsedMs <= twentyFourHoursMs;
};

export default function StudentPresenceHistory({ athleteId }: { athleteId: string }) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');
  
  // Justification Modal State
  const [selectedRecord, setSelectedRecord] = useState<Attendance | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Pre-emptive/Recent Absence Justification State
  const [isAddJustificationOpen, setIsAddJustificationOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState('');
  const [newJustificationText, setNewJustificationText] = useState('');

  useEffect(() => {
    if (athleteId) {
      loadHistory();
    }
  }, [athleteId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [attData, trainingData, eventData, athleteData] = await Promise.all([
        api.getAttendance(undefined, athleteId),
        api.getTrainings(),
        api.getEvents(),
        api.getAthlete(athleteId)
      ]);
      
      setAttendance(attData.sort((a, b) => b.date.localeCompare(a.date)));
      setTrainings(trainingData);
      setEvents(eventData);
      setAthlete(athleteData);
    } catch (error) {
      console.error('Error loading presence history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceStats = (records: Attendance[]) => {
    const total = records.length;
    const present = records.filter(a => a.status === 'Presente').length;
    const absent = records.filter(a => a.status === 'Faltou').length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, percent };
  };

  const validAttendance = athlete 
    ? attendance.filter(a => hasScheduledTrainingOrEventForAthlete(athlete, a.date, trainings, events)) 
    : attendance;

  const stats = getAttendanceStats(validAttendance);

  const filteredAttendance = validAttendance.filter(a => {
    if (filter === 'present') return a.status === 'Presente';
    if (filter === 'absent') return a.status === 'Faltou';
    return true;
  });

  const handleOpenJustify = (record: Attendance) => {
    setSelectedRecord(record);
    setJustificationText(record.justification || '');
  };

  const handleSaveJustification = async () => {
    if (!selectedRecord) return;
    setIsSaving(true);
    try {
      await api.saveAttendance({
        id: selectedRecord.id,
        justification: justificationText.trim() || undefined
      });
      toast.success("Justificativa de falta salva com sucesso!");
      setSelectedRecord(null);
      setJustificationText('');
      await loadHistory();
    } catch (err) {
      console.error("Error saving justification:", err);
      toast.error("Erro ao salvar justificativa.");
    } finally {
      setIsSaving(false);
    }
  };

  const getEligibleSessions = () => {
    if (!athlete) return [];

    const eligible: {
      id: string;
      type: 'training' | 'event';
      title: string;
      date: string;
      start_time?: string;
      training_id?: string;
      event_id?: string;
    }[] = [];

    const athleteMods = (athlete.modality || '')
      .split(',')
      .map(m => m.trim().toLowerCase())
      .filter(Boolean);

    const athleteSub = getSubCategory(athlete.birth_date);

    // 1. Process Trainings
    trainings.forEach(t => {
      if (t.modality) {
        const trainingMod = t.modality.trim().toLowerCase();
        const matchesModality = athleteMods.some(m => 
          m === trainingMod || trainingMod.includes(m) || m.includes(trainingMod)
        );
        if (!matchesModality) return;
      }

      let isCategoryEligible = t.category === 'Todos' || t.category === athleteSub;
      if (!isCategoryEligible && t.schedules && t.schedules.length > 0) {
        isCategoryEligible = t.schedules.some(s => s.categories.includes('Todos') || s.categories.includes(athleteSub));
      }

      if (!isCategoryEligible) return;

      if (isWithinJustificationTimeframe(t.date, t.start_time)) {
        // Check if student is already marked as Presente for this training
        const alreadyPresent = attendance.some(a => a.training_id === t.id && a.status === 'Presente');
        if (!alreadyPresent) {
          eligible.push({
            id: `training-${t.id}`,
            type: 'training',
            title: `Treino: ${t.category || 'Geral'} - ${t.location}`,
            date: t.date,
            start_time: t.start_time,
            training_id: t.id
          });
        }
      }
    });

    // 2. Process Events
    events.forEach(e => {
      if (e.modality) {
        const eventMod = e.modality.trim().toLowerCase();
        const matchesModality = athleteMods.some(m => 
          m === eventMod || eventMod.includes(m) || m.includes(eventMod)
        );
        if (!matchesModality) return;
      }

      if (isWithinJustificationTimeframe(e.start_date, e.start_time)) {
        const alreadyPresent = attendance.some(a => a.event_id === e.id && a.status === 'Presente');
        if (!alreadyPresent) {
          eligible.push({
            id: `event-${e.id}`,
            type: 'event',
            title: `Evento: ${e.name}`,
            date: e.start_date,
            start_time: e.start_time,
            event_id: e.id
          });
        }
      }
    });

    return eligible.sort((a, b) => b.date.localeCompare(a.date)); // descending so most recent is first
  };

  const handleSaveNewJustification = async () => {
    if (!selectedSessionId) {
      toast.error("Por favor, selecione um treino ou evento.");
      return;
    }
    if (!newJustificationText.trim()) {
      toast.error("Por favor, digite uma justificativa.");
      return;
    }

    const eligible = getEligibleSessions();
    const session = eligible.find(s => s.id === selectedSessionId);
    if (!session) {
      toast.error("Treino ou evento não encontrado ou não elegível.");
      return;
    }

    setIsSaving(true);
    try {
      const existingRecord = attendance.find(a => 
        (session.training_id && a.training_id === session.training_id) || 
        (session.event_id && a.event_id === session.event_id)
      );

      await api.saveAttendance({
        id: existingRecord?.id || undefined,
        athlete_id: athleteId,
        date: session.date,
        training_id: session.training_id || undefined,
        event_id: session.event_id || undefined,
        status: "Faltou",
        justification: newJustificationText.trim()
      });

      toast.success("Ausência comunicada com sucesso!");
      setIsAddJustificationOpen(false);
      setSelectedSessionId('');
      setNewJustificationText('');
      await loadHistory();
    } catch (err) {
      console.error("Error communicating pre-emptive absence:", err);
      toast.error("Erro ao salvar justificativa.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Meu Histórico de Presença</h2>
          <p className="text-zinc-400 text-sm">Acompanhe sua frequência em treinos e eventos</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddJustificationOpen(true)}
            className="px-4 py-2.5 bg-theme-primary hover:bg-theme-primary/95 text-black rounded-xl text-xs font-black uppercase tracking-tighter transition-all flex items-center gap-2 shadow-lg shadow-theme-primary/15 cursor-pointer"
          >
            <AlertCircle size={14} />
            Justificar Ausência (Prévia/Recente)
          </button>

          <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all",
              filter === 'all' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('present')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all",
              filter === 'present' ? "bg-green-500 text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Presenças
          </button>
          <button 
            onClick={() => setFilter('absent')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all",
              filter === 'absent' ? "bg-red-500 text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Faltas
          </button>
        </div>
      </div>
    </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Registros', value: stats.total, color: 'text-white' },
          { label: 'Presenças', value: stats.present, color: 'text-green-500' },
          { label: 'Faltas', value: stats.absent, color: 'text-red-500' },
          { label: 'Frequência', value: `${stats.percent}%`, color: 'text-theme-primary' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {filteredAttendance.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
          <ClipboardCheck size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum registro de presença encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttendance.map((record) => {
            const training = record.training_id ? trainings.find(t => t.id === record.training_id) : null;
            const event = record.event_id ? events.find(e => e.id === record.event_id) : null;
            const title = training ? `Treino: ${training.date}` : (event ? `Evento: ${event.name}` : 'Chamada Geral');
            
            return (
              <div key={record.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    record.status === 'Presente' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {record.status === 'Presente' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white uppercase text-sm">{title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold">
                        <Calendar size={12} />
                        {record.date}
                      </div>
                      {record.arrival_time && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold">
                          <Clock size={12} />
                          Check-in: {record.arrival_time}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 self-end sm:self-center">
                  {record.justification && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-xl border border-zinc-700 text-zinc-300 text-[10px] font-medium max-w-[240px]">
                      <AlertCircle size={12} className="text-amber-400 shrink-0" />
                      <span className="truncate" title={record.justification}>{record.justification}</span>
                    </div>
                  )}

                  {record.status === 'Faltou' && (() => {
                    const startTime = training?.start_time || event?.start_time;
                    const canEdit = isWithinJustificationTimeframe(record.date, startTime);

                    if (canEdit) {
                      return (
                        <button
                          onClick={() => handleOpenJustify(record)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-750 text-zinc-300 hover:text-white rounded-xl border border-zinc-700 text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <MessageSquare size={12} />
                          {record.justification ? 'Editar Justificativa' : 'Justificar Falta'}
                        </button>
                      );
                    } else {
                      return (
                        <div className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 flex items-center gap-1">
                          <Clock size={12} />
                          {record.justification ? 'Prazo de Edição Expirado (24h)' : 'Sem Justificativa (Prazo Expirado)'}
                        </div>
                      );
                    }
                  })()}

                  <div className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                    record.status === 'Presente' ? "bg-green-500 text-black" : "bg-red-500 text-black"
                  )}>
                    {record.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Justification Dialog */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <MessageSquare className="text-theme-primary" size={20} />
                <h3 className="text-md font-black text-white uppercase tracking-tight">Justificar Falta</h3>
              </div>
              <button 
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 hover:bg-zinc-850 rounded-xl text-zinc-500 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Data da Falta</p>
                <p className="text-sm font-bold text-white uppercase">{selectedRecord.date}</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Motivo / Justificativa</label>
                <textarea
                  value={justificationText}
                  onChange={(e) => setJustificationText(e.target.value)}
                  placeholder="Ex: Atestado médico, viagem familiar, compromisso escolar..."
                  rows={4}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-theme-primary/50 text-white rounded-2xl p-4 text-xs font-medium focus:ring-1 focus:ring-theme-primary/20 outline-none resize-none transition-all placeholder:text-zinc-650"
                  maxLength={250}
                />
                <p className="text-[9px] text-zinc-500 text-right mt-1 font-medium">{justificationText.length}/250 caracteres</p>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950/20 flex gap-3 justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveJustification}
                disabled={isSaving}
                className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary/90 disabled:opacity-50 text-black text-xs font-black rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? "Salvando..." : "Salvar Justificativa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pre-emptive / Recent Absence Justification Dialog */}
      {isAddJustificationOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950/40">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-theme-primary" size={20} />
                <h3 className="text-md font-black text-white uppercase tracking-tight">Justificar Ausência</h3>
              </div>
              <button 
                onClick={() => {
                  setIsAddJustificationOpen(false);
                  setSelectedSessionId('');
                  setNewJustificationText('');
                }}
                className="p-1.5 hover:bg-zinc-850 rounded-xl text-zinc-500 hover:text-white transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Selecione o Treino ou Evento</label>
                {(() => {
                  const eligible = getEligibleSessions();
                  if (eligible.length === 0) {
                    return (
                      <div className="p-4 bg-zinc-950/55 rounded-2xl border border-zinc-800 text-center text-xs font-bold uppercase text-zinc-500 space-y-1">
                        <Calendar size={24} className="mx-auto text-zinc-750 mb-1" />
                        <p>Nenhum treino ou evento elegível</p>
                        <p className="text-[9px] font-medium text-zinc-650 tracking-normal normal-case">
                          Apenas treinos futuros, de hoje ou ocorridos nas últimas 24 horas podem ser justificados antecipadamente ou recentemente.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <select
                      value={selectedSessionId}
                      onChange={(e) => setSelectedSessionId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-theme-primary/50 text-white rounded-2xl p-4 text-xs font-bold uppercase outline-none focus:ring-1 focus:ring-theme-primary/20 transition-all cursor-pointer"
                    >
                      <option value="">-- Escolha uma data e horário --</option>
                      {eligible.map(session => (
                        <option key={session.id} value={session.id}>
                          {session.date} - {session.title}
                        </option>
                      ))}
                    </select>
                  );
                })()}
              </div>

              {getEligibleSessions().length > 0 && (
                <div>
                  <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-2">Motivo / Justificativa da Ausência</label>
                  <textarea
                    value={newJustificationText}
                    onChange={(e) => setNewJustificationText(e.target.value)}
                    placeholder="Ex: Atestado médico, viagem familiar, compromisso escolar..."
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 focus:border-theme-primary/50 text-white rounded-2xl p-4 text-xs font-medium focus:ring-1 focus:ring-theme-primary/20 outline-none resize-none transition-all placeholder:text-zinc-650"
                    maxLength={250}
                  />
                  <p className="text-[9px] text-zinc-500 text-right mt-1 font-medium">{newJustificationText.length}/250 caracteres</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-950/20 flex gap-3 justify-end">
              <button
                onClick={() => {
                  setIsAddJustificationOpen(false);
                  setSelectedSessionId('');
                  setNewJustificationText('');
                }}
                className="px-5 py-2.5 rounded-xl text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
              >
                Cancelar
              </button>
              {getEligibleSessions().length > 0 && (
                <button
                  onClick={handleSaveNewJustification}
                  disabled={isSaving || !selectedSessionId || !newJustificationText.trim()}
                  className="px-6 py-2.5 bg-theme-primary hover:bg-theme-primary/90 disabled:opacity-50 text-black text-xs font-black rounded-xl uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  {isSaving ? "Salvando..." : "Confirmar Justificativa"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
