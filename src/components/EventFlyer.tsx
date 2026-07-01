import React, { useRef, useState } from 'react';
import { Event, Athlete } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trophy, Download, User, X, Camera, Search, UserCheck, MapPin, Activity, Clock, Calendar, FileText, Instagram } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn, fixHtml2CanvasColors, prepareElementForExport } from '../utils';

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

interface EventFlyerProps {
  event: Event;
  athletes: Athlete[];
  onClose: () => void;
}

export default function EventFlyer({ event, athletes, onClose }: EventFlyerProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const { settings } = useTheme();
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedAthlete2, setSelectedAthlete2] = useState<Athlete | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImage2, setCustomImage2] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');

  // Positioning State
  const [pos1, setPos1] = useState({ scale: 1, x: 0, y: 0 });
  const [pos2, setPos2] = useState({ scale: 1, x: 0, y: 0 });
  const [infoPos, setInfoPos] = useState({ y: 0 });
  const [photoPos, setPhotoPos] = useState({ y: 0 });
  const [topCrestSize, setTopCrestSize] = useState<number>(48);
  const [topFontSize, setTopFontSize] = useState<number>(20);
  const [yellowTextSize, setYellowTextSize] = useState<number>(14);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>(['stadium']);
  const [customBackgrounds, setCustomBackgrounds] = useState<{ [key: string]: string }>({});
  const [bgCategory, setBgCategory] = useState<string>('TODOS');
  const [carbonColor, setCarbonColor] = useState<string>('#1a1a1a');
  const [flyerTitle, setFlyerTitle] = useState('Grande Evento');
  const [eventName, setEventName] = useState(event.name);
  const [schoolName, setSchoolName] = useState(settings?.schoolName || 'Piruá Esporte Clube');
  const [flyerModality, setFlyerModality] = useState(event.modality || '');
  const [customLocationLine1, setCustomLocationLine1] = useState(`${event.street || ''}${event.number ? ', ' + event.number : ''}`);
  const [customLocationLine2, setCustomLocationLine2] = useState(`${event.neighborhood || ''}${event.neighborhood && (event.city || event.uf) ? ' • ' : ''}${event.city || ''}${event.city && event.uf ? '/' : ''}${event.uf || ''}`);
  const [showVS, setShowVS] = useState(true);
  const [categoryType, setCategoryType] = useState<'Adulto' | 'Categoria de Base' | 'Ambos' | ''>('');
  const [selectedSubs, setSelectedSubs] = useState<string[]>([]);
  const [customSub, setCustomSub] = useState('');

  // Auto-detecção de confronto versus para separar o título em 3 blocos (cima, vs, baixo)
  const getInitialVersusSplit = () => {
    const match = event.name.match(/\s+(vs|VS|Vs|vS|x|X|versus|Versus)\s+/);
    const parts = event.name.split(/\s+(?:vs|VS|Vs|vS|x|X|versus|Versus)\s+/i);
    if (parts.length >= 2) {
      return { 
        teamA: parts[0].trim(), 
        middle: match ? match[1].trim().toUpperCase() : 'VS', 
        teamB: parts.slice(1).join(' VS ').trim(), 
        hasVs: true 
      };
    }
    return { teamA: event.name, middle: 'VS', teamB: '', hasVs: false };
  };

  const initialVersus = getInitialVersusSplit();
  const [isVersusMode, setIsVersusMode] = useState(initialVersus.hasVs);
  const [versusTeamA, setVersusTeamA] = useState(initialVersus.teamA);
  const [versusMiddle, setVersusMiddle] = useState(initialVersus.middle);
  const [versusTeamB, setVersusTeamB] = useState(initialVersus.teamB);

  const toggleBackground = (id: string) => {
    setSelectedBackgrounds(prev => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev;
        return prev.filter(bg => bg !== id);
      }
      return [...prev, id];
    });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (activeSlot === 1) {
          setCustomImage(event.target?.result as string);
          setSelectedAthlete(null);
        } else {
          setCustomImage2(event.target?.result as string);
          setSelectedAthlete2(null);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        
        // Find which background base option to replace (preferably 'stadium' or 'grass')
        let activeId = 'stadium';
        if (selectedBackgrounds.includes('grass')) {
          activeId = 'grass';
        } else if (selectedBackgrounds.includes('stadium')) {
          activeId = 'stadium';
        } else {
          // If neither stadium nor grass is active, activate 'stadium' alongside whatever's active
          setSelectedBackgrounds(prev => {
            if (!prev.includes('stadium')) {
              return [...prev, 'stadium'];
            }
            return prev;
          });
          activeId = 'stadium';
        }

        setCustomBackgrounds(prev => ({
          ...prev,
          [activeId]: dataUrl
        }));
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
    const loadingToast = toast.loading('Gerando seu encarte de evento...');
    
    try {
      const element = flyerRef.current;
      const exportClone = await prepareElementForExport(element, 360, 640);

      try {
        const dataUrl = await htmlToImage.toPng(exportClone, {
          width: 360,
          height: 640,
          pixelRatio: 2,
          backgroundColor: '#000000',
          cacheBust: true,
          skipFonts: false
        });

        toast.dismiss(loadingToast);
        
        const link = document.createElement('a');
        const filename = isVersusMode 
          ? `EVENTO_${versusTeamA}_${versusMiddle}_${versusTeamB}`.replace(/\s+/g, '_')
          : `EVENTO_${eventName}`.replace(/\s+/g, '_');
        link.download = `${filename}.png`;
        link.href = dataUrl;
        link.click();
        
        toast.success('Encarte baixado com sucesso!');
      } finally {
        exportClone.remove();
      }
    } catch (error) {
      console.error('Error generating flyer:', error);
      toast.dismiss(loadingToast);
      toast.error('Erro ao gerar imagem.');
    } finally {
      setIsExporting(false);
    }
  };

  const formattedStartDate = format(new Date(event.start_date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR });
  const dayOfWeek = format(new Date(event.start_date + 'T12:00:00'), "EEEE", { locale: ptBR });

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-xl z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-start my-auto">
        
        {/* Left: Configuration */}
        <div className="space-y-6 bg-zinc-900/50 p-8 rounded-[2.5rem] border border-zinc-800">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Personalizar Encarte de Evento</h2>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors">
              <X size={24} />
            </button>
          </div>

          {/* Background Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-[10px] font-black text-zinc-450 uppercase tracking-widest block">Estilo de Fundo do Encarte</label>
                <p className="text-[9px] text-zinc-500 uppercase font-bold">Escolha um modelo temático ou faça upload</p>
              </div>
              <button 
                onClick={() => bgInputRef.current?.click()}
                className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1.5 rounded-xl hover:bg-theme-primary/10 transition-all flex items-center gap-1.5 shrink-0"
              >
                <Camera size={12} />
                Enviar Fundo
              </button>
              <input type="file" ref={bgInputRef} onChange={handleBgUpload} accept="image/*" className="hidden" />
            </div>

            {/* Category Tabs */}
            <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
              {['TODOS', 'FUTEBOL DE CAMPO', 'FUTSAL', 'VOLÊI', 'CORRIDA DE RUA', 'OUTROS'].map(cat => (
                <button
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
                const isActive = selectedBackgrounds.includes('stadium') && customBackgrounds['stadium'] === bg.url;
                const isDefaultActive = !customBackgrounds['stadium'] && bg.id === 'stadium_night' && selectedBackgrounds.includes('stadium');
                const selected = isActive || isDefaultActive;

                return (
                  <button
                    key={bg.id}
                    onClick={() => {
                      setCustomBackgrounds(prev => ({
                        ...prev,
                        stadium: bg.url
                      }));
                      if (!selectedBackgrounds.includes('stadium')) {
                        setSelectedBackgrounds(prev => [...prev, 'stadium']);
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

            {/* Effects Overlay Toggles */}
            <div className="flex gap-4 pt-1">
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
            <div className="space-y-4 p-4 bg-black/40 rounded-2xl border border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-1 h-3 bg-theme-primary rounded-full" />
                <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block">Tom do Carbono</label>
              </div>
              <div className="flex flex-wrap gap-2">
                {['#1a1a1a', '#0a0a0a', '#1e3a8a', '#312e81', '#164e63', '#064e3b', '#4c1d95', '#701a75', '#831843'].map(c => (
                  <button
                    key={c}
                    onClick={() => setCarbonColor(c)}
                    className={cn(
                      "relative w-10 h-10 rounded-xl border-2 overflow-hidden",
                      carbonColor === c ? "border-theme-primary scale-110" : "border-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <div className="absolute inset-0" style={{ backgroundColor: c }} />
                    <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M0 0h3v3H0zm3 3h3v3H3z' fill='%23000000' fill-opacity='0.5'/%3E%3C/svg%3E\")" }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title and Texts Customization */}
          <div className="space-y-4 p-4 bg-black/40 rounded-2xl border border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-1 h-3 bg-theme-primary rounded-full" />
              <label className="text-[10px] font-black text-zinc-300 uppercase tracking-widest block font-sans">Textos do Encarte</label>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Nome do Time (Cabeçalho)</label>
                <input 
                  type="text"
                  value={schoolName}
                  onChange={e => setSchoolName(e.target.value)}
                  className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none"
                  placeholder="Nome do Time/Clube..."
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Título/Categoria do Encarte</label>
                <input 
                  type="text"
                  value={flyerTitle}
                  onChange={e => setFlyerTitle(e.target.value)}
                  className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none"
                  placeholder="Ex: Grande Evento, Amistoso, Final..."
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Modalidade no Encarte</label>
                <input 
                  type="text"
                  value={flyerModality}
                  onChange={e => setFlyerModality(e.target.value)}
                  className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase font-bold"
                  placeholder="Ex: Futebol de Campo, Futsal..."
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Local (Rua, Nº ou Nome da Quadra)</label>
                <input 
                  type="text"
                  value={customLocationLine1}
                  onChange={e => setCustomLocationLine1(e.target.value)}
                  className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none"
                  placeholder="Ex: Ginásio Municipal, 120..."
                />
              </div>

              <div>
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Bairro • Cidade/UF</label>
                <input 
                  type="text"
                  value={customLocationLine2}
                  onChange={e => setCustomLocationLine2(e.target.value)}
                  className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none"
                  placeholder="Ex: Centro • Campos Altos/MG..."
                />
              </div>

              {/* Categoria do Evento & SUBs Section */}
              <div className="space-y-4 pt-3 border-t border-zinc-900">
                <div>
                  <label className="text-[9px] font-black text-zinc-400 uppercase tracking-wider block mb-1.5">Faixa Etária / Tipo de Categoria</label>
                  <div className="grid grid-cols-4 gap-1 bg-black p-1 rounded-xl border border-zinc-850">
                    {([
                      { id: '', label: 'Nenhum' },
                      { id: 'Adulto', label: 'Adulto' },
                      { id: 'Categoria de Base', label: 'Base' },
                      { id: 'Ambos', label: 'Ambos' }
                    ] as const).map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setCategoryType(opt.id)}
                        className={cn(
                          "py-1.5 rounded-lg text-[9px] font-black uppercase transition-all tracking-wider text-center cursor-pointer",
                          categoryType === opt.id ? "bg-theme-primary text-black" : "text-zinc-400 hover:text-white"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">Categorias SUB (Selecione ou adicione)</label>
                  <div className="flex flex-wrap gap-1 bg-black/40 p-2 rounded-xl border border-zinc-850">
                    {['SUB 7', 'SUB 9', 'SUB 11', 'SUB 13', 'SUB 15', 'SUB 17', 'SUB 20'].map(sub => {
                      const isSelected = selectedSubs.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedSubs(selectedSubs.filter(s => s !== sub));
                            } else {
                              setSelectedSubs([...selectedSubs, sub]);
                            }
                          }}
                          className={cn(
                            "px-2 py-1 rounded-lg text-[9px] font-black uppercase transition-all border cursor-pointer",
                            isSelected 
                              ? "bg-theme-primary border-theme-primary text-black" 
                              : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
                          )}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Custom Sub Input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Outro SUB (ex: SUB 14, SUB 16)..."
                      value={customSub}
                      onChange={e => setCustomSub(e.target.value)}
                      className="flex-1 bg-black border border-zinc-750 px-2.5 py-1.5 rounded-xl text-white text-[10px] uppercase outline-none focus:ring-1 focus:ring-theme-primary/50"
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customSub.trim().toUpperCase();
                          if (val && !selectedSubs.includes(val)) {
                            setSelectedSubs([...selectedSubs, val]);
                            setCustomSub('');
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customSub.trim().toUpperCase();
                        if (val && !selectedSubs.includes(val)) {
                          setSelectedSubs([...selectedSubs, val]);
                          setCustomSub('');
                        }
                      }}
                      className="px-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-bold uppercase transition-all cursor-pointer"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              {/* Seletor de Formato do Nome */}
              <div className="pt-2 border-t border-zinc-900">
                <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">Formato da Placa do Jogo</label>
                <div className="grid grid-cols-2 gap-2 bg-black p-1 rounded-xl border border-zinc-850">
                  <button 
                    type="button"
                    onClick={() => setIsVersusMode(false)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-[9px] font-black uppercase transition-all tracking-wider text-center flex items-center justify-center cursor-pointer",
                      !isVersusMode ? "bg-theme-primary text-black font-black" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Linha Única
                  </button>
                  <button 
                    type="button"
                    onClick={() => setIsVersusMode(true)}
                    className={cn(
                      "py-1.5 px-2 rounded-lg text-[9px] font-black uppercase transition-all tracking-wider text-center flex items-center justify-center cursor-pointer",
                      isVersusMode ? "bg-theme-primary text-black font-black" : "text-zinc-400 hover:text-white"
                    )}
                  >
                    Cima (VS) Baixo
                  </button>
                </div>
              </div>

              {!isVersusMode ? (
                <div className="animate-in fade-in duration-200">
                  <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Nome do Evento (Placa Principal)</label>
                  <textarea 
                    rows={2}
                    value={eventName}
                    onChange={e => setEventName(e.target.value)}
                    className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none resize-none"
                    placeholder="Ex: Sub-13 vs Sub-14, Nome do Jogo..."
                  />
                </div>
              ) : (
                <div className="space-y-3 animate-in fade-in duration-200">
                  <div>
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Time A / Nome de Cima</label>
                    <input 
                      type="text"
                      value={versusTeamA}
                      onChange={e => setVersusTeamA(e.target.value)}
                      className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none"
                      placeholder="Ex: Piruá E.C."
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 items-center">
                    <div className="col-span-1">
                      <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Divisor</label>
                      <input 
                        type="text"
                        value={versusMiddle}
                        onChange={e => setVersusMiddle(e.target.value)}
                        className="w-full bg-black border border-zinc-750 p-2 text-center rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none font-black"
                        placeholder="VS"
                      />
                    </div>
                    <div className="col-span-2 text-[10px] text-zinc-500 italic mt-3 pl-1 leading-tight">
                      Ficará estilizado no centro.
                    </div>
                  </div>

                  <div>
                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Time B / Nome de Baixo</label>
                    <input 
                      type="text"
                      value={versusTeamB}
                      onChange={e => setVersusTeamB(e.target.value)}
                      className="w-full bg-black border border-zinc-750 p-2.5 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none"
                      placeholder="Ex: Adversário"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Imagem de Destaque</label>
              <div className="flex gap-2">
                <button 
                  onClick={() => setActiveSlot(1)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                    activeSlot === 1 ? "bg-theme-primary text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]" : "bg-black border border-zinc-800 text-zinc-500"
                  )}
                >
                  Jogador 1
                </button>
                <button 
                  onClick={() => setActiveSlot(2)}
                  className={cn(
                    "px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                    activeSlot === 2 ? "bg-theme-primary text-black shadow-[0_0_10px_rgba(234,179,8,0.3)]" : "bg-black border border-zinc-800 text-zinc-500"
                  )}
                >
                  Jogador 2
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between bg-black/40 p-3 rounded-2xl border border-zinc-800">
               <div className="flex gap-4">
                  <div className="relative group w-12 h-12">
                    <div className={cn("w-full h-full rounded-lg border-2 overflow-hidden", (selectedAthlete || customImage) ? "border-theme-primary" : "border-zinc-800")}>
                      {(customImage || selectedAthlete?.photo) ? <img src={customImage || selectedAthlete?.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700"><User size={20} /></div>}
                    </div>
                    {(customImage || selectedAthlete) && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedAthlete(null); setCustomImage(null); }} className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5"><X size={10} /></button>
                    )}
                  </div>
                  <div className="relative group w-12 h-12">
                    <div className={cn("w-full h-full rounded-lg border-2 overflow-hidden", (selectedAthlete2 || customImage2) ? "border-theme-primary" : "border-zinc-800")}>
                      {(customImage2 || selectedAthlete2?.photo) ? <img src={customImage2 || selectedAthlete2?.photo} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-zinc-900 flex items-center justify-center text-zinc-700"><User size={20} /></div>}
                    </div>
                    {(customImage2 || selectedAthlete2) && (
                      <button onClick={(e) => { e.stopPropagation(); setSelectedAthlete2(null); setCustomImage2(null); }} className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5"><X size={10} /></button>
                    )}
                  </div>
               </div>
               
               <div className="flex flex-col gap-2">
                 <button onClick={() => fileInputRef.current?.click()} className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1.5 rounded-lg hover:bg-theme-primary/10 transition-all flex items-center gap-1.5">
                   <Camera size={12} />
                   Subir Foto
                 </button>
                 <button 
                  onClick={() => setShowVS(!showVS)}
                  className={cn(
                    "text-[10px] font-black uppercase px-3 py-1.5 rounded-lg transition-all",
                    showVS ? "bg-theme-primary/20 text-theme-primary border border-theme-primary/30" : "bg-black text-zinc-500 border border-zinc-800"
                  )}
                 >
                   Mostrar VS
                 </button>
               </div>
               <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
            </div>

            {/* Adjustment Controls */}
            {( (activeSlot === 1 && (selectedAthlete || customImage)) || (activeSlot === 2 && (selectedAthlete2 || customImage2)) ) && (
              <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-500 uppercase">Ajustar Jogador {activeSlot}</span>
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
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Posição das Fotos (Vertical)</label>
                  </div>
                  <input 
                    type="range" min="-150" max="150" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={photoPos.y}
                    onChange={e => setPhotoPos({y: parseInt(e.target.value)})}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Posição Data/Hora (Vertical)</label>
                  </div>
                  <input 
                    type="range" min="-250" max="250" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={infoPos.y}
                    onChange={e => setInfoPos({y: parseInt(e.target.value)})}
                  />
                </div>
              </div>
            </div>

            {/* Element Sizes Controls */}
            <div className="bg-black/60 p-4 rounded-2xl border border-zinc-800 space-y-4">
              <span className="text-[10px] font-black text-zinc-500 uppercase">Ajustar Tamanhos do Encarte</span>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Tamanho do Nome no Topo</label>
                    <span className="text-[9px] text-theme-primary font-bold">{topFontSize}px</span>
                  </div>
                  <input 
                    type="range" min="12" max="40" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={topFontSize}
                    onChange={e => setTopFontSize(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Tamanho do Escudo no Topo</label>
                    <span className="text-[9px] text-theme-primary font-bold">{topCrestSize}px</span>
                  </div>
                  <input 
                    type="range" min="20" max="120" step="2"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={topCrestSize}
                    onChange={e => setTopCrestSize(parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <label className="text-[9px] font-bold text-zinc-400 uppercase">Nomes no Espaço Amarelo</label>
                    <span className="text-[9px] text-theme-primary font-bold">{yellowTextSize}px</span>
                  </div>
                  <input 
                    type="range" min="8" max="32" step="1"
                    className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    value={yellowTextSize}
                    onChange={e => setYellowTextSize(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </div>

            {!customImage && !((activeSlot === 1 && customImage) || (activeSlot === 2 && customImage2)) && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text"
                    placeholder={`Pesquisar Jogador ${activeSlot}...`}
                    className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white text-sm outline-none focus:ring-2 focus:ring-theme-primary/50"
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
                          isSelected ? "bg-theme-primary border-theme-primary text-black" : "bg-black border-zinc-800 text-white hover:border-zinc-600"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-zinc-800 flex-shrink-0">
                          {athlete.photo ? <img src={athlete.photo} className="w-full h-full object-cover" crossOrigin="anonymous" /> : <div className="w-full h-full flex items-center justify-center"><User size={20} /></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-black uppercase text-xs truncate">{athlete.name}</p>
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
            <button onClick={handleDownload} disabled={isExporting} className="w-full py-4 bg-theme-primary text-black font-black uppercase tracking-tighter rounded-2xl flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-theme-primary/20 disabled:opacity-50">
              {isExporting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></div> : <Download size={20} />}
              {isExporting ? 'Gerando Imagem...' : 'Baixar Encarte de Evento'}
            </button>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="flex flex-col items-center gap-4 max-w-full overflow-x-auto no-scrollbar lg:sticky lg:top-4 lg:self-start">
          <div 
            ref={flyerRef}
            style={{ width: '360px', height: '640px' }}
            className="bg-black relative overflow-hidden flex flex-col select-none"
          >
            {/* Border Overlay - More reliable than container border */}
            <div 
              className="absolute inset-0 z-[100] pointer-events-none border-[8px]"
              style={{ borderColor: settings.primaryColor || '#EAB308', opacity: 0.8 }}
            >
              <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"></div>
            </div>
            {/* Background Layers */}
            <div className="absolute inset-0">
              {selectedBackgrounds.includes('stadium') && (
                <div className="absolute inset-0 z-0">
                  <img src={customBackgrounds['stadium'] || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200"} className="w-full h-full object-cover" crossOrigin="anonymous" />
                  <div className="absolute inset-0 bg-black/40" />
                </div>
              )}
              {selectedBackgrounds.includes('grass') && (
                <div className={cn("absolute inset-0 z-[1]", selectedBackgrounds.includes('stadium') ? "mix-blend-overlay opacity-80" : "opacity-100")}>
                  <img src={customBackgrounds['grass'] || "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&q=80&w=1200"} className="w-full h-full object-cover" crossOrigin="anonymous" />
                </div>
              )}
              {selectedBackgrounds.includes('carbon') && (
                <div className={cn("absolute inset-0 z-[2]", (selectedBackgrounds.includes('stadium') || selectedBackgrounds.includes('grass')) ? "mix-blend-multiply opacity-80" : "opacity-100")} style={{ backgroundColor: carbonColor }}>
                  <div className="absolute inset-0 opacity-60 mix-blend-overlay" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='6' height='6'%3E%3Cpath d='M0 0h3v3H0zm3 3h3v3H3z' fill='%23000000' fill-opacity='0.6'/%3E%3C/svg%3E\")" }} />
                </div>
              )}
              <div className="absolute inset-0 z-[3] bg-gradient-to-t from-black via-black/30 to-black/70" />
              
              {/* Photo Layer - Positionable */}
              {(customImage || selectedAthlete || customImage2 || selectedAthlete2) && (
                <div 
                  className="absolute inset-0 z-[4] flex items-center justify-center pointer-events-none p-6 transition-transform"
                  style={{ transform: `translateY(${photoPos.y}px)` }}
                >
                  <div className="relative w-full h-[300px] flex items-center justify-center">
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

            {/* Content Layer - Positionable Info */}
            <div className="relative z-[30] pt-8 px-6 flex flex-col items-center flex-1">
              <div className="mb-3 flex items-center justify-center" style={{ width: `${topCrestSize}px`, height: `${topCrestSize}px` }}>
                {settings?.schoolCrest ? (
                  <img src={settings.schoolCrest} className="w-full h-full object-contain" crossOrigin="anonymous" />
                ) : (
                  <Trophy size={Math.round(topCrestSize * 0.8)} className="text-theme-primary" />
                )}
              </div>
              <h1 
                className="font-black text-white italic tracking-tighter uppercase leading-none text-center drop-shadow-lg mb-1"
                style={{ fontSize: `${topFontSize}px` }}
              >
                {schoolName}
              </h1>
              {flyerModality && (
                <p className="text-[9px] font-black tracking-widest text-theme-primary uppercase mb-1.5 pt-0.5">
                  • {flyerModality} •
                </p>
              )}
              <div className="w-10 h-0.5 bg-theme-primary rounded-full mb-5 opacity-80"></div>

              {/* Event Title Card */}
              <div className="w-full bg-theme-primary p-2.5 rounded-xl transform -skew-x-6 shadow-2xl mb-4">
                <div className="transform skew-x-6 text-center">
                  <p className="text-[12px] font-black text-black uppercase tracking-widest leading-none mb-1.5 opacity-80">{flyerTitle}</p>
                  
                  {isVersusMode ? (
                    <div className="flex flex-col items-center justify-center w-full leading-none py-0.5">
                      <span 
                        className="font-black text-black uppercase tracking-tighter block truncate max-w-full px-2 leading-none"
                        style={{ fontSize: `${yellowTextSize}px` }}
                      >
                        {versusTeamA || 'NOME DE CIMA'}
                      </span>
                      <span className="text-[9px] font-black italic bg-black text-theme-primary px-2 py-0.5 rounded-md my-1 inline-block uppercase tracking-wider scale-90 leading-none">
                        {versusMiddle || 'VS'}
                      </span>
                      <span 
                        className="font-black text-black uppercase tracking-tighter block truncate max-w-full px-2 leading-none"
                        style={{ fontSize: `${yellowTextSize}px` }}
                      >
                        {versusTeamB || 'NOME DE BAIXO'}
                      </span>
                    </div>
                  ) : (
                    <h2 
                      className="font-black text-black uppercase tracking-tighter leading-tight px-2"
                      style={{ fontSize: `${yellowTextSize * 1.15}px` }}
                    >
                      {eventName}
                    </h2>
                  )}
                </div>
              </div>

              {/* Category & SUBs Badges */}
              {(categoryType || selectedSubs.length > 0) && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 mb-4 max-w-full px-2">
                  {categoryType === 'Adulto' && (
                    <span className="bg-black/80 text-theme-primary text-[8px] font-black px-2 py-1 rounded border border-theme-primary/30 uppercase tracking-wider">
                      Adulto
                    </span>
                  )}
                  {categoryType === 'Categoria de Base' && (
                    <span className="bg-black/80 text-theme-primary text-[8px] font-black px-2 py-1 rounded border border-theme-primary/30 uppercase tracking-wider">
                      Base
                    </span>
                  )}
                  {categoryType === 'Ambos' && (
                    <>
                      <span className="bg-black/80 text-theme-primary text-[8px] font-black px-2 py-1 rounded border border-theme-primary/30 uppercase tracking-wider">
                        Adulto
                      </span>
                      <span className="bg-black/80 text-theme-primary text-[8px] font-black px-2 py-1 rounded border border-theme-primary/30 uppercase tracking-wider">
                        Base
                      </span>
                    </>
                  )}
                  {selectedSubs.map(sub => (
                    <span key={sub} className="bg-theme-primary/20 text-theme-primary text-[8px] font-black px-2 py-1 rounded border border-theme-primary/30 uppercase tracking-wider">
                      {sub}
                    </span>
                  ))}
                </div>
              )}

              {/* Date & Time - Positionable via translateY */}
              <div 
                className="flex items-center gap-3 transition-transform z-[31]"
                style={{ transform: `translateY(${infoPos.y}px)` }}
              >
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-2 flex items-center gap-2 min-w-[100px]">
                  <div className="bg-theme-primary p-1.5 rounded-lg text-black"><Calendar size={14} /></div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[7px] font-black text-theme-primary uppercase tracking-widest mb-0.5">{dayOfWeek}</span>
                    <span className="text-[11px] font-black text-white tracking-tight">{formattedStartDate}</span>
                  </div>
                </div>
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-xl p-2 flex items-center gap-2 min-w-[100px]">
                  <div className="bg-theme-primary p-1.5 rounded-lg text-black"><Clock size={14} /></div>
                  <div className="flex flex-col leading-none">
                    <span className="text-[7px] font-black text-theme-primary uppercase tracking-widest mb-0.5">Início</span>
                    <span className="text-[11px] font-black text-white tracking-tight">{event.start_time}</span>
                  </div>
                </div>
              </div>

              <div className="flex-1" />

              {/* Minimal Location in Footer */}
              <div className="flex flex-col items-center text-center opacity-90 mb-4">
                <div className="flex items-center gap-1.5 text-theme-primary mb-1">
                  <MapPin size={10} />
                  <span className="text-[8px] font-black uppercase tracking-[0.2em]">Local do Evento</span>
                </div>
                <p className="text-[10px] font-bold text-white uppercase tracking-tight">{customLocationLine1}</p>
                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">{customLocationLine2}</p>
              </div>

              <div className="w-full border-t border-theme-primary/20 pt-4 text-center">
                <p className="text-theme-primary text-[10px] font-black uppercase italic tracking-[0.3em] mb-1">Contamos com a sua torcida!</p>
                <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-[0.2em]">{settings.schoolName} • 2026</p>
              </div>
            </div>
            <div className="absolute inset-0 z-[-1] opacity-[0.05]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16'%3E%3Ccircle cx='8' cy='8' r='1.5' fill='%23eab308' fill-opacity='0.5'/%3E%3C/svg%3E\")" }} />
          </div>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }`}</style>
    </div>
  );
}
