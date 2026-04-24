import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TrainingActivity } from '../types';
import { Plus, Search, Filter, Trash2, Edit2, Shield, Sword, Zap, Brain, Activity, Clock, Package, ChevronRight, X, Info } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface ActivityManagementProps {
  onSelect?: (activity: TrainingActivity) => void;
  isPicker?: boolean;
}

const CATEGORIES = [
  { id: "Aquecimento", name: "Aquecimento", icon: <Activity size={16} />, color: "text-orange-400", bg: "bg-orange-400/10" },
  { id: "Alongamento", name: "Alongamento", icon: <Activity size={16} />, color: "text-pink-400", bg: "bg-pink-400/10" },
  { id: "Coordenação Motora", name: "Coordenação Motora", icon: <Zap size={16} />, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "Fundamento", name: "Fundamento", icon: <Brain size={16} />, color: "text-blue-500", bg: "bg-blue-500/10" },
  { id: "Ataque", name: "Ataque", icon: <Sword size={16} />, color: "text-red-500", bg: "bg-red-500/10" },
  { id: "Defesa", name: "Defesa", icon: <Shield size={16} />, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "Agilidade", name: "Agilidade", icon: <Zap size={16} />, color: "text-yellow-500", bg: "bg-yellow-500/10" },
  { id: "Físico", name: "Físico", icon: <Activity size={16} />, color: "text-purple-500", bg: "bg-purple-500/10" },
  { id: "Tático", name: "Tático", icon: <Brain size={16} />, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "Goleiro", name: "Goleiro", icon: <Shield size={16} />, color: "text-orange-500", bg: "bg-orange-500/10" },
  { id: "Conscientização", name: "Conscientização", icon: <Info size={16} />, color: "text-cyan-500", bg: "bg-cyan-500/10" },
  { id: "Outro", name: "Outro", icon: <Package size={16} />, color: "text-zinc-500", bg: "bg-zinc-500/10" },
];

export default function ActivityManagement({ onSelect, isPicker = false }: ActivityManagementProps) {
  const [activities, setActivities] = useState<TrainingActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<TrainingActivity | null>(null);

  const [formData, setFormData] = useState<Partial<TrainingActivity>>({
    name: '',
    description: '',
    category: 'Fundamento',
    intensity: 'Média',
    duration: 15,
    equipment: ''
  });

  useEffect(() => {
    loadActivities();
  }, []);

  const loadActivities = async () => {
    setLoading(true);
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch (err) {
      toast.error("Erro ao carregar biblioteca");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveActivity(formData);
      toast.success(formData.id ? "Atividade atualizada!" : "Atividade adicionada à biblioteca!");
      setIsModalOpen(false);
      setFormData({
        name: '',
        description: '',
        category: 'Fundamento',
        intensity: 'Média',
        duration: 15,
        equipment: ''
      });
      loadActivities();
    } catch (err) {
      toast.error("Erro ao salvar atividade");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Deseja remover esta atividade da biblioteca?")) return;
    try {
      await api.deleteActivity(id);
      toast.success("Atividade removida!");
      loadActivities();
    } catch (err) {
      toast.error("Erro ao remover atividade");
    }
  };

  const openEdit = (activity: TrainingActivity) => {
    setFormData(activity);
    setIsModalOpen(true);
  };

  const seedTemplates = async () => {
    const templates: Partial<TrainingActivity>[] = [
      {
        name: "AQUECIMENTO DINÂMICO COM BOLA",
        category: "Aquecimento",
        intensity: "Baixa",
        duration: 10,
        equipment: "BOLAS",
        description: "Condução leve de bola em espaço reduzido com trocas de direção ao sinal do treinador. Auxilia na ativação neuromuscular e contato inicial com a bola."
      },
      {
        name: "ALONGAMENTO DINÂMICO FUNCIONAL",
        category: "Alongamento",
        intensity: "Baixa",
        duration: 8,
        equipment: "NENHUM",
        description: "Sequência de movimentos ativos para ganho de amplitude: chute ao ar controlado, avanço com rotação de tronco e mobilidade de tornozelo."
      },
      {
        name: "COORDENAÇÃO EM ESCADA DE AGILIDADE",
        category: "Coordenação Motora",
        intensity: "Média",
        duration: 12,
        equipment: "ESCADA DE AGILIDADE",
        description: "Exercícios de skipping lateral, Ickey Shuffle e entrada/saída dupla. Foco total na precisão dos pés dentro dos quadrados da escada."
      },
      {
        name: "COORDENAÇÃO ÓCULO-MANUAL/PEDAL",
        category: "Coordenação Motora",
        intensity: "Baixa",
        duration: 15,
        equipment: "BOLAS DE TÊNIS E FUTEBOL",
        description: "O atleta faz o controle da bola de futebol com os pés enquanto realiza lançamentos de uma bola de tênis com as mãos para um parceiro."
      },
      {
        name: "AQUECIMENTO COGNITIVO 'PEGA-PEGA'",
        category: "Aquecimento",
        intensity: "Média",
        duration: 10,
        equipment: "COLETES",
        description: "Jogo de perseguição em pares onde um deve tocar o ombro do outro. Estimula a percepção espacial e prepara o sistema cardiovascular."
      },
      {
        name: "MANUTENÇÃO DE POSSE (4x4 + 3)",
        category: "Tático",
        intensity: "Alta",
        duration: 15,
        equipment: "COLETES, CONES, BOLAS",
        description: "Exercício de rondo expandido focando em transição defensiva e ocupação de espaços. Os coringas jogam sempre com o time que tem a bola."
      },
      {
        name: "FINALIZAÇÃO APÓS DRIBLE CURTO",
        category: "Fundamento",
        intensity: "Média",
        duration: 20,
        equipment: "GOL, BOLAS, ESTACAS",
        description: "O atleta deve realizar um drible em zigue-zague nas estacas e finalizar de fora da área com precisão nos cantos."
      },
      {
        name: "LINHA DE DEFESA (CENTRALIZAÇÃO)",
        category: "Defesa",
        intensity: "Baixa",
        duration: 20,
        equipment: "BOLAS",
        description: "Trabalho de posicionamento da linha de 4 defensores. Foco em basculação (balanço) conforme o movimento da bola lateralmente."
      },
      {
        name: "CIRCUITO DE AGILIDADE 'T'",
        category: "Agilidade",
        intensity: "Alta",
        duration: 10,
        equipment: "CRONÔMETRO, CONES",
        description: "Movimentos frontais, laterais e de costas em formato de T. Foco na velocidade de reação e troca de direção rápida."
      },
      {
        name: "SCANNIG E TOMADA DE DECISÃO",
        category: "Conscientização",
        intensity: "Média",
        duration: 15,
        equipment: "CONES COLORIDOS",
        description: "Atleta recebe a bola e deve identificar a cor do cone levantado pelo instrutor atrás dele antes de realizar o passe."
      }
    ];

    if (!confirm("Isso adicionará 10 modelos de treinos profissionais à sua biblioteca. Continuar?")) return;

    try {
      for (const t of templates) {
        await api.saveActivity(t);
      }
      toast.success("Modelos adicionados com sucesso!");
      loadActivities();
    } catch (err) {
      toast.error("Erro ao adicionar modelos");
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || activity.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white tracking-tight uppercase italic">Biblioteca de Atividades</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Metodologia e Exercícios</p>
        </div>
        {!isPicker && (
          <div className="flex items-center gap-2">
            <button 
              onClick={seedTemplates}
              className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 font-bold rounded-2xl uppercase tracking-tighter hover:text-theme-primary hover:border-theme-primary/50 transition-all"
            >
              <Zap size={18} />
              Sugestões Pro
            </button>
            <button 
              onClick={() => {
                setFormData({
                  name: '',
                  description: '',
                  category: 'Fundamento',
                  intensity: 'Média',
                  duration: 15,
                  equipment: ''
                });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-2xl uppercase tracking-tighter hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
            >
              <Plus size={20} />
              Nova Atividade
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text"
            placeholder="PROCURAR EXERCÍCIO..."
            className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-xs font-bold font-mono tracking-widest"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
          <button 
            onClick={() => setSelectedCategory('Todos')}
            className={cn(
              "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border",
              selectedCategory === 'Todos' ? "bg-theme-primary border-theme-primary text-black" : "bg-zinc-900 border-zinc-800 text-zinc-500"
            )}
          >
            Todos
          </button>
          {CATEGORIES.map(cat => (
            <button 
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border flex items-center gap-2",
                selectedCategory === cat.id ? "bg-zinc-900 border-theme-primary text-theme-primary shadow-lg shadow-theme-primary/10" : "bg-zinc-900 border-zinc-800 text-zinc-500"
              )}
            >
              {cat.icon}
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-theme-primary"></div>
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/50 rounded-3xl border border-zinc-800 border-dashed max-w-2xl mx-auto">
          <Package className="mx-auto text-zinc-700 mb-4" size={48} />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">Nenhuma atividade encontrada</p>
          <p className="text-zinc-700 text-[10px] uppercase mt-1 mb-6">Crie sua metodologia personalizada ou use nossos modelos profisionais</p>
          {!isPicker && (
            <button 
              onClick={seedTemplates}
              className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-theme-primary rounded-xl font-black uppercase tracking-tighter transition-all text-[10px] border border-zinc-700"
            >
              Carregar Sugestões Profissionais
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredActivities.map(activity => {
            const category = CATEGORIES.find(c => c.id === activity.category) || CATEGORIES[CATEGORIES.length - 1];
            return (
              <motion.div 
                layout
                key={activity.id}
                onClick={() => isPicker && onSelect?.(activity)}
                className={cn(
                  "bg-black/40 border border-zinc-800 p-6 rounded-[2rem] group hover:border-theme-primary/50 transition-all cursor-pointer relative overflow-hidden",
                  isPicker && "hover:bg-theme-primary/5"
                )}
              >
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                  <div className="scale-[4]">
                    {category.icon}
                  </div>
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className={cn("p-3 rounded-2xl", category.bg, category.color)}>
                    {category.icon}
                  </div>
                  {!isPicker && (
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); openEdit(activity); }} className="p-2 text-zinc-500 hover:text-white transition-all">
                        <Edit2 size={16} />
                      </button>
                      <button onClick={(e) => handleDelete(e, activity.id)} className="p-2 text-zinc-500 hover:text-red-500 transition-all">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="relative z-10">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("text-[9px] font-black uppercase tracking-[0.2em]", category.color)}>{category.name}</span>
                    <span className="w-1 h-1 rounded-full bg-zinc-800"></span>
                    <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest">{activity.intensity} Intensidade</span>
                  </div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tighter italic mb-3 group-hover:text-theme-primary transition-colors">{activity.name}</h3>
                  <p className="text-xs text-zinc-500 leading-relaxed line-clamp-3 mb-6 font-medium italic">
                    "{activity.description}"
                  </p>

                  <div className="pt-6 border-t border-zinc-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {activity.duration && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Clock size={12} className="text-theme-primary" />
                          <span className="text-[10px] font-black font-mono">{activity.duration} MIN</span>
                        </div>
                      )}
                      {activity.equipment && (
                        <div className="flex items-center gap-1.5 text-zinc-400">
                          <Package size={12} className="text-theme-primary" />
                          <span className="text-[10px] font-black uppercase tracking-widest truncate max-w-[80px]">{activity.equipment}</span>
                        </div>
                      )}
                    </div>
                    {isPicker && (
                      <ChevronRight className="text-theme-primary group-hover:translate-x-1 transition-transform" size={18} />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-black/50">
                <h3 className="text-xl font-black text-white uppercase tracking-tighter italic">
                  {formData.id ? 'Editar Atividade' : 'Nova Atividade'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nome da Atividade</label>
                  <input 
                    required
                    type="text" 
                    placeholder="EX: DRIBLE CURTO EM VELOCIDADE"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Categoria Principal</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: e.target.value as any})}
                    >
                      {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Intensidade</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.intensity}
                      onChange={e => setFormData({...formData, intensity: e.target.value as any})}
                    >
                      <option value="Baixa">Baixa</option>
                      <option value="Média">Média</option>
                      <option value="Alta">Alta</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Duração Estimada (min)</label>
                    <input 
                      type="number" 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50"
                      value={formData.duration}
                      onChange={e => setFormData({...formData, duration: parseInt(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Equipamento Necessário</label>
                    <input 
                      type="text" 
                      placeholder="EX: CONES, ESCADA"
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase"
                      value={formData.equipment}
                      onChange={e => setFormData({...formData, equipment: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Descrição Metodológica</label>
                  <textarea 
                    required
                    placeholder="Descreva passo a passo como realizar a atividade, o que o atleta deve focar e qual o objetivo principal..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 h-32 resize-none text-sm leading-relaxed"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-5 bg-theme-primary text-black rounded-2xl font-black uppercase tracking-tighter shadow-lg shadow-theme-primary/20 hover:opacity-90 transition-all"
                >
                  {formData.id ? 'Salvar Alterações' : 'Adicionar à Biblioteca'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
