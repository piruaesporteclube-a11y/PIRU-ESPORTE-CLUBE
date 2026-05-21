import React, { useRef, useState } from 'react';
import { Sponsor } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { Trophy, Download, X, Camera, Image as ImageIcon, Layout, Settings2, Sparkles, Move, Type, Droplets, RefreshCw } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn, fixHtml2CanvasColors } from '../utils';

interface SponsorFlyerProps {
  sponsor: Sponsor;
  onClose: () => void;
}

const BACKGROUNDS = [
  { id: 'stadium', name: 'Estádio Pro', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1200' },
  { id: 'stadium2', name: 'Arena Noite', url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1200' },
  { id: 'gym', name: 'Centro de Treino', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1200' },
  { id: 'court', name: 'Quadra Elite', url: 'https://images.unsplash.com/photo-1505666287802-931dc83948e9?q=80&w=1200' },
  { id: 'abstract', name: 'Abstrato Dark', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1200' },
];

export default function SponsorFlyer({ sponsor, onClose }: SponsorFlyerProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const { settings } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [customText, setCustomText] = useState('');
  
  // States
  const [activeTab, setActiveTab] = useState<'text' | 'position' | 'appearance' | 'frame'>('text');
  const [activeSlot, setActiveSlot] = useState<'sponsor' | 'school'>('sponsor');
  const [selectedBackground, setSelectedBackground] = useState('stadium');
  
  // Customization States
  const [borderWidth, setBorderWidth] = useState(12);
  const [borderColor, setBorderColor] = useState(settings.themeColor || '#eab308');
  const [mainHeadlineSize, setMainHeadlineSize] = useState(82);
  const [customTextSize, setCustomTextSize] = useState(32);
  const [multiplyLogo, setMultiplyLogo] = useState(false);
  const [screenLogo, setScreenLogo] = useState(false);
  const [logoBrightness, setLogoBrightness] = useState(1);
  const [logoContrast, setLogoContrast] = useState(1);
  const [glowIntensity, setGlowIntensity] = useState(0.4);

  // Positioning States
  const [sponsorPos, setSponsorPos] = useState({ scale: sponsor.logo_scale || 1, x: 0, y: 0 });
  const [schoolPos, setSchoolPos] = useState({ scale: 1, x: 0, y: 0 });
  const [layoutPos, setLayoutPos] = useState({ y: 0 });
  
  // Advanced control states
  const [titleText, setTitleText] = useState(`A EQUIPE ${settings.schoolName?.toUpperCase() || 'PIRUÁ ESPORTE CLUBE'} TEM O PATROCÍNIO DE`);
  const [titlePos, setTitlePos] = useState({ x: 0, y: 0 });
  const [showTitle, setShowTitle] = useState(true);
  const [showSchoolCrest, setShowSchoolCrest] = useState(true);
  const [showSponsor, setShowSponsor] = useState(true);
  const [showSlogan, setShowSlogan] = useState(true);
  const [showFooter, setShowFooter] = useState(true);
  const [customTextPos, setCustomTextPos] = useState({ x: 0, y: 0 });
  const [footerSlogan, setFooterSlogan] = useState('Together We Win');
  const [footerSubtext, setFooterSubtext] = useState(`${settings.schoolName || 'PIRUÁ ESPORTE CLUBE'} • Temporada 2026`);
  const [footerPos, setFooterPos] = useState({ y: 0 });
  const [posElement, setPosElement] = useState<'title' | 'school' | 'sponsor' | 'slogan' | 'footer'>('sponsor');
  
  const [sponsorLogo, setSponsorLogo] = useState<string | null>(sponsor.logo || null);
  const [schoolCrest, setSchoolCrest] = useState<string | null>(settings.schoolCrest || null);

  const sponsorLogoRef = useRef<HTMLInputElement>(null);
  const schoolCrestRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'sponsor' | 'school') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (type === 'sponsor') setSponsorLogo(event.target?.result as string);
        else setSchoolCrest(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDownload = async () => {
    if (!flyerRef.current) return;
    setIsExporting(true);
    const loadingToast = toast.loading('Gerando Encarte de Alta Performance...');
    
    window.scrollTo(0, 0);

    try {
      await new Promise(resolve => setTimeout(resolve, 600));
      fixHtml2CanvasColors(flyerRef.current);

      const element = flyerRef.current;
      const dataUrl = await htmlToImage.toPng(element, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        backgroundColor: '#000000',
        cacheBust: true,
        style: {
          transform: 'none',
          margin: '0',
          padding: '0'
        }
      });

      toast.dismiss(loadingToast);
      const link = document.createElement('a');
      link.download = `GE_PATROCINIO_${sponsor.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Imagem gerada com sucesso!', {
        description: 'Salve no seu dispositivo e poste nos Stories.'
      });
    } catch (error: any) {
      console.error('Error generating flyer:', error);
      toast.error('Erro ao processar imagem. Verifique as fotos enviadas.');
    } finally {
      setIsExporting(false);
      toast.dismiss(loadingToast);
    }
  };

  const bgUrl = BACKGROUNDS.find(bg => bg.id === selectedBackground)?.url || BACKGROUNDS[0].url;

  return (
    <div className="fixed inset-0 bg-black/98 backdrop-blur-3xl z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-7xl grid grid-cols-1 md:grid-cols-[1fr,380px] gap-6 lg:gap-8 items-start my-auto">
        
        {/* Left: Dynamic Editor Panel */}
        <div className="space-y-6 bg-zinc-900/50 border border-zinc-800 p-8 rounded-[3rem] shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-theme-primary/10 rounded-2xl">
                <Sparkles className="text-theme-primary" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none">Cretor de Encartes</h2>
                <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mt-1">High Performance Edition • 9:16</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 text-zinc-500 hover:text-white transition-all bg-black rounded-2xl border border-zinc-800 hover:border-zinc-700"
            >
              <X size={20} />
            </button>
          </div>

          <div className="grid grid-cols-4 gap-1 bg-black/40 p-1 rounded-2xl border border-zinc-800/50">
            <button 
              type="button"
              onClick={() => setActiveTab('text')}
              className={cn(
                "py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1",
                activeTab === 'text' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
              title="Textos e Imagens"
            >
              <Type size={12} /> <span className="hidden sm:inline">Textos</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('position')}
              className={cn(
                "py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1",
                activeTab === 'position' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
              title="Posicionar Elementos"
            >
              <Move size={12} /> <span className="hidden sm:inline">Posições</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('appearance')}
              className={cn(
                "py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1",
                activeTab === 'appearance' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
              title="Filtros e Aparência"
            >
              <Droplets size={12} /> <span className="hidden sm:inline">Estética</span>
            </button>
            <button 
              type="button"
              onClick={() => setActiveTab('frame')}
              className={cn(
                "py-2.5 rounded-xl text-[9px] font-black uppercase transition-all flex flex-col items-center justify-center gap-1",
                activeTab === 'frame' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-350"
              )}
              title="Fundo e Moldura"
            >
              <Layout size={12} /> <span className="hidden sm:inline">Aparência</span>
            </button>
          </div>

          <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar">
            {activeTab === 'text' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                {/* Título Section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Título do Encarte</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={showTitle} onChange={e => setShowTitle(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-black"></div>
                    </label>
                  </div>
                  <textarea 
                    value={titleText}
                    onChange={e => setTitleText(e.target.value)}
                    className="w-full bg-black/60 border border-zinc-800 p-4 rounded-xl text-xs text-white resize-none h-16 focus:ring-2 focus:ring-theme-primary/30 outline-none transition-all font-medium"
                    placeholder="Título principal do encarte..."
                  />
                </div>

                {/* Slogan de Parceria */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Slogan de Parceria</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={showSlogan} onChange={e => setShowSlogan(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-black"></div>
                    </label>
                  </div>
                  <textarea 
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    maxLength={120}
                    className="w-full bg-black/60 border border-zinc-800 p-4 rounded-xl text-xs text-white resize-none h-16 focus:ring-2 focus:ring-theme-primary/30 outline-none transition-all font-medium"
                    placeholder="Slogan de impacto..."
                  />
                </div>

                {/* Upload de Imagens */}
                <div className="space-y-4 bg-black/20 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Parceiro e Clube</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={showSchoolCrest} onChange={e => setShowSchoolCrest(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-black"></div>
                      <span className="ml-2 text-[8px] font-black text-zinc-500 uppercase">Mostrar Escudo</span>
                    </label>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-zinc-500 uppercase block">Logomarca Patrocínio</span>
                      <button 
                        type="button"
                        onClick={() => sponsorLogoRef.current?.click()}
                        className="w-full py-2.5 bg-zinc-800/40 hover:bg-zinc-800 border-2 border-dashed border-zinc-700/50 rounded-xl text-[9px] font-black text-theme-primary transition-all uppercase flex items-center justify-center gap-2"
                      >
                        <ImageIcon size={14} /> Upload Sponsor
                      </button>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[9px] font-black text-zinc-500 uppercase block">Escudo do Clube</span>
                      <button 
                        type="button"
                        onClick={() => schoolCrestRef.current?.click()}
                        className="w-full py-2.5 bg-zinc-800/40 hover:bg-zinc-800 border-2 border-dashed border-zinc-700/50 rounded-xl text-[9px] font-black text-theme-primary transition-all uppercase flex items-center justify-center gap-2"
                      >
                        <ImageIcon size={14} /> Upload Clube
                      </button>
                    </div>
                  </div>
                </div>

                {/* Textos de Rodapé */}
                <div className="space-y-3 bg-black/20 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rodapé & Assinatura</label>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" checked={showFooter} onChange={e => setShowFooter(e.target.checked)} className="sr-only peer" />
                      <div className="w-9 h-5 bg-zinc-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-zinc-400 after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-theme-primary peer-checked:after:bg-black"></div>
                    </label>
                  </div>
                  
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block">Título Menor (Slogan)</span>
                    <input 
                      type="text"
                      value={footerSlogan}
                      onChange={e => setFooterSlogan(e.target.value)}
                      className="w-full bg-black/50 border border-zinc-800 p-2.5 rounded-lg text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block">Legenda (Assinatura)</span>
                    <input 
                      type="text"
                      value={footerSubtext}
                      onChange={e => setFooterSubtext(e.target.value)}
                      className="w-full bg-black/50 border border-zinc-800 p-2.5 rounded-lg text-xs text-white focus:ring-1 focus:ring-theme-primary outline-none"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'position' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">Elemento a Ajustar</label>
                  <div className="grid grid-cols-5 gap-0.5 bg-black/40 p-1 rounded-xl border border-zinc-800">
                    {[
                      { id: 'title', label: 'Título' },
                      { id: 'school', label: 'Escudo' },
                      { id: 'sponsor', label: 'Sponsor' },
                      { id: 'slogan', label: 'Slogan' },
                      { id: 'footer', label: 'Rodapé' },
                    ].map((el) => (
                      <button
                        key={el.id}
                        type="button"
                        onClick={() => setPosElement(el.id as any)}
                        className={cn(
                          "py-2 rounded-lg text-[8px] font-black uppercase transition-all whitespace-nowrap text-center",
                          posElement === el.id ? "bg-theme-primary text-black font-extrabold" : "text-zinc-500 hover:text-zinc-300"
                        )}
                      >
                        {el.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/20 p-4 rounded-2xl border border-zinc-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-theme-primary uppercase tracking-wider">
                      {posElement === 'title' && 'Título Principal'}
                      {posElement === 'school' && 'Escudo do Clube'}
                      {posElement === 'sponsor' && 'Marca Patrocinador'}
                      {posElement === 'slogan' && 'Slogan Parceria'}
                      {posElement === 'footer' && 'Rodapé'}
                    </h4>
                    
                    <button
                      type="button"
                      onClick={() => {
                        if (posElement === 'title') { setTitlePos({ x: 0, y: 0 }); setMainHeadlineSize(82); }
                        else if (posElement === 'school') { setSchoolPos({ scale: 1, x: 0, y: 0 }); }
                        else if (posElement === 'sponsor') { setSponsorPos({ scale: sponsor.logo_scale || 1, x: 0, y: 0 }); }
                        else if (posElement === 'slogan') { setCustomTextPos({ x: 0, y: 0 }); setCustomTextSize(32); }
                        else if (posElement === 'footer') { setFooterPos({ y: 0 }); }
                      }}
                      className="text-[9px] font-black text-zinc-450 hover:text-white uppercase tracking-wider flex items-center gap-1 bg-zinc-800 px-2.5 py-1 rounded-lg"
                    >
                      <RefreshCw size={8} /> Resetar Pos
                    </button>
                  </div>

                  {posElement !== 'footer' && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Tamanho / Escala</span>
                        <span className="text-[9px] text-zinc-400">
                          {posElement === 'title' && `${mainHeadlineSize}px`}
                          {posElement === 'school' && `${schoolPos.scale.toFixed(2)}x`}
                          {posElement === 'sponsor' && `${sponsorPos.scale.toFixed(2)}x`}
                          {posElement === 'slogan' && `${customTextSize}px`}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min={posElement === 'title' ? 30 : posElement === 'slogan' ? 12 : 0.2}
                        max={posElement === 'title' ? 150 : posElement === 'slogan' ? 100 : 3.5}
                        step={posElement === 'title' || posElement === 'slogan' ? '1' : '0.05'}
                        value={
                          posElement === 'title' ? mainHeadlineSize :
                          posElement === 'school' ? schoolPos.scale :
                          posElement === 'sponsor' ? sponsorPos.scale :
                          customTextSize
                        }
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (posElement === 'title') setMainHeadlineSize(val);
                          else if (posElement === 'school') setSchoolPos({ ...schoolPos, scale: val });
                          else if (posElement === 'sponsor') setSponsorPos({ ...sponsorPos, scale: val });
                          else if (posElement === 'slogan') setCustomTextSize(val);
                        }}
                        className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}

                  {posElement !== 'footer' && (
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Eixo X (Horizontal)</span>
                        <span className="text-[9px] text-zinc-400 font-mono">
                          {posElement === 'title' && `${titlePos.x}px`}
                          {posElement === 'school' && `${schoolPos.x}px`}
                          {posElement === 'sponsor' && `${sponsorPos.x}px`}
                          {posElement === 'slogan' && `${customTextPos.x}px`}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="-500"
                        max="500"
                        step="2"
                        value={
                          posElement === 'title' ? titlePos.x :
                          posElement === 'school' ? schoolPos.x :
                          posElement === 'sponsor' ? sponsorPos.x :
                          customTextPos.x
                        }
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          if (posElement === 'title') setTitlePos({ ...titlePos, x: val });
                          else if (posElement === 'school') setSchoolPos({ ...schoolPos, x: val });
                          else if (posElement === 'sponsor') setSponsorPos({ ...sponsorPos, x: val });
                          else if (posElement === 'slogan') setCustomTextPos({ ...customTextPos, x: val });
                        }}
                        className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Eixo Y (Vertical)</span>
                      <span className="text-[9px] text-zinc-400 font-mono">
                        {posElement === 'title' ? `${titlePos.y}px` : ''}
                        {posElement === 'school' ? `${schoolPos.y}px` : ''}
                        {posElement === 'sponsor' ? `${sponsorPos.y}px` : ''}
                        {posElement === 'slogan' ? `${customTextPos.y}px` : ''}
                        {posElement === 'footer' ? `${footerPos.y}px` : ''}
                      </span>
                    </div>
                    <input 
                      type="range"
                      min={posElement === 'footer' ? -400 : -1000}
                      max={posElement === 'footer' ? 400 : 1000}
                      step="2"
                      value={
                        posElement === 'title' ? titlePos.y :
                        posElement === 'school' ? schoolPos.y :
                        posElement === 'sponsor' ? sponsorPos.y :
                        posElement === 'slogan' ? customTextPos.y :
                        footerPos.y
                      }
                      onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (posElement === 'title') setTitlePos({ ...titlePos, y: val });
                        else if (posElement === 'school') setSchoolPos({ ...schoolPos, y: val });
                        else if (posElement === 'sponsor') setSponsorPos({ ...sponsorPos, y: val });
                        else if (posElement === 'slogan') setCustomTextPos({ ...customTextPos, y: val });
                        else if (posElement === 'footer') setFooterPos({ y: val });
                      }}
                      className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'appearance' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-black/20 p-5 rounded-2xl border border-zinc-800 space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Settings2 size={12} />
                    Aparência da Logomarca
                  </h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      type="button"
                      onClick={() => { setMultiplyLogo(!multiplyLogo); setScreenLogo(false); }}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase transition-all whitespace-nowrap text-center",
                        multiplyLogo ? "bg-theme-primary text-black border-theme-primary" : "bg-black border-zinc-800 text-zinc-500"
                      )}
                    >
                      Remover Fundo Branco
                    </button>
                    <button 
                      type="button"
                      onClick={() => { setScreenLogo(!screenLogo); setMultiplyLogo(false); }}
                      className={cn(
                        "px-3 py-2.5 rounded-xl border text-[9px] font-bold uppercase transition-all whitespace-nowrap text-center",
                        screenLogo ? "bg-theme-primary text-black border-theme-primary" : "bg-black border-zinc-800 text-zinc-500"
                      )}
                    >
                      Remover Fundo Preto
                    </button>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <div className="flex justify-between px-1">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Brilho da Imagem</span>
                        <span className="text-[9px] text-zinc-400">{Math.round(logoBrightness * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0.3" max="2.5" step="0.05"
                        className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg"
                        value={logoBrightness}
                        onChange={e => setLogoBrightness(parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between px-1">
                        <span className="text-[9px] font-bold text-zinc-500 uppercase">Contraste da Imagem</span>
                        <span className="text-[9px] text-zinc-400">{Math.round(logoContrast * 100)}%</span>
                      </div>
                      <input 
                        type="range" min="0.3" max="2.5" step="0.05"
                        className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg"
                        value={logoContrast}
                        onChange={e => setLogoContrast(parseFloat(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 p-5 rounded-2xl border border-zinc-800 space-y-3">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                    <Sparkles size={12} />
                    Efeito de Neon Traseiro
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-550 uppercase">Intensidade do Brilho Traseiro</span>
                      <span className="text-[9px] text-zinc-400">{(glowIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={glowIntensity} onChange={e => setGlowIntensity(parseFloat(e.target.value))} className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg appearance-none" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'frame' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">Escolher Imagem de Fundo</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {BACKGROUNDS.map(bg => (
                      <button 
                        key={bg.id}
                        type="button"
                        onClick={() => setSelectedBackground(bg.id)}
                        className={cn(
                          "aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all relative group",
                          selectedBackground === bg.id ? "border-theme-primary ring-2 ring-theme-primary/30" : "border-zinc-800 opacity-45 hover:opacity-100"
                        )}
                        title={bg.name}
                      >
                        <img src={bg.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/20 p-4 rounded-2xl border border-zinc-800 space-y-4">
                  <h4 className="text-[10px] font-black text-zinc-450 uppercase tracking-widest">Moldura do Encarte</h4>
                  
                  <div className="space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold text-zinc-550 uppercase">Espessura da Borda</span>
                      <span className="text-[9px] text-zinc-400">{borderWidth}px</span>
                    </div>
                    <input type="range" min="0" max="60" step="1" value={borderWidth} onChange={e => setBorderWidth(parseInt(e.target.value))} className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg" />
                  </div>

                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-zinc-500 uppercase block">Cor da Borda</span>
                    <div className="flex flex-wrap gap-1">
                      {[settings.themeColor || '#eab308', '#ffffff', '#ff0000', '#000000', '#1a1a1a', '#22c55e', '#3b82f6'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setBorderColor(c)}
                          className={cn(
                            "w-6 h-6 rounded-full border-2 border-zinc-800 transition-transform hover:scale-110",
                            borderColor === c ? "border-white ring-2 ring-white/30" : ""
                          )}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-black/20 p-4 rounded-2xl border border-zinc-800 space-y-2">
                  <h4 className="text-[10px] font-black text-zinc-440 uppercase tracking-widest">Compensação Geral</h4>
                  <div className="space-y-2 mt-2">
                    <div className="flex justify-between">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Posicionamento Vertical Central</span>
                      <span className="text-[9px] text-zinc-400 font-mono">{layoutPos.y}px</span>
                    </div>
                    <input 
                      type="range" min="-400" max="400" step="5"
                      className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg"
                      value={layoutPos.y}
                      onChange={e => setLayoutPos({y: parseInt(e.target.value)})}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button 
              onClick={handleDownload} 
              disabled={isExporting} 
              className="w-full py-5 bg-theme-primary text-black font-black uppercase tracking-tighter rounded-[2rem] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xl shadow-theme-primary/30 disabled:opacity-50"
            >
              {isExporting ? <RefreshCw className="animate-spin" size={20} /> : <Download size={20} />}
              {isExporting ? 'PROCESSANDO...' : 'EXPORTAR ARQUIVO PROFISSIONAL'}
            </button>
            <p className="text-center mt-4 text-[9px] text-zinc-600 font-black uppercase tracking-widest">Resolução 1080x1920 • Formato PNG</p>
          </div>

          <input type="file" ref={sponsorLogoRef} onChange={e => handleImageUpload(e, 'sponsor')} accept="image/*" className="hidden" />
          <input type="file" ref={schoolCrestRef} onChange={e => handleImageUpload(e, 'school')} accept="image/*" className="hidden" />
        </div>

        {/* Right Content: The Professional Canvas */}
        <div className="flex flex-col items-center sticky top-4">
          <div 
            className="shadow-[0_45px_100px_rgba(0,0,0,0.9)] rounded-3xl overflow-hidden ring-1 ring-white/5"
            style={{ width: '360px', height: '640px', position: 'relative' }}
          >
            <div 
              ref={flyerRef}
              className="relative overflow-hidden bg-black flex flex-col select-none"
              style={{ 
                width: '1080px', 
                height: '1920px', 
                transform: 'scale(0.33333333)', 
                transformOrigin: 'top left', 
                border: `${borderWidth}px solid ${borderColor}`
              }}
            >
              {/* 1. Cinematic Background Layer */}
              <div className="absolute inset-0 z-0">
                 <img src={bgUrl} className="w-full h-full object-cover grayscale-[0.2] contrast-125" crossOrigin="anonymous" referrerPolicy="no-referrer" />
                 
                 {/* Atmosphere Overlays */}
                 <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
                 <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-theme-primary/10" />
                 <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent" />
                 
                 {/* Vignette */}
                 <div className="absolute inset-0 shadow-[inset_0_0_500px_rgba(0,0,0,1)]" />
                 
                 {/* Structural Patterns */}
                 <div className="absolute inset-0 opacity-20 mix-blend-overlay" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px)', backgroundSize: '100px 100px' }} />
                 <div className="absolute inset-0 bg-white/[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '60px 60px' }} />
              </div>

              {/* 2. Content Composer Layer */}
              <div 
                className="relative z-10 flex-1 flex flex-col items-center justify-center p-32 text-center"
                style={{ transform: `translateY(${layoutPos.y}px)` }}
              >
                {/* Top Section: Club ID */}
                {showSchoolCrest && (
                  <div 
                    className="mb-14"
                    style={{ transform: `translate(${schoolPos.x}px, ${schoolPos.y}px) scale(${schoolPos.scale})` }}
                  >
                    <div className="relative group">
                      {/* Brand Back-glow */}
                      <div className="absolute inset-0 rounded-full blur-[80px] opacity-40 bg-theme-primary/50" />
                      
                      <div className="relative w-72 h-72 flex items-center justify-center p-4">
                        {schoolCrest ? (
                          <img 
                            src={schoolCrest} 
                            className="w-full h-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.8)]" 
                            crossOrigin="anonymous" 
                            referrerPolicy="no-referrer" 
                          />
                        ) : (
                          <Trophy size={140} className="text-theme-primary drop-shadow-2xl" />
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Central Typography Core */}
                <div className="w-full max-w-5xl mx-auto space-y-20">
                  {showTitle && (
                    <div className="space-y-12" style={{ transform: `translate(${titlePos.x}px, ${titlePos.y}px)` }}>
                       <div className="inline-flex items-center gap-6 px-10 py-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
                          <div className="w-3 h-3 rounded-full bg-theme-primary shadow-[0_0_15px_theme(colors.theme-primary)]" />
                          <span className="text-white text-2xl font-black uppercase tracking-[0.6em] italic">Official Partnership</span>
                       </div>
                       
                       <div className="relative pt-4">
                         <h2 
                           className="font-black text-white uppercase tracking-tighter leading-[0.85] italic"
                           style={{ fontSize: `${mainHeadlineSize}px` }}
                         >
                           {titleText}
                         </h2>
                         {/* Background phantom text */}
                         <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-[180px] font-black italic text-white/[0.03] select-none pointer-events-none uppercase tracking-tighter whitespace-nowrap z-[-1]">
                           PARTNER
                         </div>
                       </div>
                    </div>
                  )}

                  {/* Main Sponsor Feature */}
                  {showSponsor && (
                    <div 
                      className="relative flex items-center justify-center"
                      style={{ transform: `translate(${sponsorPos.x}px, ${sponsorPos.y}px) scale(${sponsorPos.scale})` }}
                    >
                      {/* Neon Glow Spot */}
                      <div 
                        className="absolute w-[600px] h-[400px] bg-theme-primary/20 blur-[120px] rounded-full transition-opacity duration-300" 
                        style={{ opacity: glowIntensity }}
                      />
                      
                      <div className="relative w-full max-w-3xl aspect-[16/6] flex items-center justify-center font-black">
                         {sponsorLogo ? (
                           <img 
                             src={sponsorLogo} 
                             className={cn(
                               "w-full h-full object-contain relative z-10 transition-all",
                               multiplyLogo ? "mix-blend-multiply" : "",
                               screenLogo ? "mix-blend-screen" : "",
                               !multiplyLogo && !screenLogo ? "drop-shadow-[0_25px_50px_rgba(0,0,0,0.8)]" : ""
                             )} 
                             style={{ filter: `brightness(${logoBrightness}) contrast(${logoContrast})` }}
                             crossOrigin="anonymous" 
                             referrerPolicy="no-referrer"
                           />
                         ) : (
                           <div className="text-white/10 font-black text-9xl uppercase italic tracking-tighter leading-none select-none blur-[2px]">
                             {sponsor.name}
                           </div>
                         )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Bottom Statement Section */}
                {showSlogan && customText && (
                  <div 
                    className="mt-32 w-full max-w-3xl mx-auto"
                    style={{ transform: `translate(${customTextPos.x}px, ${customTextPos.y}px)` }}
                  >
                     <div className="relative">
                       {/* Slanted decoration */}
                       <div className="absolute -inset-6 bg-theme-primary skew-x-[-12deg] opacity-10 blur-xl" />
                       <div className="bg-black/60 backdrop-blur-2xl px-16 py-12 rounded-[3.5rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)] transform -skew-x-[-8deg] relative font-black">
                          <p 
                            className="text-white font-black uppercase tracking-tight italic opacity-95 leading-tight transform -skew-x-[8deg]"
                            style={{ fontSize: `${customTextSize}px` }}
                          >
                             "{customText}"
                          </p>
                       </div>
                     </div>
                  </div>
                )}
              </div>

              {/* 3. Final Branding Lockup */}
              {showFooter && (
                <div 
                  className="absolute bottom-24 inset-x-0 flex flex-col items-center z-20"
                  style={{ transform: `translateY(${footerPos.y}px)` }}
                >
                   <div className="w-32 h-1 bg-theme-primary/30 rounded-full mb-8 shadow-[0_0_15px_theme(colors.theme-primary)]" />
                   <p className="text-theme-primary text-2xl font-black uppercase tracking-[0.6em] italic mb-4">{footerSlogan}</p>
                   <p className="text-white/40 text-lg font-black uppercase tracking-[0.4em] italic leading-none">{footerSubtext}</p>
                </div>
              )}

              {/* 4. High-Performance Frame Borders */}
              <div className="absolute inset-x-0 top-0 h-6 bg-theme-primary z-30 shadow-[0_10px_30px_rgba(0,0,0,0.5)]" />
              <div className="absolute inset-x-0 bottom-0 h-6 bg-theme-primary z-30 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]" />
            </div>
          </div>
          
          <div className="mt-8 flex gap-4 w-full">
            <div className="flex-1 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest mb-1">Dica Pro</p>
              <p className="text-[9px] text-zinc-500 font-medium">Use a escala para dar destaque à marca.</p>
            </div>
            <div className="flex-1 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-center">
              <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest mb-1">Branding</p>
              <p className="text-[9px] text-zinc-500 font-medium">A cor da escola é aplicada automaticamente.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
