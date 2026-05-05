import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Athlete, UniformRequest, getSubCategory, SponsorBlock, Sponsor, categories, UniformModel, UniformGroup } from '../types';
import { Shirt, Search, CheckCircle, Clock, XCircle, Info, Filter, Plus, Save, Trash2, Package, Users, Layers, AlertTriangle, ExternalLink, Download, FileText, Image as ImageIcon, Camera, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn, compressImage } from '../utils';
import { toast } from 'react-hot-toast';
import AthleteSearchSelect from './AthleteSearchSelect';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toPng } from 'html-to-image';

interface UniformManagementProps {
  user: any;
  athletes: Athlete[];
}

export default function UniformManagement({ user, athletes }: UniformManagementProps) {
  const [activeTab, setActiveTab] = useState<'requests' | 'blocks' | 'catalog'>('requests');
  const [requests, setRequests] = useState<UniformRequest[]>([]);
  const [sponsorBlocks, setSponsorBlocks] = useState<SponsorBlock[]>([]);
  const [uniformModels, setUniformModels] = useState<UniformModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [blockFilter, setBlockFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([]);
  
  // New block state
  const [newBlock, setNewBlock] = useState<Partial<SponsorBlock>>({
    name: '',
    sponsors: [],
    min_sets: 40
  });

  // New model state
  const [newModel, setNewModel] = useState<Partial<UniformModel>>({
    name: '',
    image: '',
    group: 'Jogo',
    description: ''
  });

  // New request state
  const [newRequest, setNewRequest] = useState<Partial<UniformRequest>>({
    type: 'Conjunto Completo',
    uniform_group: 'Jogo',
    size: 'M',
    jersey_number: '',
    status: 'Pendente',
    observations: '',
    sponsor_block_id: ''
  });

  const [isDesigning, setIsDesigning] = useState(false);
  const [designingModel, setDesigningModel] = useState<UniformModel | null>(null);

  const STANDARD_SLOTS = [
    { id: 'chest', name: 'PEITO NA FRENTE DA CAMISA', x: 40, y: 32, width: 20, height: 14 },
    { id: 'sleeves', name: 'MANGAS DA CAMISA', x: 5, y: 25, width: 90, height: 12 },
    { id: 'shorts', name: 'CALÇÃO LADO ESQUERDO NA FRENTE', x: 22, y: 78, width: 18, height: 12 },
    { id: 'back_top', name: 'COSTAS ACIMA DO NÚMERO', x: 35, y: 12, width: 30, height: 10 },
    { id: 'back_bottom', name: 'COSTAS ABAIXO DO NÚMERO', x: 35, y: 68, width: 30, height: 12 },
  ];

  const handleSaveSlots = async (modelId: string, slots: any[]) => {
    try {
      const model = uniformModels.find(m => m.id === modelId);
      if (model) {
        await api.saveUniformModel({ ...model, slots, group: model.group || 'Jogo' });
        toast.success("Áreas de patrocínio salvas!");
        setIsDesigning(false);
        setDesigningModel(null);
        loadData();
      }
    } catch (error) {
      toast.error("Erro ao salvar áreas.");
    }
  };

  const UniformSlotDesigner = ({ model, onSave, onClose }: { model: UniformModel, onSave: (id: string, slots: any[]) => void, onClose: () => void }) => {
    const [slots, setSlots] = useState(model.slots || []);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const handleAddSlot = (e: React.MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      
      const newSlot = {
        id: Math.random().toString(36).substr(2, 9),
        name: `Slot ${slots.length + 1}`,
        x: x - 5,
        y: y - 5,
        width: 10,
        height: 10
      };
      
      setSlots([...slots, newSlot]);
      setSelectedSlot(newSlot.id);
    };

    const updateSlot = (id: string, updates: any) => {
      setSlots(slots.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col md:flex-row h-[90vh] animate-in fade-in zoom-in duration-300">
          {/* Editor Area */}
          <div className="flex-1 p-8 bg-black/40 flex flex-col items-center justify-center overflow-hidden relative">
            <div className="absolute top-6 left-8">
              <h3 className="text-white font-black uppercase text-xl tracking-tighter">DESIGNER DE ÁREAS</h3>
              <p className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest leading-none">Clique na imagem para adicionar um local de patrocínio</p>
            </div>

            <div 
              ref={containerRef}
              className="relative aspect-[4/5] h-[80%] bg-zinc-800 rounded-2xl shadow-2xl cursor-crosshair group overflow-hidden border border-white/5"
              onClick={handleAddSlot}
            >
              <img src={model.image} className="w-full h-full object-contain select-none pointer-events-none" />
              
              {slots.map(slot => (
                <div
                  key={slot.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSlot(slot.id);
                  }}
                  className={cn(
                    "absolute border-2 transition-all flex items-center justify-center group/slot",
                    selectedSlot === slot.id ? "border-theme-primary bg-theme-primary/20 z-20" : "border-white/30 bg-black/20 hover:border-white/60 z-10"
                  )}
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`,
                    width: `${slot.width}%`,
                    height: `${slot.height}%`
                  }}
                >
                  <span className={cn(
                    "text-[8px] font-black uppercase whitespace-nowrap pointer-events-none",
                    selectedSlot === slot.id ? "text-theme-primary" : "text-white/60"
                  )}>
                    {slot.name}
                  </span>
                  
                  {selectedSlot === slot.id && (
                    <>
                      <div className="absolute -top-1 -left-1 w-2 h-2 bg-theme-primary rounded-full cursor-nw-resize" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-theme-primary rounded-full cursor-ne-resize" />
                      <div className="absolute -bottom-1 -left-1 w-2 h-2 bg-theme-primary rounded-full cursor-sw-resize" />
                      <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-theme-primary rounded-full cursor-se-resize" />
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Properties Area */}
          <div className="w-full md:w-80 bg-zinc-900 border-l border-zinc-800 p-6 flex flex-col">
            <h4 className="text-zinc-500 font-black uppercase text-[10px] tracking-widest mb-6">PROPRIEDADES</h4>
            
            <div className="flex-1 space-y-6 overflow-y-auto custom-scrollbar pr-2">
              {selectedSlot ? (
                <>
                  {slots.filter(s => s.id === selectedSlot).map(slot => (
                    <div key={slot.id} className="space-y-4">
                      <div>
                        <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Nome da Área</label>
                        <input 
                          type="text"
                          className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-[11px] font-bold uppercase"
                          value={slot.name}
                          onChange={(e) => updateSlot(slot.id, { name: e.target.value.toUpperCase() })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Posição X (%)</label>
                          <input 
                            type="number"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-[11px] font-bold"
                            value={Math.round(slot.x)}
                            onChange={(e) => updateSlot(slot.id, { x: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Posição Y (%)</label>
                          <input 
                            type="number"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-[11px] font-bold"
                            value={Math.round(slot.y)}
                            onChange={(e) => updateSlot(slot.id, { y: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Largura (%)</label>
                          <input 
                            type="number"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-[11px] font-bold"
                            value={Math.round(slot.width)}
                            onChange={(e) => updateSlot(slot.id, { width: parseFloat(e.target.value) })}
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black text-zinc-500 uppercase block mb-1">Altura (%)</label>
                          <input 
                            type="number"
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-white text-[11px] font-bold"
                            value={Math.round(slot.height)}
                            onChange={(e) => updateSlot(slot.id, { height: parseFloat(e.target.value) })}
                        />
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          setSlots(slots.filter(s => s.id !== selectedSlot));
                          setSelectedSlot(null);
                        }}
                        className="w-full py-2 bg-red-500/10 text-red-500 rounded-lg text-xs font-black uppercase mt-4 hover:bg-red-500 hover:text-white transition-all"
                      >
                        REMOVER ÁREA
                      </button>
                    </div>
                  ))}
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 space-y-4 pt-20">
                  <Package size={48} className="text-zinc-700" />
                  <p className="text-[10px] font-black uppercase text-zinc-600">Selecione ou adicione uma área na imagem</p>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-800 space-y-3">
              <button 
                onClick={() => setSlots(STANDARD_SLOTS.map(s => ({ ...s, id: Math.random().toString(36).substr(2, 9) })))}
                className="w-full py-4 bg-zinc-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest border border-zinc-700 hover:bg-zinc-700 transition-all flex items-center justify-center gap-2"
              >
                <Layers size={18} className="text-theme-primary" />
                Layout Padrão (5 áreas)
              </button>
              <button 
                onClick={() => onSave(model.id, slots)}
                className="w-full py-4 bg-theme-primary text-black rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-2"
              >
                <Save size={18} />
                Salvar Layout
              </button>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-zinc-800 text-zinc-400 rounded-2xl font-black text-xs uppercase tracking-widest"
              >
                Sair sem Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewBlock, setPreviewBlock] = useState<SponsorBlock | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleExportPreview = async () => {
    if (!previewRef.current) return;
    try {
      const dataUrl = await toPng(previewRef.current, {
        quality: 1.0,
        pixelRatio: 2,
        backgroundColor: '#09090b'
      });
      const link = document.createElement('a');
      link.download = `mockup-${previewBlock?.name || 'uniforme'}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Mockup exportado com sucesso!");
    } catch (error) {
      toast.error("Erro ao exportar imagem.");
    }
  };

  const UniformPreviewModal = ({ block, model, onClose }: { block: SponsorBlock, model: UniformModel, onClose: () => void }) => {
    return (
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
        <div className="bg-zinc-900 border border-zinc-800 w-full max-w-4xl rounded-[40px] overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300 flex flex-col max-h-[95vh]">
           <div className="p-8 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50 backdrop-blur-md sticky top-0 z-10">
              <div className="flex items-center gap-4">
                {settings?.schoolCrest && (
                    <img src={settings.schoolCrest} className="w-12 h-12 object-contain" alt="Escudo" />
                )}
                <div>
                  <h3 className="text-white font-black uppercase text-xl tracking-tighter leading-none mb-1">PROJETO DE UNIFORME</h3>
                  <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">{block.name} • MODELO {model.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleExportPreview}
                  className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black rounded-2xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-lg shadow-theme-primary/20"
                >
                  <Download size={16} /> Exportar Imagem
                </button>
                <button onClick={onClose} className="p-3 hover:bg-zinc-800 text-zinc-400 rounded-2xl transition-all">
                  <X size={24} />
                </button>
              </div>
           </div>

           <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/40 p-8">
              <div 
                ref={previewRef}
                className="relative w-full aspect-video min-h-[600px] bg-zinc-900 rounded-[32px] overflow-hidden flex items-center justify-center border border-white/5"
              >
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/20 to-black/60 pointer-events-none"></div>

                {/* Info Overlay */}
                <div className="absolute top-12 left-12 z-10">
                    <span className="text-zinc-600 font-black text-[8px] tracking-[0.5em] uppercase block mb-2">IDENTIFICAÇÃO DO CLUBE</span>
                    <h2 className="text-white font-black text-4xl uppercase tracking-tighter italic leading-none">{settings?.schoolName || 'PIRUA E.C.'}</h2>
                    <div className="flex items-center gap-2 mt-4">
                        <div className="px-3 py-1 rounded-full bg-theme-primary/10 border border-theme-primary/20 text-theme-primary text-[8px] font-black uppercase tracking-widest">
                            {model.group}
                        </div>
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-zinc-400 text-[8px] font-black uppercase tracking-widest">
                            TEMPORADA {new Date().getFullYear()}
                        </div>
                    </div>
                </div>

                <div className="relative h-[85%] aspect-square flex items-center justify-center p-12">
                    <div className="relative h-full w-full">
                        <img src={model.image} className="w-full h-full object-contain drop-shadow-[0_35px_35px_rgba(0,0,0,0.5)]" />
                        
                        {/* Escudo da Escolinha - Positioned relative to chest area if single view */}
                        {settings?.schoolCrest && (
                            <div 
                              className="absolute flex items-center justify-center z-10 pointer-events-none"
                              style={{
                                left: '42%',
                                top: '22%',
                                width: '16%',
                                height: '12%'
                              }}
                            >
                                <img 
                                  src={settings.schoolCrest} 
                                  className="max-w-full max-h-full object-contain filter drop-shadow-2xl" 
                                  alt="Escudo"
                                />
                            </div>
                        )}

                        {model.slots?.map(slot => {
                          const sponsorId = block.slot_mapping?.[slot.id];
                          const sponsor = block.sponsors.find(s => s.id === sponsorId);
                          if (!sponsor) return null;

                          return (
                            <div
                              key={slot.id}
                              className="absolute flex items-center justify-center transition-all animate-in fade-in duration-500 pointer-events-none"
                              style={{
                                left: `${slot.x}%`,
                                top: `${slot.y}%`,
                                width: `${slot.width}%`,
                                height: `${slot.height}%`
                              }}
                            >
                              <img 
                                src={sponsor.logo} 
                                className="max-w-full max-h-full object-contain drop-shadow-lg"
                                style={{ transform: `scale(${sponsor.logo_scale || 1})` }}
                              />
                            </div>
                          );
                        })}
                    </div>
                </div>

                {/* Footer Brand */}
                <div className="absolute bottom-12 right-12 text-right">
                    <p className="text-zinc-600 font-black text-[8px] tracking-[0.3em] uppercase">Layout Criado por</p>
                    <div className="flex items-center justify-end gap-2 mt-1">
                        <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                            <span className="text-theme-primary font-black text-xs">P.</span>
                        </div>
                        <span className="text-white font-black uppercase text-sm tracking-tighter">AMRL SPORTS</span>
                    </div>
                </div>
              </div>
           </div>

           <div className="p-8 bg-zinc-900 border-t border-zinc-800 flex items-center justify-center gap-12 overflow-x-auto pb-10">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest">PATROCINADORES DO BLOCO</span>
                <div className="flex gap-4">
                  {block.sponsors.map((s, i) => (
                    <div key={i} className="flex flex-col items-center gap-2 group">
                      <div className="w-16 h-16 bg-white rounded-2xl p-2 flex items-center justify-center border border-white/10 shadow-xl group-hover:scale-110 transition-transform">
                        <img src={s.logo} className="max-w-full max-h-full object-contain" style={{ transform: `scale(${s.logo_scale || 1})` }} />
                      </div>
                      <span className="text-[8px] font-bold text-zinc-500 truncate w-16 text-center">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
           </div>
        </div>
      </div>
    );
  };

  const { settings } = useTheme();
  const isAdmin = user?.role === 'admin' || user?.role === 'professor' || user?.email === 'piruaesporteclube@gmail.com';

  useEffect(() => {
    loadData();
  }, [user, athletes]);

  useEffect(() => {
    // If student, try to auto-select their athlete record as soon as athletes load
    if (user?.role === 'student' && user?.athlete_id && athletes.length > 0) {
        const studentAthlete = athletes.find(a => a.id === user.athlete_id);
        if (studentAthlete && !selectedAthlete) {
            setSelectedAthlete(studentAthlete);
            setNewRequest(prev => ({
                ...prev,
                athlete_id: studentAthlete.id,
                athlete_name: studentAthlete.name,
                category: getSubCategory(studentAthlete.birth_date),
                jersey_number: studentAthlete.jersey_number || ''
            }));
        }
    }
  }, [user, athletes, selectedAthlete]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [requestsData, blocksData, sponsorsData, modelsData] = await Promise.all([
          api.getUniformRequests(),
          api.getSponsorBlocks(),
          api.getSponsors(),
          api.getUniformModels()
      ]);
      
      let filteredRequests = requestsData;
      if (!isAdmin && user?.athlete_id) {
          filteredRequests = requestsData.filter(r => r.athlete_id === user.athlete_id);
      }
      setRequests(filteredRequests);
      setSponsorBlocks(blocksData);
      setAllSponsors(sponsorsData);
      setUniformModels(modelsData);
    } catch (error) {
      console.error("Error loading uniform data:", error);
      toast.error("Erro ao carregar dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBlock = async () => {
    if (!newBlock.name || !newBlock.sponsors || newBlock.sponsors.length === 0) {
      toast.error("Por favor, preencha o nome e selecione pelo menos um patrocinador.");
      return;
    }

    if (newBlock.sponsors.length > 7) {
      toast.error("Cada bloco pode ter no máximo 7 patrocinadores.");
      return;
    }

    if (!newBlock.min_sets || newBlock.min_sets < 40) {
        toast.error("O número mínimo de conjuntos por bloco é 40.");
        return;
    }

    setLoading(true);
    try {
      await api.saveSponsorBlock(newBlock);
      toast.success("Bloco de patrocinadores salvo com sucesso!");
      setIsBlockModalOpen(false);
      setNewBlock({ name: '', sponsors: [], min_sets: 40 });
      loadData();
    } catch (error) {
      console.error("Error saving block:", error);
      toast.error("Erro ao salvar bloco.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBlock = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Deseja excluir este bloco de patrocinadores?")) return;
    
    const loadingToast = toast.loading("Excluindo bloco...");
    try {
      await api.deleteSponsorBlock(id);
      toast.success("Bloco excluído com sucesso.", { id: loadingToast });
      loadData();
    } catch (error) {
      toast.error("Erro ao excluir bloco.", { id: loadingToast });
    }
  };

  const handleSaveRequest = async () => {
    // Ensure we have an athlete selected and all required data
    const athlete = selectedAthlete;
    const finalAthleteId = athlete?.id || newRequest.athlete_id;
    const finalAthleteName = athlete?.name || newRequest.athlete_name;
    const finalCategory = athlete ? getSubCategory(athlete.birth_date) : newRequest.category;

    if (!finalAthleteId || !newRequest.jersey_number || !newRequest.size || !finalCategory || !finalAthleteName) {
      toast.error("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);
    try {
      // Check number availability locally using loaded requests and athletes props
      const isTakenByAthlete = athletes.some(a => {
        if (a.id === finalAthleteId) return false;
        const athleteCategory = getSubCategory(a.birth_date);
        return athleteCategory === finalCategory && a.jersey_number === newRequest.jersey_number;
      });

      if (isTakenByAthlete) {
        toast.error(`O número ${newRequest.jersey_number} já está registrado para outro atleta na categoria ${finalCategory}.`);
        setLoading(false);
        return;
      }

      const isTakenByRequest = requests.some(r => {
        if (r.athlete_id === finalAthleteId) return false;
        return r.category === finalCategory && 
               r.jersey_number === newRequest.jersey_number && 
               (r.status === 'Pendente' || r.status === 'Aprovado' || r.status === 'Entregue');
      });

      if (isTakenByRequest) {
        toast.error(`O número ${newRequest.jersey_number} já está em um pedido pendente ou aprovado para a categoria ${finalCategory}.`);
        setLoading(false);
        return;
      }

      await api.saveUniformRequest({
          ...newRequest,
          athlete_id: finalAthleteId,
          athlete_name: finalAthleteName,
          category: finalCategory,
          status: isAdmin ? (newRequest.status || 'Aprovado') : 'Pendente'
      } as UniformRequest);
      
      toast.success(isAdmin ? "Solicitação criada com sucesso!" : "Solicitação enviada com sucesso!");
      setIsModalOpen(false);
      loadData();
    } catch (error: any) {
      console.error("Error saving request:", error);
      const errorMessage = error?.message || "";
      if (errorMessage.includes("permission-denied") || errorMessage.includes("insufficient permissions")) {
        toast.error("Sem permissão. Verifique seu cadastro de atleta.");
      } else if (errorMessage.includes("quota-exhausted") || errorMessage.includes("Quota limit exceeded")) {
        toast.error("Cota do Firebase atingida. Tente novamente mais tarde.");
      } else {
        toast.error("Erro ao enviar solicitação.");
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    
    // Header
    doc.setFillColor(0, 0, 0);
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO DE PEDIDO - UNIFORMES', 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.text(`GERADO EM: ${format(now, "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}`, 105, 30, { align: 'center' });
    
    // Filters info
    doc.setTextColor(100, 100, 100);
    doc.setFontSize(9);
    let filterText = `FILTROS: Status: ${statusFilter === 'all' ? 'Todos' : statusFilter} | `;
    filterText += `Categoria: ${categoryFilter === 'all' ? 'Todas' : categoryFilter} | `;
    filterText += `Finalidade: ${groupFilter === 'all' ? 'Todas' : groupFilter} | `;
    if (blockFilter !== 'all') {
        const block = sponsorBlocks.find(b => b.id === blockFilter);
        filterText += `Bloco: ${block?.name || 'N/A'}`;
    }
    doc.text(filterText, 14, 50);

    // Table
    const tableData = filteredData.map(req => [
        req.athlete_name,
        req.category,
        req.size,
        `#${req.jersey_number}`,
        req.uniform_group || 'N/A',
        req.type || 'N/A',
        req.status
    ]);

    autoTable(doc, {
        startY: 55,
        head: [['ATLETA', 'CAT.', 'TAM.', 'Nº', 'FINALIDADE', 'TIPO', 'STATUS']],
        body: tableData,
        headStyles: { fillColor: [0, 0, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
    });

    // Summary
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    const stats = {
        total: filteredData.length,
        completos: filteredData.filter(r => r.type === 'Conjunto Completo').length,
        camisas: filteredData.filter(r => r.type === 'Camisa Avulsa').length,
        jogo: filteredData.filter(r => r.uniform_group === 'Jogo').length,
        viagem: filteredData.filter(r => r.uniform_group === 'Viagem').length,
        torcedor: filteredData.filter(r => r.uniform_group === 'Torcedor').length,
        comissao: filteredData.filter(r => r.uniform_group === 'Comissão Técnica').length
    };

    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`TOTAL DE PEDIDOS: ${stats.total}`, 14, finalY);
    doc.text(`CONJUNTOS COMPLETOS: ${stats.completos} | CAMISAS AVULSAS: ${stats.camisas}`, 14, finalY + 5);
    doc.text(`POR FINALIDADE: JOGO: ${stats.jogo} | VIAGEM: ${stats.viagem} | TORCEDOR: ${stats.torcedor} | COMISSÃO: ${stats.comissao}`, 14, finalY + 10);

    doc.save(`pedidos-uniforme-${format(now, 'dd-MM-yyyy')}.pdf`);
    toast.success("PDF gerado com sucesso!");
  };

  const handleSaveModel = async () => {
    if (!newModel.name || !newModel.image || !newModel.group) {
        toast.error("Por favor, preencha todos os campos obrigatórios.");
        return;
    }

    setLoading(true);
    try {
        await api.saveUniformModel(newModel);
        toast.success("Modelo de uniforme salvo!");
        setIsModelModalOpen(false);
        setNewModel({ name: '', image: '', group: 'Jogo', description: '' });
        loadData();
    } catch (error) {
        toast.error("Erro ao salvar modelo.");
    } finally {
        setLoading(false);
    }
  };

  const handleCreateAMRLModel = async () => {
    const amrlModel: Partial<UniformModel> = {
      name: "MODELO AMRL (AMARELO/PRETO)",
      description: "Conjunto oficial: Camisa Amarela e Calção Preto.",
      group: "Jogo" as UniformGroup,
      image: "https://images.unsplash.com/photo-1543351611-58f69d7c1781?q=80&w=1000",
      slots: [
        { id: 'chest', name: 'PEITO NA FRENTE DA CAMISA', x: 38, y: 35, width: 24, height: 12 },
        { id: 'sleeves', name: 'MANGAS DA CAMISA', x: 2, y: 20, width: 96, height: 10 },
        { id: 'shorts', name: 'CALÇÃO LADO ESQUERDO NA FRENTE', x: 20, y: 75, width: 20, height: 12 },
        { id: 'back_top', name: 'COSTAS ACIMA DO NÚMERO', x: 35, y: 15, width: 30, height: 10 },
        { id: 'back_bottom', name: 'COSTAS ABAIXO DO NÚMERO', x: 35, y: 65, width: 30, height: 12 },
      ]
    };

    const loadingToast = toast.loading("Criando modelo...");
    try {
      setLoading(true);
      await api.saveUniformModel(amrlModel);
      toast.success("Modelo AMRL (Amarelo/Preto) criado!", { id: loadingToast });
      loadData();
    } catch (error) {
      toast.error("Erro ao criar modelo.", { id: loadingToast });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModel = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    // Check if model is being used
    const isUsedInBlock = sponsorBlocks.some(b => b.model_id === id);
    const isUsedInRequest = requests.some(r => {
        if (!r.sponsor_block_id) return false;
        const block = sponsorBlocks.find(b => b.id === r.sponsor_block_id);
        return block?.model_id === id;
    });
    
    const hasUsage = isUsedInBlock || isUsedInRequest;
    const confirmMessage = hasUsage 
        ? "ATENÇÃO: Este modelo está sendo usado em solicitações ou blocos. Deseja mesmo excluir?"
        : "Confirmar exclusão do modelo?";

    if (!confirm(confirmMessage)) return;

    const loadingToast = toast.loading("Removendo modelo...");
    try {
        await api.deleteUniformModel(id);
        toast.success("Modelo removido com sucesso.", { id: loadingToast });
        loadData();
    } catch (error) {
        console.error("Erro ao excluir modelo:", error);
        toast.error("Não foi possível excluir o modelo. Verifique se você tem permissão.", { id: loadingToast });
    }
  };

  const handleModelImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result as string, 800, 800, 0.6);
        setNewModel(prev => ({ ...prev, image: compressed }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateStatus = async (request: UniformRequest, newStatus: UniformRequest['status']) => {
    try {
      await api.saveUniformRequest({ ...request, status: newStatus });
      toast.success(`Status atualizado para: ${newStatus}`);
      
      // If Delivered, update the athlete's jersey number automatically
      if (newStatus === 'Entregue') {
          const athlete = athletes.find(a => a.id === request.athlete_id);
          if (athlete) {
              await api.saveAthlete({
                  ...athlete,
                  jersey_number: request.jersey_number
              });
          }
      }
      
      loadData();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleUpdateBlock = async (request: UniformRequest, blockId: string) => {
    try {
      await api.saveUniformRequest({ ...request, sponsor_block_id: blockId });
      toast.success("Bloco atualizado com sucesso!");
      loadData();
    } catch (error) {
      toast.error("Erro ao atualizar bloco.");
    }
  };

  const handleDeleteRequest = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!confirm("Deseja excluir esta solicitação?")) return;
    
    const loadingToast = toast.loading("Excluindo solicitação...");
    try {
      await api.deleteUniformRequest(id);
      toast.success("Solicitação excluída com sucesso.", { id: loadingToast });
      loadData();
    } catch (error) {
      console.error("Error deleting request:", error);
      toast.error("Erro ao excluir solicitação.", { id: loadingToast });
    }
  };

  const filteredData = requests.filter(r => {
    const matchesSearch = r.athlete_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         r.jersey_number.includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    const matchesBlock = blockFilter === 'all' || r.sponsor_block_id === blockFilter;
    const matchesGroup = groupFilter === 'all' || (r as any).uniform_group === groupFilter;
    return matchesSearch && matchesStatus && matchesCategory && matchesBlock && matchesGroup;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/40 p-6 rounded-3xl border border-zinc-800 shadow-xl backdrop-blur-sm">
        <div>
          <h2 className="text-2xl font-black text-white flex items-center gap-3">
            <div className="p-2 bg-theme-primary/10 rounded-xl">
              <Shirt className="text-theme-primary" size={24} />
            </div>
            UNIFORMES
          </h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            {isAdmin ? 'Gestão de pedidos, blocos de patrocínio e numeração' : 'Solicite seu uniforme e acompanhe o status'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
                <button 
                    onClick={() => setActiveTab('requests')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'requests' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
                    )}
                >
                    Solicitações
                </button>
                {isAdmin && (
                    <button 
                        onClick={() => setActiveTab('blocks')}
                        className={cn(
                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                            activeTab === 'blocks' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
                        )}
                    >
                        Blocos
                    </button>
                )}
                <button 
                    onClick={() => setActiveTab('catalog')}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                        activeTab === 'catalog' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
                    )}
                >
                    Catálogo
                </button>
            </div>
            <button 
                onClick={() => {
                    if (isAdmin) {
                        setSelectedAthlete(null);
                        setNewRequest({
                            type: 'Conjunto Completo',
                            uniform_group: 'Viagem',
                            size: 'M',
                            jersey_number: '',
                            status: 'Aprovado',
                            observations: '',
                            sponsor_block_id: ''
                        });
                    } else if (selectedAthlete) {
                        // For students, ensure we initialize with their data
                        setNewRequest({
                            athlete_id: selectedAthlete.id,
                            athlete_name: selectedAthlete.name,
                            category: getSubCategory(selectedAthlete.birth_date),
                            type: 'Conjunto Completo',
                            uniform_group: 'Viagem',
                            size: 'M',
                            jersey_number: selectedAthlete.jersey_number || '',
                            status: 'Pendente',
                            observations: '',
                            sponsor_block_id: ''
                        });
                    }
                    setIsModalOpen(true);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-theme-primary/20 active:scale-95"
            >
                <Plus size={18} />
                SOLICITAR NOVO UNIFORME
            </button>
            {isAdmin && filteredData.length > 0 && (
                <button 
                    onClick={generatePDF}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95"
                >
                    <Download size={18} />
                    Exportar PDF
                </button>
            )}
        </div>
      </div>

      {activeTab === 'requests' ? (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative md:col-span-2 lg:col-span-2">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                <input
                    type="text"
                    placeholder="PESQUISAR POR NOME OU NÚMERO..."
                    className="w-full pl-12 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all font-bold text-[10px] uppercase tracking-widest"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                </div>
                
                <select 
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                >
                    <option value="all">TODAS CATEGORIAS</option>
                    {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                    ))}
                </select>

                <select 
                    className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={groupFilter}
                    onChange={(e) => setGroupFilter(e.target.value)}
                >
                    <option value="all">TODOS TIPOS</option>
                    {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(g => (
                        <option key={g} value={g}>{g.toUpperCase()}</option>
                    ))}
                </select>

                {isAdmin && (
                    <select 
                        className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                        value={blockFilter}
                        onChange={(e) => setBlockFilter(e.target.value)}
                    >
                        <option value="all">TODOS BLOCOS</option>
                        {sponsorBlocks.map(block => (
                            <option key={block.id} value={block.id}>{block.name}</option>
                        ))}
                    </select>
                )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <Filter size={16} className="text-zinc-500 shrink-0" />
                {['all', 'Pendente', 'Aprovado', 'Entregue', 'Recusado'].map((status) => (
                    <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                        "px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all whitespace-nowrap",
                        statusFilter === status 
                        ? "bg-theme-primary text-black" 
                        : "bg-zinc-900 text-zinc-500 hover:bg-zinc-800"
                    )}
                    >
                    {status === 'all' ? 'TODOS STATUS' : status}
                    </button>
                ))}
            </div>

            {loading && requests.length === 0 ? (
                <div className="flex justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                <Package className="mx-auto mb-4 text-zinc-600" size={48} />
                <h3 className="text-white font-black uppercase mb-1">Nenhuma solicitação encontrada</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Ajuste os filtros ou crie uma nova solicitação.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredData.map((req) => {
                    const block = sponsorBlocks.find(b => b.id === req.sponsor_block_id);
                    return (
                        <div 
                        key={req.id}
                        className="bg-black border border-zinc-800 rounded-3xl overflow-hidden hover:border-theme-primary/50 transition-all group flex flex-col"
                        >
                        <div className="p-6 space-y-4 flex-1">
                            <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center text-theme-primary group-hover:scale-110 transition-transform">
                                <Shirt size={28} />
                                </div>
                                <div>
                                <h3 className="text-white font-black uppercase text-sm truncate max-w-[150px]">{req.athlete_name}</h3>
                                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none block mb-0.5">{req.category}</span>
                                <div className="flex flex-wrap gap-1">
                                    <span className={cn(
                                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border leading-none inline-block",
                                        req.type === 'Camisa Avulsa' ? "border-amber-500/50 text-amber-500 bg-amber-500/5" : "border-theme-primary/50 text-theme-primary bg-theme-primary/5"
                                    )}>
                                        {req.type || 'Conjunto'}
                                    </span>
                                    <span className={cn(
                                        "text-[8px] font-black uppercase px-1.5 py-0.5 rounded border leading-none inline-block",
                                        req.uniform_group === 'Jogo' ? "border-theme-primary/50 text-theme-primary bg-theme-primary/5" :
                                        req.uniform_group === 'Viagem' ? "border-purple-500/50 text-purple-500 bg-purple-500/5" :
                                        req.uniform_group === 'Comissão Técnica' ? "border-sky-500/50 text-sky-500 bg-sky-500/5" :
                                        "border-pink-500/50 text-pink-500 bg-pink-500/5"
                                    )}>
                                        {req.uniform_group || 'Jogo'}
                                    </span>
                                </div>
                                </div>
                            </div>
                            <div className={cn(
                                "px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest",
                                req.status === 'Pendente' ? "bg-yellow-500/10 text-yellow-500" :
                                req.status === 'Aprovado' ? "bg-blue-500/10 text-blue-500" :
                                req.status === 'Entregue' ? "bg-green-500/10 text-green-500" :
                                "bg-red-500/10 text-red-500"
                            )}>
                                {req.status}
                            </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                            <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 text-center">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Tamanho</p>
                                <p className="text-white font-black text-lg">{req.size}</p>
                            </div>
                            <div className="bg-zinc-900/50 p-3 rounded-2xl border border-zinc-800 text-center">
                                <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Número</p>
                                <p className="text-white font-black text-lg">#{req.jersey_number}</p>
                            </div>
                            </div>

                            {isAdmin ? (
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Designar Bloco (ADM)</label>
                                    <select 
                                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-theme-primary/50 text-[10px] font-black uppercase"
                                        value={req.sponsor_block_id || ''}
                                        onChange={(e) => handleUpdateBlock(req, e.target.value)}
                                    >
                                        <option value="">AGUARDANDO DEFINIÇÃO</option>
                                        {sponsorBlocks.map(b => (
                                            <option key={b.id} value={b.id}>{b.name}</option>
                                        ))}
                                    </select>
                                    {block && (
                                        <div className="flex -space-x-1.5 overflow-hidden mt-1 px-1">
                                            {block.sponsors.map((s, i) => (
                                                <div key={i} className="w-5 h-5 rounded-full border border-zinc-900 bg-white overflow-hidden flex items-center justify-center">
                                                    <img 
                                                        src={s.logo} 
                                                        className="max-w-full max-h-full object-contain" 
                                                        title={s.name}
                                                        style={{ transform: `scale(${s.logo_scale || 1})` }}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : block && (
                                <div className="p-3 bg-theme-primary/5 rounded-xl border border-theme-primary/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Layers className="text-theme-primary" size={12} />
                                        <span className="text-[10px] font-black text-white uppercase">{block.name}</span>
                                    </div>
                                    <div className="flex -space-x-2 overflow-hidden">
                                        {block.sponsors.map((s, i) => (
                                            <div key={i} className="w-6 h-6 rounded-full border-2 border-zinc-900 bg-white overflow-hidden flex items-center justify-center">
                                                <img 
                                                    src={s.logo}
                                                    alt={s.name}
                                                    style={{ transform: `scale(${s.logo_scale || 1})` }}
                                                    className="max-w-full max-h-full object-contain"
                                                    title={s.name}
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {req.observations && (
                            <div className="p-3 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
                                <p className="text-[9px] font-black text-zinc-500 uppercase mb-1">OBSERVAÇÕES:</p>
                                <p className="text-zinc-400 text-[11px] leading-relaxed italic">"{req.observations}"</p>
                            </div>
                            )}
                        </div>

                        <div className="p-4 bg-zinc-900/50 border-t border-zinc-800 flex items-center justify-between gap-2">
                            <div className="flex gap-2">
                            {isAdmin && req.status === 'Pendente' && (
                                <>
                                <button 
                                    onClick={() => handleUpdateStatus(req, 'Aprovado')}
                                    className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                    title="Aprovar"
                                >
                                    <CheckCircle size={18} />
                                </button>
                                <button 
                                    onClick={() => handleUpdateStatus(req, 'Recusado')}
                                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                    title="Recusar"
                                >
                                    <XCircle size={18} />
                                </button>
                                </>
                            )}
                            {isAdmin && req.status === 'Aprovado' && (
                                <button 
                                onClick={() => handleUpdateStatus(req, 'Entregue')}
                                className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all font-black text-[10px] uppercase tracking-widest"
                                >
                                <Package size={14} />
                                Marcar como Entregue
                                </button>
                            )}
                            </div>
                            
                            {(isAdmin || req.status === 'Pendente') && (
                                <button 
                                onClick={(e) => handleDeleteRequest(req.id, e)}
                                className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                                title="Excluir"
                                >
                                <Trash2 size={18} />
                                </button>
                            )}
                        </div>
                        </div>
                    );
                })}
                </div>
            )}
        </>
      ) : activeTab === 'blocks' ? (
          <div className="space-y-6">
              <div className="flex items-center justify-between">
                  <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                      <Layers className="text-theme-primary" size={20} />
                      GERENCIAR BLOCOS DE PATROCINADORES
                  </h3>
                  <button 
                    onClick={() => {
                        setNewBlock({ name: '', sponsors: [], min_sets: 40 });
                        setIsBlockModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                  >
                      <Plus size={16} />
                      Novo Bloco
                  </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {sponsorBlocks.map(block => {
                      const setsCount = requests.filter(r => r.sponsor_block_id === block.id).length;
                      const progress = Math.min((setsCount / block.min_sets) * 100, 100);

                      return (
                          <div key={block.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-4 hover:border-theme-primary/30 transition-all group">
                              <div className="flex justify-between items-start">
                                  <div>
                                      <h4 className="text-white font-black uppercase">{block.name}</h4>
                                      <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Min. {block.min_sets} conjuntos</span>
                                  </div>
                                  <div className="flex gap-2">
                                      <button 
                                        onClick={() => {
                                            setPreviewBlock(block);
                                            setIsPreviewOpen(true);
                                        }}
                                        className="flex items-center gap-2 px-3 py-2 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary/20 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all"
                                      >
                                          <ImageIcon size={14} />
                                          Visualizar
                                      </button>
                                      <button 
                                        onClick={() => {
                                            setNewBlock(block);
                                            setIsBlockModalOpen(true);
                                        }}
                                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-blue-500 rounded-xl transition-all"
                                      >
                                          <Filter size={16} />
                                      </button>
                                      <button 
                                        onClick={(e) => handleDeleteBlock(block.id, e)}
                                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-red-500 rounded-xl transition-all"
                                      >
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>

                              <div className="grid grid-cols-1 gap-2">
                                  {block.sponsors.map((s, i) => (
                                      <div key={i} className="p-3 bg-zinc-800 rounded-2xl border border-zinc-700 flex items-center justify-between group/sponsor hover:border-theme-primary/30 transition-all">
                                          <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center overflow-hidden">
                                              <img 
                                                src={s.logo} 
                                                alt={s.name} 
                                                style={{ transform: `scale(${s.logo_scale || 1})` }}
                                                className="max-w-full max-h-full object-contain" 
                                              />
                                            </div>
                                            <div>
                                              <span className="text-[10px] font-black text-white uppercase block leading-none">{s.name}</span>
                                              <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest">{s.segment || 'Segmento não informado'}</span>
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className="text-[8px] font-bold text-zinc-400 block uppercase">{s.responsible_name || 'Resp. não inf.'}</span>
                                            <span className="text-[9px] font-black text-theme-primary">{s.phone || 'S/ Telefone'}</span>
                                          </div>
                                      </div>
                                  ))}
                              </div>

                              <div className="pt-2">
                                  <div className="flex justify-between items-center mb-2">
                                      <span className="text-[9px] font-black text-zinc-500 uppercase">Preenchimento: {setsCount}/{block.min_sets}</span>
                                      <span className="text-[9px] font-black text-theme-primary uppercase">{Math.round(progress)}%</span>
                                  </div>
                                  <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-theme-primary transition-all duration-500" 
                                        style={{ width: `${progress}%` }}
                                      />
                                  </div>
                                  {setsCount < block.min_sets && (
                                      <p className="mt-2 text-[9px] text-yellow-500 flex items-center gap-1 font-bold">
                                          <AlertTriangle size={10} />
                                          FALTAM {block.min_sets - setsCount} CONJUNTOS PARA FECHAR O BLOCO
                                      </p>
                                  )}
                              </div>
                          </div>
                      );
                  })}
              </div>
          </div>
      ) : (
          <div className="space-y-8">
              <div className="flex items-center justify-between">
                  <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                        <ImageIcon className="text-theme-primary" size={20} />
                        CATÁLOGO DE UNIFORMES DO CLUBE
                  </h3>
                  {isAdmin && (
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={handleCreateAMRLModel}
                            disabled={loading}
                            className="flex items-center gap-2 px-4 py-3 bg-theme-primary/10 hover:bg-theme-primary/20 text-theme-primary border border-theme-primary/30 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                            <Plus size={14} />
                            Criar AMRL Magic
                        </button>
                        <button 
                            onClick={() => {
                                setNewModel({ name: '', image: '', group: 'Jogo', description: '' });
                                setIsModelModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                        >
                            <Plus size={16} />
                            Adicionar Modelo
                        </button>
                    </div>
                  )}
              </div>

              {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(group => {
                  const groupModels = uniformModels.filter(m => m.group === group);
                  if (groupModels.length === 0) return null;

                  return (
                      <div key={group} className="space-y-4">
                          <div className="flex items-center gap-4">
                              <h4 className="text-white font-black uppercase tracking-[0.2em] text-sm flex items-center gap-2">
                                  <div className={cn(
                                      "w-8 h-[2px]",
                                      group === 'Jogo' ? "bg-theme-primary" :
                                      group === 'Viagem' ? "bg-purple-500" :
                                      group === 'Comissão Técnica' ? "bg-sky-500" :
                                      "bg-pink-500"
                                  )}></div>
                                  UNIFORME DE {group.toUpperCase()}
                              </h4>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                              {groupModels.map(model => (
                                  <div key={model.id} className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden group hover:border-theme-primary/30 transition-all">
                                      <div className="aspect-[4/5] bg-zinc-800 relative overflow-hidden">
                                          <img 
                                            src={model.image} 
                                            alt={model.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                          />
                                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                                              {isAdmin && (
                                                <>
                                                  <button 
                                                    onClick={() => {
                                                        setDesigningModel(model);
                                                        setIsDesigning(true);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-theme-primary text-black rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-transform"
                                                  >
                                                      <Layers size={14} />
                                                      Desenhar Áreas
                                                  </button>
                                                  <button 
                                                    onClick={() => {
                                                        setNewModel(model);
                                                        setIsModelModalOpen(true);
                                                    }}
                                                    className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20 transition-all"
                                                  >
                                                      <FileText size={14} />
                                                      Editar Info
                                                  </button>
                                                  <button 
                                                    onClick={(e) => handleDeleteModel(model.id, e)}
                                                    className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white transition-all"
                                                  >
                                                      <Trash2 size={14} />
                                                      Excluir
                                                  </button>
                                                </>
                                              )}
                                          </div>
                                      </div>
                                      <div className="p-4">
                                          <h5 className="text-white font-black uppercase text-xs mb-1">{model.name}</h5>
                                          {model.description && (
                                              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">{model.description}</p>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  );
              })}

              {uniformModels.length === 0 && (
                <div className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-3xl p-12 text-center">
                    <ImageIcon className="mx-auto mb-4 text-zinc-600" size={48} />
                    <h3 className="text-white font-black uppercase mb-1">Nenhum modelo cadastrado</h3>
                    <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Adicione modelos para que os atletas possam visualizar.</p>
                </div>
              )}
          </div>
      )}

      {/* Previsão do Uniforme */}
      {isPreviewOpen && previewBlock && (
          <UniformPreviewModal 
            block={previewBlock} 
            model={uniformModels.find(m => m.id === previewBlock.model_id) || uniformModels[0]} 
            onClose={() => {
                setIsPreviewOpen(false);
                setPreviewBlock(null);
            }}
          />
      )}

      {/* Designer de Áreas */}
      {isDesigning && designingModel && (
          <UniformSlotDesigner 
            model={designingModel}
            onSave={handleSaveSlots}
            onClose={() => {
                setIsDesigning(false);
                setDesigningModel(null);
            }}
          />
      )}

      {/* Modal Nova Solicitação */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                <Shirt className="text-theme-primary" size={18} />
                {isAdmin ? 'SOLICITAÇÃO MANUAL (ADM)' : 'SOLICITAR MEU UNIFORME'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">O que deseja pedir?</label>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={() => setNewRequest({...newRequest, type: 'Conjunto Completo'})}
                            className={cn(
                                "py-3 px-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all",
                                newRequest.type === 'Conjunto Completo' 
                                    ? "bg-theme-primary border-theme-primary text-black" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                            )}
                        >
                            Kit Completo
                        </button>
                        <button 
                            onClick={() => setNewRequest({...newRequest, type: 'Camisa Avulsa'})}
                            className={cn(
                                "py-3 px-4 rounded-xl border-2 font-black text-[10px] uppercase tracking-widest transition-all",
                                newRequest.type === 'Camisa Avulsa' 
                                    ? "bg-theme-primary border-theme-primary text-black shadow-[0_0_15px_rgba(var(--color-theme-primary),0.2)]" 
                                    : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                            )}
                        >
                            Camisa Avulsa
                        </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Finalidade do Uniforme</label>
                    <select 
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                        value={newRequest.uniform_group}
                        onChange={(e) => setNewRequest({...newRequest, uniform_group: e.target.value as any})}
                    >
                        {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(g => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                  </div>
              </div>

              {isAdmin && (
                  <div>
                      <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Selecione o Atleta</label>
                      <AthleteSearchSelect 
                        athletes={athletes}
                        onSelect={(athlete) => {
                            setSelectedAthlete(athlete);
                            setNewRequest({
                                ...newRequest,
                                athlete_id: athlete.id,
                                athlete_name: athlete.name,
                                category: getSubCategory(athlete.birth_date),
                                jersey_number: athlete.jersey_number || ''
                            });
                        }}
                      />
                  </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Tamanho</label>
                  <select 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                    value={newRequest.size}
                    onChange={(e) => setNewRequest({...newRequest, size: e.target.value as any})}
                  >
                    <optgroup label="Adulto Tradicional">
                      {['PP', 'P', 'M', 'G', 'GG', 'EGG', 'XGG'].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Infantil Tradicional">
                      {['1 ANO', '2 ANOS', '4 ANOS', '6 ANOS', '8 ANOS', '10 ANOS', '12 ANOS', '14 ANOS', '16 ANOS'].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </optgroup>
                    <optgroup label="Baby Look">
                      {['BLPP', 'BLP', 'BLM', 'BLG', 'BLGG', 'BLG1', 'BLG2', 'BLG3', 'BLG4'].map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </optgroup>
                  </select>
                  {newRequest.size?.startsWith('BL') && (
                    <p className="mt-2 text-[9px] text-amber-500 font-black uppercase italic animate-pulse">
                      * BABY LOOK É CAMISA PEQUENA E ACINTURADA!
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Número Desejado</label>
                  <input 
                    type="text"
                    maxLength={3}
                    placeholder="EX: 10"
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black"
                    value={newRequest.jersey_number}
                    onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        setNewRequest({...newRequest, jersey_number: val});
                    }}
                  />
                  <p className="text-[9px] text-zinc-500 mt-2 flex items-center gap-1 font-bold">
                    <Info size={10} />
                    Sujeito a disponibilidade técnica.
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div>
                    <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Bloco de Patrocinadores</label>
                    <select 
                      className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                      value={newRequest.sponsor_block_id}
                      onChange={(e) => setNewRequest({...newRequest, sponsor_block_id: e.target.value})}
                    >
                      <option value="">NENHUM (OU AGUARDAR DEFINIÇÃO)</option>
                      {sponsorBlocks.map(block => (
                          <option key={block.id} value={block.id}>{block.name}</option>
                      ))}
                    </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Observações</label>
                <textarea 
                  className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold h-20 uppercase resize-none"
                  placeholder="EX: NOME NAS COSTAS, MODELO MANGA LONGA..."
                  value={newRequest.observations}
                  onChange={(e) => setNewRequest({...newRequest, observations: e.target.value})}
                />
              </div>

              {selectedAthlete && (
                <div className="bg-theme-primary/5 border border-theme-primary/10 p-4 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="text-theme-primary" size={16} />
                        <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Resumo do Atleta</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        <span className="text-[10px] text-zinc-500 uppercase">Nome:</span>
                        <span className="text-[10px] text-white font-bold uppercase truncate">{selectedAthlete.name}</span>
                        <span className="text-[10px] text-zinc-500 uppercase">Categoria:</span>
                        <span className="text-[10px] text-white font-bold uppercase">{getSubCategory(selectedAthlete.birth_date)}</span>
                    </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="px-6 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveRequest}
                disabled={loading || !selectedAthlete}
                className="flex items-center gap-2 px-8 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
              >
                {loading ? (
                    <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                ) : <Save size={18} />}
                {isAdmin ? 'Salvar Solicitação' : 'Enviar Pedido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Bloco de Patrocinadores */}
      {isBlockModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                      <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                          <Layers className="text-theme-primary" size={18} />
                          {newBlock.id ? 'Editar Bloco' : 'Novo Bloco de Patrocínio'}
                      </h3>
                      <button 
                        onClick={() => setIsBlockModalOpen(false)}
                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                      >
                          <XCircle size={20} />
                      </button>
                  </div>

                  <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                      <div>
                          <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Bloco</label>
                          <input 
                            type="text"
                            placeholder="EX: BLOCO VERÃO 2024 / PATROCINADORES OURO"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold uppercase"
                            value={newBlock.name}
                            onChange={(e) => setNewBlock({...newBlock, name: e.target.value.toUpperCase()})}
                          />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Mínimo de Conjuntos</label>
                              <input 
                                type="number"
                                min={40}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold"
                                value={newBlock.min_sets}
                                onChange={(e) => setNewBlock({...newBlock, min_sets: parseInt(e.target.value)})}
                              />
                              <p className="mt-1 text-[8px] text-zinc-500 uppercase font-black tracking-widest">Mínimo de 40 unidades por bloco</p>
                          </div>
                          <div>
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Modelo de Uniforme</label>
                              <select 
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                                value={newBlock.model_id}
                                onChange={(e) => setNewBlock({...newBlock, model_id: e.target.value, slot_mapping: {}})}
                              >
                                <option value="">SELECIONE UM MODELO</option>
                                {uniformModels.map(model => (
                                    <option key={model.id} value={model.id}>{model.name} ({model.group})</option>
                                ))}
                              </select>
                          </div>
                      </div>

                      {newBlock.model_id && (
                          <div className="p-5 bg-black/40 rounded-[32px] border border-zinc-800 space-y-6">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-theme-primary uppercase tracking-[0.3em]">LOCAIS DE PATROCÍNIO</label>
                                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest bg-zinc-800 px-3 py-1 rounded-full">
                                    {uniformModels.find(m => m.id === newBlock.model_id)?.name}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-1 gap-4">
                                  {uniformModels.find(m => m.id === newBlock.model_id)?.slots?.map(slot => {
                                      const mappedSponsorId = newBlock.slot_mapping?.[slot.id];
                                      const mappedSponsor = allSponsors.find(s => s.id === mappedSponsorId);
                                      
                                      return (
                                          <div key={slot.id} className="group/slot bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 hover:border-theme-primary/30 transition-all">
                                              <div className="flex items-center justify-between mb-3">
                                                  <div className="flex items-center gap-2">
                                                      <div className="w-1.5 h-1.5 rounded-full bg-theme-primary shadow-[0_0_8px_rgba(var(--color-theme-primary),0.5)]"></div>
                                                      <span className="text-[10px] font-black text-white uppercase tracking-wider">{slot.name}</span>
                                                  </div>
                                                  {mappedSponsor && (
                                                      <button 
                                                        onClick={() => {
                                                            const newMapping = { ... (newBlock.slot_mapping || {}) };
                                                            delete newMapping[slot.id];
                                                            
                                                            // Check if sponsor is still used in any other slot
                                                            const remainingSponsorIds = Object.values(newMapping);
                                                            const isStillUsed = remainingSponsorIds.includes(mappedSponsorId);
                                                            
                                                            setNewBlock({
                                                                ...newBlock,
                                                                slot_mapping: newMapping,
                                                                sponsors: isStillUsed 
                                                                    ? (newBlock.sponsors || []) 
                                                                    : (newBlock.sponsors || []).filter(s => s.id !== mappedSponsorId)
                                                            });
                                                        }}
                                                        className="text-[9px] font-black text-red-500 uppercase hover:underline"
                                                      >
                                                          Remover
                                                      </button>
                                                  )}
                                              </div>

                                              <select 
                                                className="w-full px-3 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-1 focus:ring-theme-primary/50 text-[10px] font-bold uppercase truncate"
                                                value={mappedSponsorId || ''}
                                                onChange={(e) => {
                                                    const sponsorId = e.target.value;
                                                    const sponsor = allSponsors.find(s => s.id === sponsorId);
                                                    if (!sponsor) return;

                                                    const newMapping = { ...(newBlock.slot_mapping || {}), [slot.id]: sponsorId };
                                                    const currentSponsors = newBlock.sponsors || [];
                                                    const uniqueSponsors = Array.from(new Set([...currentSponsors.map(s => s.id), sponsorId]))
                                                        .map(id => allSponsors.find(s => s.id === id))
                                                        .filter(Boolean) as Sponsor[];

                                                    setNewBlock({
                                                        ...newBlock, 
                                                        slot_mapping: newMapping,
                                                        sponsors: uniqueSponsors
                                                    });
                                                }}
                                              >
                                                  <option value="">VAGO - CLIQUE PARA ESCOLHER PATROCINADOR</option>
                                                  {allSponsors.map(sponsor => (
                                                      <option key={sponsor.id} value={sponsor.id}>{sponsor.name}</option>
                                                  ))}
                                              </select>
                                          </div>
                                      );
                                  })}

                                  {(!uniformModels.find(m => m.id === newBlock.model_id)?.slots || uniformModels.find(m => m.id === newBlock.model_id)?.slots?.length === 0) && (
                                      <div className="text-center py-8 bg-zinc-900/30 rounded-2xl border border-dashed border-zinc-800">
                                          <AlertTriangle size={24} className="mx-auto mb-2 text-zinc-700" />
                                          <p className="text-[10px] font-black uppercase text-zinc-600 tracking-widest">Nenhuma área definida para este modelo.</p>
                                          <button 
                                            onClick={() => {
                                                setDesigningModel(uniformModels.find(m => m.id === newBlock.model_id)!);
                                                setIsDesigning(true);
                                            }}
                                            className="mt-3 text-[10px] font-black text-theme-primary uppercase hover:underline"
                                          >
                                              Desenhar áreas agora
                                          </button>
                                      </div>
                                  )}
                              </div>
                          </div>
                      )}

                      <div>
                          <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">
                              Patrocinadores (Máx 7) - Selecionados: {newBlock.sponsors?.length || 0}/7
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                              {allSponsors.map(sponsor => {
                                  const isSelected = newBlock.sponsors?.some(s => s.id === sponsor.id);
                                  return (
                                      <button 
                                        key={sponsor.id}
                                        onClick={() => {
                                            const current = newBlock.sponsors || [];
                                            if (isSelected) {
                                                setNewBlock({...newBlock, sponsors: current.filter(s => s.id !== sponsor.id)});
                                            } else {
                                                if (current.length < 7) {
                                                    setNewBlock({...newBlock, sponsors: [...current, sponsor]});
                                                } else {
                                                    toast.error("Máximo de 7 patrocinadores por bloco.");
                                                }
                                            }
                                        }}
                                        className={cn(
                                            "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                                            isSelected 
                                                ? "bg-theme-primary/10 border-theme-primary border-2 shadow-[0_0_15px_rgba(var(--color-theme-primary),0.2)]" 
                                                : "bg-zinc-800 border-zinc-700 hover:border-zinc-500"
                                        )}
                                      >
                                          <div className="w-10 h-10 bg-white rounded-lg p-1 shrink-0">
                                            <img src={sponsor.logo} alt={sponsor.name} className="w-full h-full object-contain" />
                                          </div>
                                          <div className="min-w-0">
                                            <span className="text-[10px] font-black text-white uppercase block truncate">{sponsor.name}</span>
                                            <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-widest block truncate">{sponsor.segment || 'S/ Segmento'}</span>
                                          </div>
                                      </button>
                                  );
                              })}
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3">
                      <button 
                        onClick={() => setIsBlockModalOpen(false)}
                        className="px-6 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                          Cancelar
                      </button>
                      <button 
                        onClick={handleSaveBlock}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                          {loading ? (
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                          ) : <Save size={18} />}
                          Salvar Bloco
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Novo Modelo de Uniforme */}
      {isModelModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <div className="bg-zinc-900 border border-zinc-800 w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
                  <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
                      <h3 className="text-white font-black uppercase tracking-widest flex items-center gap-2">
                          <ImageIcon className="text-theme-primary" size={18} />
                          {newModel.id ? 'Editar Modelo' : 'Adicionar Novo Modelo'}
                      </h3>
                      <button 
                        onClick={() => setIsModelModalOpen(false)}
                        className="p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-colors"
                      >
                          <XCircle size={20} />
                      </button>
                  </div>

                  <div className="p-6 space-y-6">
                      <div className="flex justify-center">
                          <div className="w-full aspect-[4/5] bg-zinc-800 rounded-3xl border-2 border-dashed border-zinc-700 overflow-hidden relative group">
                              {newModel.image ? (
                                  <>
                                    <img src={newModel.image} alt="Preview" className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => setNewModel({...newModel, image: ''})}
                                        className="absolute top-4 right-4 p-2 bg-black/50 text-white hover:bg-red-500 rounded-xl transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                  </>
                              ) : (
                                  <div className="flex flex-col items-center justify-center w-full h-full">
                                      <label className="flex flex-col items-center justify-center cursor-pointer hover:bg-zinc-700/50 transition-colors w-full h-full p-6 text-center">
                                          <Camera className="text-zinc-500 mb-2" size={32} />
                                          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Clique para selecionar imagem</span>
                                          <input type="file" accept="image/*" className="hidden" onChange={handleModelImageUpload} />
                                      </label>
                                      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-4/5">
                                          <div className="relative">
                                            <div className="absolute inset-0 flex items-center" aria-hidden="true">
                                              <div className="w-full border-t border-zinc-700"></div>
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                              <span className="bg-zinc-800 px-2 text-zinc-500 font-bold">ou colar URL</span>
                                            </div>
                                          </div>
                                          <input 
                                            type="text" 
                                            placeholder="https://..."
                                            className="mt-2 w-full px-4 py-2 bg-zinc-900 border border-zinc-700 rounded-xl text-white text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-theme-primary/30"
                                            onBlur={(e) => setNewModel({...newModel, image: e.target.value})}
                                          />
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                          <div className="col-span-2">
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Modelo</label>
                              <input 
                                type="text"
                                placeholder="EX: CAMISA DE JOGO 1 2024"
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold uppercase"
                                value={newModel.name}
                                onChange={(e) => setNewModel({...newModel, name: e.target.value.toUpperCase()})}
                              />
                          </div>
                          <div>
                              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Categoria/Grupo</label>
                              <select 
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-black uppercase tracking-widest"
                                value={newModel.group}
                                onChange={(e) => setNewModel({...newModel, group: e.target.value as any})}
                              >
                                {(['Jogo', 'Viagem', 'Torcedor', 'Comissão Técnica'] as UniformGroup[]).map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                              </select>
                          </div>
                          <div className="col-span-2">
                            <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">Descrição Breve</label>
                            <input 
                                type="text"
                                placeholder="EX: MODELO TRADICIONAL LISTRADO"
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-[10px] font-bold uppercase"
                                value={newModel.description}
                                onChange={(e) => setNewModel({...newModel, description: e.target.value.toUpperCase()})}
                            />
                          </div>
                      </div>
                  </div>

                  <div className="p-6 bg-zinc-800/50 border-t border-zinc-800 flex justify-end gap-3">
                      <button 
                        onClick={() => setIsModelModalOpen(false)}
                        className="px-6 py-3 bg-zinc-900 text-zinc-400 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                      >
                          Cancelar
                      </button>
                      {newModel.id && (
                          <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteModel(newModel.id!, e);
                                setIsModelModalOpen(false);
                            }}
                            className="px-6 py-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                          >
                            Excluir Modelo
                          </button>
                      )}
                      <button 
                        onClick={handleSaveModel}
                        disabled={loading}
                        className="flex items-center gap-2 px-8 py-3 bg-theme-primary hover:bg-theme-secondary text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50"
                      >
                          {loading ? (
                              <div className="w-4 h-4 border-2 border-black/30 border-t-black animate-spin rounded-full" />
                          ) : <Save size={18} />}
                          Salvar Modelo
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}
