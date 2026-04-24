import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { TrainingActivity } from '../types';
import { Plus, Search, Filter, Trash2, Edit2, Shield, Sword, Zap, Brain, Activity, Clock, Package, ChevronRight, X, Info, Play, Trophy, Users, Star, ChevronDown, Move, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';
import DrillVisualizer from './DrillVisualizer';
import { geminiService } from '../services/geminiService';
import { Sparkles } from 'lucide-react';

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

  const loadActivities = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await api.getActivities();
      setActivities(data);
    } catch (err) {
      toast.error("Erro ao carregar biblioteca");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isGenerating) return;
    try {
      await api.saveActivity(formData);
      toast.success(formData.id ? "Atividade atualizada!" : "Atividade adicionada à biblioteca!");
      setIsModalOpen(false);
      resetForm();
      loadActivities(true);
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

  const [isGenerating, setIsGenerating] = useState(false);

  const generateWithAI = async () => {
    if (selectedModality === 'Todos') {
      toast.error("Selecione uma modalidade para gerar sugestões personalizadas!");
      return;
    }
    setIsGenerating(true);
    try {
      const suggestions = await geminiService.generateSuggestions(selectedModality);
      for (const s of suggestions) {
        await api.saveActivity(s as any);
      }
      toast.success(`${suggestions.length} novas atividades geradas pela IA!`);
      loadActivities();
    } catch (err) {
      toast.error("Erro ao conectar com a IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMagicFill = async () => {
    if (!formData.name && !formData.modality) {
      toast.error("Dê um nome ou selecione a modalidade primeiro!");
      return;
    }
    
    if (formData.visualData && formData.visualData !== '[]' && formData.visualData !== '') {
      if (!confirm("A IA irá gerar um novo esquema tático, substituindo o atual. Continuar?")) return;
    }

    setIsGenerating(true);
    try {
      const drill = await geminiService.generateDrill(formData.modality || 'Futebol', formData.name);
      setFormData(prev => ({
        ...prev,
        ...drill,
        id: prev.id, // Preserve ID if editing
        category: (drill.category as any)
      }));
      toast.success("Exercício gerado com sucesso!");
    } catch (err) {
      toast.error("Erro na geração por IA");
    } finally {
      setIsGenerating(false);
    }
  };

  const seedTemplates = async () => {
    const templates: Partial<TrainingActivity>[] = [
      // AQUECIMENTO
      {
        name: "PEGA-PEGA COM CONDUÇÃO",
        modality: "Futebol",
        category: "Aquecimento",
        intensity: "Alta",
        difficulty: "Iniciante",
        duration: 10,
        equipment: "BOLAS PARA TODOS, COLETES",
        description: "Todos os atletas conduzem bola em área restrita. O pegador deve tocar nos outros sem perder sua própria bola.",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 20, y: 20, team: 'A', label: '1', animate: true, toX: 40, toY: 40 },
          { id: 'b1', type: 'ball', x: 22, y: 20, animate: true, toX: 42, toY: 40 },
          { id: 'p2', type: 'player', x: 80, y: 80, team: 'B', label: 'P', animate: true, toX: 70, toY: 70 },
          { id: 'b2', type: 'ball', x: 82, y: 80, animate: true, toX: 72, toY: 70 }
        ])
      },
      // ALONGAMENTO
      {
        name: "ALONGAMENTO DINÂMICO EM LINHA",
        modality: "Futsal",
        category: "Alongamento",
        intensity: "Baixa",
        difficulty: "Iniciante",
        duration: 8,
        equipment: "ÁREA LIVRE",
        description: "Série de movimentos balísticos, abraçando o joelho, tocando o calcanhar e avanço controlado.",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 10, y: 30, team: 'A', label: '1', animate: true, toX: 90, toY: 30 },
          { id: 'p2', type: 'player', x: 10, y: 50, team: 'A', label: '2', animate: true, toX: 90, toY: 50 },
          { id: 'p3', type: 'player', x: 10, y: 70, team: 'A', label: '3', animate: true, toX: 90, toY: 70 }
        ])
      },
      // COORDENAÇÃO
      {
        name: "ESCADA DE AGILIDADE: ICKY SHUFFLE",
        modality: "Basquete",
        category: "Coordenação Motora",
        intensity: "Alta",
        difficulty: "Intermediário",
        duration: 15,
        equipment: "ESCADA DE AGILIDADE, MINI-CONES",
        description: "Movimentação lateral rápida na escada. Foco na ponta dos pés e coordenação braço-perna.",
        visualData: JSON.stringify([
          { id: 'p1', type: 'player', x: 20, y: 50, team: 'A', label: '1', animate: true, toX: 80, toY: 50 },
          { id: 'c1', type: 'cone', x: 30, y: 45 }, { id: 'c2', type: 'cone', x: 40, y: 55 },
          { id: 'c3', type: 'cone', x: 50, y: 45 }, { id: 'c4', type: 'cone', x: 60, y: 55 }
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
      },
      // TÁTICO GERAL
      {
        name: "SAÍDA DE BOLA EM 3",
        modality: "Futebol",
        category: "Tático",
        intensity: "Média",
        difficulty: "Avançado",
        duration: 15,
        equipment: "CAMPO COMPLETO",
        description: "Construção de jogo com o volante recuando entre os zagueiros para gerar superioridade numérica na saída.",
        visualData: JSON.stringify([
          { id: 'z1', type: 'player', x: 35, y: 70, team: 'A', label: 'Z1', animate: true, toX: 30, toY: 75 },
          { id: 'z2', type: 'player', x: 65, y: 70, team: 'A', label: 'Z2', animate: true, toX: 70, toY: 75 },
          { id: 'v1', type: 'player', x: 50, y: 60, team: 'A', label: 'V', animate: true, toX: 50, toY: 75 },
          { id: 'b1', type: 'ball', x: 50, y: 77, animate: true, toX: 32, toY: 77 }
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
            <div className="flex items-center gap-2">
              <button 
                onClick={seedTemplates}
                className="flex items-center gap-2 px-5 py-4 bg-zinc-900 border border-zinc-800 text-zinc-400 font-black rounded-2xl uppercase tracking-tighter hover:text-theme-primary hover:border-theme-primary/30 transition-all text-xs"
              >
                <Star size={18} fill="currentColor" className="text-white/20" />
                Modelos Pro
              </button>
              <button 
                onClick={generateWithAI}
                disabled={isGenerating}
                className={cn(
                  "flex items-center gap-2 px-5 py-4 bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 font-black rounded-2xl uppercase tracking-tighter hover:bg-indigo-600 hover:text-white transition-all text-xs",
                  isGenerating && "opacity-50 cursor-not-wait"
                )}
              >
                <Sparkles size={18} className={cn(isGenerating && "animate-spin")} />
                {isGenerating ? "Gerando..." : "Gerar com IA"}
              </button>
            </div>
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
          <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[70] flex items-center justify-center p-2 lg:p-6 overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-zinc-950 border border-zinc-800 w-full max-w-[95vw] lg:max-w-7xl h-full lg:h-[90vh] rounded-[2rem] lg:rounded-[3rem] shadow-[0_0_100px_rgba(0,0,0,0.5)] overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-6 lg:p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/20 shadow-inner">
                    {formData.id ? <Edit2 size={28} /> : <Plus size={28} />}
                  </div>
                  <div>
                    <h3 className="text-xl lg:text-3xl font-black text-white uppercase tracking-tighter italic leading-none">
                      {formData.id ? 'Refinar Estratégia' : 'Nova Metodologia Pro'}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse" />
                      <p className="text-zinc-500 text-[10px] uppercase font-black tracking-[0.2em]">Editor Tático de Alto Rendimento</p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={handleMagicFill}
                    disabled={isGenerating}
                    className="hidden sm:flex items-center gap-2 px-6 py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all text-[11px] font-black uppercase tracking-widest group disabled:opacity-50"
                  >
                    <Sparkles size={20} className={cn("group-hover:scale-110 transition-transform", isGenerating && "animate-spin")} />
                    {isGenerating ? "Consultando IA..." : "Sincronizar com IA"}
                  </button>
                  <button 
                    onClick={() => setIsModalOpen(false)} 
                    className="p-4 bg-zinc-800 hover:bg-red-500 text-zinc-400 hover:text-white rounded-2xl transition-all shadow-lg"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                {/* Left Side: Editor */}
                <div className="flex-1 bg-black relative flex flex-col min-h-[400px] lg:min-h-0 overflow-hidden">
                  <div className="absolute top-6 left-6 z-10 pointer-events-none">
                    <div className="bg-black/60 backdrop-blur-md border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
                      <div className="p-2 bg-zinc-800 rounded-xl text-theme-primary">
                        <Move size={16} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Editor Visual</p>
                        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight">Posicionamento Realista</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 w-full bg-zinc-900/10">
                    <DrillVisualizer 
                      activity={formData as any} 
                      isEditable={true} 
                      onChange={(data) => setFormData(prev => ({ ...prev, visualData: data }))}
                    />
                  </div>
                </div>

                {/* Right Side: Configuration */}
                <div className="w-full lg:w-[450px] bg-zinc-900 border-l border-zinc-800 overflow-y-auto custom-scrollbar flex flex-col">
                  <div className="p-8 space-y-8 flex-1">
                    {/* Basic Info */}
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 mb-2">
                        <Info size={16} className="text-zinc-500" />
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Informações Essenciais</h4>
                      </div>

                      <div className="space-y-4">
                        <input 
                          required
                          type="text" 
                          placeholder="TÍTULO DA ATIVIDADE"
                          className="w-full px-6 py-5 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase font-black text-lg tracking-tight placeholder:text-zinc-700"
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                        />

                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <select 
                              required
                              className="w-full px-6 py-5 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase text-[10px] font-black appearance-none cursor-pointer tracking-widest"
                              value={formData.modality}
                              onChange={e => setFormData({...formData, modality: e.target.value as any})}
                            >
                              <option value="">MODALIDADE</option>
                              {MODALITIES.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                          </div>
                          <div className="relative">
                            <select 
                              required
                              className="w-full px-6 py-5 bg-black/40 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase text-[10px] font-black appearance-none cursor-pointer tracking-widest"
                              value={formData.category}
                              onChange={e => setFormData({...formData, category: e.target.value as any})}
                            >
                              <option value="">CATEGORIA</option>
                              {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" size={16} />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Parameters */}
                    <div className="space-y-6 pt-6 border-t border-zinc-800">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap size={16} className="text-zinc-500" />
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Parâmetros de Carga</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Nível Técnico</label>
                          <select 
                            className="w-full px-4 py-4 bg-black/40 border border-zinc-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold text-xs uppercase"
                            value={formData.difficulty}
                            onChange={e => setFormData({...formData, difficulty: e.target.value as any})}
                          >
                            {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Volume/Tempo</label>
                          <div className="relative">
                            <input 
                              type="number"
                              className="w-full px-4 py-4 bg-black/40 border border-zinc-800 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold text-sm text-center"
                              value={formData.duration}
                              onChange={e => setFormData({...formData, duration: parseInt(e.target.value) || 0})}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black text-zinc-600 uppercase">min</span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1">Intensidade Desejada</label>
                        <div className="flex gap-2">
                          {["Baixa", "Média", "Alta"].map(int => (
                            <button
                              key={int}
                              type="button"
                              onClick={() => setFormData({...formData, intensity: int as any})}
                              className={cn(
                                "flex-1 py-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                                formData.intensity === int 
                                  ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20" 
                                  : "bg-black/20 border-zinc-800 text-zinc-600 hover:border-zinc-700"
                              )}
                            >
                              {int}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-6 pt-6 border-t border-zinc-800">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText size={16} className="text-zinc-500" />
                        <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Metodologia e Recursos</h4>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Lista de Materiais</label>
                          <input 
                            type="text" 
                            placeholder="CONES, BOLAS, BARREIRAS..."
                            className="w-full px-5 py-4 bg-black/20 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 uppercase text-[11px] font-bold"
                            value={formData.equipment}
                            onChange={e => setFormData({...formData, equipment: e.target.value})}
                          />
                        </div>

                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 mb-2 block">Instruções de Execução</label>
                          <textarea 
                            required
                            placeholder="Descreva o passo a passo técnico da atividade..."
                            className="w-full px-6 py-5 bg-black/20 border border-zinc-800 rounded-3xl text-zinc-300 outline-none focus:ring-2 focus:ring-indigo-500/50 h-48 resize-none text-[13px] leading-relaxed italic"
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest ml-1 block">Referência em Vídeo (YouTube)</label>
                          <div className="relative">
                            <Play className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                            <input 
                              type="url" 
                              placeholder="https://youtu.be/..."
                              className="w-full pl-12 pr-6 py-4 bg-black/20 border border-zinc-800 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 text-[11px] font-medium"
                              value={formData.youtubeUrl || ''}
                              onChange={e => setFormData({...formData, youtubeUrl: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technical Data (Collapsible) */}
                    <div className="pt-6 border-t border-zinc-800">
                      <button 
                         type="button"
                         onClick={() => setFormData((prev: any) => ({ ...prev, showJson: !prev.showJson }))}
                         className="flex items-center justify-between w-full text-[9px] font-black text-zinc-600 uppercase tracking-[0.3em] hover:text-zinc-400 transition-colors"
                      >
                         Dados do Simulador
                         <ChevronDown className={cn("transition-transform", (formData as any).showJson && "rotate-180")} size={14} />
                      </button>
                      
                      <AnimatePresence>
                        {(formData as any).showJson && (
                          <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden mt-4"
                          >
                            <textarea 
                              className="w-full p-4 bg-black border border-zinc-800 rounded-xl text-[10px] font-mono text-indigo-400 outline-none h-32"
                              value={formData.visualData}
                              onChange={e => setFormData({...formData, visualData: e.target.value})}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <div className="p-8 border-t border-zinc-800 bg-black/20 backdrop-blur-md sticky bottom-0">
                    <button 
                      type="submit"
                      disabled={isGenerating}
                      className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase text-sm tracking-widest shadow-[0_10px_40px_rgba(79,70,229,0.3)] transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                      onClick={handleSubmit}
                    >
                      {formData.id ? 'Sincronizar Atualização' : 'Publicar na Metodologia'}
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
