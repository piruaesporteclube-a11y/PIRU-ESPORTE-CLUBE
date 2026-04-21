import React, { useRef, useState, useEffect } from 'react';
import { Training, Athlete } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Trophy, Download, User, X, Camera, Search, UserCheck, Instagram, MapPin, Activity } from 'lucide-react';
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
  const [backgroundType, setBackgroundType] = useState<'carbon' | 'stadium' | 'grass'>('stadium');
  const [customBackgrounds, setCustomBackgrounds] = useState<{ [key: string]: string }>({});

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
        setCustomBackgrounds(prev => ({
          ...prev,
          [backgroundType]: event.target?.result as string
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
    
    // Ensure all images are loaded and fonts are ready
    await document.fonts.ready;
    
    // Small delay to ensure any potential layout shifts or animations finish
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const canvas = await html2canvas(flyerRef.current, {
        useCORS: true,
        allowTaint: true,
        scale: 4, // Very high quality for professional look
        backgroundColor: '#000000',
        logging: false,
        width: 360,
        height: 640,
        scrollX: 0,
        scrollY: -window.scrollY, // Fix for scrolled pages
        onclone: (clonedDoc) => {
          // You can perform last-minute adjustments to the cloned DOM here if needed
          const flyer = clonedDoc.querySelector('[data-flyer-container]');
          if (flyer) {
            (flyer as HTMLElement).style.transform = 'none';
          }
        }
      });
      
      const link = document.createElement('a');
      link.download = `agenda-treino-${date}.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
    } catch (error) {
      console.error('Error generating flyer:', error);
      alert('Houve um erro ao gerar a imagem. Verifique se todas as fotos carregaram corretamente.');
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
              ].map(bg => (
                <button
                  key={bg.id}
                  onClick={() => setBackgroundType(bg.id as any)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all",
                    backgroundType === bg.id 
                      ? "bg-theme-primary border-theme-primary text-black" 
                      : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  )}
                >
                   <bg.icon size={18} />
                   <span className="text-[10px] font-black uppercase tracking-widest">{bg.label}</span>
                </button>
              ))}
            </div>
          </div>

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
                          <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
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
              className="bg-black relative overflow-hidden flex flex-col font-sans"
            >
              {/* Background Layers */}
              {backgroundType === 'carbon' ? (
                <>
                  <div className="absolute inset-0 scale-110">
                    <img src={customBackgrounds['carbon'] || "https://images.unsplash.com/photo-1541252260730-0412e3e2107e?auto=format&fit=crop&q=80&w=1200"} className="w-full h-full object-cover opacity-40 grayscale" referrerPolicy="no-referrer" />
                  </div>
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30 mix-blend-overlay" />
                  <div className="absolute inset-0 bg-gradient-to-br from-zinc-900/80 via-black/90 to-zinc-900/80" />
                </>
              ) : backgroundType === 'stadium' ? (
                <>
                  <div className="absolute inset-0 scale-105">
                    <img src={customBackgrounds['stadium'] || "https://images.unsplash.com/photo-1574629810360-7efbbe195018?auto=format&fit=crop&q=80&w=1200"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-black/60" />
                </>
              ) : (
                <>
                  <div className="absolute inset-0 scale-105">
                    <img src={customBackgrounds['grass'] || "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&q=80&w=1200"} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-black/70" />
                </>
              )}

              {/* Halftone & Dynamic Elements */}
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/halftone-yellow.png')] opacity-[0.03] pointer-events-none" />
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-theme-primary/5 rounded-full blur-[120px] -mr-40 -mt-40" />
              <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-theme-primary/5 rounded-full blur-[100px] -ml-20 -mb-20" />

              {/* Matchday Diagonal Text Background */}
              <div className="absolute inset-0 flex items-center justify-center opacity-[0.05] pointer-events-none rotate-[-12deg]">
                <h1 className="text-[150px] font-black text-white uppercase tracking-tighter leading-none whitespace-nowrap">MATCHDAY</h1>
              </div>

              {/* Header Design */}
              <div className="absolute top-0 left-0 right-0 h-60 bg-gradient-to-b from-theme-primary/20 to-transparent" />
              <div className="p-8 pb-0 pt-8 flex flex-col items-center justify-center relative z-10 text-center">
                <div className="w-20 h-20 flex items-center justify-center mb-4 transform hover:scale-110 transition-transform duration-500">
                  {settings?.schoolCrest ? (
                    <img src={settings.schoolCrest} className="w-full h-full object-contain filter drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]" referrerPolicy="no-referrer" />
                  ) : (
                    <Trophy size={48} className="text-theme-primary" />
                  )}
                </div>
                <div className="space-y-1">
                  <h1 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none drop-shadow-lg">
                    Piruá <span className="text-theme-primary">Esporte</span> Clube
                  </h1>
                  <div className="flex items-center justify-center gap-3 mt-1">
                    <div className="h-[1px] w-8 bg-theme-primary/40"></div>
                    <p className="text-theme-primary text-[10px] font-black uppercase tracking-[0.4em] italic">Elite Training Center</p>
                    <div className="h-[1px] w-8 bg-theme-primary/40"></div>
                  </div>
                </div>
              </div>

              <div className="px-8 mt-4 relative z-10 flex flex-col items-center">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 p-2.5 rounded-2xl w-full text-center">
                   <p className="text-theme-primary text-[10px] font-black uppercase tracking-widest italic leading-none mb-1">{dayOfWeek}</p>
                   <p className="text-white text-2xl font-black italic tracking-tighter leading-none">{formattedDate}</p>
                </div>
              </div>

              {/* Main Content Area */}
              <div className="flex-1 px-8 py-4 flex flex-col gap-4 relative z-10 min-h-0">
                {/* Dates & Schedules */}
                <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                  <div className="space-y-3 overflow-y-auto custom-scrollbar pr-1">
                    {trainings.map((t, idx) => (
                      <div key={idx} className="relative group bg-black/50 backdrop-blur-sm p-3 rounded-xl border-l-[3px] border-theme-primary">
                        <div className="space-y-2">
                          <h3 className="text-xl font-black text-white uppercase italic tracking-tighter skew-x-[-10deg] flex items-center gap-2">
                             <Activity size={18} className="text-theme-primary" />
                             {t.modality}
                          </h3>
                          <div className="space-y-2">
                            {t.schedules?.slice(0, 5).map((s, si) => (
                              <div key={si} className="flex flex-col gap-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-theme-primary font-mono text-[13px] font-black tracking-tighter leading-none bg-black/60 px-2 py-1 rounded border border-theme-primary/10">{s.start_time} — {s.end_time}</span>
                                  <div className="flex flex-wrap gap-1 justify-end">
                                    {s.categories.map((c, ci) => (
                                      <span key={ci} className="text-black bg-theme-primary/90 px-1.5 py-0.5 rounded text-[8px] font-black uppercase shadow-sm">
                                        {c}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                                {s.notes && (
                                   <p className="text-zinc-400 text-[9px] font-bold uppercase italic leading-tight bg-white/5 py-1 px-2 rounded border-l border-theme-primary/30">
                                     {s.notes}
                                   </p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Featured Person (Athlete or Custom Image) */}
                <div className="w-full flex items-center justify-center gap-4 mt-auto pt-4 border-t border-white/5">
                  <div className="w-[140px] aspect-[1/1] bg-zinc-950 rounded-[2rem] border-2 border-theme-primary overflow-hidden shadow-[0_15px_60px_rgba(0,0,0,0.8)] relative group rotate-[2deg] transform hover:rotate-0 transition-all duration-500">
                    {(customImage || selectedAthlete?.photo) ? (
                      <img 
                        src={customImage || selectedAthlete?.photo} 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-900 bg-zinc-950">
                        <User size={60} strokeWidth={1} />
                      </div>
                    )}
                    
                    {/* Modern Frame Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80" />
                    <div className="absolute bottom-3 left-0 right-0 text-center">
                       <p className="text-[8px] font-black text-theme-primary uppercase tracking-[0.3em] italic">DESTAQUE</p>
                    </div>
                  </div>
                  
                  {(customImage || selectedAthlete) && (
                    <div className="flex-1 text-left transform -rotate-[1deg]">
                      <p className="text-theme-primary text-[8px] font-black uppercase tracking-[0.3em] italic mb-0.5">Destaque Oficial</p>
                      <h4 className="text-white font-black uppercase leading-none text-xl italic tracking-tighter drop-shadow-2xl scale-y-110">
                        {customImage 
                          ? "CONVOCADO" 
                          : `${selectedAthlete?.name.split(' ')[0]} ${selectedAthlete?.name.split(' ').slice(-1)}`}
                      </h4>
                      <div className="h-1 w-12 bg-theme-primary mt-2 rounded-full"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 pb-10 flex flex-col items-center gap-4 relative z-10 bg-gradient-to-t from-black via-black/80 to-transparent">
                <div className="flex items-center gap-4 w-full">
                  <div className="h-[1px] flex-1 bg-gradient-to-r from-transparent to-theme-primary/30"></div>
                  <div className="flex items-center gap-2 px-6 py-2 bg-theme-primary/10 rounded-full border border-theme-primary/20">
                    <Instagram size={18} className="text-theme-primary" />
                    <p className="text-white text-[12px] font-black uppercase tracking-[0.2em] italic">@{settings.instagram || 'piruaec'}</p>
                  </div>
                  <div className="h-[1px] flex-1 bg-gradient-to-l from-transparent to-theme-primary/30"></div>
                </div>
                <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.4em] opacity-40 italic">#PiruáEsporteClube • #FocoNoTreino</p>
              </div>

              {/* Decorative Football Corner */}
              <div className="absolute -bottom-20 -left-20 w-60 h-60 border-[30px] border-theme-primary/5 rounded-full pointer-events-none" />
              <div className="absolute top-1/2 -right-10 w-20 h-80 bg-theme-primary/5 blur-[80px] pointer-events-none" />
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
