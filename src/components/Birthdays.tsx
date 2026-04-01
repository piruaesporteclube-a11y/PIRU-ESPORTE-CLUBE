import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor } from '../types';
import { Cake, Instagram, Share2, Download, UserCircle, Calendar, Printer } from 'lucide-react';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';

export default function Birthdays() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const { settings } = useTheme();
  const [selectedPerson, setSelectedPerson] = useState<Athlete | Professor | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [a, p] = await Promise.all([api.getAthletes(), api.getProfessors()]);
    setAthletes(a);
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

  const downloadCard = async () => {
    const element = document.getElementById('birthday-card');
    if (!element) return;

    try {
      setIsGenerating(true);
      const canvas = await html2canvas(element, {
        useCORS: true,
        scale: 3, // Higher scale for better quality
        backgroundColor: '#000000'
      });
      const link = document.createElement('a');
      link.download = `parabens-${selectedPerson?.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success("Imagem de aniversário gerada com sucesso!");
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      toast.error('Erro ao gerar imagem. Tente novamente.');
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
            
            {/* The Post Layout (Strictly faithful to the user's image) */}
            <div 
              id="birthday-card" 
              className="w-[450px] h-[675px] md:w-[540px] md:h-[810px] overflow-hidden relative shadow-2xl flex flex-col group bg-black font-sans italic" 
            >
              {/* Background Image (Stadium with Cleats/Net style) */}
              <div className="absolute inset-0 z-0">
                <img 
                  src="https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2076&auto=format&fit=crop" 
                  alt="Stadium Background" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* Darkening overlays to match the contrast of the original image */}
                <div className="absolute inset-0 bg-black/50"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/70"></div>
              </div>

              {/* Gold Confetti at the top */}
              <div className="absolute top-0 left-0 w-full h-40 pointer-events-none z-10 overflow-hidden">
                {[...Array(40)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-1.5 h-1.5 bg-yellow-500 rounded-sm rotate-45 animate-pulse"
                    style={{
                      top: `${Math.random() * 100}%`,
                      left: `${Math.random() * 100}%`,
                      opacity: Math.random() * 0.8,
                      animationDelay: `${Math.random() * 3}s`
                    }}
                  />
                ))}
              </div>

              <div className="relative flex-1 flex flex-col items-center justify-between p-6 md:p-10 z-20">
                {/* Top: FELIZ, ANIVERSÁRIO! */}
                <div className="text-center mt-6 w-full">
                  <h1 className="text-5xl md:text-7xl font-black text-white uppercase tracking-tighter leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]">
                    FELIZ,
                  </h1>
                  <div className="relative inline-block">
                    <h1 className="text-5xl md:text-7xl font-black italic tracking-tighter leading-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                        style={{ 
                          background: 'linear-gradient(to bottom, #fef08a, #eab308, #a16207)',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}>
                      ANIVERSÁRIO!
                    </h1>
                    {/* The Swoosh Underline */}
                    <div className="absolute -bottom-2 left-0 w-full h-1.5 md:h-2 bg-yellow-500 rounded-full shadow-[0_2px_10px_rgba(234,179,8,0.5)]"></div>
                  </div>
                </div>

                {/* Middle Section: Message & Polaroid Photo */}
                <div className="w-full flex items-center justify-between gap-4 mt-8">
                  {/* Left Message */}
                  <div className="w-[45%] text-left">
                    <p className="text-white font-black italic text-base md:text-2xl leading-tight uppercase tracking-tighter drop-shadow-lg">
                      QUE SEU DIA SEJA TÃO ESPECIAL QUANTO UM <span className="text-yellow-400">GOLAÇO</span> NOS ACRÉSCIMOS!
                    </p>
                  </div>

                  {/* Polaroid Photo Frame */}
                  <div className="relative rotate-6 group-hover:rotate-0 transition-transform duration-500">
                    <div className="bg-white p-2 pb-12 md:p-3 md:pb-16 shadow-[0_20px_50px_rgba(0,0,0,0.6)] rounded-sm border border-zinc-200">
                      <div className="w-36 h-44 md:w-56 md:h-64 bg-zinc-900 overflow-hidden">
                        {selectedPerson.photo ? (
                          <img src={selectedPerson.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-zinc-800">
                            <UserCircle size={80} strokeWidth={1} />
                          </div>
                        )}
                      </div>
                      {/* Name on the Polaroid bottom */}
                      <div className="absolute bottom-2 md:bottom-4 left-0 w-full text-center px-2">
                        <p className="text-[10px] md:text-xs font-black text-zinc-800 uppercase tracking-widest truncate">
                          {selectedPerson.name}
                        </p>
                      </div>
                    </div>
                    
                    {/* School Crest Seal - Positioned like a sticker */}
                    <div className="absolute -top-4 -left-4 w-12 h-12 md:w-16 md:h-16 bg-white rounded-full p-1.5 shadow-xl border border-zinc-200 z-30 -rotate-12">
                      {settings.schoolCrest ? (
                        <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-theme-primary rounded-full flex items-center justify-center text-black font-black text-[10px]">P</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Section: Final Message & Icons */}
                <div className="w-full mt-auto pt-10 relative">
                  {/* Soccer Ball Decoration (Bottom Left) */}
                  <div className="absolute bottom-0 left-0 opacity-20 grayscale">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
                      <circle cx="12" cy="12" r="10" />
                      <path d="m12 2-2 3.5h4L12 2Z" />
                      <path d="m10 5.5-4 1.5L4 11l6-1 2-4.5Z" />
                    </svg>
                  </div>

                  <div className="text-center max-w-[90%] mx-auto mb-4">
                    <p className="text-yellow-400 font-black italic text-xs md:text-lg leading-tight uppercase tracking-widest drop-shadow-md">
                      QUE VENHAM MUITAS VITÓRIAS, CONQUISTAS E MUITOS GOLS! VOCÊ MERECE TUDO DE MELHOR!
                    </p>
                  </div>
                  
                  {/* Heart Icon (Bottom Right) */}
                  <div className="absolute bottom-0 right-0">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#eab308" className="drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Edge Lighting Accents */}
              <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent"></div>
              <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent"></div>
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <button 
                onClick={downloadCard}
                disabled={isGenerating}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50"
              >
                <Download size={20} className={isGenerating ? "animate-bounce" : ""} />
                {isGenerating ? 'Gerando...' : 'Salvar Imagem'}
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success('Link copiado para compartilhar!');
                }}
                className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black font-black rounded-xl hover:opacity-90 transition-colors"
              >
                <Share2 size={20} />
                Compartilhar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
