import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { Event, Athlete, Professor, getSubCategory } from '../types';
import { 
  Trophy, Download, User, X, Camera, Search, UserCheck, MapPin, 
  Activity, Clock, Calendar, FileText, Instagram, Settings, LayoutGrid, 
  Type, Heart, Image as ImageIcon, Sparkles, Sliders, ChevronDown, Check,
  UserPlus
} from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { toast } from 'sonner';
import { cn, prepareElementForExport, toBase64 } from '../utils';

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

interface LineupFlyerGeneratorProps {
  event: Event;
  allLineups: {
    athletes: Athlete[];
    staff: Professor[];
    lineup_index: number;
    category?: string;
    lineup_name?: string;
  }[];
  athletes: Athlete[];
  professors: Professor[];
  initialSelectedIndex?: number;
}

interface PlayerPhotoSettings {
  url: string | null;
  scale: number;
  x: number;
  y: number;
  opacity: number;
  flip: boolean;
  behindText: boolean;
}

export default function LineupFlyerGenerator({ event, allLineups, athletes, professors, initialSelectedIndex }: LineupFlyerGeneratorProps) {
  const { settings } = useTheme();
  const flyerRef = useRef<HTMLDivElement>(null);
  const fileInputRef1 = useRef<HTMLInputElement>(null);
  const fileInputRef2 = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const crestInputRef = useRef<HTMLInputElement>(null);

  // --- Theme / Visual Presets ---
  const [themePreset, setThemePreset] = useState<'slate' | 'sunset' | 'aurora' | 'neon' | 'monochrome'>('slate');
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>(settings?.primaryColor || '#fbbf24');
  const [customBgGradientStart, setCustomBgGradientStart] = useState<string>('#09090b');
  const [customBgGradientEnd, setCustomBgGradientEnd] = useState<string>('#18181b');
  const [fontFamily, setFontFamily] = useState<'sans' | 'serif' | 'mono'>('sans');
  const [showGridOverlay, setShowGridOverlay] = useState<boolean>(true);

  // --- Background Options ---
  const [bgType, setBgType] = useState<'solid' | 'gradient' | 'carbon' | 'stadium' | 'upload'>('carbon');
  const [uploadedBgUrl, setUploadedBgUrl] = useState<string | null>(null);
  const [bgCategory, setBgCategory] = useState<string>('TODOS');

  // --- Header Customization ---
  const formatDateSafe = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const fullAddress = [
    event.street ? `${event.street}${event.number ? ', ' + event.number : ''}` : '',
    event.neighborhood || '',
    event.city ? `${event.city}${event.uf ? '/' + event.uf : ''}` : ''
  ].filter(Boolean).join(' - ');

  const [headerTitle, setHeaderTitle] = useState<string>('CONVOCADOS');
  const [headerCategoryText, setHeaderCategoryText] = useState<string>('');
  const [headerSubtitle, setHeaderSubtitle] = useState<string>(event.name || 'DATA DO JOGO');
  const [showLogo, setShowLogo] = useState<boolean>(true);
  const [logoSize, setLogoSize] = useState<number>(48);
  const [uploadedLogoUrl, setUploadedLogoUrl] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [headerDateText, setHeaderDateText] = useState<string>(`${formatDateSafe(event.start_date)} às ${event.start_time}`);
  const [headerLocationText, setHeaderLocationText] = useState<string>(fullAddress || `${event.city || ''}/${event.uf || ''} - ${event.neighborhood || ''}`);
  const [headerDepartureText, setHeaderDepartureText] = useState<string>(
    event.departure_time 
      ? `SAÍDA: ${event.departure_time}${event.departure_location ? ' - ' + event.departure_location : ''}`
      : ''
  );

  // --- Footer Customization ---
  const [footerInstagram, setFooterInstagram] = useState<string>(settings?.instagram || '@piruaesporteclube');
  const [footerMotivationalText, setFooterMotivationalText] = useState<string>('🏆 União, Força e Glória! 🏆');
  const [showSponsors, setShowSponsors] = useState<boolean>(true);
  const [sponsorText, setSponsorText] = useState<string>('PATROCINADORES');

  // --- Players Selection & Layout ---
  const [selectedIndex, setSelectedIndex] = useState<number>(initialSelectedIndex ?? 0);
  const [selectedListAthletes, setSelectedListAthletes] = useState<string[]>([]);
  const [selectedListStaff, setSelectedListStaff] = useState<string[]>([]);
  const [showStaff, setShowStaff] = useState<boolean>(true);
  const [columnsCount, setColumnsCount] = useState<1 | 2>(2);
  const [fontSizeClass, setFontSizeClass] = useState<'text-[10px]' | 'text-[11px]' | 'text-xs' | 'text-sm'>('text-xs');
  const [itemsGap, setItemsGap] = useState<number>(1.5); // gap in py-0.5, py-1, py-1.5, etc.
  const [showJersey, setShowJersey] = useState<boolean>(true);
  const [showPosition, setShowPosition] = useState<boolean>(true);
  const [showNickname, setShowNickname] = useState<boolean>(true);
  const [sortAlphabetically, setSortAlphabetically] = useState<boolean>(true);

  // Sync selectedIndex when initialSelectedIndex changes
  useEffect(() => {
    if (initialSelectedIndex !== undefined) {
      setSelectedIndex(initialSelectedIndex);
    }
  }, [initialSelectedIndex]);

  // --- Featured Player Photos (Ajustar Fotos) ---
  const [photo1, setPhoto1] = useState<PlayerPhotoSettings>({
    url: null,
    scale: 1.0,
    x: 0,
    y: 0,
    opacity: 0.8,
    flip: false,
    behindText: true,
  });

  const [photo2, setPhoto2] = useState<PlayerPhotoSettings>({
    url: null,
    scale: 1.0,
    x: 0,
    y: 0,
    opacity: 0.8,
    flip: false,
    behindText: true,
  });

  const [activePhotoEditing, setActivePhotoEditing] = useState<1 | 2>(1);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [accordionOpen, setAccordionOpen] = useState<'theme' | 'header' | 'photos' | 'list' | 'footer'>('theme');

  // Load initial logo from settings
  useEffect(() => {
    if (settings?.schoolCrest) {
      toBase64(settings.schoolCrest).then(b64 => {
        setLogoDataUrl(b64);
      });
    }
  }, [settings?.schoolCrest]);

  // Load initial athletes from first available lineup
  useEffect(() => {
    const defaultLineup = allLineups.find(l => l.lineup_index === selectedIndex) || allLineups[0];
    if (defaultLineup) {
      setSelectedListAthletes(defaultLineup.athletes.map(a => a.id));
      setSelectedListStaff(defaultLineup.staff.map(s => s.id));
      setHeaderCategoryText(defaultLineup.category || defaultLineup.lineup_name || `SUB-${selectedIndex + 1}`);
    }
  }, [selectedIndex, allLineups]);

  // Get currently active lineup of selected index
  const currentLineup = allLineups.find(l => l.lineup_index === selectedIndex) || {
    athletes: [],
    staff: [],
    lineup_name: `Lista ${selectedIndex + 1}`,
    category: ''
  };

  // Preset Colors settings
  const colorPresets = {
    slate: { start: '#09090b', end: '#18181b', primary: '#fbbf24' },
    sunset: { start: '#451a03', end: '#1c1917', primary: '#fb923c' },
    aurora: { start: '#022c22', end: '#09090b', primary: '#10b981' },
    neon: { start: '#000000', end: '#0f172a', primary: '#ec4899' },
    monochrome: { start: '#000000', end: '#111111', primary: '#ffffff' }
  };

  const applyPreset = (preset: 'slate' | 'sunset' | 'aurora' | 'neon' | 'monochrome') => {
    setThemePreset(preset);
    const colors = colorPresets[preset];
    setCustomBgGradientStart(colors.start);
    setCustomBgGradientEnd(colors.end);
    setCustomPrimaryColor(colors.primary);
  };

  // Image Upload Handlers
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>, slot: 1 | 2) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (slot === 1) {
          setPhoto1(prev => ({ ...prev, url: result }));
        } else {
          setPhoto2(prev => ({ ...prev, url: result }));
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
        setUploadedBgUrl(event.target?.result as string);
        setBgType('upload');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedLogoUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setIsExporting(true);
    const loadingToast = toast.loading('Exportando encarte em alta resolução...');

    try {
      // Small timeout to allow state rendering to finalize
      await new Promise(resolve => setTimeout(resolve, 500));

      const element = flyerRef.current;
      const exportClone = await prepareElementForExport(element, 360, 640);
      
      try {
        // Use html-to-image with pixelRatio = 3 to get standard 1080x1920 Stories size
        // since the preview is sized 360x640 (360 * 3 = 1080; 640 * 3 = 1920)
        const dataUrl = await htmlToImage.toPng(exportClone, {
          width: 360,
          height: 640,
          pixelRatio: 3,
          backgroundColor: customBgGradientStart,
        });

        const link = document.createElement('a');
        link.download = `ESCALACAO_${event.name.replace(/\s+/g, '_')}_STORIES.png`;
        link.href = dataUrl;
        link.click();

        toast.dismiss(loadingToast);
        toast.success('Imagem stories gerada com sucesso!');
      } finally {
        exportClone.remove();
      }
    } catch (error) {
      console.error('Error generating instagram flyer:', error);
      toast.dismiss(loadingToast);
      toast.error('Erro ao gerar imagem em alta resolução.');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter actual athlete list based on users selection
  const filteredAthletesToRender = currentLineup.athletes
    .filter(a => selectedListAthletes.includes(a.id))
    .sort((a, b) => {
      if (sortAlphabetically) {
        return a.name.localeCompare(b.name, 'pt-BR');
      }
      return 0;
    });
  const filteredStaffToRender = currentLineup.staff.filter(s => selectedListStaff.includes(s.id));

  // Determine font family style
  const fontStyleClass = () => {
    if (fontFamily === 'serif') return 'font-serif';
    if (fontFamily === 'mono') return 'font-mono';
    return 'font-sans';
  };

  return (
    <div className="space-y-6 flex-1 min-h-[70vh] flex flex-col no-print">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <h3 className="text-lg font-black text-white uppercase tracking-tighter flex items-center gap-2">
            <Sparkles size={18} className="text-theme-primary" />
            Gerador Digital de Encartes (Instagram Stories)
          </h3>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest mt-1">
            Crie artes premium na proporção 9:16 com fotos de jogadores, patrocínios e downloads em HD
          </p>
        </div>

        <button
          onClick={handleDownload}
          disabled={isExporting}
          className="flex items-center gap-2 px-5 py-3 bg-theme-primary text-black hover:opacity-90 disabled:opacity-50 rounded-2xl transition-all text-xs font-black uppercase tracking-widest shadow-lg shadow-theme-primary/25 self-start md:self-auto"
        >
          <Download size={14} />
          {isExporting ? 'Processando Imagem...' : 'BAIXAR ENCARTE STORIES'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* LEFT COLUMN: Controls & Configurations - Span 7 */}
        <div className="lg:col-span-7 space-y-4 pr-2">
          
          {/* List Index Selector */}
          <div className="bg-zinc-950/60 p-4 border border-zinc-800 rounded-3xl space-y-3">
            <label className="text-[10px] font-black text-theme-primary uppercase tracking-widest block">
              Selecione a Lista Origem da Escalação
            </label>
            <div className="flex flex-wrap gap-1.5">
              {allLineups.map((lineup, idx) => {
                const name = lineup.lineup_name || `Lista ${idx + 1}`;
                const isActive = selectedIndex === idx;
                const hasAthletes = lineup.athletes.length > 0;
                
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedIndex(idx)}
                    className={`px-3 py-2 rounded-xl text-[10px] font-black transition-all uppercase tracking-wider border ${
                      isActive 
                        ? 'bg-theme-primary border-theme-primary text-black scale-105 shadow-md shadow-theme-primary/15'
                        : hasAthletes 
                          ? 'bg-zinc-900 border-zinc-750 text-zinc-300 hover:border-zinc-505'
                          : 'bg-zinc-950 border-zinc-900 text-zinc-650 opacity-40'
                    }`}
                  >
                    {name} ({lineup.athletes.length})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Accordion Configurations */}
          <div className="space-y-3">
            
            {/* Section 1: Tema e Fundo */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setAccordionOpen(accordionOpen === 'theme' ? 'header' : 'theme')}
                className="w-full flex items-center justify-between p-4 text-left font-black text-xs text-white uppercase tracking-wider hover:bg-zinc-850 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <PaletteIcon size={14} className="text-theme-primary" />
                  1. Paleta de Cores e Estilo Visual
                </span>
                <ChevronDown size={14} className={`transform transition-transform ${accordionOpen === 'theme' ? 'rotate-180' : ''}`} />
              </button>

              {accordionOpen === 'theme' && (
                <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-950/20">
                  {/* Preset Themes */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Temas Rápidos</label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {(['slate', 'sunset', 'aurora', 'neon', 'monochrome'] as const).map(preset => (
                        <button
                          key={preset}
                          onClick={() => applyPreset(preset)}
                          className={`py-2 rounded-xl text-[9px] font-black uppercase border transition-all ${
                            themePreset === preset 
                              ? 'bg-zinc-800 border-theme-primary text-theme-primary font-black' 
                              : 'bg-black border-zinc-850 text-zinc-400 hover:border-zinc-800'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Fonts */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Fonte Tipográfica</label>
                      <select
                        value={fontFamily}
                        onChange={e => setFontFamily(e.target.value as any)}
                        className="w-full bg-black border border-zinc-800 rounded-xl p-2.5 text-xs text-zinc-350 focus:border-theme-primary outline-none uppercase font-bold"
                      >
                        <option value="sans">Inter (Moderno Sans)</option>
                        <option value="serif">Playfair (Clássico Serif)</option>
                        <option value="mono">Fira Code (Atlético/Mono)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5 flex flex-col justify-end">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest flex items-center gap-2 cursor-pointer pb-2.5">
                        <input
                          type="checkbox"
                          checked={showGridOverlay}
                          onChange={e => setShowGridOverlay(e.target.checked)}
                          className="rounded border-zinc-805 bg-black text-theme-primary focus:ring-0"
                        />
                        Exibir grade futurista / quadriculado
                      </label>
                    </div>
                  </div>

                  {/* Custom Background selector */}
                  <div className="space-y-4 pt-2 border-t border-zinc-900">
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-[10px] font-black text-zinc-450 uppercase tracking-widest block">Estilo de Fundo do Encarte</label>
                        <p className="text-[9px] text-zinc-500 uppercase font-bold">Escolha um modelo temático ou faça upload</p>
                      </div>
                      <button
                        onClick={() => bgInputRef.current?.click()}
                        className="text-[9px] font-black uppercase text-theme-primary px-2.5 py-1.5 border border-theme-primary/25 hover:bg-theme-primary/10 rounded-xl flex items-center gap-1 shrink-0"
                      >
                        <Camera size={10} />
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
                        const selected = bgType === 'upload' && uploadedBgUrl === bg.url;

                        return (
                          <button
                            key={bg.id}
                            onClick={() => {
                              setUploadedBgUrl(bg.url);
                              setBgType('upload');
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

                    {/* Default System Backgrounds */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      {[
                        { id: 'carbon', label: 'Efeito Carbono' },
                        { id: 'gradient', label: 'Efeito Gradiente' },
                        { id: 'stadium', label: 'Efeito Estádio Padrão' }
                      ].map(b => (
                        <button
                          key={b.id}
                          onClick={() => setBgType(b.id as any)}
                          className={cn(
                            "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all",
                            bgType === b.id 
                              ? "bg-theme-primary border-theme-primary text-black" 
                              : "bg-black/60 border-zinc-800 text-zinc-400 hover:border-zinc-750"
                          )}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Hex Color pickers */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-zinc-900">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-500 uppercase tracking-wider block">Cor de Destaque</label>
                      <div className="flex gap-1">
                        <input
                          type="color"
                          value={customPrimaryColor}
                          onChange={e => setCustomPrimaryColor(e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer border border-zinc-800 bg-transparent"
                        />
                        <input
                          type="text"
                          value={customPrimaryColor}
                          onChange={e => setCustomPrimaryColor(e.target.value)}
                          className="flex-1 text-[10px] bg-black border border-zinc-800 px-2 rounded-lg font-mono text-zinc-350 focus:border-theme-primary outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-505 uppercase tracking-wider block">Fundo Início</label>
                      <div className="flex gap-1">
                        <input
                          type="color"
                          value={customBgGradientStart}
                          onChange={e => setCustomBgGradientStart(e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer border border-zinc-800 bg-transparent"
                        />
                        <input
                          type="text"
                          value={customBgGradientStart}
                          onChange={e => setCustomBgGradientStart(e.target.value)}
                          className="flex-1 text-[10px] bg-black border border-zinc-800 px-2 rounded-lg font-mono text-zinc-350 focus:border-theme-primary outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-zinc-505 uppercase tracking-wider block">Fundo Fim</label>
                      <div className="flex gap-1">
                        <input
                          type="color"
                          value={customBgGradientEnd}
                          onChange={e => setCustomBgGradientEnd(e.target.value)}
                          className="w-8 h-8 rounded-lg overflow-hidden cursor-pointer border border-zinc-800 bg-transparent"
                        />
                        <input
                          type="text"
                          value={customBgGradientEnd}
                          onChange={e => setCustomBgGradientEnd(e.target.value)}
                          className="flex-1 text-[10px] bg-black border border-zinc-850 px-2 rounded-lg font-mono text-zinc-350 focus:border-theme-primary outline-none"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>

            {/* Section 2: Cabeçalho */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setAccordionOpen(accordionOpen === 'header' ? 'photos' : 'header')}
                className="w-full flex items-center justify-between p-4 text-left font-black text-xs text-white uppercase tracking-wider hover:bg-zinc-850 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Type size={14} className="text-theme-primary" />
                  2. Configurações de Cabeçalho
                </span>
                <ChevronDown size={14} className={`transform transition-transform ${accordionOpen === 'header' ? 'rotate-180' : ''}`} />
              </button>

              {accordionOpen === 'header' && (
                <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-950/20">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest block">Título Principal</label>
                      <input
                        type="text"
                        value={headerTitle}
                        onChange={e => setHeaderTitle(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                        placeholder="Ex: ESCALAÇÃO OFICIAL, CONVOCADOS..."
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest block">Categoria / SUB</label>
                      <input
                        type="text"
                        value={headerCategoryText}
                        onChange={e => setHeaderCategoryText(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                        placeholder="Ex: SUB-15"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest block">Subtítulo (Evento)</label>
                      <input
                        type="text"
                        value={headerSubtitle}
                        onChange={e => setHeaderSubtitle(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                        placeholder="Ex: COPA INTERNACIONAL"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest block">Data / Hora</label>
                      <input
                        type="text"
                        value={headerDateText}
                        onChange={e => setHeaderDateText(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-550 uppercase tracking-widest block">Local / Estádio</label>
                      <input
                        type="text"
                        value={headerLocationText}
                        onChange={e => setHeaderLocationText(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest block">Saída (Hora & Local)</label>
                      <input
                        type="text"
                        value={headerDepartureText}
                        onChange={e => setHeaderDepartureText(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                        placeholder="Ex: SAÍDA: 13:00 - Sede"
                      />
                    </div>
                  </div>

                  {/* Logo Config */}
                  <div className="space-y-3 pt-3 border-t border-zinc-900 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showLogo}
                          onChange={e => setShowLogo(e.target.checked)}
                          className="rounded border-zinc-800 bg-black text-theme-primary focus:ring-0"
                        />
                        Exibir Escudo do Clube
                      </label>
                      {showLogo && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-black text-zinc-550 uppercase">Tamanho:</span>
                          <span className="text-[11px] font-mono text-zinc-400 font-bold">{logoSize}px</span>
                        </div>
                      )}
                    </div>

                    {showLogo && (
                      <div className="flex items-center gap-2.5">
                        <input
                          type="range"
                          min="30"
                          max="80"
                          value={logoSize}
                          onChange={e => setLogoSize(Number(e.target.value))}
                          className="w-32 accent-theme-primary bg-zinc-800 h-1.5 rounded-xl cursor-pointer"
                        />
                        <button
                          onClick={() => crestInputRef.current?.click()}
                          className="text-[9px] font-black uppercase text-theme-primary border border-theme-primary/25 px-2.5 py-1.5 rounded-lg hover:bg-theme-primary/10 transition-all"
                        >
                          Trocar Escudo
                        </button>
                        <input type="file" ref={crestInputRef} onChange={handleLogoUpload} accept="image/*" className="hidden" />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Section 3: Ajustar Fotos dos Atletas de Destaque */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setAccordionOpen(accordionOpen === 'photos' ? 'list' : 'photos')}
                className="w-full flex items-center justify-between p-4 text-left font-black text-xs text-white uppercase tracking-wider hover:bg-zinc-850 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <ImageIcon size={14} className="text-theme-primary" />
                  3. Ajuste de Fotos e Atletas em Destaque
                </span>
                <ChevronDown size={14} className={`transform transition-transform ${accordionOpen === 'photos' ? 'rotate-180' : ''}`} />
              </button>

              {accordionOpen === 'photos' && (
                <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-950/20">
                  <div className="p-3.5 bg-theme-primary/5 border border-theme-primary/20 rounded-2xl mb-2">
                    <p className="text-[10px] text-theme-primary font-black uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Sparkles size={11} />
                      Como funciona as fotos?
                    </p>
                    <p className="text-[10px] text-zinc-400 font-medium leading-relaxed uppercase">
                      Você pode colocar até 2 fotos com fundo transparente no encarte. Use os controles de escala, posição X, Y e opacidade abaixo para enquadrá-los perfeitamente como jogadores profissionais.
                    </p>
                  </div>

                  {/* Photo Slot Selection */}
                  <div className="flex bg-black p-1 rounded-2xl border border-zinc-850">
                    <button
                      type="button"
                      onClick={() => setActivePhotoEditing(1)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${
                        activePhotoEditing === 1 ? 'bg-theme-primary text-black' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Destaque 01 (Lado Esquerdo)
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhotoEditing(2)}
                      className={`flex-1 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${
                        activePhotoEditing === 2 ? 'bg-theme-primary text-black' : 'text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      Destaque 02 (Lado Direito)
                    </button>
                  </div>

                  {/* Photo Controls for active slot */}
                  <div className="space-y-4 bg-zinc-900/10 p-3 rounded-2xl border border-zinc-900">
                    
                    {/* Upload / Quick Select Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[9px] font-black text-zinc-550 uppercase tracking-widest block">
                          FOTO DESTAQUE DE NÚMERO {activePhotoEditing}
                        </span>
                        <span className="text-[11px] font-bold text-zinc-300 uppercase block mt-0.5">
                          {(activePhotoEditing === 1 ? photo1.url : photo2.url) ? '✓ IMAGEM CARREGADA' : '✗ NENHUMA IMAGEM SELECIONADA'}
                        </span>
                      </div>

                      <div className="flex gap-2">
                        {/* Selector for athlete photo quick crop */}
                        <button
                          type="button"
                          onClick={() => {
                            if (activePhotoEditing === 1) {
                              fileInputRef1.current?.click();
                            } else {
                              fileInputRef2.current?.click();
                            }
                          }}
                          className="px-3 py-1.5 bg-black border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all text-[9.5px] font-black uppercase tracking-wider flex items-center gap-1.5"
                        >
                          <Camera size={11} />
                          Mudar Foto PNG
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef1}
                          onChange={(e) => handlePhotoUpload(e, 1)}
                          accept="image/*"
                          className="hidden"
                        />
                        <input
                          type="file"
                          ref={fileInputRef2}
                          onChange={(e) => handlePhotoUpload(e, 2)}
                          accept="image/*"
                          className="hidden"
                        />

                        {(activePhotoEditing === 1 ? photo1.url : photo2.url) && (
                          <button
                            type="button"
                            onClick={() => {
                              if (activePhotoEditing === 1) {
                                setPhoto1(prev => ({ ...prev, url: null }));
                              } else {
                                setPhoto2(prev => ({ ...prev, url: null }));
                              }
                            }}
                            className="px-2.5 py-1.5 bg-red-950 border border-red-900/40 hover:bg-red-900 text-red-400 hover:text-white rounded-xl transition-all text-[9.5px]"
                          >
                            <X size={11} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Show Sliders only if Photo is Cargada */}
                    {(activePhotoEditing === 1 ? photo1.url : photo2.url) ? (
                      <div className="space-y-3 pt-3 border-t border-zinc-900">
                        
                        {/* Slide Scale */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-zinc-500 uppercase">Ajuste de Escala (Tamanho)</label>
                            <span className="text-[10px] font-mono font-bold text-theme-primary">
                              {activePhotoEditing === 1 ? photo1.scale.toFixed(1) : photo2.scale.toFixed(1)}x
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.3"
                            max="2.5"
                            step="0.05"
                            value={activePhotoEditing === 1 ? photo1.scale : photo2.scale}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (activePhotoEditing === 1) {
                                setPhoto1(prev => ({ ...prev, scale: v }));
                              } else {
                                setPhoto2(prev => ({ ...prev, scale: v }));
                              }
                            }}
                            className="w-full accent-theme-primary bg-zinc-900 h-1.5 rounded-xl cursor-pointer"
                          />
                        </div>

                        {/* Slide X Position */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-zinc-500 uppercase">Posição de Eixo Horizontal (X)</label>
                            <span className="text-[10px] font-mono font-bold text-zinc-350">
                              {activePhotoEditing === 1 ? photo1.x : photo2.x}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={activePhotoEditing === 1 ? photo1.x : photo2.x}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (activePhotoEditing === 1) {
                                setPhoto1(prev => ({ ...prev, x: v }));
                              } else {
                                setPhoto2(prev => ({ ...prev, x: v }));
                              }
                            }}
                            className="w-full accent-theme-primary bg-zinc-900 h-1.5 rounded-xl cursor-pointer"
                          />
                        </div>

                        {/* Slide Y Position */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-zinc-500 uppercase">Posição de Eixo Vertical (Y)</label>
                            <span className="text-[10px] font-mono font-bold text-zinc-350">
                              {activePhotoEditing === 1 ? photo1.y : photo2.y}px
                            </span>
                          </div>
                          <input
                            type="range"
                            min="-180"
                            max="180"
                            value={activePhotoEditing === 1 ? photo1.y : photo2.y}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (activePhotoEditing === 1) {
                                setPhoto1(prev => ({ ...prev, y: v }));
                              } else {
                                setPhoto2(prev => ({ ...prev, y: v }));
                              }
                            }}
                            className="w-full accent-theme-primary bg-zinc-900 h-1.5 rounded-xl cursor-pointer"
                          />
                        </div>

                        {/* Slide Opacity */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black text-zinc-505 uppercase">Opacidade da Imagem</label>
                            <span className="text-[10px] font-mono font-bold text-zinc-350">
                              {Math.round((activePhotoEditing === 1 ? photo1.opacity : photo2.opacity) * 100)}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0.1"
                            max="1.0"
                            step="0.05"
                            value={activePhotoEditing === 1 ? photo1.opacity : photo2.opacity}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (activePhotoEditing === 1) {
                                setPhoto1(prev => ({ ...prev, opacity: v }));
                              } else {
                                setPhoto2(prev => ({ ...prev, opacity: v }));
                              }
                            }}
                            className="w-full accent-theme-primary bg-zinc-900 h-1.5 rounded-xl cursor-pointer"
                          />
                        </div>

                        {/* Toggles: Flip and Depth Level */}
                        <div className="grid grid-cols-2 gap-4 pt-2">
                          <label className="text-[10px] font-black text-zinc-450 uppercase flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activePhotoEditing === 1 ? photo1.flip : photo2.flip}
                              onChange={(e) => {
                                const v = e.target.checked;
                                if (activePhotoEditing === 1) {
                                  setPhoto1(prev => ({ ...prev, flip: v }));
                                } else {
                                  setPhoto2(prev => ({ ...prev, flip: v }));
                                }
                              }}
                              className="rounded border-zinc-800 bg-black text-theme-primary focus:ring-0"
                            />
                            Espelhar horizontal
                          </label>

                          <label className="text-[10px] font-black text-zinc-450 uppercase flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={activePhotoEditing === 1 ? photo1.behindText : photo2.behindText}
                              onChange={(e) => {
                                const v = e.target.checked;
                                if (activePhotoEditing === 1) {
                                  setPhoto1(prev => ({ ...prev, behindText: v }));
                                } else {
                                  setPhoto2(prev => ({ ...prev, behindText: v }));
                                }
                              }}
                              className="rounded border-zinc-800 bg-black text-theme-primary focus:ring-0"
                            />
                            Desenhar atrás do texto
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="py-6 text-center border border-dashed border-zinc-800 rounded-xl">
                        <ImageIcon size={24} className="text-zinc-750 mx-auto mb-2" />
                        <p className="text-[10px] text-zinc-550 font-bold uppercase tracking-widest leading-relaxed">
                          Nenhuma imagem destaque importada.<br />Faça upload de um arquivo PNG com fundo limpo.
                        </p>
                      </div>
                    )}

                  </div>
                </div>
              )}
            </div>

            {/* Section 4: Ajustar Atletas e Layout */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setAccordionOpen(accordionOpen === 'list' ? 'footer' : 'list')}
                className="w-full flex items-center justify-between p-4 text-left font-black text-xs text-white uppercase tracking-wider hover:bg-zinc-850 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <LayoutGrid size={14} className="text-theme-primary" />
                  4. Seleção de Atletas e Configuração de Colunas
                </span>
                <ChevronDown size={14} className={`transform transition-transform ${accordionOpen === 'list' ? 'rotate-180' : ''}`} />
              </button>

              {accordionOpen === 'list' && (
                <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-950/20">
                  
                  {/* Preset Buttons for Quick Layout */}
                  <div className="p-3 bg-zinc-900/60 border border-zinc-800 rounded-2xl space-y-2">
                    <span className="text-[10px] font-black text-theme-primary uppercase tracking-widest block">
                      ⚡ PRESETS RÁPIDOS DE LAYOUT:
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowJersey(true);
                          setShowPosition(true);
                          setShowNickname(true);
                          setSortAlphabetically(true);
                          setColumnsCount(2);
                          setFontSizeClass('text-[11px]');
                          setItemsGap(1.5);
                          setShowStaff(true);
                          toast.success("Modelo Completo Aplicado!");
                        }}
                        className="py-2 px-3 rounded-xl bg-black hover:bg-zinc-900 border border-zinc-800 text-[10px] font-black uppercase text-zinc-300 hover:text-white transition-all text-left flex flex-col justify-center"
                      >
                        <span className="text-theme-primary">📋 Completo Tradicional</span>
                        <span className="text-[8px] text-zinc-500 font-bold mt-0.5 font-sans lowercase">número, posição, apelido e comissão em 2 colunas</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowJersey(false);
                          setShowPosition(false);
                          setShowNickname(false);
                          setSortAlphabetically(true);
                          setColumnsCount(1);
                          setFontSizeClass('text-sm');
                          setItemsGap(2.5);
                          setShowStaff(false);
                          toast.success("Modelo Stories (Apenas Nomes) Aplicado!");
                        }}
                        className="py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20 border border-orange-500/30 text-[10px] font-black uppercase text-white transition-all text-left flex flex-col justify-center"
                      >
                        <span className="text-orange-400">📲 Lista de Nomes (Stories)</span>
                        <span className="text-[8px] text-zinc-400 font-bold mt-0.5 font-sans lowercase">apenas nomes em ordem alfabética e numerados (ideal para whatsapp/instagram)</span>
                      </button>
                    </div>
                  </div>

                  {/* Grid Layout controls */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-black/40 rounded-2xl border border-zinc-900">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase">Quantidade de Colunas</label>
                      <div className="flex bg-zinc-900 p-0.5 rounded-xl border border-zinc-800">
                        <button
                          type="button"
                          onClick={() => setColumnsCount(1)}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                            columnsCount === 1 ? 'bg-theme-primary text-black' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          1 Coluna
                        </button>
                        <button
                          type="button"
                          onClick={() => setColumnsCount(2)}
                          className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all ${
                            columnsCount === 2 ? 'bg-theme-primary text-black' : 'text-zinc-500 hover:text-white'
                          }`}
                        >
                          2 Colunas
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-500 uppercase">Tamanho do Nome no Encarte</label>
                      <select
                        value={fontSizeClass}
                        onChange={e => setFontSizeClass(e.target.value as any)}
                        className="w-full bg-zinc-900 border border-zinc-805 rounded-xl p-2 text-xs text-zinc-350 focus:border-theme-primary outline-none uppercase font-bold"
                      >
                        <option value="text-[10px]">Minúsculo / Extra Small</option>
                        <option value="text-[11px]">Compacto (Recomendado)</option>
                        <option value="text-xs">Médio</option>
                        <option value="text-sm">Grande (Menos atletas)</option>
                      </select>
                    </div>
                  </div>

                  {/* Formatting Toggles */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-black/30 border border-zinc-900 rounded-xl">
                    <label className="text-[10px] font-black text-zinc-450 uppercase flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showJersey}
                        onChange={e => setShowJersey(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-900 text-theme-primary focus:ring-0 text-xs"
                      />
                      Mostrar Número #
                    </label>
                    <label className="text-[10px] font-black text-zinc-450 uppercase flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showPosition}
                        onChange={e => setShowPosition(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-900 text-theme-primary focus:ring-0 text-xs"
                      />
                      Mostrar Posição
                    </label>
                    <label className="text-[10px] font-black text-zinc-450 uppercase flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showNickname}
                        onChange={e => setShowNickname(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-900 text-theme-primary focus:ring-0 text-xs"
                      />
                      Apelido "Aspas"
                    </label>
                    <label className="text-[10px] font-black text-zinc-450 uppercase flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={sortAlphabetically}
                        onChange={e => setSortAlphabetically(e.target.checked)}
                        className="rounded border-zinc-800 bg-zinc-900 text-theme-primary focus:ring-0 text-xs"
                      />
                      Ordem Alfabética
                    </label>
                  </div>

                  {/* Items gap slider */}
                  <div className="space-y-1 p-3 bg-black/30 border border-zinc-900 rounded-xl">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-zinc-500 uppercase">Espaçamento Vertical entre nomes</label>
                      <span className="text-[10px] font-mono font-black text-theme-primary">{itemsGap}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3.0"
                      step="0.25"
                      value={itemsGap}
                      onChange={e => setItemsGap(Number(e.target.value))}
                      className="w-full accent-theme-primary bg-zinc-900 h-1 rounded-xl cursor-pointer"
                    />
                  </div>

                  {/* Filter individual athletes check lists */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">
                        Selecione quem aparecerá no Encarte ({filteredAthletesToRender.length}/{currentLineup.athletes.length})
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedListAthletes(currentLineup.athletes.map(a => a.id))}
                          className="text-[8px] font-black uppercase text-theme-primary bg-zinc-900 px-2 py-1 rounded hover:bg-zinc-800"
                        >
                          Marcar Todos
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedListAthletes([])}
                          className="text-[8px] font-black uppercase text-zinc-500 bg-zinc-900 px-2 py-1 rounded hover:bg-zinc-805"
                        >
                          Limpar
                        </button>
                      </div>
                    </div>

                    <div className="max-h-[160px] overflow-y-auto border border-zinc-850 rounded-2xl bg-black p-3 divide-y divide-zinc-900">
                      {currentLineup.athletes.length === 0 ? (
                        <p className="text-[10px] text-zinc-600 italic">Nenhum atleta na lista de origem.</p>
                      ) : (
                        currentLineup.athletes
                          .sort((a, b) => a.name.localeCompare(b.name))
                          .map(athlete => {
                            const isChecked = selectedListAthletes.includes(athlete.id);
                            return (
                              <label
                                key={athlete.id}
                                className="flex items-center justify-between py-2 text-xs text-zinc-350 hover:text-white cursor-pointer select-none"
                              >
                                <span className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedListAthletes(prev => [...prev, athlete.id]);
                                      } else {
                                        setSelectedListAthletes(prev => prev.filter(id => id !== athlete.id));
                                      }
                                    }}
                                    className="rounded border-zinc-805 bg-zinc-900 text-theme-primary focus:ring-0 mr-1"
                                  />
                                  <span className="font-extrabold uppercase">{athlete.name}</span>
                                  {athlete.nickname && <span className="text-[9px] text-zinc-500">"{athlete.nickname}"</span>}
                                </span>
                                <span className="font-mono text-[10px] text-zinc-600">#{athlete.jersey_number || 'S/N'}</span>
                              </label>
                            );
                          })
                      )}
                    </div>
                  </div>

                  {/* Staff options */}
                  <div className="space-y-3 pt-3 border-t border-zinc-900">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showStaff}
                        onChange={e => setShowStaff(e.target.checked)}
                        className="rounded border-zinc-800 bg-black text-theme-primary focus:ring-0 text-xs"
                      />
                      Exibir Comissão Técnica no encarte
                    </label>

                    {showStaff && (
                      <div className="max-h-[120px] overflow-y-auto border border-zinc-850 rounded-2xl bg-black p-3 divide-y divide-zinc-900">
                        {currentLineup.staff.length === 0 ? (
                          <p className="text-[10px] text-zinc-650 italic">Nenhuma comissão incluída na lista original.</p>
                        ) : (
                          currentLineup.staff.map(pf => {
                            const isChecked = selectedListStaff.includes(pf.id);
                            return (
                              <label
                                key={pf.id}
                                className="flex items-center gap-2 py-1.5 text-xs text-zinc-350 hover:text-white cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedListStaff(prev => [...prev, pf.id]);
                                    } else {
                                      setSelectedListStaff(prev => prev.filter(id => id !== pf.id));
                                    }
                                  }}
                                  className="rounded border-zinc-800 bg-zinc-900 text-theme-primary focus:ring-0 mr-1"
                                />
                                <span className="font-extrabold uppercase">{pf.name}</span>
                                <span className="text-[9px] text-zinc-500 font-bold">({pf.role || 'Staff'})</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>

                </div>
              )}
            </div>

            {/* Section 5: Rodapé */}
            <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden transition-all">
              <button
                onClick={() => setAccordionOpen(accordionOpen === 'footer' ? 'theme' : 'footer')}
                className="w-full flex items-center justify-between p-4 text-left font-black text-xs text-white uppercase tracking-wider hover:bg-zinc-850 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Instagram size={14} className="text-theme-primary" />
                  5. Configurações de Rodapé e Patrocinadores
                </span>
                <ChevronDown size={14} className={`transform transition-transform ${accordionOpen === 'footer' ? 'rotate-180' : ''}`} />
              </button>

              {accordionOpen === 'footer' && (
                <div className="p-4 border-t border-zinc-800 space-y-4 bg-zinc-950/20">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest block">Texto Motivacional / Hashtag</label>
                      <input
                        type="text"
                        value={footerMotivationalText}
                        onChange={e => setFooterMotivationalText(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                        placeholder="Ex: 🏆 União, Força e Glória! 🏆"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-zinc-505 uppercase tracking-widest block">Instagram do Clube</label>
                      <input
                        type="text"
                        value={footerInstagram}
                        onChange={e => setFooterInstagram(e.target.value)}
                        className="w-full bg-black border border-zinc-850 p-2.5 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold placeholder-zinc-700"
                        placeholder="Ex: @minhaequipe_oficial"
                      />
                    </div>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-zinc-900">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={showSponsors}
                        onChange={e => setShowSponsors(e.target.checked)}
                        className="rounded border-zinc-800 bg-black text-theme-primary focus:ring-0 text-xs"
                      />
                      Exibir Área de Patrocinadores (Sponsor space)
                    </label>

                    {showSponsors && (
                      <div className="grid grid-cols-1 gap-2 p-3 bg-black/40 border border-zinc-900 rounded-xl">
                        <label className="text-[10px] font-black text-zinc-505 uppercase">Título da seção</label>
                        <input
                          type="text"
                          value={sponsorText}
                          onChange={e => setSponsorText(e.target.value)}
                          className="w-full bg-zinc-900 border border-zinc-805 p-2 rounded-xl text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none font-bold uppercase"
                        />
                        <p className="text-[9px] text-zinc-550 font-bold uppercase tracking-wide mt-1.5 leading-relaxed">
                          Os patrocinadores oficiais de seu clube cadastrados em sua conta serão desenhados de forma limpa e transparente no pé da foto dos Stories.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Real-Time Render Preview Screen - Span 5 */}
        <div className="lg:col-span-12 xl:col-span-5 flex flex-col items-center justify-center p-2 max-w-full overflow-x-auto no-scrollbar xl:sticky xl:top-4 xl:self-start">
          
          <span className="text-[10px] font-black text-zinc-455 uppercase tracking-widest block mb-3 text-center">
            Pressione e Baixe para a Arte Final ficar em 1080x1920 (HD)
          </span>

          {/* Sizable Visual Device Frame */}
          <div className="relative p-3 bg-zinc-950 border border-zinc-800/80 rounded-[3rem] shadow-2xl overflow-hidden shadow-theme-primary/5">
            
            {/* Front Camera notch representation */}
            <div className="absolute top-5 left-1/2 transform -translate-x-1/2 w-28 h-5 bg-zinc-950 rounded-full z-20 flex items-center justify-around px-4">
              <div className="w-2.5 h-2.5 bg-zinc-905 rounded-full" />
              <div className="w-8 h-1 bg-zinc-900 rounded-full" />
            </div>

            {/* REAL-TIME PREVIEW CONTAINER (Stories 9:16 Aspect Ratio) */}
            <div
              id="instagram-stories-flyer-canvas"
              ref={flyerRef}
              className={`relative overflow-hidden ${fontStyleClass()} bg-black text-white`}
              style={{
                width: '360px',
                height: '640px',
                background: bgType === 'solid' 
                  ? customBgGradientStart 
                  : bgType === 'gradient'
                    ? `linear-gradient(135deg, ${customBgGradientStart} 0%, ${customBgGradientEnd} 100%)`
                    : undefined
              }}
            >
              
              {/* BACK GROUND LOGIC */}
              {bgType === 'carbon' && (
                <div 
                  className="absolute inset-0 bg-repeat bg-center z-0"
                  style={{
                    backgroundColor: customBgGradientStart,
                    backgroundImage: `linear-gradient(135deg, ${customBgGradientStart} 30%, ${customBgGradientEnd} 100%), url('https://www.transparenttextures.com/patterns/carbon-fibre.png')`,
                    backgroundBlendMode: 'overlay',
                    opacity: 1
                  }}
                />
              )}

              {bgType === 'stadium' && (
                <div 
                  className="absolute inset-0 bg-cover bg-center z-0 contrast-125 brightness-[0.25]"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.95)), url('https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000')`,
                  }}
                />
              )}

              {bgType === 'upload' && uploadedBgUrl && (
                <div 
                  className="absolute inset-0 bg-cover bg-center z-0"
                  style={{
                    backgroundImage: `linear-gradient(to bottom, rgba(0,0,0,0.3), rgba(0,0,0,0.85)), url('${uploadedBgUrl}')`
                  }}
                />
              )}

              {/* Grid overlay */}
              {showGridOverlay && (
                <div 
                  className="absolute inset-0 opacity-15 pointer-events-none z-0"
                  style={{
                    backgroundImage: 'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
                    backgroundSize: '24px 24px',
                  }}
                />
              )}

              {/* Dynamic Abstract Tech Lines */}
              <div 
                className="absolute -top-10 -right-10 w-48 h-48 rounded-full filter blur-[80px] pointer-events-none z-0"
                style={{ backgroundColor: `${customPrimaryColor}1c` }}
              />
              <div 
                className="absolute -bottom-20 -left-10 w-64 h-64 rounded-full filter blur-[100px] pointer-events-none z-0"
                style={{ backgroundColor: `${customPrimaryColor}10` }}
              />

              {/* --- BACKGROUND FEATURED PLAYER PHOTOS --- */}
              {photo1.url && photo1.behindText && (
                <img
                  src={photo1.url}
                  alt="Player 01 behind"
                  className="absolute select-none pointer-events-none max-w-none origin-center"
                  style={{
                    width: `${photo1.scale * 240}px`,
                    transform: `translate(${photo1.x}px, ${photo1.y}px) ${photo1.flip ? 'scaleX(-1)' : ''}`,
                    opacity: photo1.opacity,
                    left: '20px',
                    top: '200px',
                    zIndex: 2,
                  }}
                />
              )}

              {photo2.url && photo2.behindText && (
                <img
                  src={photo2.url}
                  alt="Player 02 behind"
                  className="absolute select-none pointer-events-none max-w-none origin-center"
                  style={{
                    width: `${photo2.scale * 240}px`,
                    transform: `translate(${photo2.x}px, ${photo2.y}px) ${photo2.flip ? 'scaleX(-1)' : ''}`,
                    opacity: photo2.opacity,
                    right: '20px',
                    top: '200px',
                    zIndex: 2,
                  }}
                />
              )}

              {/* --- STORIES FOREGROUND HEADER --- */}
              <div className="absolute top-10 left-0 right-0 px-6 pt-4 flex flex-col items-center text-center z-10 select-none">
                
                {showLogo && (logoDataUrl || uploadedLogoUrl) && (
                  <div className="mb-2">
                    <img
                      src={uploadedLogoUrl || logoDataUrl || ''}
                      alt="Club Logo"
                      style={{ height: `${logoSize}px`, width: `${logoSize}px` }}
                      className="object-contain filter drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]"
                    />
                  </div>
                )}

                {/* Main Dynamic Flyer Title */}
                <h2 
                  className="text-2xl font-black italic tracking-tighter uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"
                  style={{ color: customPrimaryColor }}
                >
                  {headerTitle}
                </h2>

                {/* Category Badge */}
                {headerCategoryText && (
                  <span 
                    className="inline-block px-3 py-0.5 text-[9px] font-black uppercase tracking-widest rounded-md mt-1 select-none shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                    style={{ 
                      borderColor: `${customPrimaryColor}40`, 
                      color: '#ffffff', 
                      backgroundColor: customPrimaryColor,
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                    }}
                  >
                    {headerCategoryText}
                  </span>
                )}

                {/* Subtitle */}
                {headerSubtitle && (
                  <p className="text-[10px] font-black tracking-widest uppercase text-white/90 drop-shadow-[0_1px_4px_rgba(0,0,0,0.8)] border-b border-white/20 pb-1 mt-0.5 max-w-[280px] truncate">
                    {headerSubtitle}
                  </p>
                )}

                {/* Match Infos */}
                {(headerDateText || headerLocationText || headerDepartureText) && (
                  <div className="mt-1 flex flex-col gap-0.5 opacity-80 select-none">
                    {headerDateText && (
                      <p className="text-[8.5px] font-bold text-zinc-300 uppercase tracking-wide flex items-center justify-center gap-1">
                        <Calendar size={8} style={{ color: customPrimaryColor }} />
                        {headerDateText}
                      </p>
                    )}
                    {headerLocationText && (
                      <p className="text-[8.5px] font-medium text-zinc-400 uppercase tracking-wider flex items-center justify-center gap-1 truncate max-w-[290px]">
                        <MapPin size={8} style={{ color: customPrimaryColor }} />
                        {headerLocationText}
                      </p>
                    )}
                    {headerDepartureText && (
                      <p className="text-[8.5px] font-medium text-zinc-400 uppercase tracking-wider flex items-center justify-center gap-1 truncate max-w-[290px]">
                        <Clock size={8} style={{ color: customPrimaryColor }} />
                        {headerDepartureText}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* --- MAIN ATHLETES GRID LIST --- */}
              <div className="absolute inset-x-6 top-36 bottom-24 flex flex-col justify-center z-10">
                
                {filteredAthletesToRender.length === 0 ? (
                  <div className="text-center py-10 bg-black/60 border border-white/5 p-4 rounded-2xl select-none">
                    <p className="text-xs uppercase font-extrabold text-zinc-500">Sem convocados selecionados</p>
                    <p className="text-[9px] uppercase tracking-wider text-zinc-650 mt-1">Habilite os atletas nos controles da esquerda.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    
                    {/* Athlete Columns */}
                    <div 
                      className={`grid ${columnsCount === 2 ? 'grid-cols-2 gap-x-6' : 'grid-cols-1'} gap-y-0.5 bg-black/45 backdrop-blur-sm border border-white/5 p-4 rounded-3xl`}
                      style={{ padding: '16px', gap: `${itemsGap * 4}px` }}
                    >
                      {filteredAthletesToRender.map((a, idx) => {
                        const sub = getSubCategory(a.birth_date);
                        const num = (idx + 1).toString().padStart(2, '0');
                        return (
                          <div 
                            key={a.id} 
                            className={`flex items-center justify-between border-b border-white/5 pb-1 max-w-full overflow-hidden ${fontSizeClass}`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[9px] font-mono opacity-40 font-semibold">{num}</span>
                              <span className="font-extrabold uppercase text-white truncate drop-shadow-[0_1px_2px_rgba(0,0,0,1)]">
                                {a.name}
                                {showNickname && a.nickname && (
                                  <span className="text-[8.5px] lowercase font-medium ml-1" style={{ color: customPrimaryColor }}>
                                    "{a.nickname.toLowerCase()}"
                                  </span>
                                )}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0 pl-1.5">
                              {showPosition && a.position && (
                                <span className="opacity-50 text-[7px] font-extrabold uppercase px-1 py-0.2 border border-white/10 rounded">
                                  {a.position.trim().split(',')[0].slice(0, 3)}
                                </span>
                              )}
                              
                              {showJersey && (
                                <span 
                                  className="font-mono text-[9px] font-black"
                                  style={{ color: customPrimaryColor }}
                                >
                                  #{a.jersey_number || 'S/N'}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Technical Staff list */}
                    {showStaff && filteredStaffToRender.length > 0 && (
                      <div className="bg-black/55 backdrop-blur-sm border border-white/5 p-3 rounded-2xl select-none">
                        <p className="text-[7.5px] font-bold text-zinc-500 uppercase tracking-widest pl-1 mb-1">
                          COMISSÃO TÉCNICA OFICIAL
                        </p>
                        <div className="flex flex-wrap gap-x-4 gap-y-1">
                          {filteredStaffToRender.map(s => (
                            <p key={s.id} className="text-[9px] font-extrabold text-zinc-200 uppercase truncate max-w-[140px]">
                              • {s.name} <span className="text-[7.5px] opacity-40">({s.role || 'Staff'})</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>

              {/* --- FRONT FOREGROUND PLAYER PHOTOS (Drawn on top of text) --- */}
              {photo1.url && !photo1.behindText && (
                <img
                  src={photo1.url}
                  alt="Player 01 front"
                  className="absolute select-none pointer-events-none max-w-none origin-center"
                  style={{
                    width: `${photo1.scale * 240}px`,
                    transform: `translate(${photo1.x}px, ${photo1.y}px) ${photo1.flip ? 'scaleX(-1)' : ''}`,
                    opacity: photo1.opacity,
                    left: '20px',
                    top: '20px',
                    zIndex: 12,
                  }}
                />
              )}

              {photo2.url && !photo2.behindText && (
                <img
                  src={photo2.url}
                  alt="Player 02 front"
                  className="absolute select-none pointer-events-none max-w-none origin-center"
                  style={{
                    width: `${photo2.scale * 240}px`,
                    transform: `translate(${photo2.x}px, ${photo2.y}px) ${photo2.flip ? 'scaleX(-1)' : ''}`,
                    opacity: photo2.opacity,
                    right: '20px',
                    top: '20px',
                    zIndex: 12,
                  }}
                />
              )}

              {/* --- STORIES FOREGROUND FOOTER --- */}
              <div className="absolute bottom-6 left-0 right-0 px-6 flex flex-col items-center text-center z-20 select-none">
                
                {/* Motivation Text */}
                {footerMotivationalText && (
                  <p 
                    className="text-[9px] font-black uppercase tracking-wider italic drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
                    style={{ color: customPrimaryColor }}
                  >
                    {footerMotivationalText}
                  </p>
                )}

                {/* Instagram Handle */}
                {footerInstagram && (
                  <p className="text-[8.5px] font-black tracking-widest text-zinc-300 drop-shadow-[0_1.5px_3px_rgba(0,0,0,1)] uppercase mt-0.5 flex items-center justify-center gap-1">
                    <Instagram size={8} style={{ color: customPrimaryColor }} />
                    {footerInstagram}
                  </p>
                )}

                {/* Sponsors section */}
                {showSponsors && (
                  <div className="mt-2.5 w-full border-t border-white/5 pt-2 select-none">
                    <p className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-1.5">
                      {sponsorText}
                    </p>
                    
                    {/* Placeholder Sponsor display */}
                    <div className="flex items-center justify-center gap-4 opacity-40 group-hover:opacity-60 transition-opacity">
                      <div className="h-4 w-12 bg-white/10 rounded border border-white/5 flex items-center justify-center text-[7px] font-black italic">SPONSOR 1</div>
                      <div className="h-4 w-12 bg-white/10 rounded border border-white/5 flex items-center justify-center text-[7px] font-black italic">SPONSOR 2</div>
                      <div className="h-4 w-12 bg-white/10 rounded border border-white/5 flex items-center justify-center text-[7px] font-black italic">SPONSOR 3</div>
                    </div>
                  </div>
                )}
              </div>

            </div>
          </div>

          {/* Quick Sliders Layer Control Info */}
          <div className="mt-4 p-3.5 bg-zinc-900/30 border border-zinc-850 rounded-2xl max-w-sm text-center">
            <Sliders size={14} className="text-theme-primary mx-auto mb-1.5 animate-pulse" />
            <p className="text-[10px] text-zinc-400 font-extrabold uppercase leading-normal">
              Utilize os controles na esquerda para ajustar as fotos do jogador {activePhotoEditing} com perfeita precisão!
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}

// Inline mini PaletteIcon definition representing colors
function PaletteIcon({ className, size }: { className?: string; size?: number }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size || 16} 
      height={size || 16} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 11.13 21.36 10.42 20.5 10.42C19.82 10.42 19.42 10.91 18.73 10.9V10.91C18.15 10.91 17.47 10.47 17.46 9.8C17.46 9.4 17.61 9.04 17.89 8.76C18.45 8.2 18.82 7.42 18.82 6.5C18.82 4.57 17.22 3 15.26 3C11.23 3 8 6.13 8 10C8 10.41 8.03 10.82 8.1 11.22L8.11 11.23C8.16 11.51 8.19 11.8 8.19 12.1C8.19 13.7 6.89 15 5.29 15C4.79 15 4.31 14.87 3.91 14.65L3.9 14.65C3.36 14.34 2.68 14.53 2.31 15.08C2.11 15.38 2 15.75 2 16.14C2 19.38 4.7 22 8.04 22L12 22Z" />
    </svg>
  );
}
