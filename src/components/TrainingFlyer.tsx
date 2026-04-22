import React, { useRef, useState, useEffect } from 'react';
import { Training, Athlete } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trophy, Download, User, X, Camera, Search, UserCheck, Instagram, MapPin, Activity, Clock, Calendar, FileText } from 'lucide-react';
import html2canvas from 'html2canvas';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface TrainingFlyerProps {
  date: string;
  trainings: Training[];
  athletes: Athlete[];
  onClose: () => void;
}

export default function TrainingFlyer({ date, trainings, athletes, onClose }: TrainingFlyerProps) {
  const flyerRef = useRef<HTMLDivElement>(null);
  const { settings } = useTheme();
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>(['stadium']);
  const [customBackgrounds, setCustomBackgrounds] = useState<{ [key: string]: string }>({});
  const [carbonColor, setCarbonColor] = useState<string>('#1a1a1a');

  const toggleBackground = (id: string) => {
    setSelectedBackgrounds(prev => {
      // Carbon is exclusive if we want but user said "combine"
      if (prev.includes(id)) {
        if (prev.length === 1) return prev; // Keep at least one
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
        setCustomImage(event.target?.result as string);
        setSelectedAthlete(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const activeId = selectedBackgrounds[selectedBackgrounds.length - 1] || 'stadium';
        setCustomBackgrounds(prev => ({
          ...prev,
          [activeId]: event.target?.result as string
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
    const loadingToast = toast.loading('Gerando seu encarte de alto impacto... Isso pode levar alguns segundos.');
    
    // helper to ensure all images in an element are loaded and converted to avoids CORS taint
    const processImages = async (el: HTMLElement) => {
      const imgs = Array.from(el.querySelectorAll('img'));
      const promises = imgs.map(async (img) => {
        try {
          if (img.src && !img.src.startsWith('data:') && !img.src.includes('blob:')) {
            // Attempt to proxy internal/external images to base64 to avoid canvas tainting
            const response = await fetch(img.src, { mode: 'cors' }).catch(() => null);
            if (response && response.ok) {
              const blob = await response.blob();
              await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                  img.src = reader.result as string;
                  resolve(null);
                };
                reader.readAsDataURL(blob);
              });
            }
          }
        } catch (e) {
          console.warn(`Failed specifically processing image: ${img.src}`, e);
        }
        
        if (img.complete && img.naturalHeight !== 0) return Promise.resolve();
        return new Promise((resolve) => {
          const timeout = setTimeout(() => resolve(null), 8000);
          img.onload = () => { clearTimeout(timeout); resolve(null); };
          img.onerror = () => { clearTimeout(timeout); resolve(null); };
          
          // Re-trigger load if necessary and ensure crossOrigin
          const currentSrc = img.src;
          img.src = "";
          img.setAttribute('crossOrigin', 'anonymous');
          img.src = currentSrc;
        });
      });
      await Promise.all(promises);
    };

    try {
      // Ensure all images are loaded and fonts are ready
      await Promise.all([
        document.fonts.ready,
        processImages(flyerRef.current)
      ]);
      
      // Reveal delay to allow rendering to settle
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const canvas = await html2canvas(flyerRef.current, {
        useCORS: true,
        allowTaint: true, // Allow tainted canvas since we try to avoid it anyway with base64
        scale: 3, // High quality for social media sharing
        backgroundColor: '#000000',
        logging: false,
        width: 360,
        height: 640,
        onclone: (clonedDoc) => {
          const flyer = clonedDoc.querySelector('[data-flyer-container]') as HTMLElement;
          if (flyer) {
            // Context settings for capture
            flyer.style.transform = 'none';
            flyer.style.position = 'fixed';
            flyer.style.top = '0';
            flyer.style.left = '0';
            flyer.style.margin = '0';
            flyer.style.padding = '0';
            flyer.style.width = '360px';
            flyer.style.height = '640px';
            flyer.style.borderRadius = '0';
            
            // html2canvas doesn't support backdrop-blur or modern color spaces well
            const allElements = flyer.querySelectorAll('*');
            allElements.forEach((el) => {
              const htmlEl = el as HTMLElement;
              const className = typeof htmlEl.className === 'string' 
                ? htmlEl.className 
                : (htmlEl.className as any)?.baseVal || '';
              const style = htmlEl.style as any;
              
              // Strip modern CSS filters and blend modes that break html2canvas
              style.backdropFilter = 'none';
              style.webkitBackdropFilter = 'none';
              style.filter = 'none';
              style.mixBlendMode = 'normal';
              style.transition = 'none';
              style.animation = 'none';

              const primary = settings.primaryColor || '#EAB308';
              const isActiveCarbon = selectedBackgrounds.includes('carbon');

              // Detect and fix problematic background images
              const computedStyle = window.getComputedStyle(htmlEl);
              const bgImg = computedStyle.backgroundImage;
              if (bgImg && bgImg !== 'none') {
                if (bgImg.includes('gradient') || bgImg.includes('transparenttextures.com')) {
                  style.backgroundImage = 'none';
                  // Fallback for carbon if it's the pattern layer
                  if (className.includes('bg-[url(')) {
                    style.backgroundColor = 'rgba(0,0,0,0.1)';
                  }
                }
              }

              // Force carbon color if visible
              if (isActiveCarbon && (className.includes('z-[2]') || htmlEl.getAttribute('data-bg-layer') === 'carbon')) {
                 style.backgroundColor = carbonColor;
                 style.opacity = '1';
                 style.backgroundImage = 'none';
              }
              
              if (className.includes('bg-theme-primary')) {
                style.backgroundColor = primary;
              }
              if (className.includes('text-theme-primary')) {
                style.color = primary;
              }
              if (className.includes('border-theme-primary')) {
                style.borderColor = primary;
              }

              if (className.includes('bg-black/40')) {
                style.backgroundColor = 'rgba(0,0,0,0.4)';
              } else if (className.includes('bg-black/60')) {
                style.backgroundColor = 'rgba(0,0,0,0.6)';
              }
            });

            // Remove any internal scrolling during capture
            const scrollable = flyer.querySelector('.flyer-scrollable') as HTMLElement;
            if (scrollable) {
              scrollable.style.overflow = 'visible';
              scrollable.style.height = 'auto';
              scrollable.style.maxHeight = 'none';
            }
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const link = document.createElement('a');
      link.download = `AGENDA_TREINO_${date}.png`;
      link.href = imgData;
      link.click();
      
      toast.dismiss(loadingToast);
      toast.success('Encarte baixado com sucesso!');
    } catch (error) {
      console.error('Error generating flyer:', error);
      toast.dismiss(loadingToast);
      toast.error('Ocorreu um erro ao gerar a imagem. Tente usar uma foto diferente ou recarregar a página.');
    } finally {
      setIsExporting(false);
    }
  };

  const formattedDate = format(new Date(date + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR });
  const dayOfWeek = format(new Date(date + 'T12:00:00'), "EEEE", { locale: ptBR });

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

          {/* Background Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-sans">Estilo de Fundo</label>
              <button 
                onClick={() => bgInputRef.current?.click()}
                className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1 rounded-lg hover:bg-theme-primary/10 transition-all flex items-center gap-1.5"
              >
                <Camera size={12} />
                Mudar Fundo
              </button>
              <input 
                type="file" 
                ref={bgInputRef} 
                onChange={handleBgUpload} 
                accept="image/*" 
                className="hidden" 
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'carbon', label: 'Carbono', icon: Trophy },
                { id: 'stadium', label: 'Estádio', icon: MapPin },
                { id: 'grass', label: 'Campo', icon: Activity }
              ].map(bg => {
                const isActive = selectedBackgrounds.includes(bg.id);
                return (
                  <button
                    key={bg.id}
                    onClick={() => toggleBackground(bg.id)}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                      isActive 
                        ? "bg-theme-primary border-theme-primary text-black" 
                        : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"
                    )}
                  >
                     <bg.icon size={18} />
                     <span className="text-[10px] font-black uppercase tracking-widest">{bg.label}</span>
                  </button>
                );
              })}
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

          {/* Image Upload / Athlete Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Imagem de Destaque</label>
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

            {customImage && (
              <div className="relative group">
                <img src={customImage} className="w-full h-32 object-cover rounded-2xl border-2 border-theme-primary" />
                <button 
                  onClick={() => setCustomImage(null)}
                  className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X size={14} />
                </button>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                   <p className="text-[10px] font-black text-theme-primary bg-black/80 px-2 py-1 rounded uppercase tracking-widest">Foto Customizada</p>
                </div>
              </div>
            )}

            {!customImage && (
              <>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input 
                    type="text"
                    placeholder="Pesquisar atleta por nome..."
                    className="w-full pl-10 pr-4 py-3 bg-black border border-zinc-700 rounded-xl text-white outline-none focus:ring-2 focus:ring-theme-primary/50 text-sm font-sans"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredAthletes.map(athlete => (
                    <button
                      key={athlete.id}
                      onClick={() => {
                        setSelectedAthlete(athlete);
                        setCustomImage(null);
                      }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                        selectedAthlete?.id === athlete.id 
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
                        <p className={cn("text-[10px] font-bold uppercase opacity-60", selectedAthlete?.id === athlete.id ? "text-black" : "text-zinc-500")}>
                          {athlete.birth_date ? format(new Date(athlete.birth_date), 'yyyy') : '---'}
                        </p>
                      </div>
                      {selectedAthlete?.id === athlete.id && <UserCheck size={18} />}
                    </button>
                  ))}
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
        <div className="flex flex-col items-center gap-4">
          <p className="text-xs font-black text-zinc-500 uppercase tracking-widest lg:hidden">Visualização</p>
          <div className="relative shadow-[0_0_100px_rgba(0,0,0,0.5)] rounded-2xl overflow-hidden">
            {/* The actual Flyer target */}
            <div 
              ref={flyerRef}
              data-flyer-container="true"
              style={{ width: '360px', height: '640px' }} // Instagram Story 9:16
              className="bg-black relative overflow-hidden flex flex-col font-sans select-none border-[8px] border-theme-primary/80 shadow-[inset_0_0_40px_rgba(0,0,0,0.8)]"
            >
              {/* Layered Background System */}
              <div className="absolute inset-x-0 inset-y-0 pointer-events-none">
                {/* Backgrounds now start after the border */}
                <div className="absolute inset-0">
                  {/* Layer 1: Stadium */}
                  {selectedBackgrounds.includes('stadium') && (
                    <div className="absolute inset-0 z-0">
                      <img 
                        src={customBackgrounds['stadium'] || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200"} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                      />
                      <div className="absolute inset-0 bg-black/40" />
                    </div>
                  )}

                  {/* Layer 2: Grass */}
                  {selectedBackgrounds.includes('grass') && (
                    <div className={cn(
                      "absolute inset-0 z-[1]",
                      selectedBackgrounds.includes('stadium') ? "mix-blend-overlay opacity-80" : "opacity-100"
                    )}>
                      <img 
                        src={customBackgrounds['grass'] || "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&q=80&w=1200"} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous"
                      />
                      {!selectedBackgrounds.includes('stadium') && <div className="absolute inset-0 bg-black/40" />}
                    </div>
                  )}

                  {/* Layer 3: Carbon */}
                  {selectedBackgrounds.includes('carbon') && (
                    <div 
                      data-bg-layer="carbon"
                      className={cn(
                      "absolute inset-0 z-[2]",
                      (selectedBackgrounds.includes('stadium') || selectedBackgrounds.includes('grass')) ? "mix-blend-multiply opacity-80" : "opacity-100"
                    )}
                    style={{ 
                      backgroundColor: carbonColor
                    }}
                    >
                      {!customBackgrounds['carbon'] && (
                        <div 
                          className="absolute inset-0 opacity-40"
                          style={{ backgroundImage: `radial-gradient(circle at center, ${carbonColor} 0%, #000000 100%)` }}
                        />
                      )}
                      {customBackgrounds['carbon'] && (
                        <img 
                          src={customBackgrounds['carbon']} 
                          className="w-full h-full object-cover" 
                          referrerPolicy="no-referrer" 
                          crossOrigin="anonymous"
                        />
                      )}
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-60 mix-blend-overlay" />
                      {/* Scanline Effect for Personalization */}
                      <div className="absolute inset-x-0 h-[3px] bg-theme-primary/30 top-1/4 animate-scan-slow blur-[2px]" />
                      <div className="absolute inset-x-0 h-[2px] bg-theme-primary/20 top-2/3 animate-scan-slow-delayed blur-[1px]" />
                      
                      {/* Tech Grid Overlay for Carbon personalization */}
                      <div className="absolute inset-0 z-[1] bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-80 mix-blend-overlay" />
                      <div className="absolute inset-0 z-[2] opacity-20 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_100%)]" />
                      
                      {!selectedBackgrounds.includes('stadium') && !selectedBackgrounds.includes('grass') && <div className="absolute inset-0 bg-black/40" />}
                    </div>
                  )}

                  {/* Global Gradients */}
                  <div className="absolute inset-0 z-[3] bg-gradient-to-t from-black via-black/30 to-black/70" />
                  <div className="absolute inset-x-0 bottom-0 z-[4] h-64 bg-gradient-to-t from-black to-transparent" />
                </div>
              </div>

              {/* Elements */}
              <div className="absolute inset-0 z-[5] bg-[url('https://www.transparenttextures.com/patterns/halftone-yellow.png')] opacity-[0.05]" />
              
              {/* Header Info */}
              <div className="relative z-20 pt-6 px-6 flex flex-col items-center">
                <div className="w-16 h-16 mb-2 filter drop-shadow-[0_0_20px_rgba(255,255,0,0.4)] transform hover:scale-110 transition-transform duration-700">
                  {settings?.schoolCrest ? (
                    <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                  ) : (
                    <Trophy size={48} className="text-theme-primary" />
                  )}
                </div>
                <div className="relative">
                  <h1 className="text-2xl font-black text-white italic tracking-tighter uppercase leading-none text-center drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
                    {settings.schoolName || 'Piruá Esporte Clube'}
                  </h1>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-theme-primary rounded-full shadow-[0_0_10px_rgba(255,255,0,0.5)]"></div>
                </div>
                <p className="mt-2 text-theme-primary text-[10px] font-black uppercase tracking-[0.4em] italic opacity-80" />
              </div>

              {/* Date Section - Minimal Glass Style */}
              <div className="relative z-20 mt-2 px-6">
                <div className="flex items-center justify-center">
                  <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-3 shadow-xl ring-1 ring-white/5">
                    <div className="bg-theme-primary p-1.5 rounded-full">
                      <Calendar size={12} className="text-black" />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col leading-none">
                        <span className="text-[7px] font-black text-theme-primary uppercase tracking-widest leading-none mb-0.5">
                          {dayOfWeek.split('-')[0]}
                        </span>
                        <span className="text-[14px] font-black text-white leading-none tracking-tight">
                          {formattedDate.split(' de ')[0]}
                        </span>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="flex flex-col leading-none">
                        <span className="text-[9px] font-black text-zinc-300 uppercase tracking-tight">
                          {formattedDate.split(' de ').slice(1).join(' ')}
                        </span>
                        <span className="text-[6px] font-black text-theme-primary uppercase tracking-[0.2em] italic">
                          Agenda
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Trainings List */}
              <div className="relative z-20 flex-1 px-6 py-4 flex flex-col min-h-0">
                <div className="flyer-scrollable space-y-3 custom-scrollbar pr-1 flex-1">
                  {trainings.map((t, idx) => (
                    <div key={idx} className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                      <div className="bg-gradient-to-r from-white/10 to-transparent px-3 py-1.5 flex items-center justify-between border-b border-white/10">
                        <div className="flex items-center gap-2">
                          <div className="w-1 h-3 bg-theme-primary rounded-full"></div>
                          <h3 className="text-[12px] font-black text-white uppercase italic tracking-widest">
                            {t.modality}
                          </h3>
                        </div>
                        <div className="flex items-center gap-1 text-zinc-400">
                          <MapPin size={9} className="text-theme-primary" />
                          <span className="text-[8px] font-bold uppercase truncate max-w-[80px]">{t.location}</span>
                        </div>
                      </div>
                      <div className="p-2 space-y-2">
                        {t.schedules?.map((s, si) => (
                          <div key={si} className="bg-zinc-900/80 rounded-lg p-2 border border-white/5 space-y-1.5 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-theme-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative flex items-center justify-between">
                              <div className="flex items-center gap-1.5 px-1.5 py-0.5 bg-black/60 rounded border border-theme-primary/20">
                                <Clock size={9} className="text-theme-primary" />
                                <span className="text-theme-primary font-mono text-[10px] font-black tracking-tighter">{s.start_time} — {s.end_time}</span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {s.categories.map((c, ci) => (
                                  <span key={ci} className="text-[7px] bg-theme-primary text-black px-1.5 py-0.5 rounded font-black uppercase italic shadow-sm">
                                    {c}
                                  </span>
                                ))}
                              </div>
                            </div>
                            {s.notes && (
                              <div className="relative flex items-start gap-1.5 pt-1 border-t border-white/5">
                                <FileText size={9} className="text-theme-primary mt-0.5 flex-shrink-0" />
                                <p className="text-zinc-400 text-[8px] font-bold uppercase italic leading-tight">
                                  {s.notes}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-20 px-6 pb-6 text-center">
                <div className="py-2 border-y border-theme-primary/10 mb-2">
                  <p className="text-theme-primary text-[9px] font-black uppercase italic tracking-[0.2em] drop-shadow-md">
                    Foco, Disciplina e Raça! O sucesso começa no treino.
                  </p>
                </div>
                <p className="text-zinc-500 text-[7px] font-bold uppercase tracking-widest opacity-40">
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
