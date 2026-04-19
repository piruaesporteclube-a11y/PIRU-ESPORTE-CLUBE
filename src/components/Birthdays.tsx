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
          // Fix for oklch error in html2canvas (unsupported color function)
          // We wrap in try-catch and check for SecurityError when accessing rules
          try {
            Array.from(clonedDoc.styleSheets).forEach(sheet => {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) return;
                for (let j = rules.length - 1; j >= 0; j--) {
                  if (rules[j] && rules[j].cssText && rules[j].cssText.includes('oklch')) {
                    sheet.deleteRule(j);
                  }
                }
              } catch (e) {
                // This happens for cross-origin stylesheets (SecurityError)
                console.warn('Could not access rules for stylesheet:', e);
              }
            });
          } catch (e) {
            console.warn('Could not sanitize stylesheets for oklch:', e);
          }

          const clonedElement = clonedDoc.getElementById('birthday-card');
          if (clonedElement) {
            // Further protect the cloned element by using explicit hex colors for problematic areas
            (clonedElement as HTMLElement).style.backgroundColor = '#000000';
            
            // Remove animations and complex effects that break html2canvas
            const animatedElements = clonedElement.querySelectorAll('.animate-spin-slow, .animate-spin-slow-reverse, .animate-pulse');
            animatedElements.forEach(el => {
              (el as HTMLElement).style.animation = 'none';
              (el as HTMLElement).style.transition = 'none';
              (el as HTMLElement).style.transform = 'none';
            });
            
            // Remove the scanline effect which uses complex gradients that often fail
            const scanline = clonedDoc.querySelector('.bg-\\[linear-gradient');
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

  const BIRTHDAY_TEMPLATE_IMAGE = "https://firebasestorage.googleapis.com/v0/b/fire-template-6gjyxy/o/pirua%2Fencarte-aniversario.jpg?alt=media"; // Placeholder for the provided image URL
  
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
            
            {/* Comic Style Birthday Card - High Fidelity Recreation */}
            <div 
              id="birthday-card" 
              className="w-[360px] h-[640px] md:w-[450px] md:h-[800px] overflow-hidden relative shadow-2xl flex flex-col group bg-[#111827] font-sans" 
            >
              {/* High-Fidelity Comic Background Recreation */}
              <div className="absolute inset-0 z-0 bg-[#065f46]">
                {/* Stadium Lights / Crowd Pattern */}
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.2) 2px, transparent 0)', backgroundSize: '30px 30px' }}></div>
                
                {/* Field & Goal */}
                <div className="absolute bottom-0 left-0 right-0 h-[40%] bg-[linear-gradient(to_bottom,#10b981,#065f46)] border-t-4 border-white/20">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[60%] h-full border-2 border-white/30 rounded-t-full"></div>
                </div>

                {/* Comic Bursts */}
                <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[40%] bg-yellow-500 transform rotate-12 -skew-x-12 opacity-90"></div>
                <div className="absolute top-[-5%] left-[-5%] w-[40%] h-[30%] bg-yellow-400 transform -rotate-6 skew-x-6 opacity-80"></div>
              </div>

              {/* Dynamic Content Overlay */}
              <div className="relative flex-1 z-20 flex flex-col h-full p-4 pointer-events-none">
                
                {/* Header: FELIZ ANIVERSÁRIO */}
                <div className="text-center mt-6 space-y-[-10px] transform -rotate-2">
                  <h2 className="text-5xl md:text-7xl font-black text-white italic tracking-tighter drop-shadow-[0_8px_0_rgba(0,0,0,1)] uppercase">
                    FELIZ
                  </h2>
                  <h2 className="text-4xl md:text-6xl font-black text-yellow-400 italic tracking-tighter drop-shadow-[0_8px_0_rgba(0,0,0,1)] uppercase">
                    ANIVERSÁRIO!
                  </h2>
                </div>

                {/* Banner: PARABÉNS CAMPEÃO */}
                <div className="mt-4 flex justify-center">
                  <div className="bg-yellow-400 border-4 border-black px-6 py-2 transform rotate-1 shadow-[8px_8px_0_rgba(0,0,0,1)] flex items-center gap-3">
                    <Cake size={20} className="text-black" />
                    <span className="text-black font-black text-lg md:text-xl uppercase tracking-tighter italic">PARABÉNS, CAMPEÃO!</span>
                  </div>
                </div>

                {/* Middle Section: Player Interaction */}
                <div className="flex-1 relative mt-8">
                  {/* Team Crest - Floating left */}
                  <div className="absolute top-0 left-0">
                    <div className="w-20 h-20 bg-yellow-400 p-1 rounded-2xl shadow-[8px_8px_0_rgba(0,0,0,1)] border-4 border-black relative">
                      {settings.schoolCrest ? (
                        <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                      ) : (
                        <div className="w-full h-full bg-black rounded-xl flex items-center justify-center text-yellow-500 font-black text-3xl">P</div>
                      )}
                      
                      {/* Badge Crown */}
                      <div className="absolute -top-6 -right-6 text-yellow-400 transform rotate-12 drop-shadow-[2px_2px_0_rgba(0,0,0,1)]">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="currentColor"><path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" /></svg>
                      </div>
                    </div>
                  </div>

                  {/* Photo Frame - Big square on the right */}
                  <div className="absolute right-0 top-10 w-[180px] h-[240px] md:w-[220px] md:h-[300px] bg-zinc-900 border-8 border-black shadow-[12px_12px_0_rgba(0,0,0,1)] overflow-hidden transform rotate-2">
                    {selectedPerson.photo ? (
                      <img src={selectedPerson.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" crossOrigin="anonymous" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-700 bg-[#1a1a1a]">
                        <UserCircle size={100} strokeWidth={1} />
                      </div>
                    )}
                    {/* Header Label inside frame */}
                    <div className="absolute top-0 left-0 right-0 py-1 bg-black/60 text-center">
                      <span className="text-[10px] text-yellow-400 font-black uppercase tracking-widest">FOTO DO ATLETA</span>
                    </div>
                  </div>

                  {/* Name Label - Below Photo */}
                  <div className="absolute right-[-10px] top-[260px] md:top-[330px] w-full text-right pointer-events-none">
                    <div className="bg-black border-4 border-yellow-400 px-6 py-2 inline-block shadow-[8px_8px_0_rgba(0,0,0,0.5)] transform -rotate-2 min-w-[200px]">
                      <h3 className="text-white font-black text-xl md:text-2xl uppercase tracking-tighter leading-none italic truncate">
                        {selectedPerson.name}
                      </h3>
                      <p className="text-yellow-400 text-[10px] font-black uppercase text-center mt-1 tracking-widest">Aniversariante do Mês</p>
                    </div>
                  </div>

                  {/* Cartoon Cake - Bottom Left */}
                  <div className="absolute bottom-4 left-0 transform -rotate-6 animate-bounce-slow">
                    <div className="text-5xl md:text-7xl drop-shadow-[4px_4px_0_rgba(0,0,0,1)]">🎂</div>
                    <div className="absolute -top-4 -right-4 bg-yellow-400 text-black text-[10px] font-black px-2 py-1 border-2 border-black rounded-lg transform rotate-12">YAY!</div>
                  </div>
                </div>

                {/* Footer Message */}
                <div className="mt-auto mb-6 px-4">
                  <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0_rgba(0,0,0,1)] transform rotate-1">
                    <p className="text-[11px] md:text-[13px] text-black font-black uppercase tracking-tight leading-relaxed italic text-center">
                      "A escolinha <span className="text-emerald-700">Piruá Esporte Clube</span> deseja a você um feliz aniversário! Que Deus ilumine sempre sua vida, muita paz e saúde."
                    </p>
                  </div>
                </div>
              </div>

              {/* Halftone / Comic Texture Overlays */}
              <div className="absolute inset-0 pointer-events-none z-30 opacity-10 mix-blend-overlay">
                <div className="w-full h-full" style={{ backgroundImage: 'radial-gradient(black 1px, transparent 0)', backgroundSize: '10px 10px' }}></div>
              </div>
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
