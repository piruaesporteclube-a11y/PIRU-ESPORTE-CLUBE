import React, { useRef, useState } from 'react';
import { Event, Athlete } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trophy, Download, User, X, Camera, Search, UserCheck, MapPin, Activity, Clock, Calendar, FileText, Instagram } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
import { cn, fixHtml2CanvasColors } from '../utils';

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
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>(['stadium']);
  const [customBackgrounds, setCustomBackgrounds] = useState<{ [key: string]: string }>({});
  const [carbonColor, setCarbonColor] = useState<string>('#1a1a1a');
  const [flyerTitle, setFlyerTitle] = useState('Grande Evento');
  const [showVS, setShowVS] = useState(true);

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
    const loadingToast = toast.loading('Gerando seu encarte de evento...');
    
    try {
      const toBase64 = async (url: string): Promise<string> => {
        if (!url || url.startsWith('data:')) return url;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000);
          const response = await fetch(url, { mode: 'cors', signal: controller.signal, credentials: 'omit' });
          clearTimeout(timeoutId);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(url);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          console.warn('Fetch failed, falling back to canvas/proxy method', e);
          return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
              try {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                if (!ctx) { resolve(url); return; }
                ctx.drawImage(img, 0, 0);
                resolve(canvas.toDataURL('image/png', 1.0));
              } catch (err) { resolve(url); }
            };
            img.onerror = () => resolve(url);
            const proxyUrl = url.includes('?') ? `${url}&nc=${Date.now()}` : `${url}?nc=${Date.now()}`;
            img.src = proxyUrl;
            setTimeout(() => resolve(url), 8000);
          });
        }
      };

      const element = flyerRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      Object.assign(clone.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '360px',
        height: '640px',
        zIndex: '-9999',
        opacity: '1',
      });
      document.body.appendChild(clone);

      // Apply color fixes for oklch support
      fixHtml2CanvasColors(clone);

      const cloneImages = Array.from(clone.querySelectorAll('img'));
      await Promise.all(cloneImages.map(async (img) => {
        const currentSrc = img.getAttribute('src');
        if (currentSrc) {
          const b64 = await toBase64(currentSrc);
          img.setAttribute('src', b64);
        }
      }));

      const cloneBgElements = Array.from(clone.querySelectorAll('*')).filter(el => (el as HTMLElement).style.backgroundImage);
      await Promise.all(cloneBgElements.map(async (el) => {
        const bg = (el as HTMLElement).style.backgroundImage;
        const match = bg.match(/url\(['"]?(.*?)['"]?\)/);
        if (match && match[1]) {
          const b64 = await toBase64(match[1]);
          (el as HTMLElement).style.backgroundImage = `url("${b64}")`;
        }
      }));

      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 1000));

      const dataUrl = await htmlToImage.toPng(clone, {
        width: 360,
        height: 640,
        pixelRatio: 2,
        backgroundColor: '#000000',
      });

      document.body.removeChild(clone);
      toast.dismiss(loadingToast);
      
      const link = document.createElement('a');
      link.download = `EVENTO_${event.name.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Encarte baixado com sucesso!');
    } catch (error) {
      console.error('Error generating flyer:', error);
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block">Estilo de Fundo</label>
              <button 
                onClick={() => bgInputRef.current?.click()}
                className="text-[10px] font-black text-theme-primary uppercase border border-theme-primary/30 px-3 py-1 rounded-lg hover:bg-theme-primary/10 transition-all flex items-center gap-1.5"
              >
                <Camera size={12} />
                Mudar Fundo
              </button>
              <input type="file" ref={bgInputRef} onChange={handleBgUpload} accept="image/*" className="hidden" />
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
                      isActive ? "bg-theme-primary border-theme-primary text-black" : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"
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
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-40" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Title Customization */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest block font-sans">Título do Encarte</label>
            <input 
              type="text"
              value={flyerTitle}
              onChange={e => setFlyerTitle(e.target.value)}
              className="w-full bg-black border border-zinc-700 p-3 rounded-xl text-white text-sm focus:ring-2 focus:ring-theme-primary/50 outline-none"
              placeholder="Ex: Grande Evento, Final de Campeonato..."
            />
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
        <div className="flex flex-col items-center gap-4">
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
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-60 mix-blend-overlay" />
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
              <div className="w-12 h-12 mb-3">
                {settings?.schoolCrest ? <img src={settings.schoolCrest} className="w-full h-full object-contain" crossOrigin="anonymous" /> : <Trophy size={40} className="text-theme-primary" />}
              </div>
              <h1 className="text-xl font-black text-white italic tracking-tighter uppercase leading-none text-center drop-shadow-lg mb-1">
                {settings.schoolName || 'Piruá Esporte Clube'}
              </h1>
              <div className="w-10 h-0.5 bg-theme-primary rounded-full mb-6 opacity-80"></div>

              {/* Event Title Card */}
              <div className="w-full bg-theme-primary p-2 rounded-xl transform -skew-x-6 shadow-2xl mb-4">
                <div className="transform skew-x-6 text-center">
                  <p className="text-[9px] font-black text-black uppercase tracking-widest leading-none mb-1 opacity-60">{flyerTitle}</p>
                  <h2 className="text-base font-black text-black uppercase tracking-tighter leading-tight px-2">{event.name}</h2>
                </div>
              </div>

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
                <p className="text-[10px] font-bold text-white uppercase tracking-tight">{event.street}, {event.number}</p>
                <p className="text-[8px] text-zinc-400 font-bold uppercase tracking-widest">{event.neighborhood} • {event.city}/{event.uf}</p>
              </div>

              <div className="w-full border-t border-theme-primary/20 pt-4 text-center">
                <p className="text-theme-primary text-[10px] font-black uppercase italic tracking-[0.3em] mb-1">Contamos com a sua torcida!</p>
                <p className="text-zinc-500 text-[8px] font-bold uppercase tracking-[0.2em]">{settings.schoolName} • 2026</p>
              </div>
            </div>
            <div className="absolute inset-0 z-[-1] bg-[url('https://www.transparenttextures.com/patterns/halftone-yellow.png')] opacity-[0.05]" />
          </div>
        </div>
      </div>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 10px; }`}</style>
    </div>
  );
}
