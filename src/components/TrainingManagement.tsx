import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Training, Athlete, categories } from '../types';
import { Plus, Calendar, Clock, MapPin, Trophy, Users, Trash2, Edit2, CheckCircle2, X, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import Attendance from './Attendance';

interface TrainingManagementProps {
  athletes?: Athlete[];
  role?: 'admin' | 'student';
}

export default function TrainingManagement({ athletes: athletesProp, role = 'admin' }: TrainingManagementProps) {
  const isAdmin = role === 'admin';
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [activeAttendanceTraining, setActiveAttendanceTraining] = useState<Training | null>(null);
  
  const [formData, setFormData] = useState<Partial<Training>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    location: '',
    modality: 'Futebol de Campo',
    schedules: []
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
      
      setTrainings(trainingsData.sort((a, b) => b.date.localeCompare(a.date)));
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
        schedules: []
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

  const openEdit = (training: Training) => {
    setFormData(training);
    setIsModalOpen(true);
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
          <button 
            onClick={() => {
              setFormData({
                date: format(new Date(), 'yyyy-MM-dd'),
                location: '',
                modality: 'Futebol de Campo',
                schedules: []
              });
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-2xl uppercase tracking-tighter hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
          >
            <Plus size={20} />
            Novo Treino
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainings.map((training) => (
            <motion.div
              key={training.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-theme-primary/50 transition-all"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                    <Trophy size={24} />
                  </div>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(training)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDelete(training.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">{training.modality}</h3>
                  {training.schedules && training.schedules.length > 0 ? (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {training.schedules.map((s, i) => (
                        <span key={i} className="text-[10px] bg-zinc-800 text-zinc-500 px-2 py-0.5 rounded-lg border border-zinc-700 font-bold uppercase font-mono">
                          {s.categories.join('/')}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{training.category}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar size={14} className="text-theme-primary" />
                    <span className="text-xs font-bold uppercase">{format(new Date(training.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                  </div>
                  {training.schedules && training.schedules.length > 0 ? (
                    <div className="space-y-1">
                      {training.schedules.map((s, i) => (
                        <div key={i} className="flex items-center gap-2 text-zinc-400">
                          <Clock size={12} className="text-theme-primary opacity-50" />
                          <span className="text-[10px] font-bold uppercase">
                            {s.start_time} - {s.end_time}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-zinc-400">
                      <Clock size={14} className="text-theme-primary" />
                      <span className="text-xs font-bold uppercase">{training.start_time} - {training.end_time}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MapPin size={14} className="text-theme-primary" />
                    <span className="text-xs font-bold uppercase truncate">{training.location}</span>
                  </div>
                </div>

                {isAdmin && (
                  <button 
                    onClick={() => setActiveAttendanceTraining(training)}
                    className="w-full py-4 bg-zinc-800 hover:bg-theme-primary hover:text-black text-white rounded-2xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 size={18} />
                    Fazer Chamada
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
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
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Horários por Sub</label>
                    <button 
                      type="button"
                      onClick={addSchedule}
                      className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1 rounded-lg hover:bg-theme-primary/10 transition-all"
                    >
                      + Adicionar Horário
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
