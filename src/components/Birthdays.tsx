import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor } from '../types';
import { Cake, Instagram, Share2, Download, UserCircle, Calendar, Printer, Upload, X, Plus } from 'lucide-react';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { cn } from '../utils';
import * as htmlToImage from 'html-to-image';

interface BirthdaysProps {
  athletes?: Athlete[];
}

export default function Birthdays({ athletes: athletesProp }: BirthdaysProps) {
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const { settings } = useTheme();
  const [selectedPerson, setSelectedPerson] = useState<Athlete | Professor | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [bgImage, setBgImage] = useState<string | null>(null);
  const [overlayImages, setOverlayImages] = useState<string[]>([]);

  useEffect(() => {
    if (athletesProp) {
      setAthletes(athletesProp);
    }
    loadData();
  }, [athletesProp]);

  const loadData = async () => {
    const promises: [Promise<Athlete[]> | null, Promise<Professor[]>] = [
      athletesProp ? null : api.getAthletes(),
      api.getProfessors()
    ];
    
    const [a, p] = await Promise.all(promises);
    if (a) setAthletes(a);
    setProfessors(p);
  };

  const isValidDate = (dateStr: string | undefined | null) => {
    if (!dateStr) return false;
    try {
      const d = parseISO(dateStr);
      return !isNaN(d.getTime());
    } catch {
      return false;
    }
  };

  const selectedDate = isValidDate(filterDate) ? parseISO(filterDate) : new Date();
  
  const isBirthday = (dateStr: string, target: Date) => {
    if (!isValidDate(dateStr)) return false;
    const d = parseISO(dateStr);
    return d.getDate() === target.getDate() && d.getMonth() === target.getMonth();
  };

  const isBirthdayMonth = (dateStr: string, target: Date) => {
    if (!isValidDate(dateStr)) return false;
    const d = parseISO(dateStr);
    return d.getMonth() === target.getMonth();
  };

  const todayBirthdays = [...athletes, ...professors].filter(p => {
    const isActive = 'status' in p ? p.status === 'Ativo' : true;
    return isActive && p.birth_date && isValidDate(p.birth_date) && isBirthday(p.birth_date, selectedDate);
  });

  const monthBirthdays = [...athletes, ...professors].filter(p => {
    const isActive = 'status' in p ? p.status === 'Ativo' : true;
    return isActive && p.birth_date && isValidDate(p.birth_date) && isBirthdayMonth(p.birth_date, selectedDate) && !isBirthday(p.birth_date, selectedDate);
  });

  const getAge = (birthDate: string) => {
    if (!isValidDate(birthDate)) return 0;
    const d = parseISO(birthDate);
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
      age--;
    }
    return age;
  };

  const handleShare = (person: Athlete | Professor) => {
    setSelectedPerson(person);
  };

  const downloadCard = async (share = false) => {
    const element = document.getElementById('birthday-card');
    if (!element) return;

    try {
      setIsGenerating(true);
      const loadingToast = toast.loading('Processando arte final...');

      // 1. Ultra-robust Base64 conversion
      const toBase64 = async (url: string): Promise<string> => {
        if (!url || url.startsWith('data:')) return url;
        
        // Try fetch first (better for CORS usually)
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 4000);
          const response = await fetch(url, { mode: 'cors', signal: controller.signal });
          clearTimeout(timeoutId);
          const blob = await response.blob();
          return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = () => resolve(url);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          // Fallback to Image + Canvas
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
              } catch (err) { resolve(url); }
            };
            img.onerror = () => resolve(url);
            img.src = `${url}${url.includes('?') ? '&' : '?'}nc=${Date.now()}`;
            setTimeout(() => resolve(url), 5000);
          });
        }
      };

      // 2. Prepare Clone
      const clone = element.cloneNode(true) as HTMLElement;
      clone.id = 'birthday-card-clone';
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
        border: '4px solid #eab308', // Explicitly keep the theme primary border for the export
        margin: '0',
        padding: '0'
      });
      document.body.appendChild(clone);

      // 3. Clean Styles (No animations, no blurs)
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

      // 6. Capture
      await document.fonts.ready;
      await new Promise(resolve => setTimeout(resolve, 1000));

      const dataUrl = await htmlToImage.toPng(clone, {
        width: 360,
        height: 640,
        pixelRatio: 2, // Reducing to 2 for better mobile stability, still high res (720x1280)
        backgroundColor: '#000000',
        cacheBust: false
      });

      document.body.removeChild(clone);
      toast.dismiss(loadingToast);

      const fileName = `parabens-${selectedPerson?.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      
      if (share && navigator.share) {
        // Share flow
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], fileName, { type: 'image/png' });
        
        if (navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `Parabéns ${selectedPerson?.name}!`,
              text: `A escolinha Piruá Esporte Clube deseja a você um feliz aniversário! 🎂⚽️`
            });
            toast.success("Compartilhamento aberto!");
          } catch (err) {
            if ((err as Error).name !== 'AbortError') {
              const link = document.createElement('a');
              link.download = fileName;
              link.href = dataUrl;
              link.click();
            }
          }
        } else {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = dataUrl;
          link.click();
          toast.success("Imagem baixada! Agora você pode postar.");
        }
      } else {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = dataUrl;
        link.click();
        toast.success("Imagem baixada com sucesso!");
      }
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      toast.error('Erro ao gerar imagem. Tente usar uma conexão mais estável ou outra foto.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ser menor que 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setBgImage(reader.result as string);
        toast.success("Plano de fundo personalizado carregado!");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleOverlayUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    if (overlayImages.length >= 4) {
      toast.error("Limite máximo de 4 fotos atingido.");
      return;
    }

    const file = files[0];
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ser menor que 2MB.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setOverlayImages(prev => [...prev, reader.result as string].slice(0, 4));
      toast.success("Foto adicionada!");
    };
    reader.readAsDataURL(file);
  };

  const removeOverlay = (index: number) => {
    setOverlayImages(prev => prev.filter((_, i) => i !== index));
  };

  const BIRTHDAY_TEMPLATE_IMAGE = "https://firebasestorage.googleapis.com/v0/b/fire-template-6gjyxy/o/pirua%2Fencarte-aniversario.jpg?alt=media"; 
  
  return (
    <div className="space-y-8">
      {/* Print Header */}
      <div className="hidden print-only mb-8 border-b-2 border-black pb-4">
        <div className="flex items-center gap-4">
          {settings?.schoolCrest && (
            <img src={settings.schoolCrest} alt="Crest" className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
          )}
          <div>
            <h1 className="text-2xl font-black uppercase">Piruá Esporte Clube</h1>
            <p className="text-sm font-bold text-zinc-600">Aniversariantes do Mês</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Aniversariantes</h2>
          <p className="text-zinc-400 text-sm sm:text-base">Comemore o aniversário dos nossos atletas e membros da comissão técnica</p>
        </div>
        
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-bold text-zinc-500 uppercase tracking-widest">Filtrar por Data</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all"
            />
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold uppercase text-sm tracking-widest no-print"
          >
            <Printer size={16} />
            Imprimir Lista
          </button>
        </div>
      </div>

      {/* Today's Birthdays */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2 uppercase tracking-widest">
          <Cake size={20} />
          Aniversariantes de {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todayBirthdays.map((person) => (
            <div key={person.id} className="bg-black border border-theme-primary/30 p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-theme-primary/5">
              <div className="w-16 h-16 bg-zinc-800 rounded-full border-2 border-theme-primary overflow-hidden flex-shrink-0">
                {person.photo ? (
                  <img src={person.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <UserCircle size={32} />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-white text-base sm:text-lg">{person.name}</h4>
                <p className="text-sm text-zinc-400">
                  {getAge(person.birth_date)} anos • {isValidDate(person.birth_date) ? format(parseISO(person.birth_date), 'dd/MM/yyyy') : 'Data inválida'}
                </p>
              </div>
              <button 
                onClick={() => handleShare(person)}
                className="p-2 bg-theme-primary hover:opacity-90 text-black rounded-xl transition-colors"
                title="Gerar post para Instagram"
              >
                <Instagram size={20} />
              </button>
            </div>
          ))}
          {todayBirthdays.length === 0 && (
            <div className="col-span-full p-8 bg-black border border-theme-primary/20 rounded-2xl text-center text-zinc-500 italic">
              Nenhum aniversariante hoje.
            </div>
          )}
        </div>
      </section>

      {/* Month's Birthdays */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-zinc-400 flex items-center gap-2 uppercase tracking-widest">
          <Calendar size={20} />
          Aniversariantes de {format(selectedDate, 'MMMM', { locale: ptBR })}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {monthBirthdays.map((person) => (
            <div key={person.id} className="bg-black border border-theme-primary/20 p-4 rounded-2xl flex items-center gap-3">
              <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                {person.photo ? (
                  <img src={person.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <UserCircle size={20} />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-white truncate text-base">{person.name}</h4>
                <p className="text-xs sm:text-sm text-zinc-500 font-medium">
                  Dia {isValidDate(person.birth_date) ? format(parseISO(person.birth_date), 'dd') : '--'} • {getAge(person.birth_date)} anos
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Print View for Birthdays */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-12 z-[100]">
        <div className="flex items-center justify-between mb-8 border-b-2 border-black pb-4">
          <div className="flex items-center gap-4">
            {settings.schoolCrest && (
              <img src={settings.schoolCrest} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            )}
            <h1 className="text-2xl font-black uppercase">Piruá Esporte Clube</h1>
          </div>
          <div className="text-right">
            <h2 className="font-bold uppercase">Aniversariantes do Mês</h2>
            <p className="text-sm uppercase">{format(selectedDate, 'MMMM yyyy', { locale: ptBR })}</p>
          </div>
        </div>

        <div className="space-y-8">
          <div>
            <h3 className="text-lg font-bold border-b border-zinc-300 mb-4 uppercase">Aniversariantes de Hoje ({format(selectedDate, 'dd/MM')})</h3>
            {todayBirthdays.length > 0 ? (
              <div className="grid grid-cols-2 gap-4">
                {todayBirthdays.map(p => (
                  <div key={p.id} className="flex items-center gap-3 border p-2 rounded">
                    <div className="font-bold">{isValidDate(p.birth_date) ? format(parseISO(p.birth_date), 'dd/MM') : '--/--'}</div>
                    <div>
                      <div className="font-bold uppercase text-sm">{p.name}</div>
                      <div className="text-xs">{getAge(p.birth_date)} anos</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm italic">Nenhum aniversariante hoje.</p>}
          </div>

          <div>
            <h3 className="text-lg font-bold border-b border-zinc-300 mb-4 uppercase">Outros Aniversariantes do Mês</h3>
            <div className="grid grid-cols-2 gap-4">
              {monthBirthdays
                .filter(p => isValidDate(p.birth_date))
                .sort((a, b) => parseISO(a.birth_date).getDate() - parseISO(b.birth_date).getDate())
                .map(p => (
                <div key={p.id} className="flex items-center gap-3 border p-2 rounded">
                  <div className="font-bold">{format(parseISO(p.birth_date), 'dd/MM')}</div>
                  <div>
                    <div className="font-bold uppercase text-sm">{p.name}</div>
                    <div className="text-xs">{getAge(p.birth_date)} anos</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Instagram Post Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[70] flex items-center justify-center p-4 overflow-y-auto">
          <div className="relative py-8">
            <button 
              onClick={() => setSelectedPerson(null)}
              className="absolute top-0 right-0 text-white hover:text-theme-primary transition-colors font-black uppercase tracking-widest text-xs"
            >
              Fechar [X]
            </button>
            
            {/* Instagram Style Birthday Card - Modern Sports Poster */}
            <div 
              id="birthday-card" 
              className="w-[360px] h-[640px] md:w-[450px] md:h-[800px] overflow-hidden relative shadow-2xl flex flex-col bg-zinc-950 font-sans mx-auto rounded-xl border-4 border-theme-primary" 
            >
              {/* Background Layer: Soccer Theme & Mascot */}
              <div className="absolute inset-0 z-0">
                {/* Default Background */}
                <img 
                  src="https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1080&h=1920" 
                  alt="Soccer Stadium" 
                  className="w-full h-full object-cover opacity-70"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />

                {/* Custom Uploaded Background */}
                {bgImage && (
                  <img 
                    src={bgImage} 
                    alt="Custom Background" 
                    className="absolute inset-0 w-full h-full object-cover z-5"
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                )}

                {/* Overlay Template Layer (User's provided image if it loads) */}
                <img 
                  src="https://firebasestorage.googleapis.com/v0/b/fire-template-6gjyxy/o/pirua%2Fencarte-aniversario.jpg?alt=media" 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                  loading="eager"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
                
                {/* Custom Overlay Images - REMOVED OLD LOGIC AS IT IS NOW IN THE GRID */}
                
                {/* Stylized Gradients for "Modern/Attractive" look */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/60 z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-theme-primary/10 via-transparent to-theme-primary/10 z-10" />
              </div>

              {/* Grid of 4 Photos - 2 Top, 2 Bottom - Positioned behind content (z-10) */}
              <div className="absolute inset-0 z-10 p-4 flex flex-col justify-between pointer-events-none">
                <div className="flex justify-between w-full">
                  <div className={cn(
                    "w-[90px] h-[120px] md:w-[130px] md:h-[170px] border-4 border-theme-primary shadow-[0_10px_20px_rgba(0,0,0,0.8)] rotate-[-4deg] overflow-hidden bg-zinc-800 transition-all",
                    !overlayImages[0] && "border-zinc-700 bg-zinc-900/50 opacity-20 border-dashed"
                  )}>
                    {overlayImages[0] ? (
                      <img src={overlayImages[0]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus size={20} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "w-[90px] h-[120px] md:w-[130px] md:h-[170px] border-4 border-theme-primary shadow-[0_10px_20px_rgba(0,0,0,0.8)] rotate-[4deg] overflow-hidden bg-zinc-800 transition-all",
                    !overlayImages[1] && "border-zinc-700 bg-zinc-900/50 opacity-20 border-dashed"
                  )}>
                    {overlayImages[1] ? (
                      <img src={overlayImages[1]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus size={20} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between w-full mt-auto">
                  <div className={cn(
                    "w-[90px] h-[120px] md:w-[130px] md:h-[170px] border-4 border-theme-primary shadow-[0_10px_20px_rgba(0,0,0,0.8)] rotate-[4deg] overflow-hidden bg-zinc-800 transition-all",
                    !overlayImages[2] && "border-zinc-700 bg-zinc-900/50 opacity-20 border-dashed"
                  )}>
                    {overlayImages[2] ? (
                      <img src={overlayImages[2]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus size={20} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                  <div className={cn(
                    "w-[90px] h-[120px] md:w-[130px] md:h-[170px] border-4 border-theme-primary shadow-[0_10px_20px_rgba(0,0,0,0.8)] rotate-[-4deg] overflow-hidden bg-zinc-800 transition-all",
                    !overlayImages[3] && "border-zinc-700 bg-zinc-900/50 opacity-20 border-dashed"
                  )}>
                    {overlayImages[3] ? (
                      <img src={overlayImages[3]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Plus size={20} className="text-zinc-500" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Dynamic Content Overlay - Centered Design - Higher Z-Index (z-20) */}
              <div className="relative flex-1 z-20 flex flex-col h-full pointer-events-none items-center justify-between py-8 px-6">
                
                {/* TOP: Parabéns & Crest */}
                <div className="w-full flex flex-col items-center gap-2 relative z-30">
                  <div className="bg-black/90 border-4 border-theme-primary px-10 py-1 transform skew-x-[-15deg] shadow-[6px_6px_0_rgba(0,0,0,1)]">
                    <h1 className="text-white font-black text-4xl md:text-5xl tracking-tighter uppercase italic drop-shadow-[2px_2px_0_rgba(0,0,0,1)] text-center skew-x-[15deg]">
                      PARABÉNS
                    </h1>
                  </div>
                  
                  <div className="w-24 h-24 md:w-32 md:h-32 relative flex items-center justify-center bg-transparent mt-2">
                    {settings.schoolCrest ? (
                      <img 
                        src={settings.schoolCrest} 
                        className="w-full h-full object-contain relative z-10" 
                        referrerPolicy="no-referrer" 
                        crossOrigin="anonymous" 
                        style={{ 
                          filter: 'drop-shadow(0 0 15px rgba(234, 179, 8, 0.6))'
                        }}
                      />
                    ) : (
                      <div className="font-black text-theme-primary text-4xl md:text-5xl italic">P</div>
                    )}
                  </div>
                  
                  <div className="text-center bg-theme-primary text-black px-6 py-1 transform skew-x-[-12deg] shadow-[4px_4px_0_rgba(255,255,255,1)]">
                    <h2 className="font-black text-xl md:text-2xl italic tracking-tighter uppercase skew-x-[12deg]">
                      FELIZ ANIVERSÁRIO!
                    </h2>
                  </div>
                </div>

                {/* CENTER: Athlete Photo (3x4 Portrait) */}
                <div className="relative group z-20 mt-4">
                  {/* Decorative Border for "Attractive" look */}
                  <div className="absolute -inset-4 bg-theme-primary opacity-30 blur-3xl group-hover:opacity-50 transition-opacity"></div>
                  
                  <div className="w-[160px] h-[210px] md:w-[220px] md:h-[290px] bg-zinc-900 border-[6px] border-theme-primary shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden relative z-10">
                    {selectedPerson.photo ? (
                      <img src={selectedPerson.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-black gap-2">
                        <UserCircle size={80} strokeWidth={1} />
                        <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Foto do Atleta</span>
                      </div>
                    )}
                    
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-theme-primary z-20" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-theme-primary z-20" />
                  </div>

                  {/* Name Banner - HIGH IMPACT */}
                  <div className="absolute -bottom-6 inset-x-[-15%] z-30">
                    <div className="bg-white text-black py-3 px-8 shadow-[6px_6px_0_rgba(0,0,0,1)] border-[4px] border-theme-primary transform skew-x-[-12deg]">
                      <h3 className="text-3xl md:text-4xl font-black uppercase tracking-tighter text-center skew-x-[12deg] leading-none whitespace-nowrap italic drop-shadow-sm">
                        {selectedPerson.name.split(' ').slice(0, 2).join(' ')}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* BOTTOM: Message */}
                <div className="w-full flex flex-col items-center gap-4 mt-16 pb-4">
                  <div className="max-w-[280px] text-center bg-black/60 backdrop-blur-sm p-3 border border-theme-primary/30 rounded-xl lg:max-w-xs relative z-30">
                    <p className="text-white font-black leading-tight text-[11px] md:text-sm drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase tracking-tighter italic">
                      "A escolinha <span className="text-theme-primary">Piruá Esporte Clube</span> te deseja um feliz aniversário! que Deus ilumine sempre sua vida, muita paz e saúde."
                    </p>
                  </div>
                  
                  {/* Soccer ball icon accent */}
                  <div className="flex gap-2 relative z-30">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-2.5 h-2.5 rounded-full bg-theme-primary shadow-[0_0_10px_rgba(234,179,8,0.8)]"></div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Modern Graphic Elements */}
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-10 overflow-hidden opacity-20">
                <div className="absolute top-[20%] -left-10 w-40 h-40 border-8 border-white rounded-full opacity-10 transform -rotate-12 translate-x-[-20%] translate-y-[-20%]" />
                <div className="absolute bottom-[20%] -right-10 w-60 h-60 border-8 border-white rounded-full opacity-10 transform rotate-12 translate-x-[20%] translate-y-[20%]" />
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4 bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800 border-dashed">
              <div className="w-full text-center mb-2">
                <p className="text-[10px] font-black text-theme-primary uppercase tracking-[0.2em]">Personalizar Encarte</p>
              </div>

              <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors uppercase text-[10px] tracking-widest cursor-pointer">
                <Upload size={16} />
                Fundo
                <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
              </label>

              {overlayImages.length < 4 && (
                <label className="flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 text-white font-bold rounded-xl hover:bg-zinc-700 transition-colors uppercase text-[10px] tracking-widest cursor-pointer">
                  <Plus size={16} />
                  Adicionar Foto ({overlayImages.length}/4)
                  <input type="file" accept="image/*" className="hidden" onChange={handleOverlayUpload} />
                </label>
              )}

              <div className="w-full flex flex-wrap justify-center gap-2 mt-2">
                {bgImage && (
                  <button 
                    onClick={() => setBgImage(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-[9px] font-black uppercase hover:bg-red-500 hover:text-white transition-all"
                  >
                    <X size={12} /> Remover Fundo
                  </button>
                )}
                {overlayImages.map((_, i) => (
                  <button 
                    key={i}
                    onClick={() => removeOverlay(i)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 text-zinc-400 rounded-lg text-[9px] font-black uppercase hover:text-red-500 transition-all border border-zinc-700"
                  >
                    <X size={12} /> Foto {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-4">
              <button 
                onClick={() => downloadCard(false)}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 uppercase text-sm tracking-tighter"
              >
                <Download size={20} className={isGenerating ? "animate-bounce" : ""} />
                {isGenerating ? 'Gerando...' : 'Salvar no Celular'}
              </button>
              
              <button 
                onClick={() => downloadCard(true)}
                disabled={isGenerating}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-theme-primary text-black font-black rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 uppercase text-sm tracking-tighter shadow-[0_10px_20px_rgba(234,179,8,0.3)]"
              >
                <Share2 size={20} />
                {isGenerating ? 'Processando...' : 'Postar / Compartilhar'}
              </button>

              <button 
                onClick={() => {
                  const text = `A escolinha Piruá Esporte Clube deseja a você um feliz aniversário! Que Deus ilumine sempre sua vida, muita paz e saúde. 🎂⚽️ #PiruáEC #FênixDoCampo #Parabéns`;
                  navigator.clipboard.writeText(text);
                  toast.success('Legenda copiada! Agora é só colar no post.');
                }}
                className="flex items-center justify-center gap-2 px-6 py-4 bg-zinc-800 text-white font-black rounded-xl hover:bg-zinc-700 transition-colors uppercase text-sm tracking-tighter"
              >
                <Instagram size={20} />
                Copiar Legenda
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
