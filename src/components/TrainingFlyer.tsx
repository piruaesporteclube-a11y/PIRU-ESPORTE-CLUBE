import React, { useRef, useState, useEffect } from 'react';
import { Training, Athlete } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { Trophy, Download, User, X, Camera, Search, UserCheck, Instagram, MapPin, Activity, Clock, Calendar, FileText } from 'lucide-react';
import * as htmlToImage from 'html-to-image';
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
  const [activeSlot, setActiveSlot] = useState<1 | 2>(1);
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(null);
  const [selectedAthlete2, setSelectedAthlete2] = useState<Athlete | null>(null);
  const [customImage, setCustomImage] = useState<string | null>(null);
  const [customImage2, setCustomImage2] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [search, setSearch] = useState('');

  // Positioning State
  const [pos1, setPos1] = useState({ scale: 1, x: 0, y: 0 });
  const [pos2, setPos2] = useState({ scale: 1, x: 0, y: 0 });
  const [infoPos, setInfoPos] = useState({ y: 0 });
  const [photoPos, setPhotoPos] = useState({ y: 0 });
  const [showVS, setShowVS] = useState(false);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>(['stadium']);
  const [customBackgrounds, setCustomBackgrounds] = useState<{ [key: string]: string }>({});
  const [carbonColor, setCarbonColor] = useState<string>('#1a1a1a');
  const [playerMode, setPlayerMode] = useState<'foreground' | 'background'>('foreground');
  const [playerOpacity, setPlayerOpacity] = useState(0.4);

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
    const loadingToast = toast.loading('Gerando seu encarte... Aguarde um momento.');
    
    try {
      // 1. Ultra-robust Base64 conversion
      const toBase64 = async (url: string): Promise<string> => {
        if (!url || url.startsWith('data:')) return url;
        try {
          // Add cache buster and crossOrigin if possible
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 6000); // Increased timeout
          
          const response = await fetch(url, { 
            mode: 'cors', 
            signal: controller.signal,
            credentials: 'omit'
          });
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
                resolve(canvas.toDataURL('image/png'));
              } catch (err) { 
                console.error('Canvas conversion failed', err);
                resolve(url); 
              }
            };
            img.onerror = () => {
              console.error('Image load failed for toBase64', url);
              resolve(url);
            };
            // Try with a different proxy or cache buster
            const proxyUrl = url.includes('?') ? `${url}&nc=${Date.now()}` : `${url}?nc=${Date.now()}`;
            img.src = proxyUrl;
            setTimeout(() => resolve(url), 8000);
          });
        }
      };

      // 2. Clone and prepare
      const element = flyerRef.current;
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'flyer-clone';
      Object.assign(clone.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        width: '360px',
        height: '640px',
        transform: 'none',
        transition: 'none',
        zIndex: '-9999',
        opacity: '1',
        pointerEvents: 'none',
        borderRadius: '0',
        border: 'none',
        margin: '0',
        padding: '0'
      });
      document.body.appendChild(clone);

      // 3. Clean clone
      const allCloneElements = clone.querySelectorAll('*');
      allCloneElements.forEach((el: any) => {
        if (el.style) {
          el.style.animation = 'none';
          el.style.transition = 'none';
          el.style.backdropFilter = 'none';
          if (el.style.filter && el.style.filter.includes('blur')) {
            el.style.filter = 'none';
          }
        }
      });

      // 4. Convert all images to Base64
      const cloneImages = Array.from(clone.querySelectorAll('img'));
      await Promise.all(cloneImages.map(async (img) => {
        const currentSrc = img.getAttribute('src');
        if (currentSrc) {
          const b64 = await toBase64(currentSrc);
          img.setAttribute('src', b64);
        }
      }));

      // 5. Convert Background Images to Base64
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
        cacheBust: false
      });

      document.body.removeChild(clone);
      toast.dismiss(loadingToast);
      
      const link = document.createElement('a');
      link.download = `AGENDA_TREINO_${date}.png`;
      link.href = dataUrl;
      link.click();
      
      toast.success('Encarte baixado com sucesso!');
    } catch (error) {
      console.error('Error generating flyer:', error);
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
                  <label className="text-[9px] font-bold text-zinc-400 uppercase">Posição Treinos (Vertical)</label>
                </div>
                <input 
                  type="range" min="-300" max="300" step="1"
                  className="w-full accent-theme-primary h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer"
                  value={infoPos.y}
                  onChange={e => setInfoPos({y: parseInt(e.target.value)})}
                />
              </div>
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
              
              {/* Header Info */}
              <div className="relative z-30 pt-6 px-6 flex flex-col items-center">
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
              </div>

              {/* Date Section - Minimal Glass Style */}
              <div className="relative z-30 mt-2 px-6">
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
              <div 
                className="relative z-30 flex-1 px-6 py-4 flex flex-col min-h-0 transition-transform"
                style={{ transform: `translateY(${infoPos.y}px)` }}
              >
                <div className={cn(
                  "flyer-scrollable space-y-3 custom-scrollbar pr-1 flex-1 transition-all duration-700",
                  playerMode === 'background' ? "scale-95 translate-y-4" : "scale-100"
                )}>
                  {trainings.map((t, idx) => (
                    <div key={idx} className={cn(
                      "backdrop-blur-md border border-white/10 rounded-xl overflow-hidden shadow-2xl transition-all duration-700",
                      playerMode === 'background' ? "bg-black/40" : "bg-black/70"
                    )}>
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
                          <div key={si} className={cn(
                            "rounded-lg p-2 border border-white/5 space-y-1.5 relative overflow-hidden transition-all duration-700",
                            playerMode === 'background' ? "bg-zinc-900/40" : "bg-zinc-900/80"
                          )}>
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

              <div className="relative z-30 px-6 pb-6 text-center">
                <div className="py-2 border-y border-theme-primary/10 mb-2">
                  <p className="text-theme-primary text-[9px] font-black uppercase italic tracking-[0.1em] drop-shadow-md">
                    FOCO DISCIPLINA E RAÇA! O SUCESSO COMEÇA, NO TREINO.
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
