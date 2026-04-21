import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Training, Athlete, categories } from '../types';
import { Plus, Calendar, Clock, MapPin, Trophy, Users, Trash2, Edit2, CheckCircle2, X, ChevronDown, ChevronUp, FileText, Instagram, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { cn } from '../utils';
import Attendance from './Attendance';
import TrainingFlyer from './TrainingFlyer';

interface TrainingManagementProps {
  athletes?: Athlete[];
  role?: 'admin' | 'student';
}

export default function TrainingManagement({ athletes: athletesProp, role = 'admin' }: TrainingManagementProps) {
  const isAdmin = role === 'admin';
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isReordering, setIsReordering] = useState(false);
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [activeAttendanceTraining, setActiveAttendanceTraining] = useState<Training | null>(null);
  const [flyerData, setFlyerData] = useState<{ date: string, trainings: Training[] } | null>(null);
  
  const [formData, setFormData] = useState<Partial<Training>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    modality: 'Futebol de Campo',
    schedules: [],
    notes: ''
  });

  const addSchedule = () => {
    const newSchedule = {
      categories: ['Todos'],
      start_time: '08:00',
      end_time: '09:00'
    };
    setFormData(prev => ({
      ...prev,
      schedules: [...(prev.schedules || []), newSchedule]
    }));
  };

  const removeSchedule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      schedules: prev.schedules?.filter((_, i) => i !== index)
    }));
  };

  const updateSchedule = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const newSchedules = [...(prev.schedules || [])];
      newSchedules[index] = { ...newSchedules[index], [field]: value };
      return { ...prev, schedules: newSchedules };
    });
  };

  const toggleCategory = (scheduleIndex: number, category: string) => {
    setFormData(prev => {
      const newSchedules = [...(prev.schedules || [])];
      const currentCategories = newSchedules[scheduleIndex].categories;
      
      let nextCategories: string[];
      if (category === 'Todos') {
        nextCategories = ['Todos'];
      } else {
        nextCategories = currentCategories.filter(c => c !== 'Todos');
        if (nextCategories.includes(category)) {
          nextCategories = nextCategories.filter(c => c !== category);
          if (nextCategories.length === 0) nextCategories = ['Todos'];
        } else {
          nextCategories.push(category);
        }
      }
      
      newSchedules[scheduleIndex] = { ...newSchedules[scheduleIndex], categories: nextCategories };
      return { ...prev, schedules: newSchedules };
    });
  };

  useEffect(() => {
    if (athletesProp) {
      setAthletes(athletesProp);
    }
    loadData();
  }, [athletesProp]);

  const loadData = async () => {
    setLoading(true);
    try {
      const promises: [Promise<Training[]>, Promise<Athlete[]> | null] = [
        api.getTrainings(),
        athletesProp ? null : api.getAthletes()
      ];
      
      const [trainingsData, athletesData] = await Promise.all(promises);
      
      const sortedTrainings = trainingsData.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (a.order ?? 0) - (b.order ?? 0);
      });
      
      setTrainings(sortedTrainings);
      if (athletesData) setAthletes(athletesData);
    } catch (err) {
      toast.error("Erro ao carregar treinos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveTraining(formData);
      toast.success(formData.id ? "Treino atualizado!" : "Treino cadastrado!");
      setIsModalOpen(false);
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        location: '',
        modality: 'Futebol de Campo',
        schedules: [],
        notes: ''
      });
      loadData();
    } catch (err) {
      toast.error("Erro ao salvar treino");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este treino?")) return;
    try {
      await api.deleteTraining(id);
      toast.success("Treino excluído!");
      loadData();
    } catch (err) {
      toast.error("Erro ao excluir treino");
    }
  };

  const handleReorder = async (date: string, newDayTrainings: Training[]) => {
    // Assign new order values locally so sorting works correctly
    const reorderedWithNewIndices = newDayTrainings.map((t, i) => ({ ...t, order: i }));

    // Update local state first for responsiveness
    setTrainings(current => {
      const otherDays = current.filter(t => t.date !== date);
      const combined = [...otherDays, ...reorderedWithNewIndices];
      
      return combined.sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date);
        return (a.order ?? 0) - (b.order ?? 0);
      });
    });

    try {
      await api.updateTrainingsOrder(newDayTrainings);
    } catch (error) {
      toast.error("Erro ao salvar nova ordem");
      loadData(); // Revert on error
    }
  };

  const openEdit = (training: Training) => {
    setFormData(training);
    setIsModalOpen(true);
  };

  const isTrainingEnded = (training: Training) => {
    const now = new Date();
    const todayString = format(now, 'yyyy-MM-dd');
    const currentTimeStr = format(now, 'HH:mm');

    if (training.date < todayString) return true;
    if (training.date > todayString) return false;

    // It's today
    let latestEnd = '00:00';
    if (training.schedules && training.schedules.length > 0) {
      latestEnd = training.schedules.reduce((latest, s) => s.end_time > latest ? s.end_time : latest, '00:00');
    } else {
      latestEnd = training.end_time || '00:00';
    }
    return currentTimeStr > latestEnd;
  };

  if (activeAttendanceTraining) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
              <Trophy size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                Chamada: {activeAttendanceTraining.modality}
              </h2>
              <div className="flex flex-col">
                <p className="text-xs text-zinc-500 uppercase tracking-widest">
                  {format(new Date(activeAttendanceTraining.date + 'T12:00:00'), 'dd/MM/yyyy')} - {activeAttendanceTraining.location}
                </p>
                {activeAttendanceTraining.schedules && activeAttendanceTraining.schedules.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {activeAttendanceTraining.schedules.map((s, i) => (
                      <span key={i} className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md font-bold uppercase">
                        {s.categories.join(', ')}: {s.start_time}-{s.end_time}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-zinc-500 font-bold uppercase">
                    {activeAttendanceTraining.start_time} às {activeAttendanceTraining.end_time}
                  </p>
                )}
              </div>
            </div>
          </div>
          <button 
            onClick={() => setActiveAttendanceTraining(null)}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl transition-colors"
          >
            <X size={18} />
            Fechar Chamada
          </button>
        </div>
        <Attendance athletes={athletes} trainingId={activeAttendanceTraining.id} initialDate={activeAttendanceTraining.date} role={role} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Treinos</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Confira a agenda de treinamentos</p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsReordering(!isReordering)}
              className={cn(
                "flex items-center gap-2 px-6 py-3 font-black rounded-2xl uppercase tracking-tighter transition-all border",
                isReordering 
                  ? "bg-black border-theme-primary text-theme-primary" 
                  : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
              )}
            >
              <GripVertical size={20} />
              {isReordering ? 'Parar Reordenação' : 'Reordenar'}
            </button>
            <button 
              onClick={() => {
                setFormData({
                  date: format(new Date(), 'yyyy-MM-dd'),
                  location: '',
                  modality: 'Futebol de Campo',
                  schedules: [],
                  notes: ''
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-2xl uppercase tracking-tighter hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
            >
              <Plus size={20} />
              Novo Treino
            </button>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(
            trainings.reduce((acc, t) => {
              if (!acc[t.date]) acc[t.date] = [];
              acc[t.date].push(t);
              return acc;
            }, {} as Record<string, Training[]>)
          )
          .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
          .map(([date, dayTrainings]) => {
            const isToday = date === format(new Date(), 'yyyy-MM-dd');
            
            return (
              <div key={date} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center min-w-[60px] p-2 bg-zinc-900 rounded-2xl border border-zinc-800">
                    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">{format(new Date(date + 'T12:00:00'), 'MMM')}</span>
                    <span className="text-2xl font-black text-white leading-none">{format(new Date(date + 'T12:00:00'), 'dd')}</span>
                  </div>
                  <div className="h-[1px] flex-1 bg-zinc-800/50"></div>
                  <div className="flex items-center gap-2">
                    {isToday && (
                      <span className="px-3 py-1 bg-theme-primary text-black text-[10px] font-black uppercase rounded-full">Hoje</span>
                    )}
                    {isAdmin && (
                      <button 
                        onClick={() => setFlyerData({ date, trainings: dayTrainings })}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-900 border border-zinc-800 hover:border-theme-primary/50 text-zinc-400 hover:text-theme-primary rounded-xl transition-all group"
                      >
                        <Instagram size={14} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Gerar Encarte</span>
                      </button>
                    )}
                  </div>
                </div>

                <Reorder.Group 
                  axis="y" 
                  values={dayTrainings} 
                  onReorder={(vals) => handleReorder(date, vals)}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                >
                  {dayTrainings.map((training) => {
                    const ended = isTrainingEnded(training);
                    return (
                      <Reorder.Item
                        key={training.id}
                        value={training}
                        dragListener={isReordering}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "bg-zinc-900/50 border rounded-3xl overflow-hidden group transition-all relative",
                          ended 
                            ? "border-red-500/30 hover:border-red-500/60 shadow-lg shadow-red-500/5" 
                            : "border-green-500/30 hover:border-green-500/60 shadow-lg shadow-green-500/5",
                          isReordering && "cursor-grab active:cursor-grabbing"
                        )}
                      >
                        {isReordering && (
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-theme-primary/20 p-1.5 rounded-full z-10 animate-pulse">
                            <GripVertical size={16} className="text-theme-primary" />
                          </div>
                        )}
                        <div className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className={cn(
                              "p-3 rounded-2xl",
                              ended ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                            )}>
                              <Trophy size={24} />
                            </div>
                            <div className="flex gap-2">
                              <div className={cn(
                                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                                ended ? "bg-red-500/10 text-red-500" : "bg-green-500/10 text-green-500"
                              )}>
                                {ended ? (
                                  <>
                                    <X size={10} />
                                    Encerrado
                                  </>
                                ) : (
                                  <>
                                    <Clock size={10} />
                                    Ativo
                                  </>
                                )}
                              </div>
                              {isAdmin && (
                                <div className="flex gap-1">
                                  <button onClick={() => openEdit(training)} className="p-2 text-zinc-500 hover:text-white transition-all hover:scale-110">
                                    <Edit2 size={18} />
                                  </button>
                                  <button onClick={() => handleDelete(training.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-all hover:scale-110">
                                    <Trash2 size={18} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div>
                            <h3 className="text-xl font-black text-white uppercase tracking-tighter italic leading-none">{training.modality}</h3>
                            <div className="flex items-center gap-2 mt-2 text-zinc-500">
                              <MapPin size={14} className={ended ? "text-red-500/60" : "text-green-500/60"} />
                              <span className="text-[10px] font-black uppercase tracking-widest truncate">{training.location}</span>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                              <Clock size={12} />
                              Sessões
                            </p>
                            
                            {training.schedules && training.schedules.length > 0 ? (
                              <div className="space-y-2">
                                {training.schedules.map((s, i) => (
                                  <div key={i} className={cn(
                                    "bg-black/30 border rounded-xl p-3 flex flex-col gap-2",
                                    ended ? "border-red-500/10" : "border-green-500/10"
                                  )}>
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-black text-white font-mono">{s.start_time} — {s.end_time}</span>
                                      <div className={cn("w-8 h-[1px]", ended ? "bg-red-500/20" : "bg-green-500/20")}></div>
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {s.categories.map((c, ci) => (
                                        <span key={ci} className={cn(
                                          "text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase",
                                          ended 
                                            ? "bg-red-500/10 text-red-500 border-red-500/20" 
                                            : "bg-green-500/10 text-green-500 border-green-500/20"
                                        )}>
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                    {s.notes && (
                                      <div className={cn(
                                        "mt-2 p-2 rounded-lg border flex flex-col gap-1",
                                        ended ? "bg-red-500/5 border-red-500/10" : "bg-green-500/5 border-green-500/10"
                                      )}>
                                        <div className="flex items-center gap-1 opacity-60">
                                          <FileText size={8} />
                                          <span className="text-[7px] font-black uppercase tracking-widest">Atividade do Horário</span>
                                        </div>
                                        <p className="text-[10px] text-zinc-400 font-medium leading-tight">
                                          {s.notes}
                                        </p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className={cn(
                                "bg-black/30 border rounded-xl p-3",
                                ended ? "border-red-500/10" : "border-green-500/10"
                              )}>
                                <p className="text-xs font-black text-white font-mono mb-2">{training.start_time} — {training.end_time}</p>
                                <span className={cn(
                                  "text-[9px] px-1.5 py-0.5 rounded border font-bold uppercase",
                                  ended 
                                    ? "bg-red-500/10 text-red-500 border-red-500/20" 
                                    : "bg-green-500/10 text-green-500 border-green-500/20"
                                )}>
                                  {training.category}
                                </span>
                              </div>
                            )}
                          </div>

                          {training.notes && (
                            <div className={cn(
                              "p-3 bg-black/30 rounded-xl border",
                              ended ? "border-red-500/5" : "border-green-500/5"
                            )}>
                              <p className={cn(
                                "text-[10px] font-black uppercase tracking-widest mb-1 flex items-center gap-1",
                                ended ? "text-red-500" : "text-green-500"
                              )}>
                                <FileText size={10} />
                                Observações Gerais
                              </p>
                              <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                                {training.notes}
                              </p>
                            </div>
                          )}

                          {isAdmin && (
                            <button 
                              onClick={() => setActiveAttendanceTraining(training)}
                              className={cn(
                                "w-full py-4 rounded-2xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2",
                                ended 
                                  ? "bg-zinc-800 text-zinc-500 hover:bg-zinc-700 hover:text-white" 
                                  : "bg-green-500 text-black hover:bg-green-400"
                              )}
                            >
                              {ended ? (
                                <>
                                  <FileText size={18} />
                                  Ver Chamada
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 size={18} />
                                  Fazer Chamada
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </Reorder.Item>
                    );
                  })}
                </Reorder.Group>
              </div>
            );
          })}
        </div>
      )}

      {/* Instagram Flyer Modal */}
      {flyerData && (
        <TrainingFlyer 
          date={flyerData.date}
          trainings={flyerData.trainings}
          athletes={athletes}
          onClose={() => setFlyerData(null)}
        />
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black/50">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">
                  {formData.id ? 'Editar Treino' : 'Novo Treino'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-[10px]">Data do Treino</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-[10px]">Modalidade</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                      value={formData.modality}
                      onChange={e => setFormData({...formData, modality: e.target.value})}
                    >
                      <option value="Futebol de Campo">Futebol de Campo</option>
                      <option value="Futsal">Futsal</option>
                      <option value="Volêi">Volêi</option>
                      <option value="Corrida de Rua">Corrida de Rua</option>
                      <option value="Outros">Outros</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest text-[10px]">Local</label>
                  <input 
                    required
                    type="text" 
                    placeholder="EX: CAMPO PRINCIPAL"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Grade de Horários</label>
                      <p className="text-[9px] text-zinc-600 font-bold uppercase">Defina tempos específicos para cada categoria</p>
                    </div>
                    <button 
                      type="button"
                      onClick={addSchedule}
                      className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1.5 rounded-xl hover:bg-theme-primary/10 transition-all flex items-center gap-1.5"
                    >
                      <Plus size={12} />
                      Novo Horário
                    </button>
                  </div>

                  <div className="space-y-4">
                    {(formData.schedules || []).map((schedule, idx) => (
                      <div key={idx} className="p-4 bg-black/40 border border-zinc-800 rounded-2xl space-y-4 relative group">
                        <button 
                          type="button" 
                          onClick={() => removeSchedule(idx)}
                          className="absolute top-2 right-2 p-1 text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Início</label>
                            <input 
                              type="time" 
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                              value={schedule.start_time}
                              onChange={e => updateSchedule(idx, 'start_time', e.target.value)}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Fim</label>
                            <input 
                              type="time" 
                              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-sm"
                              value={schedule.end_time}
                              onChange={e => updateSchedule(idx, 'end_time', e.target.value)}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Atividade / Observações</label>
                          <textarea 
                            rows={2}
                            placeholder="Descreva o foco deste horário..."
                            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs outline-none focus:ring-1 focus:ring-theme-primary/30 resize-none"
                            value={schedule.notes || ''}
                            onChange={e => updateSchedule(idx, 'notes', e.target.value)}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">Categorias (Subs)</label>
                          <div className="flex flex-wrap gap-2">
                            {['Todos', ...categories].map(c => {
                              const isActive = schedule.categories.includes(c);
                              return (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() => toggleCategory(idx, c)}
                                  className={cn(
                                    "px-3 py-1 rounded-lg text-[9px] font-black uppercase transition-all border",
                                    isActive 
                                      ? "bg-theme-primary border-theme-primary text-black" 
                                      : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-500"
                                  )}
                                >
                                  {c}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ))}

                    {(!formData.schedules || formData.schedules.length === 0) && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Início</label>
                          <input 
                            required={!formData.schedules || formData.schedules.length === 0}
                            type="time" 
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
                            value={formData.start_time}
                            onChange={e => setFormData({...formData, start_time: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fim</label>
                          <input 
                            required={!formData.schedules || formData.schedules.length === 0}
                            type="time" 
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none"
                            value={formData.end_time}
                            onChange={e => setFormData({...formData, end_time: e.target.value})}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria</label>
                          <select 
                            required={!formData.schedules || formData.schedules.length === 0}
                            className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none uppercase"
                            value={formData.category}
                            onChange={e => setFormData({...formData, category: e.target.value})}
                          >
                            <option value="Todos">Todos</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observações Gerais / Instruções</label>
                  <textarea 
                    placeholder="Instruções gerais, materiais ou recados para o dia..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none h-24 resize-none text-sm leading-relaxed"
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-theme-primary text-black rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-theme-primary/20 hover:opacity-90 transition-all"
                >
                  {formData.id ? 'Salvar Alterações' : 'Cadastrar Treino'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
