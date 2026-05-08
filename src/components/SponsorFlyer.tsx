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
  const [activeTab, setActiveTab] = useState<'content' | 'visual'>('content');
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
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8 items-start my-auto">
        
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

          <div className="grid grid-cols-2 gap-2 bg-black/40 p-1.5 rounded-2xl border border-zinc-800/50">
            <button 
              onClick={() => setActiveTab('content')}
              className={cn(
                "py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                activeTab === 'content' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Type size={14} /> Conteúdo
            </button>
            <button 
              onClick={() => setActiveTab('visual')}
              className={cn(
                "py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                activeTab === 'visual' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Droplets size={14} /> Estética
            </button>
          </div>

          <div className="space-y-6 max-h-[55vh] overflow-y-auto pr-4 custom-scrollbar">
            {activeTab === 'content' ? (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Slogan de Parceria</label>
                    <span className="text-[9px] text-zinc-600 font-bold">{customText.length}/100</span>
                  </div>
                  <textarea 
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    maxLength={100}
                    className="w-full bg-black/60 border border-zinc-800 p-5 rounded-[2rem] text-sm text-white resize-none h-28 focus:ring-2 focus:ring-theme-primary/30 outline-none transition-all placeholder:text-zinc-800 font-medium"
                    placeholder="Ex: Construindo o futuro do esporte regional juntos..."
                  />
                </div>

                <div className="bg-black/20 p-6 rounded-[2.5rem] border border-zinc-800 space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Upload de Marcas</h4>
                    <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800">
                      <button onClick={() => setActiveSlot('sponsor')} className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all", activeSlot === 'sponsor' ? "bg-theme-primary text-black shadow-lg shadow-theme-primary/20" : "text-zinc-500")}>Patrocinador</button>
                      <button onClick={() => setActiveSlot('school')} className={cn("px-4 py-1.5 rounded-lg text-[8px] font-black uppercase transition-all", activeSlot === 'school' ? "bg-theme-primary text-black shadow-lg shadow-theme-primary/20" : "text-zinc-500")}>Clube</button>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => activeSlot === 'sponsor' ? sponsorLogoRef.current?.click() : schoolCrestRef.current?.click()}
                    className="w-full py-5 bg-zinc-800/50 border-2 border-dashed border-zinc-700/50 rounded-2xl text-[10px] font-black text-theme-primary hover:bg-zinc-800 transition-all uppercase tracking-widest flex items-center justify-center gap-3 group"
                  >
                    <div className="p-2 bg-theme-primary/10 rounded-lg group-hover:scale-110 transition-transform">
                      <ImageIcon size={18} />
                    </div>
                    Subir nova imagem
                  </button>

                  <div className="space-y-6 pt-2">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <Move size={12} className="text-zinc-600" />
                        <span className="text-[10px] font-black text-zinc-500 uppercase">Ajuste de Posicionamento</span>
                      </div>
                      <button 
                        onClick={() => activeSlot === 'sponsor' ? setSponsorPos({scale: 1, x: 0, y: 0}) : setSchoolPos({scale: 1, x: 0, y: 0})}
                        className="text-[9px] font-black text-theme-primary uppercase hover:underline"
                      >
                        Resetar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase">Escala</span>
                          <span className="text-[9px] text-zinc-400">{(activeSlot === 'sponsor' ? sponsorPos.scale : schoolPos.scale).toFixed(1)}x</span>
                        </div>
                        <input type="range" min="0.1" max="4" step="0.1" value={activeSlot === 'sponsor' ? sponsorPos.scale : schoolPos.scale} onChange={e => activeSlot === 'sponsor' ? setSponsorPos({...sponsorPos, scale: parseFloat(e.target.value)}) : setSchoolPos({...schoolPos, scale: parseFloat(e.target.value)})} className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer" />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase block">Eixo X</span>
                          <input type="range" min="-300" max="300" step="1" value={activeSlot === 'sponsor' ? sponsorPos.x : schoolPos.x} onChange={e => activeSlot === 'sponsor' ? setSponsorPos({...sponsorPos, x: parseInt(e.target.value)}) : setSchoolPos({...schoolPos, x: parseInt(e.target.value)})} className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg" />
                        </div>
                        <div className="space-y-2">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase block">Eixo Y</span>
                          <input type="range" min="-300" max="300" step="1" value={activeSlot === 'sponsor' ? sponsorPos.y : schoolPos.y} onChange={e => activeSlot === 'sponsor' ? setSponsorPos({...sponsorPos, y: parseInt(e.target.value)}) : setSchoolPos({...schoolPos, y: parseInt(e.target.value)})} className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg" />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 space-y-4 border-t border-zinc-800/50">
                    <h4 className="text-[10px] font-black text-theme-primary uppercase tracking-widest flex items-center gap-2 pt-4">
                      <Settings2 size={12} />
                      Tratamento de Imagem
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => { setMultiplyLogo(!multiplyLogo); setScreenLogo(false); }}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all",
                          multiplyLogo ? "bg-theme-primary text-black border-theme-primary" : "bg-black border-zinc-800 text-zinc-500"
                        )}
                      >
                        Remover Fundo Branco
                      </button>
                      <button 
                        onClick={() => { setScreenLogo(!screenLogo); setMultiplyLogo(false); }}
                        className={cn(
                          "px-4 py-3 rounded-xl border text-[10px] font-bold uppercase transition-all",
                          screenLogo ? "bg-theme-primary text-black border-theme-primary" : "bg-black border-zinc-800 text-zinc-500"
                        )}
                      >
                        Remover Fundo Preto
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between px-1">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Brilho do Logo</span>
                          <span className="text-[9px] text-zinc-400">{Math.round(logoBrightness * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0.5" max="2" step="0.05"
                          className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg"
                          value={logoBrightness}
                          onChange={e => setLogoBrightness(parseFloat(e.target.value))}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between px-1">
                          <span className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Contraste do Logo</span>
                          <span className="text-[9px] text-zinc-400">{Math.round(logoContrast * 100)}%</span>
                        </div>
                        <input 
                          type="range" min="0.5" max="2" step="0.05"
                          className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg"
                          value={logoContrast}
                          onChange={e => setLogoContrast(parseFloat(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-300">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">Fundo de Estágio</label>
                  <div className="grid grid-cols-5 gap-3">
                    {BACKGROUNDS.map(bg => (
                      <button 
                        key={bg.id}
                        onClick={() => setSelectedBackground(bg.id)}
                        className={cn(
                          "aspect-[2/3] rounded-xl overflow-hidden border-2 transition-all relative group",
                          selectedBackground === bg.id ? "border-theme-primary ring-4 ring-theme-primary/10 scale-105" : "border-zinc-800 opacity-40 hover:opacity-100"
                        )}
                      >
                        <img src={bg.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-black/20 p-6 rounded-[2.5rem] border border-zinc-800 space-y-6">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tratamento de Imagem</h4>
                  
                  <button 
                    onClick={() => setMultiplyLogo(!multiplyLogo)}
                    className={cn(
                      "w-full py-4 rounded-2xl border-2 transition-all flex items-center justify-between px-5",
                      multiplyLogo 
                        ? "bg-theme-primary/10 border-theme-primary text-theme-primary shadow-lg shadow-theme-primary/10" 
                        : "bg-zinc-800/30 border-zinc-700/50 text-zinc-500"
                    )}
                  >
                    <div className="text-left">
                      <span className="text-[10px] font-black uppercase block">Remover Fundo Branco</span>
                      <span className="text-[8px] font-bold opacity-60">Ideal para logotipos com fundo sólido</span>
                    </div>
                    <div className={cn("w-10 h-5 rounded-full relative transition-colors", multiplyLogo ? "bg-theme-primary" : "bg-zinc-700")}>
                      <div className={cn("absolute top-1 w-3 h-3 rounded-full bg-white transition-all", multiplyLogo ? "right-1" : "left-1")} />
                    </div>
                  </button>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-[9px] font-bold text-zinc-600 uppercase">Intensidade do Brilho</span>
                      <span className="text-[9px] text-zinc-400">{(glowIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <input type="range" min="0" max="1" step="0.05" value={glowIntensity} onChange={e => setGlowIntensity(parseFloat(e.target.value))} className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg appearance-none" />
                  </div>
                </div>

                <div className="bg-black/20 p-6 rounded-[2.5rem] border border-zinc-800 space-y-6">
                  <h4 className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Tipografia & Moldura</h4>
                  
                  <div className="grid grid-cols-1 gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-bold text-zinc-600 uppercase">Tamanho do Título</span>
                        <span className="text-[9px] text-zinc-400">{mainHeadlineSize}px</span>
                      </div>
                      <input type="range" min="40" max="140" step="2" value={mainHeadlineSize} onChange={e => setMainHeadlineSize(parseInt(e.target.value))} className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg" />
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-[9px] font-bold text-zinc-600 uppercase">Cor da Borda</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {[settings.themeColor || '#eab308', '#ffffff', '#ff0000', '#000000', '#1a1a1a', '#22c55e', '#3b82f6'].map(c => (
                          <button
                            key={c}
                            onClick={() => setBorderColor(c)}
                            className={cn(
                              "w-8 h-8 rounded-full border-2 border-zinc-800 transition-transform hover:scale-110",
                              borderColor === c ? "border-white ring-4 ring-white/10" : ""
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                        <span className="text-[9px] font-bold text-zinc-600 uppercase block">Compensação Vertical</span>
                        <input 
                          type="range" min="-400" max="400" step="5"
                          className="w-full accent-theme-primary h-1.5 bg-zinc-800 rounded-lg"
                          value={layoutPos.y}
                          onChange={e => setLayoutPos({y: parseInt(e.target.value)})}
                        />
                    </div>
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
                <div 
                  className="mb-14"
                  style={{ transform: `scale(${schoolPos.scale}) translate(${schoolPos.x}px, ${schoolPos.y}px)` }}
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

                {/* Central Typography Core */}
                <div className="w-full max-w-5xl mx-auto space-y-20">
                  <div className="space-y-12">
                     <div className="inline-flex items-center gap-6 px-10 py-3 bg-black/40 backdrop-blur-md border border-white/10 rounded-full shadow-2xl">
                        <div className="w-3 h-3 rounded-full bg-theme-primary shadow-[0_0_15px_theme(colors.theme-primary)]" />
                        <span className="text-white text-2xl font-black uppercase tracking-[0.6em] italic">Official Partnership</span>
                     </div>
                     
                     <div className="relative pt-4">
                       <h2 
                         className="font-black text-white uppercase tracking-tighter leading-[0.85] italic"
                         style={{ fontSize: `${mainHeadlineSize}px` }}
                       >
                          A EQUIPE <span className="text-theme-primary drop-shadow-[0_0_30px_rgba(0,0,0,0.5)]">{settings.schoolName?.toUpperCase() || 'PIRUÁ ESPORTE CLUBE'}</span> TEM O PATROCÍNIO DE
                       </h2>
                       {/* Background phantom text */}
                       <div className="absolute -top-10 left-1/2 -underline-x-1/2 -translate-x-1/2 text-[180px] font-black italic text-white/[0.03] select-none pointer-events-none uppercase tracking-tighter whitespace-nowrap z-[-1]">
                         PARTNER
                       </div>
                     </div>
                  </div>

                  {/* Main Sponsor Feature */}
                  <div 
                    className="relative flex items-center justify-center"
                    style={{ transform: `scale(${sponsorPos.scale}) translate(${sponsorPos.x}px, ${sponsorPos.y}px)` }}
                  >
                    {/* Neon Glow Spot */}
                    <div 
                      className="absolute w-[600px] h-[400px] bg-theme-primary/20 blur-[120px] rounded-full transition-opacity duration-300" 
                      style={{ opacity: glowIntensity }}
                    />
                    
                    <div className="relative w-full max-w-3xl aspect-[16/6] flex items-center justify-center">
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
                         <div className="text-white/10 font-black text-9xl uppercase italic tracking-tighter tracking-tighter leading-none select-none blur-[2px]">
                           {sponsor.name}
                         </div>
                       )}
                    </div>
                  </div>
                </div>

                {/* Bottom Statement Section */}
                {customText && (
                  <div className="mt-32 w-full max-w-3xl mx-auto">
                     <div className="relative">
                       {/* Slanted decoration */}
                       <div className="absolute -inset-6 bg-theme-primary skew-x-[-12deg] opacity-10 blur-xl" />
                       <div className="bg-black/60 backdrop-blur-2xl px-16 py-12 rounded-[3.5rem] border border-white/5 shadow-[0_40px_80px_rgba(0,0,0,0.6)] transform -skew-x-[-8deg] relative">
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
              <div className="absolute bottom-24 inset-x-0 flex flex-col items-center z-20">
                 <div className="w-32 h-1 bg-theme-primary/30 rounded-full mb-8 shadow-[0_0_15px_theme(colors.theme-primary)]" />
                 <p className="text-theme-primary text-2xl font-black uppercase tracking-[0.6em] italic mb-4">Together We Win</p>
                 <p className="text-white/40 text-lg font-black uppercase tracking-[0.4em] italic leading-none">{settings.schoolName} • 2026 Season Official Post</p>
              </div>

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
