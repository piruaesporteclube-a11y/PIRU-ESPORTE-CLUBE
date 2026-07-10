import React, { useRef, useState, useEffect } from 'react';
import { Training, Athlete } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trophy, Download, User, X, Camera, Search, UserCheck, Instagram, MapPin, Activity, Clock, Calendar, FileText, ChevronDown } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { motion, AnimatePresence } from 'motion/react';
import { cn, fixHtml2CanvasColors, compressImage, prepareElementForExport } from '../utils';

const SPORT_BACKGROUNDS = [
  // FUTEBOL DE CAMPO
  { id: 'stadium_night', name: 'Estádio Iluminado', category: 'FUTEBOL DE CAMPO', url: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200' },
  { id: 'soccer_field_day', name: 'Gramado Verde Dia', category: 'FUTEBOL DE CAMPO', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1200' },
  { id: 'field_detail', name: 'Detalhe de Gramado', category: 'FUTEBOL DE CAMPO', url: 'https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&q=80&w=1200' },
  { id: 'soccer_stadium_sunset', name: 'Estádio Sunset', category: 'FUTEBOL DE CAMPO', url: 'https://images.unsplash.com/photo-1524015368236-bbf6f72545b6?auto=format&fit=crop&q=80&w=1200' },

  // FUTSAL
  { id: 'futsal_court_wood', name: 'Quadra de Futsal', category: 'FUTSAL', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1200' },
  { id: 'futsal_court_blue', name: 'Quadra de Vinílico', category: 'FUTSAL', url: 'https://images.unsplash.com/photo-1543351611-58f69d7c1781?auto=format&fit=crop&q=80&w=1200' },
  { id: 'indoor_court_gym', name: 'Ginásio Coberto', category: 'FUTSAL', url: 'https://images.unsplash.com/photo-1628891890467-b79f2c8ba9ed?auto=format&fit=crop&q=80&w=1200' },

  // VOLÊI
  { id: 'volleyball_court', name: 'Quadra de Vôlei', category: 'VOLÊI', url: 'https://images.unsplash.com/photo-1592656094267-764a450201c5?auto=format&fit=crop&q=80&w=1200' },
  { id: 'beach_volley', name: 'Vôlei de Praia', category: 'VOLÊI', url: 'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?auto=format&fit=crop&q=80&w=1200' },
  { id: 'volley_net_sunset', name: 'Rede Sunset', category: 'VOLÊI', url: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?auto=format&fit=crop&q=80&w=1200' },

  // CORRIDA DE RUA
  { id: 'running_track', name: 'Pista de Atletismo', category: 'CORRIDA DE RUA', url: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=1200' },
  { id: 'street_marathon', name: 'Asfalto / Cidade', category: 'CORRIDA DE RUA', url: 'https://images.unsplash.com/photo-1502224562085-639556652f33?auto=format&fit=crop&q=80&w=1200' },
  { id: 'running_trail', name: 'Trilha Natural', category: 'CORRIDA DE RUA', url: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?auto=format&fit=crop&q=80&w=1200' },

  // GERAL / OUTROS
  { id: 'carbon_fibre', name: 'Fibra de Carbono', category: 'OUTROS', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1200' },
  { id: 'gym_training', name: 'Centro de Treinamento', category: 'OUTROS', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=1200' },
  { id: 'arena_neon', name: 'Arena Neon', category: 'OUTROS', url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=1200' },
  { id: 'dark_gradient', name: 'Preto Abstrato', category: 'OUTROS', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1200' }
];

interface TrainingFlyerProps {
  date: string;
  trainings: Training[];
  athletes: Athlete[];
  onClose: () => void;
}

export default function TrainingFlyer({ date, trainings, athletes, onClose }: TrainingFlyerProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const { settings } = useTheme();
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedAthlete2, setSelectedAthlete2] = useState<Athlete | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImage2, setCustomImage2] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('all');
  const [customTimes, setCustomTimes] = useState<{ [key: string]: string }>({});
  const [customCategories, setCustomCategories] = useState<{ [key: string]: string }>({});

  const activeTrainings = selectedTrainingId === 'all' 
    ? trainings 
    : trainings.filter(t => t.id === selectedTrainingId);

  // Positioning State
  const [pos1, setPos1] = useState({ scale: 1, x: 0, y: 0 });
  const [pos2, setPos2] = useState({ scale: 1, x: 0, y: 0 });
  const [infoPos, setInfoPos] = useState({ x: 0, y: 30 });
  const [photoPos, setPhotoPos] = useState({ y: 0 });
  const [infoAlign, setInfoAlign] = useState<'left' | 'right'>('left');
  const [showVS, setShowVS] = useState(false);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>(['stadium']);
  const [customBackgrounds, setCustomBackgrounds] = useState<{ [key: string]: string }>({});
  
  // Custom Dual-Layer Background States
  const [fundo1, setFundo1] = useState<string>('stadium_night');
  const [fundo1Custom, setFundo1Custom] = useState<string | null>(null);
  const [fundo2, setFundo2] = useState<string>('none');
  const [fundo2Custom, setFundo2Custom] = useState<string | null>(null);
  const [fundo1Opacity, setFundo1Opacity] = useState<number>(1);
  const [fundo2Opacity, setFundo2Opacity] = useState<number>(0.5);
  const [fundoBlend, setFundoBlend] = useState<string>('overlay');
  const [bgSelectTarget, setBgSelectTarget] = useState<1 | 2>(1);
  const [bgCategory, setBgCategory] = useState<string>('TODOS');
  const [carbonColor, setCarbonColor] = useState<string>('#1a1a1a');
  const [overlayOpacity, setOverlayOpacity] = useState(0.6);
  const [playerMode, setPlayerMode] = useState<'foreground' | 'background'>('foreground');
  const [playerOpacity, setPlayerOpacity] = useState(0.4);
  const [timeFontSize, setTimeFontSize] = useState<number>(9);
  const [colsCount, setColsCount] = useState<1 | 2>(1);
  const [sidebarWidth, setSidebarWidth] = useState<number>(114);
  const [footerPos, setFooterPos] = useState({ x: 0, y: 0 });
  const [footerWidth, setFooterWidth] = useState<number>(140);

  useEffect(() => {
    if (colsCount === 1) {
      setSidebarWidth(114);
    } else {
      setSidebarWidth(228);
    }
  }, [colsCount]);

  const toggleBackground = (id: string) => {
    setSelectedBackgrounds(prev => {
      // If choosing 'none', clear all others
      if (id === 'none') return ['none'];
      
      // If we are selecting something else but 'none' was active, remove 'none'
      const withoutNone = prev.filter(bg => bg !== 'none');
      
      if (withoutNone.includes(id)) {
        if (withoutNone.length === 1 && id !== 'custom') return ['none']; // Fallback to none if last one removed
        return withoutNone.filter(bg => bg !== id);
      }
      return [...withoutNone, id];
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const bg1InputRef = useRef<HTMLInputElement>(null);
  const bg2InputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const compressed = await compressImage(base64, 800, 800, 0.7);
          if (activeSlot === 1) {
            setCustomImage(compressed);
            setSelectedAthlete(null);
          } else {
            setCustomImage2(compressed);
            setSelectedAthlete2(null);
          }
        } catch (err) {
          if (activeSlot === 1) {
            setCustomImage(base64);
            setSelectedAthlete(null);
          } else {
            setCustomImage2(base64);
            setSelectedAthlete2(null);
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const compressed = await compressImage(base64, 1200, 1200, 0.8);
          setCustomBackgrounds(prev => ({
            ...prev,
            custom: compressed
          }));
          // Automatically select 'custom' if a photo is uploaded
          if (!selectedBackgrounds.includes('custom')) {
            toggleBackground('custom');
          }
          toast.success('Foto de fundo carregada!');
        } catch (err) {
          setCustomBackgrounds(prev => ({
            ...prev,
            custom: base64
          }));
          if (!selectedBackgrounds.includes('custom')) {
            toggleBackground('custom');
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const getFundo1Url = () => {
    if (fundo1 === 'custom') return fundo1Custom;
    const found = SPORT_BACKGROUNDS.find(bg => bg.id === fundo1);
    return found ? found.url : 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200';
  };

  const getFundo2Url = () => {
    if (fundo2 === 'none') return null;
    if (fundo2 === 'custom') return fundo2Custom;
    const found = SPORT_BACKGROUNDS.find(bg => bg.id === fundo2);
    return found ? found.url : null;
  };

  const handleBg1Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const compressed = await compressImage(base64, 1200, 1200, 0.8);
          setFundo1Custom(compressed);
          setFundo1('custom');
          toast.success('Fundo Principal (Fundo 1) carregado!');
        } catch (err) {
          setFundo1Custom(base64);
          setFundo1('custom');
          toast.success('Fundo Principal (Fundo 1) carregado!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBg2Upload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        try {
          const compressed = await compressImage(base64, 1200, 1200, 0.8);
          setFundo2Custom(compressed);
          setFundo2('custom');
          toast.success('Fundo de Mesclagem (Fundo 2) carregado!');
        } catch (err) {
          setFundo2Custom(base64);
          setFundo2('custom');
          toast.success('Fundo de Mesclagem (Fundo 2) carregado!');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredAthletes = athletes.filter(a => 
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.doc?.includes(search)
  ).slice(0, 5);

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setIsExporting(true);
    const loadingToast = toast.loading('Gerando seu encarte... Aguarde um momento.');
    
    try {
      const element = flyerRef.current;
      const exportClone = await prepareElementForExport(element, 360, 640);

      try {
        console.log('Capturing flyer with backgrounds:', selectedBackgrounds);
        
        const dataUrl = await htmlToImage.toPng(exportClone, {
          width: 360,
          height: 640,
          pixelRatio: 2,
          backgroundColor: '#000000',
          cacheBust: true,
          skipFonts: false
        });

        toast.dismiss(loadingToast);
        
        const isSingle = activeTrainings.length === 1;
        const downloadName = isSingle 
          ? `TREINO_${activeTrainings[0].modality.replace(/\s+/g, '_').toUpperCase()}_${date}.png`
          : `AGENDA_TREINO_${date}.png`;

        const link = document.createElement('a');
        link.download = downloadName;
        link.href = dataUrl;
        link.click();
        
        toast.success('Encarte baixado com sucesso!');
      } finally {
        exportClone.remove();
      }
    } catch (error) {
      console.error('Error generating flyer:', error);
      toast.dismiss(loadingToast);
      toast.error('Ocorreu um erro ao gerar a imagem. Tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  const formatDateSafely = (dateStr: string, pattern: string) => {
    try {
      if (!dateStr) return '---';
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return '---';
      return format(d, pattern, { locale: ptBR });
    } catch {
      return '---';
    }
  };

  const formattedDate = formatDateSafely(date, "dd 'de' MMMM");
  const dayOfWeek = formatDateSafely(date, "EEEE");

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start my-auto">
        
        {/* Left: Configuration */}
        <div className="space-y-6 bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Personalizar Encarte</h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Training Display Selector (only when there is more than 1 training) */}
          {trainings.length > 1 && (
            <div className="space-y-2 bg-black/40 p-4 rounded-3xl border border-zinc-800">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-sans">
                Exibição de Treino
              </label>
              <div className="relative">
                <select
                  value={selectedTrainingId}
                  onChange={(e) => setSelectedTrainingId(e.target.value)}
                  className="w-full bg-black border border-zinc-700 hover:border-zinc-600 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs font-black uppercase tracking-wider appearance-none cursor-pointer"
                >
                  <option value="all">TODOS OS TREINOS DO DIA</option>
                  {trainings.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.modality.toUpperCase()} ({t.start_time})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-zinc-400">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>
          )}

          {/* Background Selection */}
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-zinc-450 uppercase tracking-widest block font-sans">Configuração de Fundos</label>
              <p className="text-[9px] text-zinc-500 uppercase font-bold">Personalize o fundo, mescle imagens e controle a opacidade</p>
            </div>

            {/* Selector Tab for Layer 1 vs Layer 2 */}
            <div className="flex bg-black p-1 rounded-xl border border-zinc-850">
              <button 
                type="button"
                onClick={() => setBgSelectTarget(1)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5",
                  bgSelectTarget === 1 ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-400"
                )}
              >
                Fundo Principal (Fundo 1)
              </button>
              <button 
                type="button"
                onClick={() => setBgSelectTarget(2)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-1.5",
                  bgSelectTarget === 2 ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-400"
                )}
              >
                Fundo de Mesclagem (Fundo 2)
              </button>
            </div>

            {/* Upload Button based on active layer */}
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase">
                {bgSelectTarget === 1 ? "Customizar Fundo Principal" : "Customizar Fundo de Mesclagem"}
              </span>
              <button 
                type="button"
                onClick={() => bgSelectTarget === 1 ? bg1InputRef.current?.click() : bg2InputRef.current?.click()}
                className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1.5 rounded-xl hover:bg-theme-primary/10 transition-all flex items-center gap-1.5 shrink-0"
              >
                <Camera size={12} />
                Enviar Foto {bgSelectTarget}
              </button>
              <input 
                type="file" 
                ref={bg1InputRef} 
                onChange={handleBg1Upload} 
                accept="image/*" 
                className="hidden" 
              />
              <input 
                type="file" 
                ref={bg2InputRef} 
                onChange={handleBg2Upload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {/* Custom active uploads toggles */}
            <div className="flex flex-wrap gap-2">
              {bgSelectTarget === 1 ? (
                fundo1Custom && (
                  <button
                    type="button"
                    onClick={() => setFundo1('custom')}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1",
                      fundo1 === 'custom' ? "bg-theme-primary border-theme-primary text-black" : "bg-black/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    ✨ Usar Foto Enviada 1
                  </button>
                )
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setFundo2('none')}
                    className={cn(
                      "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all",
                      fundo2 === 'none' ? "bg-theme-primary border-theme-primary text-black" : "bg-black/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                    🚫 Sem Mesclagem (Fundo 2 Off)
                  </button>
                  {fundo2Custom && (
                    <button
                      type="button"
                      onClick={() => setFundo2('custom')}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all flex items-center gap-1",
                        fundo2 === 'custom' ? "bg-theme-primary border-theme-primary text-black" : "bg-black/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      )}
                    >
                      ✨ Usar Foto Enviada 2
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['TODOS', 'FUTEBOL DE CAMPO', 'FUTSAL', 'VOLÊI', 'CORRIDA DE RUA', 'OUTROS'].map(cat => (
                <button
                  type="button"
                  key={cat}
                  onClick={() => setBgCategory(cat)}
                  className={cn(
                    "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all whitespace-nowrap",
                    bgCategory === cat
                      ? "bg-theme-primary border-theme-primary text-black"
                      : "bg-black/60 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  )}
                >
                  {cat === 'TODOS' ? 'TODOS' : cat.split(' ')[0]}
                </button>
              ))}
            </div>

            {/* Preset Grid */}
            <div className="grid grid-cols-4 gap-2 max-h-[160px] overflow-y-auto pr-1 no-scrollbar">
              {SPORT_BACKGROUNDS.filter(bg => bgCategory === 'TODOS' || bg.category === bgCategory).map(bg => {
                const selected = bgSelectTarget === 1 ? fundo1 === bg.id : fundo2 === bg.id;

                return (
                  <button
                    type="button"
                    key={bg.id}
                    onClick={() => {
                      if (bgSelectTarget === 1) {
                        setFundo1(bg.id);
                      } else {
                        setFundo2(bg.id);
                      }
                    }}
                    className={cn(
                      "group relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all text-left bg-zinc-950",
                      selected ? "border-theme-primary ring-2 ring-theme-primary/30" : "border-zinc-850 hover:border-zinc-700"
                    )}
                  >
                    <img src={bg.url} alt={bg.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" crossOrigin="anonymous" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                    <span className="absolute bottom-1.5 left-1.5 right-1.5 text-[8px] font-black uppercase tracking-tight text-white leading-tight line-clamp-2 drop-shadow-md">
                      {bg.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Opacity and Blend Mode Controls */}
            <div className="space-y-4 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-850/80">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Ajuste de Opacidade & Mesclagem</div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Opacidade Fundo 1</label>
                    <span className="text-[9px] text-theme-primary font-bold">{(fundo1Opacity * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={fundo1Opacity}
                    onChange={e => setFundo1Opacity(parseFloat(e.target.value))}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-500 uppercase">Opacidade Fundo 2</label>
                    <span className="text-[9px] text-theme-primary font-bold">{(fundo2Opacity * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="1" step="0.05"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    disabled={fundo2 === 'none'}
                    value={fundo2Opacity}
                    onChange={e => setFundo2Opacity(parseFloat(e.target.value))}
                  />
                </div>
              </div>

              {fundo2 !== 'none' && (
                <div className="animate-in fade-in duration-300">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1.5">Efeito de Mesclagem (Fundo 2 sobre Fundo 1)</label>
                  <select
                    value={fundoBlend}
                    onChange={(e) => setFundoBlend(e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded-xl px-3 py-2 outline-none focus:ring-1 focus:ring-theme-primary text-[10px] font-bold uppercase cursor-pointer"
                  >
                    <option value="normal">Normal (Sem Mesclagem)</option>
                    <option value="overlay">Sobreposição (Overlay)</option>
                    <option value="multiply">Multiplicar (Multiply)</option>
                    <option value="screen">Clarear (Screen)</option>
                    <option value="soft-light">Luz Suave (Soft Light)</option>
                    <option value="hard-light">Luz Intensa (Hard Light)</option>
                    <option value="color-dodge">Esquivar Cor (Color Dodge)</option>
                    <option value="color-burn">Super-exposição (Color Burn)</option>
                    <option value="difference">Diferença (Difference)</option>
                    <option value="luminosity">Luminosidade (Luminosity)</option>
                  </select>
                </div>
              )}
            </div>

            {/* Effects Overlay Toggles */}
            <div className="flex flex-wrap gap-4 pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={selectedBackgrounds.includes('carbon')}
                  onChange={() => toggleBackground('carbon')}
                  className="rounded border-zinc-800 bg-black text-theme-primary focus:ring-0"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Efeito Carbono</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={selectedBackgrounds.includes('grass')}
                  onChange={() => toggleBackground('grass')}
                  className="rounded border-zinc-800 bg-black text-theme-primary focus:ring-0"
                />
                <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Efeito Campo</span>
              </label>
            </div>
          </div>

          {/* Carbon Color Selection */}
          {selectedBackgrounds.includes('carbon') && (
            <div className="space-y-4 p-4 bg-black/40 rounded-2xl border border-zinc-800 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-theme-primary rounded-full" />
                <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block font-sans">Tom do Carbono</label>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="flex flex-wrap gap-2">
                  {[
                    { color: '#1a1a1a', label: 'Padrão' },
                    { color: '#0a0a0a', label: 'Ebon' },
                    { color: '#1e3a8a', label: 'Azul' },
                    { color: '#312e81', label: 'Índigo' },
                    { color: '#164e63', label: 'Ciano' },
                    { color: '#064e3b', label: 'Verde' },
                    { color: '#4c1d95', label: 'Roxo' },
                    { color: '#701a75', label: 'Magenta' },
                    { color: '#831843', label: 'Vinho' },
                  ].map(c => (
                    <button
                      key={c.color}
                      onClick={() => setCarbonColor(c.color)}
                      className={cn(
                        "group relative w-10 h-10 rounded-xl border-2 transition-all flex items-center justify-center overflow-hidden",
                        carbonColor === c.color ? "border-theme-primary scale-110 shadow-[0_0_15px_rgba(234,179,8,0.4)]" : "border-zinc-800 hover:border-zinc-700 hover:scale-105"
                      )}
                      title={c.label}
                    >
                      <div className="absolute inset-0" style={{ backgroundColor: c.color }} />
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-40" />
                      {carbonColor === c.color && (
                        <div className="relative z-10 bg-theme-primary w-2 h-2 rounded-full" />
                      )}
                    </button>
                  ))}
                </div>
                
                <div className="flex items-center gap-3 pt-2 border-t border-zinc-800/50">
                  <div className="relative w-full">
                    <input 
                      type="color" 
                      value={carbonColor}
                      onChange={(e) => setCarbonColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                    <div className="flex items-center justify-between px-3 py-2 bg-black/60 rounded-lg border border-zinc-700 pointer-events-none">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-tight">Cor Customizada</span>
                      <div className="w-4 h-4 rounded shadow-inner" style={{ backgroundColor: carbonColor }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Slot Selection */}
          <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setActiveSlot(1)}
              className={cn(
                "flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                activeSlot === 1 ? "bg-theme-primary text-black" : "text-zinc-500"
              )}
            >
              <User size={14} /> Atleta 1
            </button>
            <button 
              onClick={() => setActiveSlot(2)}
              className={cn(
                "flex-1 py-3 rounded-lg text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                activeSlot === 2 ? "bg-theme-primary text-black" : "text-zinc-500"
              )}
            >
              <User size={14} /> Atleta 2
            </button>
          </div>

          <div className="flex items-center justify-between px-4 py-2 bg-black/40 rounded-xl border border-zinc-800">
            <span className="text-[10px] font-black text-zinc-400 uppercase">Habilitar Modo VS (Confronto)</span>
            <button 
              onClick={() => setShowVS(!showVS)}
              className={cn(
                "w-10 h-6 rounded-full relative transition-colors",
                showVS ? "bg-theme-primary" : "bg-zinc-800"
              )}
            >
              <div className={cn("absolute top-1 w-4 h-4 rounded-full bg-white transition-all", showVS ? "right-1" : "left-1")} />
            </button>
          </div>

          {/* Adjustment Controls */}
          {( (activeSlot === 1 && (selectedAthlete || customImage)) || (activeSlot === 2 && (selectedAthlete2 || customImage2)) ) && (
            <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase">Ajustar Atleta {activeSlot}</span>
                <button 
                  onClick={() => activeSlot === 1 ? setPos1({ scale: 1, x: 0, y: 0 }) : setPos2({ scale: 1, x: 0, y: 0 })}
                  className="text-[10px] font-bold text-theme-primary uppercase"
                >
                  Resetar
                </button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Tamanho</label>
                    <span className="text-[9px] text-theme-primary font-bold">{(activeSlot === 1 ? pos1.scale : pos2.scale).toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="2" step="0.1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={activeSlot === 1 ? pos1.scale : pos2.scale}
                    onChange={e => activeSlot === 1 ? setPos1({...pos1, scale: parseFloat(e.target.value)}) : setPos2({...pos2, scale: parseFloat(e.target.value)})}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Horizontal (X)</label>
                    <span className="text-[9px] text-theme-primary font-bold">{activeSlot === 1 ? pos1.x : pos2.x}px</span>
                  </div>
                  <input 
                    type="range" min="-100" max="100" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={activeSlot === 1 ? pos1.x : pos2.x}
                    onChange={e => activeSlot === 1 ? setPos1({...pos1, x: parseInt(e.target.value)}) : setPos2({...pos2, x: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Vertical (Y)</label>
                    <span className="text-[9px] text-theme-primary font-bold">{activeSlot === 1 ? pos1.y : pos2.y}px</span>
                  </div>
                  <input 
                    type="range" min="-150" max="150" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={activeSlot === 1 ? pos1.y : pos2.y}
                    onChange={e => activeSlot === 1 ? setPos1({...pos1, y: parseInt(e.target.value)}) : setPos2({...pos2, y: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Global Layout Controls */}
          <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
            <span className="text-[10px] font-black text-zinc-500 uppercase">Ajustar Layout Global</span>
            <div className="space-y-4">
              <div>
                <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-2">Lado dos Treinos</label>
                <div className="flex bg-black p-1 rounded-lg border border-zinc-700">
                  <button 
                    onClick={() => setInfoAlign('left')}
                    className={cn(
                      "flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all",
                      infoAlign === 'left' ? "bg-theme-primary text-black" : "text-zinc-500"
                    )}
                  >
                    Esquerda
                  </button>
                  <button 
                    onClick={() => setInfoAlign('right')}
                    className={cn(
                      "flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all",
                      infoAlign === 'right' ? "bg-theme-primary text-black" : "text-zinc-500"
                    )}
                  >
                    Direita
                  </button>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Intensidade do Fundo (Escurecer)</label>
                  <span className="text-[9px] text-theme-primary font-bold">{(overlayOpacity * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  value={overlayOpacity}
                  onChange={e => setOverlayOpacity(parseFloat(e.target.value))}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Posição das Fotos (Vertical)</label>
                </div>
                <input 
                  type="range" min="-250" max="250" step="1"
                  className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  value={photoPos.y}
                  onChange={e => setPhotoPos({y: parseInt(e.target.value)})}
                />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Posição dos Treinos (V/H)</label>
                </div>
                <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-zinc-500 font-bold w-4 text-center">V</span>
                        <input 
                          type="range" min="-500" max="500" step="1"
                          className="flex-1 accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                          value={infoPos.y}
                          onChange={e => setInfoPos(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] text-zinc-500 font-bold w-4 text-center">H</span>
                        <input 
                          type="range" min="-300" max="300" step="1"
                          className="flex-1 accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                          value={infoPos.x}
                          onChange={e => setInfoPos(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                        />
                      </div>
                </div>
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Tamanho da Fonte dos Horários</label>
                  <span className="text-[9px] text-theme-primary font-bold">{timeFontSize}px</span>
                </div>
                <input 
                  type="range" min="5" max="20" step="0.5"
                  className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  value={timeFontSize}
                  onChange={e => setTimeFontSize(parseFloat(e.target.value))}
                />
              </div>

              {/* Colunas dos Treinos option and Sidebar Width */}
              <div className="border-t border-zinc-800 pt-3 space-y-3">
                <div>
                  <label className="text-[9px] font-bold text-zinc-400 uppercase block mb-2">Colunas dos Treinos</label>
                  <div className="flex bg-black p-1 rounded-lg border border-zinc-700">
                    <button 
                      onClick={() => setColsCount(1)}
                      className={cn(
                        "flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all",
                        colsCount === 1 ? "bg-theme-primary text-black" : "text-zinc-500"
                      )}
                    >
                      1 Coluna
                    </button>
                    <button 
                      onClick={() => setColsCount(2)}
                      className={cn(
                        "flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all",
                        colsCount === 2 ? "bg-theme-primary text-black" : "text-zinc-500"
                      )}
                    >
                      2 Colunas
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Largura da Área de Treinos</label>
                    <span className="text-[9px] text-theme-primary font-bold">{sidebarWidth}px</span>
                  </div>
                  <input 
                    type="range" min="80" max="280" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={sidebarWidth}
                    onChange={e => setSidebarWidth(parseInt(e.target.value))}
                  />
                </div>
              </div>

              {/* Posição do Rodapé */}
              <div className="border-t border-zinc-800 pt-3 space-y-3">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Largura do rodapé</label>
                    <span className="text-[9px] text-theme-primary font-bold">{footerWidth}px</span>
                  </div>
                  <input 
                    type="range" min="80" max="280" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={footerWidth}
                    onChange={e => setFooterWidth(parseInt(e.target.value))}
                  />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Posição do Rodapé (V/H)</label>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-zinc-500 font-bold w-4 text-center">V</span>
                      <input 
                        type="range" min="-150" max="150" step="1"
                        className="flex-1 accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        value={footerPos.y}
                        onChange={e => setFooterPos(prev => ({ ...prev, y: parseInt(e.target.value) }))}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] text-zinc-500 font-bold w-4 text-center">H</span>
                      <input 
                        type="range" min="-150" max="150" step="1"
                        className="flex-1 accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                        value={footerPos.x}
                        onChange={e => setFooterPos(prev => ({ ...prev, x: parseInt(e.target.value) }))}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Custom Time and Text Inputs */}
          <div className="bg-black/40 p-5 rounded-[2rem] border border-zinc-800 space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-3.5 bg-theme-primary rounded-full" />
              <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block font-sans">
                Personalizar Horários e Textos
              </label>
            </div>
            <p className="text-[9px] text-zinc-500 font-bold uppercase leading-normal">
              Edite os horários ou adicione textos e notas para aparecerem nos blocos do encarte.
            </p>
            <div className="space-y-4 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
              {activeTrainings.map((t, idx) => {
                const hasSchedules = t.schedules && t.schedules.length > 0;
                if (!hasSchedules) {
                  const timeKey = `${t.id}-time`;
                  const catKey = `${t.id}-cat`;
                  return (
                    <div key={t.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                      <div className="text-[9px] font-black text-theme-primary uppercase italic">
                        {t.modality}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Horário / Texto</label>
                          <input
                            type="text"
                            value={customTimes[timeKey] !== undefined ? customTimes[timeKey] : (t.end_time ? `${t.start_time} às ${t.end_time}` : t.start_time)}
                            onChange={(e) => setCustomTimes(prev => ({ ...prev, [timeKey]: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-black border border-zinc-850 rounded-lg text-white text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-theme-primary"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Categoria / Rótulo</label>
                          <input
                            type="text"
                            value={customCategories[catKey] !== undefined ? customCategories[catKey] : t.category}
                            onChange={(e) => setCustomCategories(prev => ({ ...prev, [catKey]: e.target.value }))}
                            className="w-full px-2 py-1.5 bg-black border border-zinc-850 rounded-lg text-white text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-theme-primary"
                          />
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  return (
                    <div key={t.id} className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 space-y-3">
                      <div className="text-[9px] font-black text-theme-primary uppercase italic mb-1">
                        {t.modality} ({t.schedules?.length} horários)
                      </div>
                      {t.schedules?.map((s, si) => {
                        const timeKey = `${t.id}-${si}-time`;
                        const catKey = `${t.id}-${si}-cat`;
                        return (
                          <div key={si} className="p-2 bg-black/60 rounded-lg border border-zinc-800 space-y-2">
                            <div className="text-[8px] font-bold text-zinc-400">Horário {si+1}</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Horário / Texto</label>
                                <input
                                  type="text"
                                  value={customTimes[timeKey] !== undefined ? customTimes[timeKey] : (s.end_time ? `${s.start_time} às ${s.end_time}` : s.start_time)}
                                  onChange={(e) => setCustomTimes(prev => ({ ...prev, [timeKey]: e.target.value }))}
                                  className="w-full px-2 py-1.5 bg-black border border-zinc-850 rounded-lg text-white text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-theme-primary"
                                />
                              </div>
                              <div>
                                <label className="text-[8px] font-black text-zinc-500 uppercase block mb-1">Categorias / Tags</label>
                                <input
                                  type="text"
                                  value={customCategories[catKey] !== undefined ? customCategories[catKey] : s.categories.join(', ')}
                                  onChange={(e) => setCustomCategories(prev => ({ ...prev, [catKey]: e.target.value }))}
                                  className="w-full px-2 py-1.5 bg-black border border-zinc-855 rounded-lg text-white text-[10px] font-bold focus:outline-none focus:ring-1 focus:ring-theme-primary"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              })}
            </div>
          </div>

          {/* Image Upload / Athlete Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Imagem de Destaque (Slot {activeSlot})</label>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1 rounded-lg hover:bg-theme-primary/10 transition-all flex items-center gap-1.5"
              >
                <Camera size={12} />
                Subir Foto
              </button>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>

            {((activeSlot === 1 && customImage) || (activeSlot === 2 && customImage2)) && (
              <div className="space-y-4">
                <div className="relative group">
                  <img src={activeSlot === 1 ? customImage! : customImage2!} className="w-full h-32 object-cover rounded-2xl border-2 border-theme-primary" />
                  <button 
                    onClick={() => activeSlot === 1 ? setCustomImage(null) : setCustomImage2(null)}
                    className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={14} />
                  </button>
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <p className="text-[10px] font-black text-theme-primary bg-black/80 px-2 py-1 rounded uppercase tracking-widest">Foto Customizada {activeSlot}</p>
                  </div>
                </div>

                <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                  <button 
                    onClick={() => setPlayerMode('foreground')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                      playerMode === 'foreground' ? "bg-theme-primary text-black" : "text-zinc-500"
                    )}
                  >
                    Destaque
                  </button>
                  <button 
                    onClick={() => setPlayerMode('background')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                      playerMode === 'background' ? "bg-theme-primary text-black" : "text-zinc-500"
                    )}
                  >
                    Fundo
                  </button>
                </div>
              </div>
            )}

            {!((activeSlot === 1 && customImage) || (activeSlot === 2 && customImage2)) && (
              <>
                <div className="flex bg-black p-1 rounded-xl border border-zinc-800 mb-4">
                  <button 
                    onClick={() => setPlayerMode('foreground')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                      playerMode === 'foreground' ? "bg-theme-primary text-black" : "text-zinc-500"
                    )}
                  >
                    Destaque
                  </button>
                  <button 
                    onClick={() => setPlayerMode('background')}
                    className={cn(
                      "flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all",
                      playerMode === 'background' ? "bg-theme-primary text-black" : "text-zinc-500"
                    )}
                  >
                    Fundo
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text"
                    placeholder={`Pesquisar atleta ${activeSlot}...`}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm font-sans"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredAthletes.map(athlete => {
                    const isSelected = activeSlot === 1 ? selectedAthlete?.id === athlete.id : selectedAthlete2?.id === athlete.id;
                    return (
                      <button
                        key={athlete.id}
                        onClick={() => {
                          if (activeSlot === 1) {
                            setSelectedAthlete(athlete);
                            setCustomImage(null);
                          } else {
                            setSelectedAthlete2(athlete);
                            setCustomImage2(null);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                          isSelected 
                            ? "bg-theme-primary border-theme-primary text-black" 
                            : "bg-black border-zinc-800 text-white hover:border-zinc-600"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                          {athlete.photo ? (
                            <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><User size={20} /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black uppercase text-xs truncate">{athlete.name}</p>
                          <p className={cn("text-[10px] font-bold uppercase opacity-60", isSelected ? "text-black" : "text-zinc-500")}>
                            {athlete.birth_date ? format(new Date(athlete.birth_date), 'yyyy') : '---'}
                          </p>
                        </div>
                        {isSelected && <UserCheck size={18} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          <div className="pt-6 border-t border-zinc-800">
            <button
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full py-4 bg-theme-primary text-black font-black uppercase tracking-tighter rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-theme-primary/20 disabled:opacity-50"
            >
              {isExporting ? (
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></div>
              ) : (
                <Download size={20} />
              )}
              {isExporting ? 'Gerando Imagem...' : 'Baixar Encarte PNG'}
            </button>
            <p className="text-[10px] text-zinc-500 font-bold uppercase text-center mt-4">Formato 9:16 Instagram Story (1080x1920)</p>
          </div>
        </div>

        {/* Right: Preview (Flyer Content) */}
        <div className="flex flex-col items-center gap-4 max-w-full overflow-x-auto no-scrollbar lg:sticky lg:top-4 lg:self-start">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest lg:hidden">Visualização</p>
          <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
            {/* The actual Flyer target */}
            <div 
              ref={flyerRef}
              data-flyer-container="true"
              style={{ width: '360px', height: '640px' }} // Instagram Story 9:16
              className="bg-black relative overflow-hidden flex flex-col font-sans select-none"
            >
              {/* Main Border Overlay - Better for rendering than container border */}
              <div 
                className="absolute inset-0 border-[8px] pointer-events-none z-[100]"
                style={{ borderColor: settings?.primaryColor || '#EAB308', opacity: 0.8 }}
              >
                <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"></div>
              </div>

              {/* Layered Background System */}
              <div className="absolute inset-x-0 inset-y-0 pointer-events-none">
                {/* Backgrounds now start after the border */}
                <div className="absolute inset-0">
                  {/* Layer 1: Background 1 */}
                  {getFundo1Url() && (
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={getFundo1Url() || ''} 
                        className="w-full h-full object-cover" 
                        style={{ opacity: fundo1Opacity }}
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  {/* Layer 2: Background 2 (Mesclagem) */}
                  {getFundo2Url() && (
                    <div className="absolute inset-0 z-[1]" style={{ mixBlendMode: fundoBlend as any }}>
                      <img 
                        src={getFundo2Url() || ''} 
                        className="w-full h-full object-cover" 
                        style={{ opacity: fundo2Opacity }}
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  {/* Layer 3: Grass Overlay */}
                  {selectedBackgrounds.includes('grass') && (
                    <div className="absolute inset-0 z-[2] mix-blend-overlay opacity-80">
                      <img 
                        src="https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&q=80&w=1200" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                      />
                    </div>
                  )}

                  {/* Layer 4: Carbon Overlay */}
                  {selectedBackgrounds.includes('carbon') && (
                    <div 
                      data-bg-layer="carbon"
                      className="absolute inset-0 z-[3] mix-blend-multiply opacity-80"
                      style={{ 
                        backgroundColor: carbonColor,
                        backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`
                      }}
                    >
                      <div className="absolute inset-0 opacity-60 mix-blend-overlay" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')` }} />
                      {/* Scanline Effect */}
                      <div className="absolute inset-x-0 h-[3px] bg-theme-primary/30 top-1/4 animate-scan-slow blur-[2px]" />
                      <div className="absolute inset-x-0 h-[2px] bg-theme-primary/20 top-2/3 animate-scan-slow-delayed blur-[1px]" />
                      
                      {/* Tech Grid Overlay */}
                      <div className="absolute inset-0 z-[1] opacity-80 mix-blend-overlay" style={{ backgroundImage: `url('https://www.transparenttextures.com/patterns/carbon-fibre.png')` }} />
                      <div className="absolute inset-0 z-[2] opacity-20 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]" />
                    </div>
                  )}

                  {/* Global Gradients */}
                  <div 
                    className="absolute inset-0 z-[3] bg-gradient-to-t from-black via-black/40 to-black/80" 
                    style={{ opacity: overlayOpacity }}
                  />
                  
                  {/* Athlete Image Layer */}
                  {(customImage || selectedAthlete || customImage2 || selectedAthlete2) && (
                    <div 
                      className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none p-6 transition-transform"
                      style={{ transform: `translateY(${photoPos.y}px)` }}
                    >
                      <div className="relative w-full h-[300px] flex items-center justify-center">
                        {/* Player 1 Slot (Left) */}
                        <div className="absolute left-0 w-1/2 h-full flex items-center justify-center">
                          <div 
                            className={cn(
                              "w-28 h-40 border-4 border-theme-primary flex items-center justify-center overflow-hidden bg-black/40 shadow-[0_0_20px_rgba(234,179,8,0.3)]",
                              (selectedAthlete || customImage) ? "opacity-100" : "opacity-30 border-zinc-800"
                            )}
                            style={{ transform: 'skew(-6deg)' }}
                          >
                            {(customImage || selectedAthlete?.photo) && (
                              <img 
                                src={customImage || selectedAthlete?.photo} 
                                className="w-full h-full object-cover transform skew(6deg)" 
                                style={{ 
                                  transform: `skew(6deg) scale(${pos1.scale}) translate(${pos1.x}px, ${pos1.y}px)` 
                                }}
                                crossOrigin="anonymous" 
                              />
                            )}
                          </div>
                        </div>

                        {/* Player 2 Slot (Right) */}
                        <div className="absolute right-0 w-1/2 h-full flex items-center justify-center">
                          <div 
                            className={cn(
                              "w-28 h-40 border-4 border-theme-primary flex items-center justify-center overflow-hidden bg-black/40 shadow-[0_0_20px_rgba(234,179,8,0.3)]",
                              (selectedAthlete2 || customImage2) ? "opacity-100" : "opacity-30 border-zinc-800"
                            )}
                            style={{ transform: 'skew(-6deg)' }}
                          >
                            {(customImage2 || selectedAthlete2?.photo) && (
                              <img 
                                src={customImage2 || selectedAthlete2?.photo} 
                                className="w-full h-full object-cover transform skew(6deg)" 
                                style={{ 
                                  transform: `skew(6deg) scale(${pos2.scale}) translate(${pos2.x}px, ${pos2.y}px)` 
                                }}
                                crossOrigin="anonymous" 
                              />
                            )}
                          </div>
                        </div>

                        {/* VS Centered */}
                        {showVS && (
                          <div className="absolute z-10 flex flex-col items-center">
                            <div className="bg-black text-theme-primary font-black text-2xl italic p-2 px-4 rounded-xl border-2 border-theme-primary shadow-[0_0_30px_rgba(234,179,8,0.5)] transform -skew-x-12">
                              VS
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="absolute inset-x-0 bottom-0 z-[5] h-64 bg-gradient-to-t from-black to-transparent" />
                </div>
              </div>

              {/* Elements */}
              <div className="absolute inset-0 z-[6] bg-[url('https://www.transparenttextures.com/patterns/halftone-yellow.png')] opacity-[0.05]" />
              
              {/* Tech Header - Centered Orientation */}
              <div className="relative z-30 pt-10 flex flex-col items-center">
                <div className="w-20 h-20 mb-3 filter drop-shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                  {settings?.schoolCrest ? (
                    <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                  ) : (
                    <Trophy size={40} className="text-theme-primary" />
                  )}
                </div>
                <div className="text-center px-4">
                  <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] border-b-2 border-theme-primary/50 pb-1">
                    {settings.schoolName || 'Piruá Esporte Clube'}
                  </h1>
                </div>
              </div>

              {/* Date Section - Centered */}
              <div className="relative z-30 mt-4 flex justify-center">
                <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-xl px-3 py-1.5 flex items-center gap-2 shadow-xl">
                  <Calendar size={10} className="text-theme-primary" />
                  <div className="flex flex-col leading-tight items-center">
                    <span className="text-[6px] font-black text-theme-primary uppercase tracking-widest">{dayOfWeek}</span>
                    <span className="text-[11px] font-black text-white uppercase tracking-tight">{formattedDate}</span>
                  </div>
                </div>
              </div>

              {/* Vertical Sidebar: Schedules */}
              <div 
                className={cn(
                  "absolute bottom-32 z-40 flex flex-col gap-3 py-4 transition-all duration-300",
                  infoAlign === 'left' ? "left-2" : "right-2"
                )}
                style={{ 
                  top: `${96 + infoPos.y}px`,
                  transform: `translateX(${infoPos.x}px)`,
                  width: `${sidebarWidth}px`
                }}
              >
                {activeTrainings.map((t, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <div className={cn(
                      "bg-theme-primary/10 px-2 py-1 backdrop-blur-sm",
                      infoAlign === 'left' ? "border-l-2 border-theme-primary text-left" : "border-r-2 border-theme-primary text-right"
                    )}>
                      <h3 
                        className="text-[10px] font-black text-theme-primary uppercase italic tracking-tighter truncate leading-tight"
                        style={{ color: '#EAB308' }}
                      >
                        {t.modality}
                      </h3>
                    </div>
                    
                    <div className={cn(colsCount === 2 ? "grid grid-cols-2 gap-1.5" : "space-y-2", infoAlign === 'left' ? "pl-1" : "pr-1")}>
                      {!t.schedules || t.schedules.length === 0 ? (
                        <div className="relative group">
                          <div className={cn(
                            "bg-black/60 backdrop-blur-md p-2 space-y-1.5 shadow-lg group-hover:bg-black/80 transition-all",
                            infoAlign === 'left' ? "border-l border-white/10 rounded-r-lg" : "border-r border-white/10 rounded-l-lg"
                          )}>
                            {/* Time Slot */}
                            <div className={cn("flex items-center gap-1 flex-wrap", infoAlign === 'right' && "justify-end")}>
                              {infoAlign === 'left' && <Clock size={Math.max(6, Math.round(timeFontSize * 0.9))} className="text-theme-primary opacity-70" />}
                              <span 
                                className="text-theme-primary font-mono font-black tracking-tighter text-center"
                                style={{ fontSize: `${timeFontSize}px` }}
                              >
                                {customTimes[`${t.id}-time`] !== undefined ? customTimes[`${t.id}-time`] : (t.end_time ? `${t.start_time} às ${t.end_time}` : t.start_time)}
                              </span>
                              {infoAlign === 'right' && <Clock size={Math.max(6, Math.round(timeFontSize * 0.9))} className="text-theme-primary opacity-70" />}
                            </div>
                            
                            {/* Categories Stacks */}
                            <div className="flex flex-col gap-0.5 mt-0.5">
                              {(customCategories[`${t.id}-cat`] !== undefined ? customCategories[`${t.id}-cat`] : t.category) && (
                                <div className="bg-theme-primary text-black px-1.5 py-0.5 rounded-sm flex items-center justify-center">
                                  <span className="text-[7px] font-black uppercase italic leading-none text-center">
                                    {customCategories[`${t.id}-cat`] !== undefined ? customCategories[`${t.id}-cat`] : t.category}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        t.schedules.map((s, si) => (
                          <div key={si} className="relative group">
                            <div className={cn(
                              "bg-black/60 backdrop-blur-md p-2 space-y-1.5 shadow-lg group-hover:bg-black/80 transition-all",
                              infoAlign === 'left' ? "border-l border-white/10 rounded-r-lg" : "border-r border-white/10 rounded-l-lg"
                            )}>
                              {/* Time Slot */}
                              <div className={cn("flex items-center gap-1 flex-wrap", infoAlign === 'right' && "justify-end")}>
                                {infoAlign === 'left' && <Clock size={Math.max(6, Math.round(timeFontSize * 0.9))} className="text-theme-primary opacity-70" />}
                                <span 
                                  className="text-theme-primary font-mono font-black tracking-tighter text-center"
                                  style={{ fontSize: `${timeFontSize}px` }}
                                >
                                  {customTimes[`${t.id}-${si}-time`] !== undefined ? customTimes[`${t.id}-${si}-time`] : (s.end_time ? `${s.start_time} às ${s.end_time}` : s.start_time)}
                                </span>
                                {infoAlign === 'right' && <Clock size={Math.max(6, Math.round(timeFontSize * 0.9))} className="text-theme-primary opacity-70" />}
                              </div>

                              {/* Categories Stacks */}
                              <div className="flex flex-col gap-0.5 mt-0.5">
                                {customCategories[`${t.id}-${si}-cat`] !== undefined ? (
                                  customCategories[`${t.id}-${si}-cat`] && (
                                    <div className="bg-theme-primary text-black px-1.5 py-0.5 rounded-sm flex items-center justify-center">
                                      <span className="text-[7px] font-black uppercase italic leading-none text-center">
                                        {customCategories[`${t.id}-${si}-cat`]}
                                      </span>
                                    </div>
                                  )
                                ) : (
                                  s.categories.map((c, ci) => (
                                    <div key={ci} className="bg-theme-primary text-black px-1.5 py-0.5 rounded-sm flex items-center justify-center">
                                      <span className="text-[7px] font-black uppercase italic leading-none whitespace-nowrap">
                                        {c}
                                      </span>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* VS Slot Adjustment - Shifted right to account for sidebar */}
              {(customImage || selectedAthlete || customImage2 || selectedAthlete2) && (
                <div 
                  className="absolute top-1/2 -translate-y-1/2 z-20 flex items-center justify-center transition-all"
                  style={{
                    left: infoAlign === 'left' ? `${sidebarWidth + 12}px` : '16px',
                    right: infoAlign === 'right' ? `${sidebarWidth + 12}px` : '16px',
                  }}
                >
                  <div className="relative w-full h-[280px] flex items-center justify-center">
                    <div className="absolute left-0 w-1/2 h-full flex items-center justify-center -translate-x-2">
                      <div 
                        className={cn(
                          "w-24 h-36 border-4 border-theme-primary flex items-center justify-center overflow-hidden bg-black/40 shadow-[0_0_20px_rgba(234,179,8,0.3)]",
                          (selectedAthlete || customImage) ? "opacity-100" : "opacity-30 border-zinc-800"
                        )}
                        style={{ transform: 'skew(-6deg)' }}
                      >
                        {(customImage || selectedAthlete?.photo) && (
                          <img 
                            src={customImage || selectedAthlete?.photo} 
                            className="w-full h-full object-cover transform skew(6deg)" 
                            style={{ 
                              transform: `skew(6deg) scale(${pos1.scale}) translate(${pos1.x}px, ${pos1.y}px)` 
                            }}
                            crossOrigin="anonymous" 
                          />
                        )}
                      </div>
                    </div>

                    <div className="absolute right-0 w-1/2 h-full flex items-center justify-center translate-x-2">
                      <div 
                        className={cn(
                          "w-24 h-36 border-4 border-theme-primary flex items-center justify-center overflow-hidden bg-black/40 shadow-[0_0_20px_rgba(234,179,8,0.3)]",
                          (selectedAthlete2 || customImage2) ? "opacity-100" : "opacity-30 border-zinc-800"
                        )}
                        style={{ transform: 'skew(-6deg)' }}
                      >
                        {(customImage2 || selectedAthlete2?.photo) && (
                          <img 
                            src={customImage2 || selectedAthlete2?.photo} 
                            className="w-full h-full object-cover transform skew(6deg)" 
                            style={{ 
                              transform: `skew(6deg) scale(${pos2.scale}) translate(${pos2.x}px, ${pos2.y}px)` 
                            }}
                            crossOrigin="anonymous" 
                          />
                        )}
                      </div>
                    </div>

                    {showVS && (
                      <div className="absolute z-10">
                        <div className="bg-black text-theme-primary font-black text-xl italic px-3 py-1.5 rounded-lg border-2 border-theme-primary shadow-[0_0_30px_rgba(234,179,8,0.5)] transform -skew-x-12">
                          VS
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Motivational Footer Tag */}
              <div 
                className="absolute bottom-10 z-30 transition-all"
                style={{
                  left: infoAlign === 'left' ? 'auto' : '16px',
                  right: infoAlign === 'right' ? 'auto' : '16px',
                  width: `${footerWidth}px`,
                  transform: `translate(${footerPos.x}px, ${footerPos.y}px)`
                }}
              >
                <div className={cn(
                  "bg-black/20 backdrop-blur-sm pl-3 py-2 italic",
                  infoAlign === 'left' ? "border-l-2 border-theme-primary text-left" : "border-r-2 border-theme-primary text-right pr-3 pl-0"
                )}>
                  <p 
                    className="text-theme-primary text-[10px] font-black uppercase italic tracking-tighter drop-shadow-md leading-tight"
                    style={{ color: '#EAB308' }}
                  >
                    FOCO DISCIPLINA E RAÇA!<br />
                    O SUCESSO COMEÇA NO TREINO.
                  </p>
                </div>
              </div>

              {/* Footer info */}
              <div 
                className="absolute bottom-6 left-0 right-0 z-30 text-center"
                style={{
                  transform: `translate(${footerPos.x}px, ${footerPos.y}px)`
                }}
              >
                <p 
                  className="text-[7px] font-bold uppercase tracking-widest opacity-60"
                  style={{ color: '#71717a' }}
                >
                  {settings.schoolName || 'Piruá Esporte Clube'} • 2026
                </p>
              </div>
            </div>
          </div>
          <p className="text-zinc-500 text-[10px] italic font-medium uppercase tracking-widest opacity-60">Story Pro Render 2026 • High-Fidelity</p>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }
      `}</style>
    </div>
  );
}
