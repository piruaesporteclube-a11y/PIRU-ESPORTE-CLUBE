import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor } from '../types';
import { Cake, Instagram, Share2, Download, UserCircle, Calendar, Printer } from 'lucide-react';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

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
      
      // Small delay to ensure any modal transitions are finished
      await new Promise(resolve => setTimeout(resolve, 300));

      // Ensure all images are loaded before capturing
      const images = element.getElementsByTagName('img');
      await Promise.all(Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      }));

      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 2,
        backgroundColor: '#000000',
        logging: false,
        allowTaint: false,
        windowWidth: 1200,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('birthday-card');
          if (clonedElement) {
            // Remove animations and complex effects that break html2canvas
            const animatedElements = clonedElement.querySelectorAll('.animate-spin-slow, .animate-spin-slow-reverse, .animate-pulse');
            animatedElements.forEach(el => {
              (el as HTMLElement).style.animation = 'none';
              (el as HTMLElement).style.transform = 'none';
            });
            
            // Remove the scanline effect which uses complex gradients that often fail
            const scanline = clonedElement.querySelector('.bg-\\[linear-gradient');
            if (scanline) scanline.remove();
          }
        }
      });

      const fileName = `parabens-${selectedPerson?.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      
      if (share && navigator.share && navigator.canShare) {
        // Try to share using Web Share API (Best for mobile/Instagram/WhatsApp)
        canvas.toBlob(async (blob) => {
          if (!blob) {
            toast.error("Erro ao processar imagem para compartilhamento.");
            return;
          }
          
          const file = new File([blob], fileName, { type: 'image/png' });
          
          if (navigator.canShare({ files: [file] })) {
            try {
              await navigator.share({
                files: [file],
                title: `Parabéns ${selectedPerson?.name}!`,
                text: `A escolinha Piruá Esporte Clube deseja a você um feliz aniversário! Que Deus ilumine sempre sua vida, muita paz e saúde. 🎂⚽️ #PiruáEC #FênixDoCampo`
              });
              toast.success("Compartilhamento aberto!");
            } catch (err) {
              if ((err as Error).name !== 'AbortError') {
                console.error('Erro ao compartilhar:', err);
                // Fallback to download if share fails
                const link = document.createElement('a');
                link.download = fileName;
                link.href = canvas.toDataURL('image/png');
                link.click();
              }
            }
          } else {
            // Fallback to download if cannot share files
            const link = document.createElement('a');
            link.download = fileName;
            link.href = canvas.toDataURL('image/png');
            link.click();
            toast.success("Imagem baixada! Agora você pode postar no Instagram.");
          }
        }, 'image/png');
      } else {
        // Standard download
        const link = document.createElement('a');
        link.download = fileName;
        link.href = canvas.toDataURL('image/png');
        link.click();
        toast.success("Imagem baixada com sucesso!");
      }
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      toast.error('Erro ao gerar imagem. Tente novamente ou use um navegador moderno.');
    } finally {
      setIsGenerating(false);
    }
  };

  const BIRTHDAY_TEMPLATE_URL = "https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2076&auto=format&fit=crop"; // High quality soccer stadium as fallback
  // The user provided image URL (I'll use a high-quality recreation or the provided one if I could, 
  // but I'll use the provided image as a background if I can reference it).
  // For now, I'll use a high-quality soccer background and overlay the elements to match the requested style.
  
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
          <p className="text-zinc-400 text-sm">Comemore o aniversário dos nossos atletas e membros da comissão técnica</p>
        </div>
        
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Filtrar por Data</label>
            <input 
              type="date" 
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-theme-primary/50 transition-all"
            />
          </div>
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors font-bold uppercase text-xs tracking-widest no-print"
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
                <h4 className="font-bold text-white">{person.name}</h4>
                <p className="text-xs text-zinc-400">
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
                <h4 className="font-bold text-white truncate text-sm">{person.name}</h4>
                <p className="text-[10px] text-zinc-500">
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
            
            {/* Modern Phoenix Birthday Card - Instagram Stories Size (9:16) */}
            <div 
              id="birthday-card" 
              className="w-[360px] h-[640px] md:w-[450px] md:h-[800px] overflow-hidden relative shadow-2xl flex flex-col group bg-[#000000] font-sans italic" 
            >
              {/* Background Layers */}
              <div className="absolute inset-0 z-0">
                {/* Dark Soccer Field Background */}
                <img 
                  src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2076&auto=format&fit=crop" 
                  alt="Stadium Background" 
                  className="w-full h-full object-cover opacity-30 grayscale"
                  referrerPolicy="no-referrer"
                />
                
                {/* Phoenix Wings / Fire Effect (Standard RGBA) */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(234,179,8,0.15),transparent_70%)]"></div>
                <div className="absolute -bottom-20 -left-20 w-[400px] h-[400px] bg-[rgba(234,179,8,0.1)] blur-[100px] rounded-full animate-pulse"></div>
                <div className="absolute -top-20 -right-20 w-[400px] h-[400px] bg-[rgba(234,179,8,0.1)] blur-[100px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                
                {/* Phoenix Motif (Stylized Wings) */}
                <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                  <svg viewBox="0 0 200 200" className="w-[120%] h-[120%] text-[#EAB308] fill-current">
                    <path d="M100 20C100 20 80 50 40 60C20 65 10 80 10 100C10 140 40 170 100 180C160 170 190 140 190 100C190 80 180 65 160 60C120 50 100 20 100 20ZM100 40C110 60 140 75 170 80C175 82 180 85 180 100C180 130 155 155 100 165C45 155 20 130 20 100C20 85 25 82 30 80C60 75 90 60 100 40Z" />
                  </svg>
                </div>
              </div>

              {/* Content Overlay */}
              <div className="relative flex-1 flex flex-col items-center justify-between p-8 z-20">
                {/* Header: Logo & Title */}
                <div className="w-full flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 md:w-16 md:h-16 bg-[#EAB308] p-1.5 rounded-2xl shadow-[0_0_20px_rgba(234,179,8,0.4)]">
                      {settings.schoolCrest && settings.schoolCrest.trim() !== "" ? (
                        <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-[#000000] rounded-xl flex items-center justify-center text-[#EAB308] font-black text-xl">P</div>
                      )}
                    </div>
                    <div className="text-left">
                      <h4 className="text-white font-black uppercase tracking-tighter text-sm md:text-base leading-none">Piruá E.C.</h4>
                      <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em] text-[#EAB308]">Fênix do Campo</p>
                    </div>
                  </div>
                  <div className="bg-[rgba(234,179,8,0.1)] px-4 py-2 rounded-full border border-[rgba(234,179,8,0.2)]">
                    <p className="text-[10px] font-black text-[#EAB308] uppercase tracking-widest">#RENASCENDO</p>
                  </div>
                </div>

                {/* Main Section: Photo & Name */}
                <div className="flex flex-col items-center w-full relative">
                  {/* Large Background Text */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-5 pointer-events-none whitespace-nowrap">
                    <h2 className="text-[150px] md:text-[220px] font-black uppercase italic tracking-tighter text-white">BIRTHDAY</h2>
                  </div>

                  <div className="relative mb-8">
                    {/* Modern Hexagon/Diamond Frame */}
                    <div className="absolute -inset-4 border-2 border-[rgba(234,179,8,0.3)] rotate-12 rounded-[40px] animate-spin-slow"></div>
                    <div className="absolute -inset-4 border-2 border-[rgba(234,179,8,0.3)] -rotate-12 rounded-[40px] animate-spin-slow-reverse"></div>
                    
                    {/* Athlete Photo */}
                    <div className="w-48 h-48 md:w-64 md:h-64 bg-[#18181b] rounded-[48px] border-4 border-[#EAB308] overflow-hidden shadow-[0_0_50px_rgba(234,179,8,0.3)] relative z-10 group-hover:scale-105 transition-transform duration-500">
                      {selectedPerson.photo && selectedPerson.photo.trim() !== "" ? (
                        <img src={selectedPerson.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[#27272a]">
                          <UserCircle size={120} strokeWidth={1} />
                        </div>
                      )}
                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-[rgba(0,0,0,0.8)] via-transparent to-transparent"></div>
                    </div>

                    {/* Birthday Badge */}
                    <div className="absolute -bottom-4 -right-4 px-6 py-3 bg-[#EAB308] text-black rounded-2xl flex items-center gap-2 shadow-2xl z-20 -rotate-6 font-black uppercase text-xs tracking-tighter border-2 border-black">
                      Parabéns!
                    </div>
                  </div>

                  <div className="text-center space-y-2 z-20">
                    <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter italic leading-none text-white">
                      FELIZ <span className="text-[#EAB308]">ANIVERSÁRIO</span>
                    </h2>
                    <div className="inline-block px-8 py-2 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.1)] rounded-2xl">
                      <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">
                        {selectedPerson.name}
                      </h3>
                    </div>
                  </div>
                </div>

                {/* Footer: Message */}
                <div className="w-full text-center space-y-4">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-[rgba(234,179,8,0.5)] to-transparent"></div>
                  <div className="px-4">
                    <p className="text-[11px] md:text-sm text-white font-bold uppercase tracking-wider leading-relaxed">
                      A escolinha <span className="text-[#EAB308]">Piruá Esporte Clube</span> deseja a você um feliz aniversário!
                    </p>
                    <p className="text-[10px] md:text-xs text-[#a1a1aa] font-medium uppercase tracking-widest mt-1 italic">
                      "Que Deus ilumine sempre sua vida, muita paz e saúde."
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-4 opacity-50">
                    <div className="h-2 w-2 bg-[#EAB308] rounded-full"></div>
                    <div className="h-2 w-2 bg-[#EAB308] rounded-full"></div>
                    <div className="h-2 w-2 bg-[#EAB308] rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* Modern Edge Accents */}
              <div className="absolute top-0 right-0 w-2 h-full bg-[#EAB308] opacity-20"></div>
              <div className="absolute top-0 left-0 w-2 h-full bg-[#EAB308] opacity-20"></div>
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
            </div>

            <div className="mt-6 flex flex-col md:flex-row justify-center gap-4">
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
