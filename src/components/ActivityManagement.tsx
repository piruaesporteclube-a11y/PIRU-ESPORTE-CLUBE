import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TrainingActivity } from '../types';
import { Plus, Search, Filter, Trash2, Edit2, Shield, Sword, Zap, Brain, Activity, Clock, Package, ChevronRight, X, Info, Play, Trophy, Users, Star, ChevronDown, Move } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import DrillVisualizer from './DrillVisualizer';

interface ActivityManagementProps {
  onSelect?: (activity: TrainingActivity) => void;
  isPicker?: boolean;
}

const MODALITIES = ["Futebol", "Futsal", "Vôlei", "Basquete", "Futebol de Areia", "Outros"];
const DIFFICULTIES = ["Iniciante", "Intermediário", "Avançado"];

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
  const [selectedModality, setSelectedModality] = useState<string>('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [visualizingActivity, setVisualizingActivity] = useState<TrainingActivity | null>(null);

  const [formData, setFormData] = useState<Partial<TrainingActivity>>({
    name: '',
    description: '',
    category: 'Fundamento',
    modality: 'Futebol',
    intensity: 'Média',
    difficulty: 'Iniciante',
    duration: 15,
    equipment: '',
    youtubeUrl: '',
    visualData: ''
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
      resetForm();
      loadActivities();
    } catch (err) {
      toast.error("Erro ao salvar atividade");
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Fundamento',
      modality: 'Futebol',
      intensity: 'Média',
      difficulty: 'Iniciante',
      duration: 15,
      equipment: '',
      youtubeUrl: '',
      visualData: ''
    });
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
      // FUTEBOL
      {
        name: "CIRCUITO TÉCNICO DE CONDUÇÃO",
        modality: "Futebol",
        category: "Fundamento",
        intensity: "Média",
        difficulty: "Intermediário",
        duration: 15,
        equipment: "6 CONES, 2 ESTACAS, 1 BOLA",
        description: "Circuito em 'S' focando em controle de bola com ambos os pés. Finaliza com um passe longo entre as estacas.",
        youtubeUrl: "https://www.youtube.com/watch?v=5-0V2o7DpxE",
        visualData: JSON.stringify([
          { id: 'c1', type: 'cone', x: 20, y: 30 },
          { id: 'c2', type: 'cone', x: 30, y: 70 },
          { id: 'c3', type: 'cone', x: 40, y: 30 },
          { id: 'c4', type: 'cone', x: 50, y: 70 },
          { id: 's1', type: 'stake', x: 80, y: 40 },
          { id: 's2', type: 'stake', x: 80, y: 60 },
          { id: 'p1', type: 'player', x: 10, y: 50, team: 'A', label: '1', animate: true, toX: 75, toY: 50 },
          { id: 'b1', type: 'ball', x: 12, y: 50, animate: true, toX: 77, toY: 50 }
        ])
      },
      {
        name: "PRESSÃO PÓS-PERDA (RONDÒ)",
        modality: "Futebol",
        category: "Tático",
        intensity: "Alta",
        difficulty: "Avançado",
        duration: 12,
        equipment: "4 CONES, 1 BOLA, COLETES",
        description: "Quadrado de 10x10m. 4 atacantes contra 2 defensores. O foco é a reação instantânea após perder a posse.",
        youtubeUrl: "https://www.youtube.com/watch?v=Nn1EaIeI58Q",
        visualData: JSON.stringify([
          { id: 'c1', type: 'cone', x: 30, y: 30 },
          { id: 'c2', type: 'cone', x: 70, y: 30 },
          { id: 'c3', type: 'cone', x: 70, y: 70 },
          { id: 'c4', type: 'cone', x: 30, y: 70 },
          { id: 'a1', type: 'player', x: 30, y: 50, team: 'A', label: '1', animate: true, toX: 35, toY: 50 },
          { id: 'a2', type: 'player', x: 70, y: 50, team: 'A', label: '2', animate: true, toX: 65, toY: 50 },
          { id: 'a3', type: 'player', x: 50, y: 30, team: 'A', label: '3', animate: true, toX: 50, toY: 35 },
          { id: 'a4', type: 'player', x: 50, y: 70, team: 'A', label: '4', animate: true, toX: 50, toY: 65 },
          { id: 'd1', type: 'player', x: 45, y: 50, team: 'B', label: 'D1', animate: true, toX: 48, toY: 50 },
          { id: 'd2', type: 'player', x: 55, y: 50, team: 'B', label: 'D2', animate: true, toX: 52, toY: 50 },
          { id: 'b1', type: 'ball', x: 35, y: 50, animate: true, toX: 65, toY: 50 }
        ])
      },
      // VÔLEI
      {
        name: "SISTEMA DE DEFESA 2-1-3",
        modality: "Vôlei",
        category: "Tático",
        intensity: "Média",
        difficulty: "Avançado",
        duration: 25,
        equipment: "REDE, ANTENAS, BOLAS",
        description: "Posicionamento defensivo em relação ao ataque adversário pelas pontas. Cobertura do bloqueio.",
        youtubeUrl: "https://www.youtube.com/watch?v=0hLzJ59TzM4",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 20, y: 20, team: 'A', label: '1', animate: true, toX: 25, toY: 25 },
          { id: 'p2', type: 'player', x: 20, y: 50, team: 'A', label: '6', animate: true, toX: 25, toY: 50 },
          { id: 'p3', type: 'player', x: 20, y: 80, team: 'A', label: '5', animate: true, toX: 25, toY: 75 },
          { id: 'p4', type: 'player', x: 40, y: 30, team: 'A', label: '2', animate: true, toX: 45, toY: 35 },
          { id: 'p5', type: 'player', x: 40, y: 70, team: 'A', label: '4', animate: true, toX: 45, toY: 65 },
          { id: 'p6', type: 'player', x: 45, y: 50, team: 'A', label: '3', animate: true, toX: 48, toY: 50 },
          { id: 'arr1', type: 'arrow', x: 45, y: 50, toX: 55, toY: 50, color: '#f87171' }
        ])
      },
      // BASQUETE
      {
        name: "FOOTWORK E TIRO APÓS DRIBLE",
        modality: "Basquete",
        category: "Fundamento",
        intensity: "Alta",
        difficulty: "Intermediário",
        duration: 20,
        equipment: "CESTAS, 3 CONES",
        description: "Trabalho de pés (pro-hop ou step-back) após drible intenso entre cones, finalizando com arremesso.",
        youtubeUrl: "https://www.youtube.com/watch?v=tYk52u_t_vM",
        visualData: JSON.stringify([
          { id: 'c1', type: 'cone', x: 20, y: 20 },
          { id: 'c2', type: 'cone', x: 30, y: 30 },
          { id: 'c3', type: 'cone', x: 20, y: 40 },
          { id: 'p1', type: 'player', x: 10, y: 10, team: 'A', animate: true, toX: 80, toY: 50 },
          { id: 'b1', type: 'ball', x: 12, y: 10, animate: true, toX: 85, toY: 50 }
        ])
      },
      // FUTSAL
      {
        name: "ALA E PIVÔ: TABELA RÁPIDA",
        modality: "Futsal",
        category: "Fundamento",
        intensity: "Alta",
        difficulty: "Intermediário",
        duration: 15,
        equipment: "BOLA PESADA, 2 ATLETAS",
        description: "Passe do ala para o pivô, infiltração em velocidade e devolução para finalização de primeira.",
        youtubeUrl: "https://www.youtube.com/watch?v=UayS0uH1zY4",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 20, y: 80, team: 'A', label: 'ALA', animate: true, toX: 50, toY: 50 },
          { id: 'p2', type: 'player', x: 60, y: 50, team: 'A', label: 'PIVÔ', animate: true, toX: 70, toY: 50 },
          { id: 'b1', type: 'ball', x: 25, y: 80, animate: true, toX: 55, toY: 53 }
        ])
      },
      // FUTEBOL DE AREIA
      {
        name: "BICICLETA E FINALIZAÇÃO AÉREA",
        modality: "Futebol de Areia",
        category: "Fundamento",
        intensity: "Alta",
        difficulty: "Avançado",
        duration: 20,
        equipment: "BOLAS, REDE DE FUTEBOL DE AREIA",
        description: "Levantamento de bola com o pé e execução de movimentos acrobáticos (bicicleta/voleio) na areia.",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 50, y: 80, team: 'A', label: '1', animate: true, toX: 50, toY: 40 },
          { id: 'p2', type: 'player', x: 20, y: 40, team: 'A', label: '2', animate: true, toX: 45, toY: 40 },
          { id: 'b1', type: 'ball', x: 22, y: 40, animate: true, toX: 48, toY: 40 }
        ])
      }
    ];

    if (!confirm("Isso adicionará modelos profissionais com esquemas táticos e vídeos. Continuar?")) return;

    try {
      console.log("Seeding templates...");
      for (const t of templates) {
        // Explicitly inject a temporary ID to satisfy firestore rules if needed
        const templateWithId = { ...t, id: `tmp_${Math.random().toString(36).substr(2, 9)}` };
        await api.saveActivity(templateWithId);
      }
      toast.success("Modelos profissionais adicionados!");
      loadActivities();
    } catch (err) {
      console.error("Seed error:", err);
      toast.error(`Erro ao adicionar modelos: ${err instanceof Error ? err.message : 'Erro desconhecido'}`);
    }
  };

  const filteredActivities = activities.filter(activity => {
    const matchesSearch = activity.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         activity.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'Todos' || activity.category === selectedCategory;
    const matchesModality = selectedModality === 'Todos' || activity.modality === selectedModality;
    return matchesSearch && matchesCategory && matchesModality;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-theme-primary/10 rounded-2xl">
              <Star className="text-theme-primary" size={24} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Metodologia Pro</h2>
              <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Gestão de Treinos e Atividades</p>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {!isPicker && (
            <button 
              onClick={seedTemplates}
              className="flex items-center gap-2 px-5 py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 font-black rounded-2xl uppercase tracking-tighter hover:text-theme-primary hover:border-theme-primary/30 transition-all text-xs"
            >
              <Star size={18} fill="currentColor" className="text-theme-primary" />
              Sugestões da IA
            </button>
          )}
          <button 
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
            className="flex items-center gap-2 px-8 py-4 bg-white text-black font-black rounded-2xl uppercase tracking-tighter hover:bg-theme-primary transition-all shadow-xl shadow-theme-primary/20 text-sm"
          >
            <Plus size={22} />
            Criar Atividade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 p-4 bg-zinc-900/30 rounded-[2.5rem] border border-zinc-800/50">
        <div className="lg:col-span-2 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
          <input 
            type="text"
            placeholder="BUSCAR NA METODOLOGIA..."
            className="w-full pl-12 pr-4 py-4 bg-black/40 border border-zinc-800/50 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-[10px] font-black tracking-widest"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="relative">
          <select 
            className="w-full h-full px-4 py-4 bg-black/40 border border-zinc-800/50 rounded-2xl text-white outline-none appearance-none uppercase text-[10px] font-black tracking-widest cursor-pointer"
            value={selectedModality}
            onChange={e => setSelectedModality(e.target.value)}
          >
            <option value="Todos">Todas Modalidades</option>
            {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
        </div>

        <div className="relative">
          <select 
            className="w-full h-full px-4 py-4 bg-black/40 border border-zinc-800/50 rounded-2xl text-white outline-none appearance-none uppercase text-[10px] font-black tracking-widest cursor-pointer"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
          >
            <option value="Todos">Categorias</option>
            {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={16} />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="h-12 w-12 border-4 border-theme-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredActivities.length === 0 ? (
        <div className="py-32 text-center bg-zinc-900/30 rounded-[3rem] border border-zinc-800/50 border-dashed max-w-2xl mx-auto">
          <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto mb-6">
            <Package className="text-zinc-600" size={40} />
          </div>
          <p className="text-white font-black uppercase tracking-tighter italic text-xl mb-2">Sua biblioteca está vazia</p>
          <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-8">Nenhum exercício encontrado para estes filtros</p>
          {!isPicker && (
            <button 
              onClick={seedTemplates}
              className="px-10 py-4 bg-white/5 hover:bg-theme-primary hover:text-black text-theme-primary rounded-2xl font-black uppercase tracking-tighter transition-all border border-theme-primary/20"
            >
              Carregar Sugestões Pro
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredActivities.map(activity => {
            const category = CATEGORIES.find(c => c.id === activity.category) || CATEGORIES[CATEGORIES.length - 1];
            return (
              <motion.div 
                layout
                key={activity.id}
                onClick={() => isPicker && onSelect?.(activity)}
                className={cn(
                  "bg-black/40 border border-zinc-800/80 p-8 rounded-[2.5rem] group hover:border-theme-primary transition-all cursor-pointer relative overflow-hidden backdrop-blur-sm",
                  isPicker && "hover:bg-theme-primary/5"
                )}
              >
                <div className="absolute -right-4 -top-4 w-32 h-32 bg-theme-primary/5 rounded-full blur-3xl group-hover:bg-theme-primary/10 transition-colors" />

                <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className={cn("p-4 rounded-2xl shadow-xl", category.bg, category.color)}>
                      {category.icon}
                    </div>
                    <div>
                      <span className={cn("text-[10px] font-black uppercase tracking-widest", category.color)}>{category.name}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">{activity.modality}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 transform translate-x-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setVisualizingActivity(activity);
                      }}
                      className="p-3 rounded-xl bg-theme-primary text-black hover:scale-110 transition-all shadow-lg shadow-theme-primary/20"
                    >
                      <Play size={18} fill="currentColor" />
                    </button>
                    {!isPicker && (
                      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={(e) => { e.stopPropagation(); openEdit(activity); }} className="p-3 text-zinc-500 hover:text-white transition-all">
                          <Edit2 size={18} />
                        </button>
                        <button onClick={(e) => handleDelete(e, activity.id)} className="p-3 text-zinc-500 hover:text-red-500 transition-all">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="relative z-10 space-y-4">
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter italic group-hover:text-theme-primary transition-colors leading-tight">
                    {activity.name}
                  </h3>
                  
                  <p className="text-zinc-500 text-xs leading-relaxed line-clamp-3 font-medium italic mb-6">
                    "{activity.description}"
                  </p>

                  <div className="flex items-center gap-3">
                     <span className={cn(
                       "px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest border",
                       activity.difficulty === 'Avançado' ? "bg-red-500/10 border-red-500/20 text-red-500" :
                       activity.difficulty === 'Intermediário' ? "bg-yellow-500/10 border-yellow-500/20 text-yellow-500" :
                       "bg-emerald-500/10 border-emerald-500/20 text-emerald-500"
                     )}>
                       {activity.difficulty}
                     </span>
                     <span className="px-2 py-1 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-md text-[8px] font-black uppercase tracking-widest">
                       {activity.intensity} INT.
                     </span>
                  </div>

                  <div className="pt-6 border-t border-zinc-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                      {activity.duration && (
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Clock size={14} className="text-theme-primary" />
                          <span className="text-[11px] font-black font-mono">{activity.duration} MIN</span>
                        </div>
                      )}
                    </div>
                    {isPicker ? (
                      <div className="p-3 bg-white/5 rounded-xl text-theme-primary group-hover:bg-theme-primary group-hover:text-black transition-all">
                        <Plus size={18} />
                      </div>
                    ) : (
                      <ChevronRight className="text-zinc-800 group-hover:text-theme-primary transform group-hover:translate-x-1 transition-all" size={24} />
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-black/30">
                <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter italic">
                    {formData.id ? 'Refinar Atividade' : 'Nova Metodologia'}
                  </h3>
                  <p className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest mt-1">Defina os parâmetros técnicos</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (!confirm("Deseja usar a IA para gerar uma descrição técnica para este título?")) return;
                      // Em um app real chamaríamos a API aqui. 
                      // Por enquanto vamos simular um texto técnico.
                      setFormData(prev => ({
                        ...prev,
                        description: `OBJETIVO: Aprimorar ${prev.name || 'a técnica'}.\nEXECUÇÃO: Dividir em grupos de 4. Focar na intensidade e postura corporal.\nCOBRANÇA: Atenção máxima aos detalhes do movimento.`
                      }));
                      toast.success("Sugestão técnica gerada!");
                    }}
                    className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl hover:bg-theme-primary hover:text-black transition-all flex items-center gap-2 text-[10px] font-black uppercase"
                  >
                    <Brain size={18} />
                    Auto-Desc
                  </button>
                  <button onClick={() => setIsModalOpen(false)} className="p-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-2xl transition-colors">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-10 space-y-8 overflow-y-auto custom-scrollbar">
                <div className="p-6 bg-black/50 border border-zinc-800 rounded-[2rem] space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Move size={16} className="text-theme-primary" />
                    <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Editor de Esquema Tático</h4>
                  </div>
                  <div className="h-[300px] w-full">
                    <DrillVisualizer 
                      activity={formData as any} 
                      isEditable={true} 
                      onChange={(data) => setFormData(prev => ({ ...prev, visualData: data }))}
                    />
                  </div>
                  <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest text-center mt-2 italic">
                    ARRASTE OS ELEMENTOS PARA POSICIONAR. USE O MENU ACIMA PARA ADICIONAR NOVOS.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4 col-span-1 md:col-span-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Nomenclatura Técnica</label>
                    <input 
                      required
                      type="text" 
                      placeholder="EX: TRANSIÇÃO DEFENSIVA RÁPIDA"
                      className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-bold text-sm tracking-tight"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})}
                    />
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Modalidade</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-xs font-bold appearance-none cursor-pointer"
                        value={formData.modality}
                        onChange={e => setFormData({...formData, modality: e.target.value as any})}
                      >
                        {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Categoria Técnica</label>
                    <div className="relative">
                      <select 
                        required
                        className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-xs font-bold appearance-none cursor-pointer"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value as any})}
                      >
                        {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                      <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" size={18} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Nivel de Dificuldade</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTIES.map(diff => (
                        <button
                          key={diff}
                          type="button"
                          onClick={() => setFormData({...formData, difficulty: diff as any})}
                          className={cn(
                            "py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                            formData.difficulty === diff 
                              ? "bg-theme-primary border-theme-primary text-black" 
                              : "bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                          )}
                        >
                          {diff}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Intensidade Física</label>
                    <div className="grid grid-cols-3 gap-2">
                      {["Baixa", "Média", "Alta"].map(int => (
                        <button
                          key={int}
                          type="button"
                          onClick={() => setFormData({...formData, intensity: int as any})}
                          className={cn(
                            "py-3 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all",
                            formData.intensity === int 
                              ? "bg-theme-primary border-theme-primary text-black" 
                              : "bg-black/40 border-zinc-800 text-zinc-500 hover:border-zinc-600"
                          )}
                        >
                          {int}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Tempo Previsto (min)</label>
                    <input 
                      type="number" 
                      className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm font-mono"
                      value={formData.duration}
                      onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Video Demonstrativo (YouTube URL)</label>
                    <input 
                      type="url" 
                      placeholder="https://www.youtube.com/watch?v=..."
                      className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs"
                      value={formData.youtubeUrl || ''}
                      onChange={e => setFormData({...formData, youtubeUrl: e.target.value})}
                    />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Materiais Necessários</label>
                    <input 
                      type="text" 
                      placeholder="CONES, BOLAS, COLETES..."
                      className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase text-xs font-bold"
                      value={formData.equipment}
                      onChange={e => setFormData({...formData, equipment: e.target.value.toUpperCase()})}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] ml-1">Plano Metodológico / Descrição</label>
                  <textarea 
                    required
                    placeholder="Descreva o passo a passo, o objetivo tático e o que cobrar dos atletas..."
                    className="w-full px-6 py-4 bg-black/40 border border-zinc-800 rounded-3xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 h-40 resize-none text-sm italic leading-relaxed"
                    value={formData.description}
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="p-6 bg-zinc-950/50 rounded-3xl border border-zinc-800/80 space-y-4">
                   <div className="flex items-center gap-2 mb-2">
                     <Brain size={16} className="text-theme-primary" />
                     <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Configuração do Simulador (Experimental)</h4>
                   </div>
                   <textarea 
                    placeholder='Ex: [{"type": "cone", "x": 50, "y": 50}]'
                    className="w-full px-6 py-4 bg-zinc-900/50 border border-zinc-700 rounded-2xl text-theme-primary outline-none focus:ring-1 focus:ring-theme-primary/30 h-24 font-mono text-[10px]"
                    value={formData.visualData}
                    onChange={e => setFormData({...formData, visualData: e.target.value})}
                  />
                  <p className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest text-center">Os modelos Pro já vêm com esta configuração automática.</p>
                </div>

                <button 
                  type="submit"
                  className="w-full py-6 bg-white text-black rounded-2xl font-black uppercase tracking-tighter shadow-2xl shadow-theme-primary/10 hover:bg-theme-primary transition-all text-sm mb-6"
                >
                  {formData.id ? 'Publicar Atualização' : 'Publicar na Biblioteca'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detailed View / Visualizer Modal */}
      <AnimatePresence>
        {visualizingActivity && (
          <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-zinc-900 border border-zinc-800 w-full max-w-6xl rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
            >
              <div className="p-10 border-b border-zinc-800/50 flex items-center justify-between bg-black/30">
                <div className="flex items-center gap-6">
                   <div className={cn("p-6 rounded-[2rem] shadow-2xl", CATEGORIES.find(c => c.id === visualizingActivity.category)?.bg, CATEGORIES.find(c => c.id === visualizingActivity.category)?.color)}>
                     {CATEGORIES.find(c => c.id === visualizingActivity.category)?.icon && React.cloneElement(CATEGORIES.find(c => c.id === visualizingActivity.category)!.icon as any, { size: 32 })}
                   </div>
                   <div>
                    <div className="flex items-center gap-3 mb-2">
                       <span className="px-3 py-1 bg-theme-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest">
                         MODO SIMULAÇÃO
                       </span>
                       <span className="text-zinc-500 font-black uppercase tracking-widest text-[10px]">{visualizingActivity.modality}</span>
                    </div>
                    <h3 className="text-4xl font-black text-white uppercase tracking-tighter italic leading-none">
                      {visualizingActivity.name}
                    </h3>
                   </div>
                </div>
                <button onClick={() => setVisualizingActivity(null)} className="p-5 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-[1.5rem] transition-all">
                  <X size={32} />
                </button>
              </div>

              <div className="flex-1 p-10 grid grid-cols-1 lg:grid-cols-5 gap-12 items-start overflow-y-auto custom-scrollbar">
                <div className="lg:col-span-3 space-y-8">
                  <DrillVisualizer activity={visualizingActivity} />
                  
                  {visualizingActivity.youtubeUrl && (
                    <div className="w-full aspect-video bg-black rounded-[2.5rem] overflow-hidden border border-zinc-800 shadow-2xl relative">
                       <iframe
                         width="100%"
                         height="100%"
                         src={`https://www.youtube.com/embed/${visualizingActivity.youtubeUrl.split('v=')[1]?.split('&')[0] || visualizingActivity.youtubeUrl.split('/').pop()}`}
                         title="YouTube video player"
                         frameBorder="0"
                         allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                         allowFullScreen
                       ></iframe>
                    </div>
                  )}

                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-black/30 border border-zinc-800 p-6 rounded-3xl">
                      <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Dificuldade</p>
                      <p className="text-lg font-black text-white uppercase italic">{visualizingActivity.difficulty}</p>
                    </div>
                    <div className="bg-black/30 border border-zinc-800 p-6 rounded-3xl">
                      <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Intensidade</p>
                      <p className="text-lg font-black text-white uppercase italic">{visualizingActivity.intensity}</p>
                    </div>
                    <div className="bg-black/30 border border-zinc-800 p-6 rounded-3xl">
                      <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Duração</p>
                      <p className="text-lg font-black text-theme-primary uppercase italic">{visualizingActivity.duration}m</p>
                    </div>
                    <div className="bg-black/30 border border-zinc-800 p-6 rounded-3xl">
                      <p className="text-[10px] font-black text-zinc-600 uppercase mb-2 tracking-widest">Selo</p>
                      <Trophy className="text-theme-primary" size={24} />
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-zinc-800/20 border border-zinc-800 rounded-[2.5rem] p-10 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                      <Brain size={120} />
                    </div>
                    <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                       <Zap size={18} className="text-theme-primary" />
                       Estratégia e Foco
                    </h4>
                    <p className="text-zinc-400 text-lg leading-relaxed italic font-medium">
                      "{visualizingActivity.description}"
                    </p>
                  </div>

                  {visualizingActivity.equipment && (
                    <div className="bg-zinc-800/20 border border-zinc-800 rounded-[2.5rem] p-10">
                      <h4 className="text-xs font-black text-white uppercase tracking-[0.3em] mb-6 flex items-center gap-3">
                         <Package size={18} className="text-theme-primary" />
                         Kit de Materiais
                      </h4>
                      <div className="grid grid-cols-2 gap-3">
                        {visualizingActivity.equipment.split(',').map((eq, i) => (
                          <div key={i} className="px-4 py-3 bg-black/40 border border-zinc-700/50 rounded-2xl flex items-center gap-2">
                             <div className="w-1.5 h-1.5 rounded-full bg-theme-primary" />
                             <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">
                               {eq.trim()}
                             </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4">
                    {onSelect && (
                      <button 
                        onClick={() => {
                          onSelect(visualizingActivity);
                          setVisualizingActivity(null);
                        }}
                        className="flex-1 py-6 bg-white text-black rounded-[2rem] font-black uppercase tracking-tighter shadow-3xl shadow-theme-primary/20 hover:bg-theme-primary transition-all flex items-center justify-center gap-3 text-lg"
                      >
                        Aplicar ao Treino
                        <Plus size={24} />
                      </button>
                    )}
                    <button 
                      onClick={() => setVisualizingActivity(null)}
                      className="px-10 py-6 bg-zinc-800 text-white rounded-[2rem] font-black uppercase tracking-tighter hover:bg-zinc-700 transition-all text-sm"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
