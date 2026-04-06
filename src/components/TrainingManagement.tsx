import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Training, Athlete } from '../types';
import { Plus, Calendar, Clock, MapPin, Trophy, Users, Trash2, Edit2, CheckCircle2, X } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import Attendance from './Attendance';

interface TrainingManagementProps {
  athletes?: Athlete[];
}

export default function TrainingManagement({ athletes: athletesProp }: TrainingManagementProps) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<Training | null>(null);
  const [activeAttendanceTraining, setActiveAttendanceTraining] = useState<Training | null>(null);
  
  const [formData, setFormData] = useState<Partial<Training>>({
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: format(new Date(), 'HH:mm'),
    end_time: format(new Date(), 'HH:mm'),
    location: '',
    modality: 'Futebol de Campo',
    category: 'Todos'
  });

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
        start_time: format(new Date(), 'HH:mm'),
        end_time: format(new Date(), 'HH:mm'),
        location: '',
        modality: 'Futebol de Campo',
        category: 'Todos'
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
              <p className="text-xs text-zinc-500 uppercase tracking-widest">
                {format(new Date(activeAttendanceTraining.date + 'T12:00:00'), 'dd/MM/yyyy')} das {activeAttendanceTraining.start_time} às {activeAttendanceTraining.end_time} - {activeAttendanceTraining.location}
              </p>
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
        <Attendance athletes={athletes} trainingId={activeAttendanceTraining.id} initialDate={activeAttendanceTraining.date} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Gestão de Treinos</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Cadastre e gerencie os horários de treinos</p>
        </div>
        <button 
          onClick={() => {
            setFormData({
              date: format(new Date(), 'yyyy-MM-dd'),
              start_time: format(new Date(), 'HH:mm'),
              end_time: format(new Date(), 'HH:mm'),
              location: '',
              modality: 'Futebol de Campo',
              category: 'Todos'
            });
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-2xl uppercase tracking-tighter hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
        >
          <Plus size={20} />
          Novo Treino
        </button>
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
                  <div className="flex gap-2">
                    <button onClick={() => openEdit(training)} className="p-2 text-zinc-500 hover:text-white transition-colors">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => handleDelete(training.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>

                <div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">{training.modality}</h3>
                  <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{training.category}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Calendar size={14} className="text-theme-primary" />
                    <span className="text-xs font-bold uppercase">{format(new Date(training.date + 'T12:00:00'), 'dd/MM/yyyy')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <Clock size={14} className="text-theme-primary" />
                    <span className="text-xs font-bold uppercase">{training.start_time} - {training.end_time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-zinc-400">
                    <MapPin size={14} className="text-theme-primary" />
                    <span className="text-xs font-bold uppercase truncate">{training.location}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setActiveAttendanceTraining(training)}
                  className="w-full py-4 bg-zinc-800 hover:bg-theme-primary hover:text-black text-white rounded-2xl font-black uppercase tracking-tighter transition-all flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={18} />
                  Fazer Chamada
                </button>
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

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</label>
                    <input 
                      required
                      type="date" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none"
                      value={formData.date}
                      onChange={e => setFormData({...formData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Início</label>
                    <input 
                      required
                      type="time" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none"
                      value={formData.start_time}
                      onChange={e => setFormData({...formData, start_time: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Fim</label>
                    <input 
                      required
                      type="time" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none"
                      value={formData.end_time}
                      onChange={e => setFormData({...formData, end_time: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Local</label>
                  <input 
                    required
                    type="text" 
                    placeholder="EX: CAMPO PRINCIPAL"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Modalidade</label>
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
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value})}
                    >
                      <option value="Todos">Todos</option>
                      <option value="SUB 7">SUB 7</option>
                      <option value="SUB 9">SUB 9</option>
                      <option value="SUB 11">SUB 11</option>
                      <option value="SUB 13">SUB 13</option>
                      <option value="SUB 15">SUB 15</option>
                      <option value="SUB 17">SUB 17</option>
                      <option value="SUB ADULTO">SUB ADULTO</option>
                    </select>
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
