import React, { useRef, useState } from 'react';
import { Sponsor } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { Trophy, Download, X, Camera, Image as ImageIcon, Layout, Settings2 } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn } from '../utils';

interface SponsorFlyerProps {
  sponsor: Sponsor;
  onClose: () => void;
}

const BACKGROUNDS = [
  { id: 'stadium', name: 'Estádio Pro', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?q=80&w=1000' },
  { id: 'stadium2', name: 'Arena Noite', url: 'https://images.unsplash.com/photo-1522778119026-d647f0596c20?q=80&w=1000' },
  { id: 'gym', name: 'Centro de Treino', url: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000' },
  { id: 'court', name: 'Quadra Elite', url: 'https://images.unsplash.com/photo-1505666287802-931dc83948e9?q=80&w=1000' },
  { id: 'abstract', name: 'Abstrato Dark', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=1000' },
];

export default function SponsorFlyer({ sponsor, onClose }: SponsorFlyerProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const { settings } = useTheme();
  const [isExporting, setIsExporting] = useState(false);
  const [customText, setCustomText] = useState('');
  
  // States
  const [activeTab, setActiveTab] = useState<'config' | 'layout'>('config');
  const [activeSlot, setActiveSlot] = useState<'sponsor' | 'school'>('sponsor');
  const [selectedBackground, setSelectedBackground] = useState('stadium');
  
  // Customization States
  const [borderWidth, setBorderWidth] = useState(15);
  const [borderColor, setBorderColor] = useState('#eab308');
  const [mainHeadlineSize, setMainHeadlineSize] = useState(72);
  const [customTextSize, setCustomTextSize] = useState(30);

  // Positioning States
  const [sponsorPos, setSponsorPos] = useState({ scale: 1, x: 0, y: 0 });
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
    const loadingToast = toast.loading('Gerando Flyer Profissional...');
    
    try {
      const element = flyerRef.current;
      const dataUrl = await htmlToImage.toPng(element, {
        width: 1080,
        height: 1920,
        pixelRatio: 1,
        backgroundColor: '#000000',
      });

      toast.dismiss(loadingToast);
      const link = document.createElement('a');
      link.download = `PATROCINIO_${sponsor.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      toast.success('Pronto para o Instagram!');
    } catch (error) {
      toast.error('Erro ao gerar imagem.');
    } finally {
      setIsExporting(false);
    }
  };

  const bgUrl = BACKGROUNDS.find(bg => bg.id === selectedBackground)?.url || BACKGROUNDS[0].url;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-2xl z-[70] flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-[1fr,380px] gap-8 items-start my-auto">
        
        {/* Left: Configuration Panel */}
        <div className="space-y-6 bg-zinc-900 border border-zinc-800 p-6 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-black text-white italic tracking-tighter uppercase">Estúdio de Patrocínio</h2>
              <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Story do Instagram (9:16)</p>
            </div>
            <button onClick={onClose} className="p-2 text-zinc-500 hover:text-white transition-colors bg-zinc-800 rounded-xl">
              <X size={20} />
            </button>
          </div>

          <div className="flex bg-black p-1 rounded-2xl border border-zinc-800">
            <button 
              onClick={() => setActiveTab('config')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                activeTab === 'config' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Settings2 size={14} /> Elementos
            </button>
            <button 
              onClick={() => setActiveTab('layout')}
              className={cn(
                "flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2",
                activeTab === 'layout' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Layout size={14} /> Ajustes & Fundo
            </button>
          </div>

          <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
            {activeTab === 'config' ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">Mensagem do Rodapé</label>
                  <textarea 
                    value={customText}
                    onChange={e => setCustomText(e.target.value)}
                    className="w-full bg-black border border-zinc-800 p-4 rounded-3xl text-sm text-white resize-none h-24 focus:ring-2 focus:ring-theme-primary/50 outline-none transition-all placeholder:text-zinc-700"
                    placeholder="Ex: Novo parceiro da temporada 2026!"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">Ativar Slot</label>
                    <div className="flex bg-black p-1 rounded-xl border border-zinc-800">
                      <button onClick={() => setActiveSlot('sponsor')} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase", activeSlot === 'sponsor' ? "bg-theme-primary text-black" : "text-zinc-500")}>Sponsor</button>
                      <button onClick={() => setActiveSlot('school')} className={cn("flex-1 py-2 rounded-lg text-[8px] font-black uppercase", activeSlot === 'school' ? "bg-theme-primary text-black" : "text-zinc-500")}>Escola</button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">Imagem</label>
                    <button 
                      onClick={() => activeSlot === 'sponsor' ? sponsorLogoRef.current?.click() : schoolCrestRef.current?.click()}
                      className="w-full py-3 bg-zinc-800 border-2 border-dashed border-zinc-700 rounded-xl text-[10px] font-black text-theme-primary hover:bg-zinc-700 transition-colors uppercase tracking-widest flex items-center justify-center gap-2"
                    >
                      <Camera size={14} /> Subir Foto
                    </button>
                  </div>
                </div>

                <div className="bg-black/40 p-4 rounded-3xl border border-zinc-800 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black text-zinc-500 uppercase">Ajustar: {activeSlot === 'sponsor' ? 'Sponsor' : 'Brasão'}</span>
                    <button 
                      onClick={() => activeSlot === 'sponsor' ? setSponsorPos({scale: 1, x: 0, y: 0}) : setSchoolPos({scale: 1, x: 0, y: 0})}
                      className="text-[10px] font-bold text-theme-primary uppercase"
                    >
                      Resetar
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Escala</label>
                      <input type="range" min="0.2" max="3" step="0.1" value={activeSlot === 'sponsor' ? sponsorPos.scale : schoolPos.scale} onChange={e => activeSlot === 'sponsor' ? setSponsorPos({...sponsorPos, scale: parseFloat(e.target.value)}) : setSchoolPos({...schoolPos, scale: parseFloat(e.target.value)})} className="w-full accent-theme-primary" />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Pos X</label>
                      <input type="range" min="-200" max="200" step="1" value={activeSlot === 'sponsor' ? sponsorPos.x : schoolPos.x} onChange={e => activeSlot === 'sponsor' ? setSponsorPos({...sponsorPos, x: parseInt(e.target.value)}) : setSchoolPos({...schoolPos, x: parseInt(e.target.value)})} className="w-full accent-theme-primary" />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-zinc-500 uppercase block mb-1">Pos Y</label>
                      <input type="range" min="-200" max="200" step="1" value={activeSlot === 'sponsor' ? sponsorPos.y : schoolPos.y} onChange={e => activeSlot === 'sponsor' ? setSponsorPos({...sponsorPos, y: parseInt(e.target.value)}) : setSchoolPos({...schoolPos, y: parseInt(e.target.value)})} className="w-full accent-theme-primary" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block px-1">Fundo do Estágio</label>
                  <div className="grid grid-cols-5 gap-2">
                    {BACKGROUNDS.map(bg => (
                      <button 
                        key={bg.id}
                        onClick={() => setSelectedBackground(bg.id)}
                        className={cn(
                          "aspect-square rounded-xl overflow-hidden border-2 transition-all relative group",
                          selectedBackground === bg.id ? "border-theme-primary scale-110 shadow-lg" : "border-zinc-800 opacity-60 hover:opacity-100"
                        )}
                      >
                        <img src={bg.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent" />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-black/60 p-4 rounded-3xl border border-zinc-800 space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Espessura da Borda</label>
                      <input type="range" min="0" max="60" step="1" value={borderWidth} onChange={e => setBorderWidth(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Cor da Borda</label>
                      <div className="flex gap-2">
                        {['#eab308', '#ffffff', '#ff0000', '#000000', '#1a1a1a', '#22c55e', '#3b82f6'].map(c => (
                          <button
                            key={c}
                            onClick={() => setBorderColor(c)}
                            className={cn(
                              "w-6 h-6 rounded-full border border-white/20",
                              borderColor === c ? "ring-2 ring-white" : ""
                            )}
                            style={{ backgroundColor: c }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="bg-black/60 p-4 rounded-3xl border border-zinc-800 space-y-4">
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Tamanho Título Principal</label>
                      <input type="range" min="30" max="120" step="1" value={mainHeadlineSize} onChange={e => setMainHeadlineSize(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                    </div>
                    <div>
                      <label className="text-[9px] font-bold text-zinc-500 uppercase block mb-1">Tamanho Mensagem</label>
                      <input type="range" min="10" max="80" step="1" value={customTextSize} onChange={e => setCustomTextSize(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                    </div>
                  </div>

                  <div className="bg-black/60 p-4 rounded-3xl border border-zinc-800 space-y-4">
                     <div>
                        <div className="flex justify-between mb-1">
                          <label className="text-[9px] font-bold text-zinc-500 uppercase">Posição de Conteúdo (Vertical)</label>
                        </div>
                        <input 
                          type="range" min="-300" max="300" step="1"
                          className="w-full accent-theme-primary"
                          value={layoutPos.y}
                          onChange={e => setLayoutPos({y: parseInt(e.target.value)})}
                        />
                     </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <button onClick={handleDownload} disabled={isExporting} className="w-full py-4 bg-theme-primary text-black font-black uppercase tracking-tighter rounded-[1.5rem] flex items-center justify-center gap-2 hover:opacity-90 transition-all shadow-xl shadow-theme-primary/20 disabled:opacity-50">
            {isExporting ? <div className="animate-spin rounded-full h-5 w-5 border-2 border-black/20 border-t-black"></div> : <Download size={20} />}
            {isExporting ? 'Processando Imagem...' : 'BAIXAR PARA INSTAGRAM'}
          </button>

          <input type="file" ref={sponsorLogoRef} onChange={e => handleImageUpload(e, 'sponsor')} accept="image/*" className="hidden" />
          <input type="file" ref={schoolCrestRef} onChange={e => handleImageUpload(e, 'school')} accept="image/*" className="hidden" />
        </div>

        {/* Right: Instagram Story Preview (1080x1920 logical scale) */}
        <div className="flex flex-col items-center">
          <div 
            ref={flyerRef}
            className="relative overflow-hidden bg-black flex flex-col select-none ring-1 ring-white/10 shadow-[0_32px_64px_rgba(0,0,0,0.8)]"
            style={{ 
              width: '1080px', 
              height: '1920px', 
              transform: 'scale(0.333)', 
              transformOrigin: 'top center', 
              marginBottom: '-1280px',
              border: `${borderWidth}px solid ${borderColor}`
            }}
          >
            {/* 1. Backgrounds & Textures */}
            <div className="absolute inset-0 z-0">
               <img src={bgUrl} className="w-full h-full object-cover scale-110 blur-[2px]" crossOrigin="anonymous" />
               <div className="absolute inset-0 bg-black/60" />
               <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-black/80" />
               <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20" />
            </div>

            {/* 2. Content Layer (Positionable) */}
            <div 
              className="relative z-10 flex-1 flex flex-col items-center justify-center p-20 text-center transition-transform"
              style={{ transform: `translateY(${layoutPos.y}px)` }}
            >
              
              {/* Top: School Identity */}
              <div 
                className="mb-12 transition-transform"
                style={{ transform: `scale(${schoolPos.scale}) translate(${schoolPos.x}px, ${schoolPos.y}px)` }}
              >
                <div className="w-64 h-64 mx-auto p-4 flex items-center justify-center relative">
                  {schoolCrest ? (
                    <img src={schoolCrest} className="w-full h-full object-contain relative z-10" crossOrigin="anonymous" />
                  ) : (
                    <Trophy size={112} className="text-theme-primary relative z-10" />
                  )}
                </div>
              </div>

              {/* Central Text Block */}
              <div className="space-y-16 w-full max-w-4xl mx-auto">
                <div className="space-y-8">
                   <div className="inline-flex items-center gap-4 px-6 py-2 bg-theme-primary/10 border border-theme-primary/30 rounded-full">
                      <div className="w-2 h-2 rounded-full bg-theme-primary animate-ping" />
                      <span className="text-theme-primary text-xl font-black uppercase tracking-[0.5em]">Parceria de Elite</span>
                   </div>
                   
                   <div className="relative">
                     <h2 
                       className="font-black text-white uppercase tracking-tighter leading-[0.9] italic drop-shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                       style={{ fontSize: `${mainHeadlineSize}px` }}
                     >
                        A EQUIPE <span className="text-theme-primary">{settings.schoolName?.toUpperCase() || 'PIRUÁ ESPORTE CLUBE'}</span> TEM O PATROCÍNIO DE
                     </h2>
                   </div>
                </div>

                {/* Big Sponsor Badge */}
                <div 
                  className="transition-transform"
                  style={{ transform: `scale(${sponsorPos.scale}) translate(${sponsorPos.x}px, ${sponsorPos.y}px)` }}
                >
                  <div className="w-full aspect-video max-w-md mx-auto bg-white rounded-[4rem] p-16 shadow-[0_40px_100px_rgba(0,0,0,0.5)] flex items-center justify-center relative overflow-hidden group border-[12px] border-theme-primary">
                     <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-zinc-100" />
                     {sponsorLogo ? (
                       <img src={sponsorLogo} className="w-full h-full object-contain relative z-10 scale-110" crossOrigin="anonymous" />
                     ) : (
                       <div className="text-zinc-200 font-black text-7xl uppercase italic relative z-10 select-none">{sponsor.name}</div>
                     )}
                  </div>
                </div>
              </div>

              {/* Custom Message Card */}
              {customText && (
                <div className="mt-24 w-full max-w-2xl mx-auto">
                   <div className="bg-black/60 backdrop-blur-3xl p-10 rounded-[3rem] border-2 border-white/10 shadow-2xl transform -skew-x-6">
                      <p 
                        className="text-white font-black uppercase tracking-tight italic opacity-95 leading-relaxed transform skew-x-6"
                        style={{ fontSize: `${customTextSize}px` }}
                      >
                         "{customText}"
                      </p>
                   </div>
                </div>
              )}
            </div>

            {/* Footer Branding */}
            <div className="absolute bottom-20 inset-x-0 flex flex-col items-center">
               <div className="w-24 h-1 bg-theme-primary/50 rounded-full mb-6" />
               <p className="text-theme-primary text-xl font-black uppercase tracking-[0.5em] mb-4">JUNTOS SOMOS MAIS FORTES</p>
               <p className="text-zinc-500 text-sm font-bold uppercase tracking-widest opacity-40 italic">{settings.schoolName} — TEMPORADA 2026</p>
            </div>

            {/* Aesthetic Polish */}
            <div className="absolute inset-x-0 top-0 h-4 bg-theme-primary" />
            <div className="absolute inset-x-0 bottom-0 h-4 bg-theme-primary" />
            <div className="absolute inset-0 z-[5] bg-[url('https://www.transparenttextures.com/patterns/halftone-yellow.png')] opacity-[0.03] pointer-events-none" />
          </div>
          
          <p className="mt-4 text-[10px] font-black text-zinc-600 uppercase tracking-widest">Ajuste os sliders para enquadrar as marcas perfeitamente</p>
        </div>
      </div>
    </div>
  );
}
