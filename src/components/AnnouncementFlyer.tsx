import React, { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Settings } from '../types';
import { 
  Megaphone, 
  Download, 
  Camera, 
  Calendar as CalendarIcon, 
  Type, 
  AlignLeft,
  RefreshCw,
  Layout as LayoutIcon,
  Palette,
  Share2,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Maximize2
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';
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

export default function AnnouncementFlyer() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [title, setTitle] = useState('COMUNICADO IMPORTANTE');
  const [subject, setSubject] = useState('TREINO EXTRA CONFIRMADO');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [message, setMessage] = useState('Informamos a todos os atletas que teremos um treinamento extra nesta sexta-feira para preparação do campeonato regional. Contamos com a presença de todos!');
  const [category, setCategory] = useState('TODAS AS CATEGORIAS');
  const [themeColor, setThemeColor] = useState('#FFD700'); // Default gold
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [bgCategory, setBgCategory] = useState<string>('TODOS');
  const [playerPhoto, setPlayerPhoto] = useState<string | null>(null);
  
  // Element Control States
  const [headerConfig, setHeaderConfig] = useState({ y: 0, scale: 1 });
  const [titleConfig, setTitleConfig] = useState({ y: 0, scale: 1 });
  const [subjectConfig, setSubjectConfig] = useState({ y: 0, scale: 0.8 }); // Adjusted default
  const [messageBoxConfig, setMessageBoxConfig] = useState({ y: 0, scale: 1 });
  const [footerConfig, setFooterConfig] = useState({ y: 0, scale: 1 });
  const [borderWidth, setBorderWidth] = useState(6);
  const [subjectY, setSubjectY] = useState(0);

  const [photoScale, setPhotoScale] = useState(1);
  const [photoYOffset, setPhotoYOffset] = useState(0);
  const [photoXOffset, setPhotoXOffset] = useState(0);
  const flyerRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Zoom & Sticky Viewport Controls
  const [previewZoom, setPreviewZoom] = useState<number>(0.75);
  const [isMobilePreviewExpanded, setIsMobilePreviewExpanded] = useState<boolean>(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const s = await api.getSettings();
    setSettings(s);
    if (s?.primaryColor) {
      setThemeColor(s.primaryColor);
    }
  };

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setIsGenerating(true);
    
    // Smooth scrolling to top to avoid offset issues
    window.scrollTo(0, 0);

    try {
      // Small delay to ensure any layout changes are settled
      await new Promise(resolve => setTimeout(resolve, 800));

      const element = flyerRef.current;
      const exportClone = await prepareElementForExport(element, 360, 640);

      try {
        const dataUrl = await toPng(exportClone, {
          quality: 1.0,
          pixelRatio: 2,
          width: 360,
          height: 640,
        });

        const link = document.createElement('a');
        link.download = `comunicado-${format(new Date(), 'dd-MM-yyyy')}.png`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        toast.success("Encarte gerado com sucesso!");
      } finally {
        exportClone.remove();
      }
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Erro ao gerar encarte. Tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayerPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (re) => {
        const base64 = re.target?.result as string;
        try {
          const compressed = await compressImage(base64, 800, 800, 0.7);
          setPlayerPhoto(compressed);
        } catch (err) {
          setPlayerPhoto(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const formatDateSafely = (dateStr: string) => {
    try {
      if (!dateStr) return '---';
      const [year, month, day] = dateStr.split('-').map(Number);
      const d = new Date(year, month - 1, day);
      if (isNaN(d.getTime())) return '---';
      return format(d, "dd 'de' MMMM", { locale: ptBR });
    } catch (e) {
      return '---';
    }
  };

  // Reusable Flyer Render JSX to avoid duplication
  const renderFlyerCard = () => (
    <div 
      ref={flyerRef}
      className="w-[360px] aspect-[9/16] bg-black relative overflow-hidden shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-3xl border border-zinc-800/80 shrink-0 select-none"
      style={{ letterSpacing: '-0.02em' }}
    >
      {/* Background Layer */}
      {bgImage ? (
        <div className="absolute inset-0 z-0">
           <img src={bgImage} className="w-full h-full object-cover opacity-60" referrerPolicy="no-referrer" crossOrigin="anonymous" />
           <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent"></div>
        </div>
      ) : (
        <>
          <div className="absolute inset-0 bg-zinc-900 z-0 opacity-20"></div>
          <div className="absolute top-0 left-0 w-full h-[50%] bg-gradient-to-b from-zinc-800/20 to-transparent z-0"></div>
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-theme-primary/5 rounded-full blur-[100px] z-0"></div>
          <div className="absolute top-[30%] -left-20 w-80 h-80 bg-theme-primary/5 rounded-full blur-[120px] z-0"></div>
        </>
      )}

      {/* Decorative Pattern */}
      <div className="absolute inset-0 opacity-[0.03] z-1 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>

      {/* Content Layer */}
      <div className="absolute inset-0 z-10 flex flex-col p-10 pt-16">
        {/* Border Overlay */}
        <div 
          className="absolute inset-4 z-[100] border-solid"
          style={{ 
            borderColor: themeColor, 
            borderWidth: `${borderWidth}px`,
            pointerEvents: 'none',
            opacity: 0.8
          }}
        ></div>
        <div 
          className="absolute inset-[18px] z-[100] border border-white/20"
          style={{ pointerEvents: 'none' }}
        ></div>

        {/* Header */}
        <div 
          className="flex flex-col items-center gap-4 text-center mb-6 transition-transform"
          style={{ transform: `translateY(${headerConfig.y}px) scale(${headerConfig.scale})` }}
        >
          {settings?.schoolCrest ? (
            <div className="w-24 h-24 bg-white/5 backdrop-blur-md rounded-3xl p-3 border border-white/10 shadow-2xl">
              <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
            </div>
          ) : (
            <div className="w-24 h-24 bg-theme-primary/10 rounded-3xl flex items-center justify-center text-theme-primary border border-theme-primary/20">
              <LayoutIcon size={40} />
            </div>
          )}
          
          <div className="space-y-1">
            <h4 className="text-white font-black text-[12px] uppercase tracking-[0.3em] opacity-80">
              {settings?.schoolName || 'Piruá Esporte Clube'}
            </h4>
          </div>
        </div>

        {/* Main Title Area */}
        <div 
          className="flex flex-col items-center mb-6 transition-transform"
          style={{ transform: `translateY(${titleConfig.y}px) scale(${titleConfig.scale})` }}
        >
          <div className="px-4 py-1.5 rounded-full border border-white/20 bg-white/5 backdrop-blur-sm mb-4">
             <span className="text-white font-black uppercase text-[8px] tracking-[0.4em]">{title}</span>
          </div>
          <h2 className="text-center font-black text-white text-3xl leading-[1.1] uppercase italic tracking-tighter" style={{ color: themeColor, transform: `translateY(${subjectY}px) scale(${subjectConfig.scale})` }}>
            {subject}
          </h2>
        </div>

        {/* Separator */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-white/20 to-transparent mb-8"></div>

        {/* Details Box */}
        <div 
          className="bg-white/5 border border-white/10 rounded-[40px] p-8 flex flex-col gap-6 backdrop-blur-md mb-8 transition-transform z-20"
          style={{ transform: `translateY(${messageBoxConfig.y}px) scale(${messageBoxConfig.scale})` }}
        >
           <div className="flex items-center gap-4">
             <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: themeColor }}></div>
             <div className="flex flex-col">
                <span className="text-zinc-500 font-bold uppercase text-[8px] tracking-[0.2em] mb-1">Data de Emissão</span>
                <span className="text-white font-black uppercase text-base tracking-tighter">
                  {formatDateSafely(date)}
                </span>
             </div>
           </div>

           <div className="flex flex-col">
              <span className="text-zinc-500 font-bold uppercase text-[8px] tracking-[0.2em] mb-2">Mensagem</span>
              <p className="text-white text-sm font-medium leading-relaxed italic">
                "{message}"
              </p>
           </div>

           <div className="pt-4 border-t border-white/10 flex justify-between items-center">
              <div className="flex flex-col">
                 <span className="text-zinc-500 font-bold uppercase text-[7px] tracking-[0.2em]">Público Alvo</span>
                 <span className="text-white font-black uppercase text-xs tracking-tighter" style={{ color: themeColor }}>{category}</span>
              </div>
              <Share2 className="text-zinc-500" size={16} />
           </div>
        </div>

        {/* Player Photo Integration */}
        {playerPhoto && (
          <div 
            className="absolute z-10 pointer-events-none"
            style={{
              width: '300px',
              height: '400px',
              bottom: '5%',
              left: '50%',
              transform: `translateX(calc(-50% + ${photoXOffset}px)) translateY(${photoYOffset}px) scale(${photoScale})`,
              transformOrigin: 'bottom center',
              filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.8))'
            }}
          >
            <img 
              src={playerPhoto} 
              className="w-full h-full object-contain" 
              style={{ maskImage: 'linear-gradient(to top, transparent, black 20%)' }}
              referrerPolicy="no-referrer" 
              crossOrigin="anonymous"
            />
          </div>
        )}

        {/* Footer */}
        <div 
          className="mt-auto flex flex-col items-center text-center gap-4 transition-transform pb-4"
          style={{ transform: `translateY(${footerConfig.y}px) scale(${footerConfig.scale})` }}
        >
           <div className="w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
           <p className="text-[9px] font-black uppercase text-zinc-500 tracking-[0.3em]">
             Fique por dentro das novidades!
           </p>
           
           <div className="flex gap-4">
             <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                <div className="w-3 h-[1px] bg-white opacity-40"></div>
             </div>
             <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border border-white opacity-40"></div>
             </div>
             <div className="w-8 h-8 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center">
                <div className="w-3 h-[1px] bg-white opacity-40"></div>
             </div>
           </div>
        </div>

        {/* Aesthetic Borders */}
        <div className="absolute top-6 left-6 w-12 h-[1px] bg-white/20"></div>
        <div className="absolute top-6 left-6 w-[1px] h-12 bg-white/20"></div>
        
        <div className="absolute bottom-6 right-6 w-12 h-[1px] bg-white/20"></div>
        <div className="absolute bottom-6 right-6 w-[1px] h-12 bg-white/20"></div>
      </div>
    </div>
  );

  return (
    <div className="relative space-y-6">
      {/* Mobile Sticky Top Live Preview Bar (Fixed at top while scrolling options below) */}
      <div className="lg:hidden sticky top-20 z-40 bg-zinc-950/95 border border-zinc-800/80 backdrop-blur-xl p-3.5 rounded-2xl shadow-2xl transition-all">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
            <span className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
              <span>Recado Fixo</span>
              <span className="text-[9px] text-zinc-400 font-bold bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">Ao Vivo</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobilePreviewExpanded(!isMobilePreviewExpanded)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border border-zinc-700/60"
            >
              {isMobilePreviewExpanded ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>{isMobilePreviewExpanded ? "Minimizar" : "Ver Recado"}</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={isGenerating}
              className="p-2 bg-theme-primary text-black font-bold rounded-xl transition-all hover:scale-105 cursor-pointer shadow-md shadow-theme-primary/20"
              title="Baixar Recado"
            >
              <Download size={15} />
            </button>
          </div>
        </div>

        {isMobilePreviewExpanded && (
          <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-center overflow-hidden h-[340px] sm:h-[390px] bg-black/80 rounded-2xl border border-zinc-800/60 relative">
            <div className="scale-[0.50] sm:scale-[0.58] origin-center shrink-0">
              {renderFlyerCard()}
            </div>
          </div>
        )}
      </div>

      {/* Main Grid: Options on Left (Scrolls), Fixed Recado Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Editor Controls Column (Scrollable options) */}
        <div className="lg:col-span-7 xl:col-span-7 space-y-6">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-theme-primary/10 rounded-2xl flex items-center justify-center text-theme-primary border border-theme-primary/20">
                  <Megaphone size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-black text-white uppercase tracking-tighter">Gerador de Recados</h2>
                  <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Edite as opções abaixo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHeaderConfig({ y: 0, scale: 1 });
                  setTitleConfig({ y: 0, scale: 1 });
                  setSubjectConfig({ y: 0, scale: 1 });
                  setMessageBoxConfig({ y: 0, scale: 1 });
                  setFooterConfig({ y: 0, scale: 1 });
                  setSubjectY(0);
                  setBorderWidth(2);
                  setPhotoScale(1);
                  setPhotoYOffset(0);
                  setPhotoXOffset(0);
                  toast.success("Ajustes restaurados para o padrão!");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer border border-zinc-700/50"
                title="Restaurar posições originais"
              >
                <RefreshCw size={12} />
                <span>Reset Posições</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-4">Título do Encarte</label>
                <div className="relative">
                  <Type className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                  <input 
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs font-bold uppercase"
                    placeholder="EX: COMUNICADO"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-4">Assunto</label>
                  <input 
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value.toUpperCase())}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-4">Data</label>
                  <div className="relative">
                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={16} />
                    <input 
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-2xl pl-12 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs font-bold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-4">Categoria / Público</label>
                <input 
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value.toUpperCase())}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs font-bold uppercase"
                  placeholder="EX: SUB-13 OU TODOS"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase mb-1.5 ml-4">Mensagem</label>
                <div className="relative">
                  <AlignLeft className="absolute left-4 top-4 text-zinc-400" size={16} />
                  <textarea 
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={4}
                    className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-theme-primary/50 text-xs font-medium leading-relaxed"
                    placeholder="Escreva sua mensagem aqui..."
                  />
                </div>
              </div>

              {/* Background Selection */}
              <div className="pt-4 border-t border-zinc-800/50 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest block font-sans">Estilo de Fundo do Encarte</label>
                    <p className="text-[9px] text-zinc-500 uppercase font-bold">Escolha um modelo temático ou faça upload</p>
                  </div>
                  <button 
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e: any) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = async (re) => {
                            const base64 = re.target?.result as string;
                            try {
                              const compressed = await compressImage(base64, 1200, 1200, 0.6);
                              setBgImage(compressed);
                            } catch (err) {
                              setBgImage(base64);
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      };
                      input.click();
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shrink-0 cursor-pointer"
                  >
                    <Camera size={12} />
                    Enviar Fundo
                  </button>
                </div>

                {/* Category Tabs */}
                <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                  {['TODOS', 'FUTEBOL DE CAMPO', 'FUTSAL', 'VOLÊI', 'CORRIDA DE RUA', 'OUTROS'].map(cat => (
                    <button
                      key={cat}
                      onClick={() => setBgCategory(cat)}
                      className={cn(
                        "px-3 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all whitespace-nowrap cursor-pointer",
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
                    const selected = bgImage === bg.url;

                    return (
                      <button
                        key={bg.id}
                        onClick={() => setBgImage(bg.url)}
                        className={cn(
                          "group relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition-all text-left bg-zinc-950 cursor-pointer",
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

                {/* Theme Color Picker & Status */}
                <div className="flex flex-wrap items-center gap-4 pt-1">
                  <div className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-1.5">
                    <Palette size={14} className="text-zinc-500" />
                    <input 
                      type="color" 
                      value={themeColor}
                      onChange={(e) => setThemeColor(e.target.value)}
                      className="w-6 h-6 bg-transparent cursor-pointer rounded overflow-hidden"
                    />
                    <span className="text-[10px] font-mono text-zinc-400 uppercase">{themeColor}</span>
                  </div>

                  {bgImage && (
                    <button 
                      onClick={() => setBgImage(null)}
                      className="flex items-center gap-2 px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                    >
                      Remover Fundo
                    </button>
                  )}
                </div>
              </div>

              {/* Layout Adjustments */}
              <div className="pt-4 border-t border-zinc-800/50 space-y-6">
                <label className="block text-xs font-black text-theme-primary uppercase tracking-widest ml-4">Ajustes de Layout</label>
                
                {/* Header Controls */}
                <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 space-y-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cabeçalho (Logo)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">ALTURA</span>
                    <input type="range" min="-100" max="100" value={headerConfig.y} onChange={(e) => setHeaderConfig(prev => ({ ...prev, y: parseInt(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">TAMANHO</span>
                    <input type="range" min="0.5" max="2" step="0.1" value={headerConfig.scale} onChange={(e) => setHeaderConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                </div>

                {/* Title & Subject Controls */}
                <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 space-y-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Título e Assunto</span>
                  <div className="flex items-center gap-3">
                     <span className="text-[10px] text-zinc-400 w-12 text-right">POSIÇÃO</span>
                     <input type="range" min="-100" max="100" value={titleConfig.y} onChange={(e) => setTitleConfig(prev => ({ ...prev, y: parseInt(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">TÍTULO</span>
                    <input type="range" min="0.5" max="2" step="0.1" value={titleConfig.scale} onChange={(e) => setTitleConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">ASSUNTO</span>
                    <input type="range" min="0.5" max="2.5" step="0.1" value={subjectConfig.scale} onChange={(e) => setSubjectConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">SUB Y</span>
                    <input type="range" min="-50" max="50" value={subjectY} onChange={(e) => setSubjectY(parseInt(e.target.value))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                </div>

                {/* Message Box Controls */}
                <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 space-y-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Bloco de Mensagem</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">ALTURA</span>
                    <input type="range" min="-200" max="200" value={messageBoxConfig.y} onChange={(e) => setMessageBoxConfig(prev => ({ ...prev, y: parseInt(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">GERAL</span>
                    <input type="range" min="0.5" max="1.5" step="0.05" value={messageBoxConfig.scale} onChange={(e) => setMessageBoxConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                </div>

                {/* Border Controls */}
                <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 space-y-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Moldura (Borda)</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">ESPESS.</span>
                    <input type="range" min="0" max="20" value={borderWidth} onChange={(e) => setBorderWidth(parseInt(e.target.value))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="bg-black/40 p-5 rounded-2xl border border-zinc-800 space-y-4">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Rodapé</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-zinc-400 w-12 text-right">ALTURA</span>
                    <input type="range" min="-100" max="50" value={footerConfig.y} onChange={(e) => setFooterConfig(prev => ({ ...prev, y: parseInt(e.target.value) }))} className="flex-1 accent-theme-primary h-1.5 cursor-pointer" />
                  </div>
                </div>

                <label className="block text-[10px] font-black text-zinc-500 uppercase ml-4">Foto do Destaque / Jogador</label>
                
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer">
                    <Camera size={14} /> Subir Foto
                    <input type="file" accept="image/*" className="hidden" onChange={handlePlayerPhotoUpload} />
                  </label>

                  {playerPhoto && (
                    <button 
                      onClick={() => setPlayerPhoto(null)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-[10px] font-black uppercase transition-all cursor-pointer"
                    >
                      Remover Foto
                    </button>
                  )}
                </div>

                {playerPhoto && (
                  <div className="space-y-4 bg-black/40 p-4 rounded-2xl border border-zinc-800">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-400 w-12 text-right">TAMANHO</span>
                      <input 
                        type="range" min="0.5" max="3" step="0.1"
                        value={photoScale} onChange={(e) => setPhotoScale(parseFloat(e.target.value))}
                        className="flex-1 accent-theme-primary h-1.5 cursor-pointer"
                      />
                      <span className="text-[10px] font-bold text-white w-8">{Math.round(photoScale * 100)}%</span>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-400 w-12 text-right">ALTURA</span>
                      <input 
                        type="range" min="-200" max="200"
                        value={photoYOffset} onChange={(e) => setPhotoYOffset(parseInt(e.target.value))}
                        className="flex-1 accent-theme-primary h-1.5 cursor-pointer"
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-zinc-400 w-12 text-right">LATERAL</span>
                      <input 
                        type="range" min="-200" max="200"
                        value={photoXOffset} onChange={(e) => setPhotoXOffset(parseInt(e.target.value))}
                        className="flex-1 accent-theme-primary h-1.5 cursor-pointer"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6">
              <button 
                onClick={handleDownload}
                disabled={isGenerating}
                className="w-full bg-theme-primary text-black font-black uppercase tracking-widest text-xs py-4 rounded-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer shadow-lg shadow-theme-primary/20"
              >
                {isGenerating ? <RefreshCw className="animate-spin" size={18} /> : <Download size={18} />}
                {isGenerating ? "Processando..." : "Gerar Imagem Story"}
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Sticky Fixed Preview Column */}
        <div className="hidden lg:flex flex-col items-center lg:col-span-5 xl:col-span-5 lg:sticky lg:top-24 lg:self-start space-y-4 z-30">
          {/* Fixed Preview Control Toolbar */}
          <div className="w-full max-w-[360px] bg-zinc-900/95 border border-zinc-800/90 backdrop-blur-md px-4 py-2.5 rounded-2xl flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
              <span className="text-[10px] font-black uppercase text-white tracking-widest">
                Recado Fixo (Ao Vivo)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPreviewZoom(prev => Math.max(0.50, parseFloat((prev - 0.05).toFixed(2))))}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors cursor-pointer"
                title="Reduzir Zoom da Prévia"
              >
                <ZoomOut size={13} />
              </button>

              <button
                type="button"
                onClick={() => setPreviewZoom(0.75)}
                className="text-[10px] font-mono text-theme-primary font-black px-1.5 text-center hover:underline cursor-pointer"
                title="Restaurar Tamanho Padrão (75%)"
              >
                {Math.round(previewZoom * 100)}%
              </button>

              <button
                type="button"
                onClick={() => setPreviewZoom(prev => Math.min(1.0, parseFloat((prev + 0.05).toFixed(2))))}
                className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-xs transition-colors cursor-pointer"
                title="Aumentar Zoom da Prévia"
              >
                <ZoomIn size={13} />
              </button>
            </div>
          </div>

          {/* Scaled Live Preview Card Container with Box Fitting */}
          <div 
            className="relative flex items-center justify-center transition-all duration-200"
            style={{ 
              width: `${Math.round(360 * previewZoom)}px`,
              height: `${Math.round(640 * previewZoom)}px`
            }}
          >
            <div 
              className="shadow-2xl rounded-3xl overflow-hidden transition-transform duration-200 origin-top-left"
              style={{ 
                transform: `scale(${previewZoom})`,
                width: '360px',
                height: '640px'
              }}
            >
              {renderFlyerCard()}
            </div>
          </div>

          {/* Download Button right below fixed preview */}
          <button 
            onClick={handleDownload}
            disabled={isGenerating}
            className="w-full max-w-[360px] bg-theme-primary text-black font-black uppercase tracking-widest text-xs py-3.5 rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-theme-primary/20 cursor-pointer"
          >
            {isGenerating ? <RefreshCw className="animate-spin" size={16} /> : <Download size={16} />}
            {isGenerating ? "Processando..." : "Baixar Imagem do Recado"}
          </button>
        </div>
      </div>
    </div>
  );
}

