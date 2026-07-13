import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor } from '../types';
import { Cake, Instagram, Share2, Download, UserCircle, Calendar, Printer, Upload, X, Plus, FlipHorizontal } from 'lucide-react';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { cn, compressImage } from '../utils';
import * as htmlToImage from 'html-to-image';

interface BirthdaysProps {
  athletes?: Athlete[];
  professors?: Professor[];
}

export const BORDER_THEMES = [
  { id: 'neon-teal', label: 'Neon Teal', class: 'bg-gradient-to-tr from-theme-primary via-teal-400 to-cyan-500', glow: 'rgba(20,184,166,0.35)', dotColor: '#14b8a6' },
  { id: 'neon-yellow', label: 'Neon Ouro', class: 'bg-gradient-to-tr from-yellow-500 via-amber-400 to-orange-400', glow: 'rgba(245,158,11,0.35)', dotColor: '#f59e0b' },
  { id: 'neon-purple', label: 'Neon Roxo', class: 'bg-gradient-to-tr from-purple-600 via-pink-400 to-rose-400', glow: 'rgba(168,85,247,0.35)', dotColor: '#a855f7' },
  { id: 'neon-blue', label: 'Neon Azul', class: 'bg-gradient-to-tr from-blue-600 via-indigo-400 to-cyan-400', glow: 'rgba(59,130,246,0.35)', dotColor: '#3b82f6' },
  { id: 'neon-green', label: 'Neon Verde', class: 'bg-gradient-to-tr from-green-600 via-emerald-400 to-lime-300', glow: 'rgba(34,197,94,0.35)', dotColor: '#22c55e' },
  { id: 'neon-red', label: 'Neon Vermelho', class: 'bg-gradient-to-tr from-red-600 via-orange-500 to-rose-500', glow: 'rgba(239,68,68,0.35)', dotColor: '#ef4444' },
  { id: 'plain-white', label: 'Branco Clean', class: 'bg-gradient-to-tr from-neutral-200 via-white to-neutral-400', glow: 'rgba(255,255,255,0.15)', dotColor: '#ffffff' }
];

export const BACKGROUND_TEMPLATES = [
  { id: 'default-stadium', label: 'Estádio Padrão', url: 'https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'stadium-neon', label: 'Estádio Épico', url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'stadium-sunset', label: 'Gramado Sunset', url: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'neon-cyberpunk', label: 'Futurista Cyberpunk', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'gold-luxury', label: 'Ouro Imperial', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'tech-dark', label: 'Carbono & Holofote', url: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'fluid-gradient', label: 'Fluido Moderno', url: 'https://images.unsplash.com/photo-1557683316-973673baf926?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'balloons-dark', label: 'Balões & Celebração', url: 'https://images.unsplash.com/photo-1507608869274-d3177c8bb4c7?auto=format&fit=crop&q=80&w=1080&h=1920' },
  { id: 'abstract-neon-light', label: 'Luzes Abstratas', url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=80&w=1080&h=1920' }
];

export default function Birthdays({ athletes: athletesProp, professors: professorsProp }: BirthdaysProps) {
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [professors, setProfessors] = useState<Professor[]>(professorsProp || []);
  const { settings } = useTheme();
  const [selectedPerson, setSelectedPerson] = useState<Athlete | Professor | null>(null);
  const [athleteName, setAthleteName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedBgUrl, setSelectedBgUrl] = useState('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1080&h=1920');
  const [bgLayers, setBgLayers] = useState<Array<{
    id: string;
    url: string;
    scale: number;
    xOffset: number;
    yOffset: number;
    mirror: boolean;
    opacity: number;
  }>>([]);
  const [overlayImages, setOverlayImages] = useState<string[]>([]);
  const [nameYOffset, setNameYOffset] = useState(0);
  const [nameFontSize, setNameFontSize] = useState(32);
  const [nameXOffset, setNameXOffset] = useState(0);
  const [bannerYOffset, setBannerYOffset] = useState(0);
  const [bannerXOffset, setBannerXOffset] = useState(0);
  const [bannerScale, setBannerScale] = useState(1);
  const [bannerStyle, setBannerStyle] = useState<'yellow' | 'white' | 'black' | 'red' | 'outline'>('yellow');
  const [bannerSkew, setBannerSkew] = useState(-15);
  const [footerMessage, setFooterMessage] = useState("A escolinha Piruá Esporte Clube te deseja um feliz aniversário! Que Deus ilumine sempre sua vida, muita paz e saúde.");
  const [footerYOffset, setFooterYOffset] = useState(0);
  const [footerXOffset, setFooterXOffset] = useState(0);
  const [footerFontSize, setFooterFontSize] = useState(10);
  const [photoScale, setPhotoScale] = useState(1);
  const [photoYOffset, setPhotoYOffset] = useState(0);
  const [photoXOffset, setPhotoXOffset] = useState(0);
  const [customMainPhoto, setCustomMainPhoto] = useState<string | null>(null);
  const [congratsScale, setCongratsScale] = useState(1);
  const [congratsXOffset, setCongratsXOffset] = useState(0);
  const [congratsYOffset, setCongratsYOffset] = useState(0);
  const [crestXOffset, setCrestXOffset] = useState(0);
  const [crestYOffset, setCrestYOffset] = useState(0);
  const [crestScale, setCrestScale] = useState(1);
  const [showMainPhoto, setShowMainPhoto] = useState(true);
  const [showAthleteName, setShowAthleteName] = useState(true);
  const [photoBorderTheme, setPhotoBorderTheme] = useState('neon-teal');
  const [bgScale, setBgScale] = useState(1);
  const [bgMirror, setBgMirror] = useState(false);
  const [bgXOffset, setBgXOffset] = useState(0);
  const [bgYOffset, setBgYOffset] = useState(0);
  const [supportPhotoScales, setSupportPhotoScales] = useState<number[]>([1, 1, 1, 1]);
  const [supportPhotoXOffsets, setSupportPhotoXOffsets] = useState<number[]>([0, 0, 0, 0]);
  const [supportPhotoYOffsets, setSupportPhotoYOffsets] = useState<number[]>([0, 0, 0, 0]);

  const currentBorder = BORDER_THEMES.find(t => t.id === photoBorderTheme) || BORDER_THEMES[0];

  useEffect(() => {
    if (selectedPerson) {
      setAthleteName(selectedPerson.name.split(' ').slice(0, 2).join(' '));
    } else {
      setAthleteName('');
    }
  }, [selectedPerson]);

  useEffect(() => {
    if (athletesProp) {
      setAthletes(athletesProp);
    }
    if (professorsProp) {
      setProfessors(professorsProp);
    }
    loadData();
  }, [athletesProp, professorsProp]);

  const loadData = async () => {
    const promises: [Promise<Athlete[]> | null, Promise<Professor[]> | null] = [
      athletesProp ? null : api.getAthletes(),
      professorsProp ? null : api.getProfessors()
    ];
    
    const [a, p] = await Promise.all(promises);
    if (a) setAthletes(a);
    if (p) setProfessors(p);
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
        try {
          // Direct fetch FIRST - most reliable as it keeps official signatures intact
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
          console.warn('Direct fetch failed, trying proxy/cache-busted method', e);
          try {
            const cacheBustedUrl = url.includes('?') 
              ? `${url}&cb=${Date.now()}` 
              : `${url}?cb=${Date.now()}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const response = await fetch(cacheBustedUrl, { mode: 'cors', signal: controller.signal, credentials: 'omit' });
            clearTimeout(timeoutId);
            const blob = await response.blob();
            return new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = () => resolve(url);
              reader.readAsDataURL(blob);
            });
          } catch (err) {
            console.warn('All fetches failed, falling back to canvas/proxy method', err);
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
                } catch (canvasErr) { resolve(url); }
              };
              img.onerror = () => resolve(url);
              img.src = url;
              setTimeout(() => resolve(url), 8000);
            });
          }
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
        boxSizing: 'border-box',
        transform: 'none',
        transition: 'none',
        zIndex: '-9999',
        opacity: '1',
        pointerEvents: 'none',
        borderRadius: '0',
        border: '8px solid #eab308',
        margin: '0',
        padding: '0'
      });
      document.body.appendChild(clone);

      // Adjust clone internal sizes to the base dimensions
      const cardInner = clone.querySelector('#birthday-card') || clone;
      (cardInner as HTMLElement).style.width = '360px';
      (cardInner as HTMLElement).style.height = '640px';
      (cardInner as HTMLElement).style.borderRadius = '0';

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
        const currentSrc = img.src; // Resolved absolute URL, extremely reliable
        if (currentSrc) {
          const b64 = await toBase64(currentSrc);
          img.src = b64;
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
      await new Promise(resolve => setTimeout(resolve, 800));

      const dataUrl = await htmlToImage.toPng(clone, {
        width: 360,
        height: 640,
        pixelRatio: 3, // 1080x1920 (Exact IG Story Size with 3x scale)
        backgroundColor: '#09090b',
        cacheBust: false
      });

      // Compress even further for WhatsApp/Instagram efficiency
      const compressedDataUrl = await compressImage(dataUrl, 1080, 1920, 0.85);

      document.body.removeChild(clone);
      toast.dismiss(loadingToast);

      const fileName = `parabens-${selectedPerson?.name.toLowerCase().replace(/\s+/g, '-')}.jpg`;
      
      if (share && navigator.share) {
        // Share flow
        const blob = await (await fetch(compressedDataUrl)).blob();
        const file = new File([blob], fileName, { type: 'image/jpeg' });
        
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
              link.href = compressedDataUrl;
              link.click();
            }
          }
        } else {
          const link = document.createElement('a');
          link.download = fileName;
          link.href = compressedDataUrl;
          link.click();
          toast.success("Imagem baixada! Agora você pode postar.");
        }
      } else {
        const link = document.createElement('a');
        link.download = fileName;
        link.href = compressedDataUrl;
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

  const addBgLayer = (url: string) => {
    if (bgLayers.length >= 4) {
      toast.error("Limite máximo de 4 planos de fundo atingido.");
      return;
    }
    const newLayer = {
      id: Math.random().toString(36).substring(2, 9),
      url,
      scale: 1.0,
      xOffset: 0,
      yOffset: 0,
      mirror: false,
      opacity: 0.8,
    };
    setBgLayers(prev => [...prev, newLayer]);
    toast.success("Plano de fundo carregado!");
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ser menor que 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64, 1200, 1920, 0.8);
          addBgLayer(compressed);
        } catch (e) {
          addBgLayer(base64);
        }
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
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      try {
        const compressed = await compressImage(base64, 800, 800, 0.7);
        setOverlayImages(prev => [...prev, compressed].slice(0, 4));
        toast.success("Foto adicionada!");
      } catch (e) {
        setOverlayImages(prev => [...prev, base64].slice(0, 4));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleMainPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error("A imagem deve ser menor que 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        try {
          const compressed = await compressImage(base64, 800, 1000, 0.8);
          setCustomMainPhoto(compressed);
          toast.success("Foto principal personalizada carregada!");
        } catch (e) {
          setCustomMainPhoto(base64);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const [activeControlTab, setActiveControlTab] = useState<'photos' | 'banner' | 'main_photo' | 'layout'>('photos');

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
          <div className="relative py-8 w-full max-w-[1400px]">
            <button 
              onClick={() => setSelectedPerson(null)}
              className="absolute top-0 right-0 text-white hover:text-theme-primary transition-colors font-black uppercase tracking-widest text-xs z-[80]"
            >
              Fechar [X]
            </button>

            <div className="flex flex-col items-center mb-10">
              <h2 className="text-2xl font-black text-white italic tracking-tighter uppercase">Editor de Encarte</h2>
              <div className="w-20 h-1 bg-theme-primary mt-2"></div>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-12 w-full items-start justify-center px-4">
              {/* Preview Column */}
              <div className="flex flex-col items-center gap-8 lg:sticky lg:top-8 w-full lg:w-auto">
                {/* Instagram Style Birthday Card - Modern Sports Poster */}
                <div 
                  id="birthday-card" 
              className="w-[360px] h-[640px] md:w-[450px] md:h-[800px] overflow-hidden relative shadow-2xl flex flex-col bg-zinc-950 font-sans mx-auto rounded-3xl border-[8px] border-theme-primary shadow-[0_0_80px_rgba(234,179,8,0.3)]" 
            >
              {/* Background Layer: Soccer Theme & Mascot */}
              <div className="absolute inset-0 z-0">
                {/* Default Background */}
                <div className="absolute inset-0 bg-black overflow-hidden">
                  <img 
                    src={selectedBgUrl} 
                    alt="Soccer Stadium" 
                    className="w-full h-full object-cover opacity-50"
                    style={{
                      transform: `translate(${bgXOffset}px, ${bgYOffset}px) scale(${bgScale}) ${bgMirror ? 'scaleX(-1)' : ''}`,
                      transformOrigin: 'center',
                      transition: 'transform 0.1s ease-out'
                    }}
                    referrerPolicy="no-referrer"
                    crossOrigin="anonymous"
                  />
                  {/* Carbon Fiber Texture Overlay */}
                  <div 
                    className="absolute inset-0 opacity-20 mix-blend-overlay"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='0.1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
                      backgroundSize: '20px 20px'
                    }}
                  />
                </div>

                {/* Custom Uploaded Backgrounds */}
                {bgLayers.map((layer, idx) => (
                  <div key={layer.id} className="absolute inset-0 z-5 overflow-hidden" style={{ opacity: layer.opacity }}>
                    <img 
                      src={layer.url} 
                      alt={`Custom Background ${idx + 1}`} 
                      className="w-full h-full object-cover"
                      style={{
                        transform: `translate(${layer.xOffset}px, ${layer.yOffset}px) scale(${layer.scale}) ${layer.mirror ? 'scaleX(-1)' : ''}`,
                        transformOrigin: 'center',
                        transition: 'transform 0.1s ease-out'
                      }}
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </div>
                ))}

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
                  {overlayImages[0] ? (
                    <div 
                      className={cn(
                        "w-[90px] h-[120px] md:w-[130px] md:h-[170px] transition-all overflow-hidden relative rounded-2xl p-[3px]",
                        currentBorder.class
                      )}
                      style={{
                        transform: `translate(${supportPhotoXOffsets[0] ?? 0}px, ${supportPhotoYOffsets[0] ?? 0}px) rotate(-4deg) scale(${supportPhotoScales[0] ?? 1})`,
                        transformOrigin: 'center',
                        boxShadow: `0 10px 25px rgba(0,0,0,0.8), 0 0 15px ${currentBorder.glow}`
                      }}
                    >
                      <div className="w-full h-full bg-zinc-950 rounded-[13px] overflow-hidden relative">
                        <img src={overlayImages[0]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[90px] h-[120px] md:w-[130px] md:h-[170px]" />
                  )}

                  {overlayImages[1] ? (
                    <div 
                      className={cn(
                        "w-[90px] h-[120px] md:w-[130px] md:h-[170px] transition-all overflow-hidden relative rounded-2xl p-[3px]",
                        currentBorder.class
                      )}
                      style={{
                        transform: `translate(${supportPhotoXOffsets[1] ?? 0}px, ${supportPhotoYOffsets[1] ?? 0}px) rotate(4deg) scale(${supportPhotoScales[1] ?? 1})`,
                        transformOrigin: 'center',
                        boxShadow: `0 10px 25px rgba(0,0,0,0.8), 0 0 15px ${currentBorder.glow}`
                      }}
                    >
                      <div className="w-full h-full bg-zinc-950 rounded-[13px] overflow-hidden relative">
                        <img src={overlayImages[1]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[90px] h-[120px] md:w-[130px] md:h-[170px]" />
                  )}
                </div>

                <div className="flex justify-between w-full mt-auto">
                  {overlayImages[2] ? (
                    <div 
                      className={cn(
                        "w-[90px] h-[120px] md:w-[130px] md:h-[170px] transition-all overflow-hidden relative rounded-2xl p-[3px]",
                        currentBorder.class
                      )}
                      style={{
                        transform: `translate(${supportPhotoXOffsets[2] ?? 0}px, ${supportPhotoYOffsets[2] ?? 0}px) rotate(4deg) scale(${supportPhotoScales[2] ?? 1})`,
                        transformOrigin: 'center',
                        boxShadow: `0 10px 25px rgba(0,0,0,0.8), 0 0 15px ${currentBorder.glow}`
                      }}
                    >
                      <div className="w-full h-full bg-zinc-950 rounded-[13px] overflow-hidden relative">
                        <img src={overlayImages[2]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[90px] h-[120px] md:w-[130px] md:h-[170px]" />
                  )}

                  {overlayImages[3] ? (
                    <div 
                      className={cn(
                        "w-[90px] h-[120px] md:w-[130px] md:h-[170px] transition-all overflow-hidden relative rounded-2xl p-[3px]",
                        currentBorder.class
                      )}
                      style={{
                        transform: `translate(${supportPhotoXOffsets[3] ?? 0}px, ${supportPhotoYOffsets[3] ?? 0}px) rotate(-4deg) scale(${supportPhotoScales[3] ?? 1})`,
                        transformOrigin: 'center',
                        boxShadow: `0 10px 25px rgba(0,0,0,0.8), 0 0 15px ${currentBorder.glow}`
                      }}
                    >
                      <div className="w-full h-full bg-zinc-950 rounded-[13px] overflow-hidden relative">
                        <img src={overlayImages[3]} className="w-full h-full object-cover" crossOrigin="anonymous" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-[90px] h-[120px] md:w-[130px] md:h-[170px]" />
                  )}
                </div>
              </div>

              {/* Dynamic Content Overlay - Centered Design - Higher Z-Index (z-20) */}
              <div className="relative flex-1 z-20 flex flex-col h-full pointer-events-none items-center justify-between pt-6 pb-2 px-6">
                
                {/* TOP: Parabéns & Crest */}
                <div 
                  className="w-full flex flex-col items-center gap-2 relative z-30"
                  style={{ transform: `translate(${congratsXOffset}px, ${congratsYOffset}px) scale(${congratsScale})` }}
                >
                  <div className="bg-black/90 border-4 border-theme-primary px-8 py-1 transform skew-x-[-15deg] shadow-[6px_6px_0_rgba(0,0,0,1)]">
                    <h1 className="text-white font-black text-3xl md:text-4xl tracking-tighter uppercase italic drop-shadow-[2px_2px_0_rgba(0,0,0,1)] text-center skew-x-[15deg]">
                      PARABÉNS
                    </h1>
                  </div>
                  
                  <div 
                    className="w-20 h-20 md:w-28 md:h-28 relative flex items-center justify-center bg-transparent mt-1"
                    style={{ 
                      transform: `translate(${crestXOffset}px, ${crestYOffset}px) scale(${crestScale})`
                    }}
                  >
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
                      <div className="font-black text-theme-primary text-3xl md:text-4xl italic">P</div>
                    )}
                  </div>
                  
                  <div className="text-center bg-theme-primary text-black px-4 py-0.5 transform skew-x-[-12deg] shadow-[4px_4px_0_rgba(255,255,255,1)]">
                    <h2 className="font-black text-lg md:text-xl italic tracking-tighter uppercase skew-x-[12deg]">
                      FELIZ ANIVERSÁRIO!
                    </h2>
                  </div>
                </div>

                  {/* CENTER: Athlete Photo (3x4 Portrait) with enhanced frame */}
                  {(showMainPhoto || showAthleteName) && (
                    <div 
                      className="relative group z-20 transition-transform my-auto"
                      style={{ 
                        transform: `translate(${photoXOffset}px, ${photoYOffset}px) scale(${photoScale})`
                      }}
                    >
                      {/* Glowing background effect */}
                      {showMainPhoto && (
                        <div 
                          className="absolute -inset-6 opacity-20 blur-2xl group-hover:opacity-40 transition-opacity rounded-full"
                          style={{ backgroundColor: currentBorder.dotColor }}
                        ></div>
                      )}
                      
                      {showMainPhoto ? (
                        <div 
                          className={cn(
                            "w-[190px] aspect-[3/4] p-[4px] rounded-3xl overflow-hidden relative z-10",
                            currentBorder.class
                          )}
                          style={{
                            boxShadow: `0 20px 50px rgba(0,0,0,0.9), 0 0 25px ${currentBorder.glow}`
                          }}
                        >
                          <div className="w-full h-full bg-zinc-950 rounded-[20px] overflow-hidden relative">
                            {customMainPhoto ? (
                              <img src={customMainPhoto} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                            ) : selectedPerson.photo ? (
                              <img src={selectedPerson.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 bg-black gap-2">
                                <UserCircle size={80} strokeWidth={1} />
                                <span className="text-[10px] font-bold uppercase tracking-widest opacity-30">Foto do Atleta</span>
                              </div>
                            )}
                            
                            {/* Internal theme border */}
                            <div className="absolute inset-0 border-2 border-theme-primary/30 pointer-events-none z-20 rounded-[20px]" />
                            
                            {/* Technical corner accents */}
                            <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 border-theme-primary z-20" />
                            <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 border-theme-primary z-20" />
                          </div>
                        </div>
                      ) : (
                        /* Structural layout filler of exact same size to maintain absolute position reference if name is shown but photo is hidden */
                        <div className="w-[190px] aspect-[3/4] pointer-events-none" />
                      )}

                      {/* Name Banner - Creative, high-visibility design */}
                      {showAthleteName && (
                        <div 
                          className="absolute z-40 transform"
                          style={{ 
                            bottom: `${-30 + nameYOffset}px`, 
                            left: `${-15 + nameXOffset}%`, 
                            right: `${-15 - nameXOffset}%`,
                            rotate: '1.5deg',
                            scale: `${bannerScale}`
                          }}
                        >
                          <div className={cn(
                            "py-4 px-6 border-[4px] rounded-2xl shadow-[8px_8px_0_rgba(0,0,0,1)] flex items-center justify-center min-h-[60px]",
                            bannerStyle === 'yellow' && "bg-theme-primary border-black",
                            bannerStyle === 'white' && "bg-white border-theme-primary shadow-[8px_8px_0_rgba(0,0,0,0.5)]",
                            bannerStyle === 'black' && "bg-black border-theme-primary shadow-[8px_8px_0_rgba(255,255,255,0.2)]",
                            bannerStyle === 'red' && "bg-red-600 border-black",
                            bannerStyle === 'outline' && "bg-black/80 backdrop-blur-md border-theme-primary shadow-none"
                          )}
                          style={{ transform: `skewX(${bannerSkew}deg)` }}
                          >
                            <h3 
                              className={cn(
                                "font-black uppercase tracking-tighter text-center leading-none italic drop-shadow-[2px_2px_0_rgba(0,0,0,0.1)]",
                                (bannerStyle === 'yellow' || bannerStyle === 'white') ? "text-black" : "text-white"
                              )}
                              style={{ 
                                fontSize: `${nameFontSize}px`,
                                transform: `skewX(${-bannerSkew}deg)`,
                                maxWidth: '100%',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                              }}
                            >
                              {athleteName || selectedPerson.name}
                            </h3>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                {/* BOTTOM: Message */}
                <div 
                  className="w-full flex flex-col items-center gap-3 mt-auto pb-4 relative z-30"
                  style={{
                    transform: `translate(${footerXOffset}px, ${footerYOffset}px)`
                  }}
                >
                  <div className="max-w-[280px] text-center bg-black/85 backdrop-blur-md p-3 border-l-4 border-theme-primary shadow-2xl relative">
                    <div className="absolute top-0 right-0 w-2 h-2 bg-theme-primary"></div>
                    <p 
                      className="text-white font-black leading-tight drop-shadow-md uppercase tracking-[0.05em] italic"
                      style={{ fontSize: `${footerFontSize}px` }}
                    >
                      {footerMessage}
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

            {/* Action Buttons for Mobile - Only visible on small screens below the preview */}
            <div className="lg:hidden w-full max-w-[400px] flex flex-col gap-3">
              <div className="flex gap-2">
                <button 
                  onClick={() => downloadCard(false)}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 uppercase text-xs tracking-tighter"
                >
                  <Download size={18} className={isGenerating ? "animate-bounce" : ""} />
                  Salvar
                </button>
                <button 
                  onClick={() => downloadCard(true)}
                  disabled={isGenerating}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-theme-primary text-black font-black rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 uppercase text-xs tracking-tighter"
                >
                  <Share2 size={18} />
                  Postar
                </button>
              </div>
            </div>
          </div>

          {/* Controls Column */}
          <div className="flex-1 w-full max-w-[700px] flex flex-col gap-6">
            <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl">
              {/* Tabs Header */}
              <div className="flex bg-black p-1 gap-1">
                {[
                  { id: 'photos', label: 'Fotos', icon: Plus },
                  { id: 'main_photo', label: 'Perfil', icon: UserCircle },
                  { id: 'banner', label: 'Banner', icon: Instagram },
                  { id: 'layout', label: 'Layout', icon: Cake },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveControlTab(tab.id as any)}
                    className={cn(
                      "flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all",
                      activeControlTab === tab.id 
                        ? "bg-theme-primary text-black" 
                        : "text-zinc-500 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    <tab.icon size={14} />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              <div className="p-6">
                {activeControlTab === 'photos' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Fotos de Apoio (Até 4)</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {overlayImages.map((img, i) => (
                          <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border-2 border-zinc-800 bg-black">
                            <img src={img} className="w-full h-full object-cover" />
                            <button 
                              onClick={() => removeOverlay(i)}
                              className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ))}
                        {overlayImages.length < 4 && (
                          <label className="flex flex-col items-center justify-center aspect-square rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-800/20 hover:border-theme-primary hover:bg-theme-primary/5 cursor-pointer transition-all">
                            <Plus size={24} className="text-zinc-600 mb-1" />
                            <span className="text-[8px] font-black text-zinc-500 uppercase">Adicionar</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleOverlayUpload} />
                          </label>
                        )}
                      </div>

                      {/* Individual Support Photo Size Sliders */}
                      {overlayImages.length > 0 && (
                        <div className="space-y-3 mt-4 bg-zinc-950 p-4 rounded-2xl border border-zinc-800 animate-in fade-in duration-300 w-full pointer-events-auto">
                          <p className="text-[9px] font-black text-zinc-400 uppercase tracking-widest mb-1">Ajustes das Fotos de Apoio</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {overlayImages.map((_, idx) => (
                              <div key={idx} className="space-y-3 bg-zinc-900/50 p-3 rounded-xl border border-zinc-800/60 font-sans">
                                <div className="flex justify-between items-center pb-1 border-b border-zinc-800/60">
                                  <span className="text-[9px] font-black text-theme-primary uppercase">Foto {idx + 1}</span>
                                </div>

                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-medium text-zinc-400 uppercase">Zoom</span>
                                    <span className="text-[9px] font-mono font-bold text-theme-primary">{Math.round((supportPhotoScales[idx] ?? 1) * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0.4" 
                                    max="2.0" 
                                    step="0.05" 
                                    value={supportPhotoScales[idx] ?? 1} 
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      setSupportPhotoScales(prev => {
                                        const next = [...prev];
                                        next[idx] = val;
                                        return next;
                                      });
                                    }} 
                                    className="w-full accent-theme-primary" 
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[8px] font-medium text-zinc-500 uppercase mb-0.5 block">Vertical</span>
                                      <span className="text-[8px] font-mono text-zinc-400">{(supportPhotoYOffsets[idx] ?? 0)}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-150" 
                                      max="150" 
                                      step="5"
                                      value={supportPhotoYOffsets[idx] ?? 0} 
                                      onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setSupportPhotoYOffsets(prev => {
                                          const next = [...prev];
                                          next[idx] = val;
                                          return next;
                                        });
                                      }} 
                                      className="w-full accent-theme-primary" 
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[8px] font-medium text-zinc-500 uppercase mb-0.5 block">Horizontal</span>
                                      <span className="text-[8px] font-mono text-zinc-400">{(supportPhotoXOffsets[idx] ?? 0)}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-150" 
                                      max="150" 
                                      step="5"
                                      value={supportPhotoXOffsets[idx] ?? 0} 
                                      onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setSupportPhotoXOffsets(prev => {
                                          const next = [...prev];
                                          next[idx] = val;
                                          return next;
                                        });
                                      }} 
                                      className="w-full accent-theme-primary" 
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-zinc-800 space-y-4">
                      <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Estilo da Borda das Fotos</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {BORDER_THEMES.map((theme) => (
                          <button
                            key={theme.id}
                            onClick={() => setPhotoBorderTheme(theme.id)}
                            className={cn(
                              "flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all relative group",
                              photoBorderTheme === theme.id 
                                ? "bg-zinc-800 border-theme-primary" 
                                : "bg-black/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
                            )}
                          >
                            <div className={cn("w-6 h-6 rounded-full mb-1 sm:mb-2 shadow-inner", theme.class)} />
                            <span className={cn(
                              "text-[9px] font-bold tracking-tight",
                              photoBorderTheme === theme.id ? "text-theme-primary" : "text-zinc-400 group-hover:text-white"
                            )}>
                              {theme.label}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 space-y-6">
                      <div className="flex justify-between items-center flex-wrap gap-2">
                        <div>
                          <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Planos de Fundo Customizados ({bgLayers.length}/4)</p>
                          <p className="text-[8px] text-zinc-500 uppercase">Coloque até 4 fotos decorativas ou texturas sob o flyer</p>
                        </div>
                        {bgLayers.length < 4 && (
                          <label className="py-2 px-3 bg-theme-primary hover:opacity-90 text-black text-[9px] font-black uppercase tracking-widest rounded-xl cursor-pointer transition-colors block shadow-[0_5px_15px_rgba(234,179,8,0.2)]">
                            <Plus size={12} className="inline mr-1" />
                            Carregar Fotos
                            <input type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
                          </label>
                        )}
                      </div>

                      {bgLayers.length === 0 ? (
                        <div className="bg-zinc-950 p-6 rounded-2xl border border-zinc-800 text-center text-zinc-500 text-xs italic">
                          Nenhum plano de fundo customizado adicionado. Ajuste o estádio padrão abaixo.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {bgLayers.map((layer, idx) => (
                            <div key={layer.id} className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-4">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-20 rounded-lg overflow-hidden border border-zinc-800 bg-black flex-shrink-0">
                                  <img src={layer.url} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1">
                                  <p className="text-[10px] font-black text-theme-primary uppercase mb-1">Foto de Fundo #{idx + 1}</p>
                                  <div className="flex gap-2">
                                    <button 
                                      onClick={() => {
                                        setBgLayers(prev => prev.filter(l => l.id !== layer.id));
                                        toast.success("Plano de fundo removido!");
                                      }}
                                      className="py-1 px-3 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg text-[9px] font-black uppercase tracking-widest transition-all"
                                    >
                                      Remover
                                    </button>
                                  </div>
                                </div>
                              </div>

                              <div className="pt-2 border-t border-zinc-800/50 space-y-3">
                                {/* Opacity slider */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Opacidade / Mistura</span>
                                    <span className="text-[9px] font-bold text-theme-primary">{Math.round(layer.opacity * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="0.1" 
                                    max="1.0" 
                                    step="0.05" 
                                    value={layer.opacity} 
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      setBgLayers(prev => prev.map(l => l.id === layer.id ? { ...l, opacity: val } : l));
                                    }} 
                                    className="w-full accent-theme-primary" 
                                  />
                                </div>

                                {/* Zoom/Scale slider */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <span className="text-[9px] font-bold text-zinc-500 uppercase">Zoom</span>
                                    <span className="text-[9px] font-bold text-theme-primary">{Math.round(layer.scale * 100)}%</span>
                                  </div>
                                  <input 
                                    type="range" 
                                    min="1.0" 
                                    max="5.0" 
                                    step="0.05" 
                                    value={layer.scale} 
                                    onChange={e => {
                                      const val = parseFloat(e.target.value);
                                      setBgLayers(prev => prev.map(l => l.id === layer.id ? { ...l, scale: val } : l));
                                    }} 
                                    className="w-full accent-theme-primary" 
                                  />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Vertical</span>
                                      <span className="text-[9px] font-mono font-bold text-theme-primary">{layer.yOffset}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-500" 
                                      max="500" 
                                      step="5"
                                      value={layer.yOffset} 
                                      onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setBgLayers(prev => prev.map(l => l.id === layer.id ? { ...l, yOffset: val } : l));
                                      }} 
                                      className="w-full accent-theme-primary" 
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex justify-between items-center">
                                      <span className="text-[9px] font-bold text-zinc-500 uppercase">Horizontal</span>
                                      <span className="text-[9px] font-mono font-bold text-theme-primary">{layer.xOffset}px</span>
                                    </div>
                                    <input 
                                      type="range" 
                                      min="-500" 
                                      max="500" 
                                      step="5"
                                      value={layer.xOffset} 
                                      onChange={e => {
                                        const val = parseInt(e.target.value);
                                        setBgLayers(prev => prev.map(l => l.id === layer.id ? { ...l, xOffset: val } : l));
                                      }} 
                                      className="w-full accent-theme-primary" 
                                    />
                                  </div>
                                </div>
                                
                                <div className="flex items-center justify-between py-1 bg-zinc-900 px-2 rounded-xl border border-zinc-800/40">
                                  <span className="text-[9px] font-bold text-zinc-500 uppercase">Espelhar Foto</span>
                                  <button
                                    onClick={() => {
                                      setBgLayers(prev => prev.map(l => l.id === layer.id ? { ...l, mirror: !l.mirror } : l));
                                    }}
                                    className={cn(
                                      "flex items-center gap-1.5 py-1 px-2.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                      layer.mirror 
                                        ? "bg-theme-primary text-black border-theme-primary" 
                                        : "bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700"
                                    )}
                                  >
                                    <FlipHorizontal size={10} />
                                    {layer.mirror ? "Espelhada" : "Normal"}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="pt-4 border-t border-zinc-800 space-y-3">
                        <div>
                          <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Modelos de Fundo Modernos</p>
                          <p className="text-[8px] text-zinc-500 uppercase mt-0.5">Selecione um design de plano de fundo moderno e profissional</p>
                        </div>
                        <div className="grid grid-cols-3 gap-2.5 pt-1">
                          {BACKGROUND_TEMPLATES.map((bg) => (
                            <button
                              key={bg.id}
                              onClick={() => {
                                setSelectedBgUrl(bg.url);
                                toast.success(`Modelo "${bg.label}" ativado!`);
                              }}
                              className={cn(
                                "flex flex-col items-center p-2 rounded-2xl border text-center transition-all group overflow-hidden relative",
                                selectedBgUrl === bg.url 
                                  ? "bg-zinc-800 border-theme-primary" 
                                  : "bg-black/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
                              )}
                            >
                              <div className="w-full aspect-[4/5] rounded-xl overflow-hidden mb-1 relative border border-zinc-800/80 bg-zinc-950">
                                <img src={bg.url} alt={bg.label} className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-300" referrerPolicy="no-referrer" />
                                {selectedBgUrl === bg.url && (
                                  <div className="absolute inset-0 bg-theme-primary/15 flex items-center justify-center">
                                    <div className="bg-theme-primary text-black text-[7px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shadow-md">
                                      Ativo
                                    </div>
                                  </div>
                                )}
                              </div>
                              <span className={cn(
                                "text-[8px] font-bold tracking-tight block w-full truncate",
                                selectedBgUrl === bg.url ? "text-theme-primary" : "text-zinc-400 group-hover:text-white"
                              )}>
                                {bg.label}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="pt-4 border-t border-zinc-800">
                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest mb-4">Ajustar Estádio de Fundo (Padrão)</p>
                        <div className="pt-2 space-y-3">
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Zoom Padrão</span>
                              <span className="text-[9px] font-bold text-theme-primary">{Math.round(bgScale * 100)}%</span>
                            </div>
                            <input 
                              type="range" 
                              min="1.0" 
                              max="3.0" 
                              step="0.05" 
                              value={bgScale} 
                              onChange={e => setBgScale(parseFloat(e.target.value))} 
                              className="w-full accent-theme-primary" 
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Fundo Vertical</span>
                                <span className="text-[9px] font-mono font-bold text-theme-primary">{bgYOffset}px</span>
                              </div>
                              <input 
                                type="range" 
                                min="-300" 
                                max="300" 
                                step="5"
                                value={bgYOffset} 
                                onChange={e => setBgYOffset(parseInt(e.target.value))} 
                                className="w-full accent-theme-primary" 
                              />
                            </div>
                            <div className="space-y-1">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Fundo Horizontal</span>
                                <span className="text-[9px] font-mono font-bold text-theme-primary">{bgXOffset}px</span>
                              </div>
                              <input 
                                type="range" 
                                min="-300" 
                                max="300" 
                                step="5"
                                value={bgXOffset} 
                                onChange={e => setBgXOffset(parseInt(e.target.value))} 
                                className="w-full accent-theme-primary" 
                              />
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between py-1 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Espelhar Estádio de Fundo</span>
                            <button
                              onClick={() => setBgMirror(prev => !prev)}
                              className={cn(
                                "flex items-center gap-2 py-1.5 px-3 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border",
                                bgMirror 
                                  ? "bg-theme-primary text-black border-theme-primary" 
                                  : "bg-zinc-800 text-zinc-400 hover:text-white border-zinc-700"
                              )}
                            >
                              <FlipHorizontal size={12} />
                              {bgMirror ? "Sim, Espelhada" : "Não, Normal"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeControlTab === 'main_photo' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex flex-col items-center gap-3">
                        <div className={cn(
                          "w-32 aspect-[3/4] rounded-xl overflow-hidden border-4 border-black shadow-xl bg-zinc-800 relative",
                          !showMainPhoto && "opacity-20 grayscale"
                        )}>
                          {customMainPhoto ? (
                            <img src={customMainPhoto} className="w-full h-full object-cover" />
                          ) : selectedPerson.photo ? (
                            <img src={selectedPerson.photo} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-zinc-600">
                              <UserCircle size={40} />
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2 w-full">
                          <button 
                            onClick={() => setShowMainPhoto(!showMainPhoto)}
                            className={cn(
                              "w-full py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                              showMainPhoto ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-theme-primary border-theme-primary text-black"
                            )}
                          >
                            {showMainPhoto ? 'Ocultar Foto' : 'Mostrar Foto'}
                          </button>
                          <button 
                            onClick={() => setShowAthleteName(!showAthleteName)}
                            className={cn(
                              "w-full py-2 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                              showAthleteName ? "bg-zinc-800 border-zinc-700 text-zinc-400" : "bg-theme-primary border-theme-primary text-black"
                            )}
                          >
                            {showAthleteName ? 'Ocultar Nome' : 'Mostrar Nome'}
                          </button>
                        </div>
                      </div>

                      <div className="flex-1 space-y-4">
                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Controles da Foto Principal</p>
                        
                        <div className="space-y-4">
                          <label className="block bg-black border border-zinc-800 hover:border-theme-primary/50 p-4 rounded-2xl transition-all cursor-pointer text-center">
                            <Upload size={20} className="mx-auto mb-2 text-theme-primary" />
                            <p className="text-[10px] font-black text-white uppercase tracking-widest">Mudar Foto Principal</p>
                            <input type="file" accept="image/*" className="hidden" onChange={handleMainPhotoUpload} />
                          </label>

                          <div className="grid grid-cols-1 gap-4 pt-2">
                             <div className="space-y-1">
                              <div className="flex justify-between">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Tamanho</span>
                                <span className="text-[9px] font-bold text-theme-primary">{Math.round(photoScale * 100)}%</span>
                              </div>
                              <input type="range" min="0.5" max="2.5" step="0.05" value={photoScale} onChange={e => setPhotoScale(parseFloat(e.target.value))} className="w-full accent-theme-primary" />
                            </div>
                            <div className="flex gap-4">
                              <div className="flex-1 space-y-1">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Vertical</span>
                                <input type="range" min="-300" max="300" value={photoYOffset} onChange={e => setPhotoYOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                              </div>
                              <div className="flex-1 space-y-1">
                                <span className="text-[9px] font-bold text-zinc-500 uppercase">Horizontal</span>
                                <input type="range" min="-200" max="200" value={photoXOffset} onChange={e => setPhotoXOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                              </div>
                            </div>
                          </div>

                          <div className="pt-4 border-t border-zinc-800 space-y-3">
                            <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Estilo da Borda das Fotos</p>
                            <div className="grid grid-cols-2 gap-2">
                              {BORDER_THEMES.map((theme) => (
                                <button
                                  key={theme.id}
                                  onClick={() => setPhotoBorderTheme(theme.id)}
                                  className={cn(
                                    "flex flex-col items-center justify-center p-2.5 rounded-2xl border text-center transition-all relative group",
                                    photoBorderTheme === theme.id 
                                      ? "bg-zinc-800 border-theme-primary" 
                                      : "bg-black/40 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/30"
                                  )}
                                >
                                  <div className={cn("w-5 h-5 rounded-full mb-1 shadow-inner", theme.class)} />
                                  <span className={cn(
                                    "text-[8px] font-bold tracking-tight",
                                    photoBorderTheme === theme.id ? "text-theme-primary" : "text-zinc-400 group-hover:text-white"
                                  )}>
                                    {theme.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeControlTab === 'banner' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="flex items-center justify-between bg-zinc-950 p-4 rounded-2xl border border-zinc-800">
                      <span className="text-[10px] font-black uppercase text-zinc-400 tracking-widest">Nome do Atleta</span>
                      <button
                        onClick={() => setShowAthleteName(prev => !prev)}
                        className={cn(
                          "py-1.5 px-4 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                          showAthleteName ? "bg-theme-primary border-theme-primary text-black" : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white"
                        )}
                      >
                        {showAthleteName ? 'Ocultar Nome' : 'Mostrar Nome'}
                      </button>
                    </div>

                    <div className="bg-zinc-950 p-4 rounded-2xl border border-zinc-800 space-y-2">
                      <label className="block text-[10px] font-black uppercase text-theme-primary tracking-widest">Escrever / Alterar Nome no Encarte</label>
                      <input
                        type="text"
                        value={athleteName}
                        onChange={(e) => setAthleteName(e.target.value)}
                        placeholder="Nome personalizado..."
                        className="w-full px-4 py-2.5 bg-black border border-zinc-800 rounded-xl text-white text-xs font-bold focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Estilo do Nome</p>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { id: 'yellow', label: 'Amarelo' },
                            { id: 'white', label: 'Branco' },
                            { id: 'black', label: 'Preto' },
                            { id: 'red', label: 'Vermelho' },
                            { id: 'outline', label: 'Linha' },
                          ].map(style => (
                            <button
                              key={style.id}
                              onClick={() => setBannerStyle(style.id as any)}
                              className={cn(
                                "px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all",
                                bannerStyle === style.id 
                                  ? "bg-theme-primary border-theme-primary text-black" 
                                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-white"
                              )}
                            >
                              {style.label}
                            </button>
                          ))}
                        </div>

                        <div className="space-y-4 pt-4 border-t border-zinc-800">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Tamanho da Fonte</span>
                              <span className="text-[9px] font-bold text-theme-primary">{nameFontSize}px</span>
                            </div>
                            <input type="range" min="12" max="100" value={nameFontSize} onChange={e => setNameFontSize(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Inclinação</span>
                              <span className="text-[9px] font-bold text-theme-primary">{bannerSkew}°</span>
                            </div>
                            <input type="range" min="-45" max="45" value={bannerSkew} onChange={e => setBannerSkew(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Posicionamento</p>
                        <div className="space-y-4">
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Escala Banner</span>
                              <span className="text-[9px] font-bold text-theme-primary">{Math.round(bannerScale * 100)}%</span>
                            </div>
                            <input type="range" min="0.5" max="3" step="0.1" value={bannerScale} onChange={e => setBannerScale(parseFloat(e.target.value))} className="w-full accent-theme-primary" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Posição Vertical</span>
                            <input type="range" min="-400" max="500" value={nameYOffset} onChange={e => setNameYOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                          </div>
                          <div className="space-y-1">
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">Posição Horizontal</span>
                            <input type="range" min="-200" max="200" value={nameXOffset} onChange={e => setNameXOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeControlTab === 'layout' && (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                       <div className="space-y-4">
                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Cabeçalho (Parabéns/Escudo)</p>
                        <div className="space-y-3 p-4 bg-black/50 rounded-2xl border border-zinc-800">
                           <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Tamanho Texto</span>
                              <span className="text-[9px] font-bold text-theme-primary">{Math.round(congratsScale * 100)}%</span>
                            </div>
                            <input type="range" min="0.5" max="1.5" step="0.05" value={congratsScale} onChange={e => setCongratsScale(parseFloat(e.target.value))} className="w-full accent-theme-primary" />
                          </div>
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Texto V</span>
                              <input type="range" min="-200" max="300" value={congratsYOffset} onChange={e => setCongratsYOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Texto H</span>
                              <input type="range" min="-200" max="200" value={congratsXOffset} onChange={e => setCongratsXOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                            </div>
                          </div>
                          <div className="pt-2 border-t border-zinc-800">
                            <div className="flex justify-between mb-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Escudo V/H/T</span>
                            </div>
                            <div className="space-y-2">
                              <input type="range" min="-200" max="200" value={crestYOffset} onChange={e => setCrestYOffset(parseInt(e.target.value))} className="w-full accent-theme-primary mb-1" title="Vertical" />
                              <input type="range" min="-200" max="200" value={crestXOffset} onChange={e => setCrestXOffset(parseInt(e.target.value))} className="w-full accent-theme-primary mb-1" title="Horizontal" />
                              <input type="range" min="0.2" max="3" step="0.05" value={crestScale} onChange={e => setCrestScale(parseFloat(e.target.value))} className="w-full accent-theme-primary" title="Tamanho" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Rodapé (Mensagem)</p>
                        <div className="space-y-4">
                          <textarea 
                            rows={3}
                            value={footerMessage} 
                            onChange={(e) => setFooterMessage(e.target.value)}
                            placeholder="Mensagem do rodapé..."
                            className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-2xl text-white text-[11px] font-medium focus:ring-2 focus:ring-theme-primary focus:border-theme-primary transition-all resize-none shadow-inner"
                          />
                          <div className="flex gap-4">
                            <div className="flex-1 space-y-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Mensagem V</span>
                              <input type="range" min="-100" max="100" value={footerYOffset} onChange={e => setFooterYOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                            </div>
                            <div className="flex-1 space-y-1">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Mensagem H</span>
                              <input type="range" min="-100" max="100" value={footerXOffset} onChange={e => setFooterXOffset(parseInt(e.target.value))} className="w-full accent-theme-primary" />
                            </div>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-[9px] font-bold text-zinc-500 uppercase">Tamanho da Fonte</span>
                              <span className="text-[9px] font-bold text-theme-primary">{footerFontSize}px</span>
                            </div>
                            <input 
                              type="range" 
                              min="6" 
                              max="24" 
                              value={footerFontSize} 
                              onChange={e => setFooterFontSize(parseInt(e.target.value))} 
                              className="w-full accent-theme-primary" 
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-zinc-800 flex justify-center">
                      <button 
                        onClick={() => {
                          setNameXOffset(0);
                          setNameYOffset(0);
                          setBannerScale(1);
                          setNameFontSize(32);
                          setBannerSkew(-15);
                          setFooterYOffset(0);
                          setFooterXOffset(0);
                          setFooterFontSize(10);
                          setPhotoScale(1);
                          setPhotoYOffset(0);
                          setPhotoXOffset(0);
                          setCongratsScale(1);
                          setCongratsXOffset(0);
                          setCongratsYOffset(0);
                          setCrestXOffset(0);
                          setCrestYOffset(0);
                          setCrestScale(1);
                          setShowMainPhoto(true);
                          setShowAthleteName(true);
                          setBgScale(1);
                          setBgMirror(false);
                          setBgXOffset(0);
                          setBgYOffset(0);
                          setBgLayers([]);
                          setSelectedBgUrl('https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&q=80&w=1080&h=1920');
                          setSupportPhotoScales([1, 1, 1, 1]);
                          setSupportPhotoXOffsets([0, 0, 0, 0]);
                          setSupportPhotoYOffsets([0, 0, 0, 0]);
                          setFooterMessage("A escolinha Piruá Esporte Clube te deseja um feliz aniversário! Que Deus ilumine sempre sua vida, muita paz e saúde.");
                        }}
                        className="py-2 px-6 bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >
                        Resetar Todos Ajustes
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons for Desktop */}
            <div className="hidden lg:flex flex-wrap justify-center gap-4 mt-2">
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
                  className="flex i flex items-center justify-center gap-2 px-6 py-4 bg-theme-primary text-black font-black rounded-xl hover:opacity-90 transition-colors disabled:opacity-50 uppercase text-sm tracking-tighter shadow-[0_10px_20px_rgba(234,179,8,0.3)]"
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
                  Legenda
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}
