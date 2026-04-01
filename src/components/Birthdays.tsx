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
        scale: 2,
        backgroundColor: settings.secondaryColor
      });
      const link = document.createElement('a');
      link.download = `parabens-${selectedPerson?.name.toLowerCase().replace(/\s+/g, '-')}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success("Imagem gerada com sucesso!");
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      toast.error('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

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
            
            {/* The Post Layout (1080x1080 aspect for Instagram) */}
            <div 
              id="birthday-card" 
              className="w-[350px] h-[350px] md:w-[600px] md:h-[600px] overflow-hidden relative shadow-2xl flex flex-col group" 
              style={{ backgroundColor: settings.secondaryColor }}
            >
              {/* Background Layers */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Football Field Background Image */}
                <div className="absolute inset-0 opacity-40 mix-blend-overlay">
                  <img 
                    src="https://images.unsplash.com/photo-1556056504-5c7696c4c28d?q=80&w=2076&auto=format&fit=crop" 
                    alt="Football Field" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>

                {/* Main Gradient Overlay */}
                <div 
                  className="absolute inset-0 opacity-70" 
                  style={{ 
                    background: `linear-gradient(135deg, ${settings.secondaryColor}, transparent, ${settings.primaryColor}22)` 
                  }}
                ></div>
                
                {/* Field Lines (Decorative) */}
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-full bg-white/40"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/40 rounded-full"></div>
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 bg-white/60 rounded-full shadow-[0_0_10px_white]"></div>
                  
                  {/* Penalty Areas */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-24 border-b-2 border-x-2 border-white/20"></div>
                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-24 border-t-2 border-x-2 border-white/20"></div>
                </div>

                {/* Stadium Lights Effect */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 blur-3xl rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2"></div>
                
                {/* Goal Post (Decorative SVG) */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-32 opacity-10 pointer-events-none">
                  <svg width="100%" height="100%" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <path d="M50,100 L50,20 L350,20 L350,100" stroke="white" strokeWidth="2" fill="none" />
                    <path d="M50,20 L350,20" stroke="white" strokeWidth="4" fill="none" opacity="0.5" />
                    {/* Net Pattern */}
                    <defs>
                      <pattern id="net" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
                        <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" opacity="0.3"/>
                      </pattern>
                    </defs>
                    <rect x="50" y="20" width="300" height="80" fill="url(#net)" />
                  </svg>
                </div>

                {/* Grass Texture Overlay */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 0)', backgroundSize: '20px 20px' }}></div>

                {/* Floating Soccer Balls (Decorative SVGs) */}
                <div className="absolute top-20 left-10 opacity-10 rotate-12 animate-bounce-slow">
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m12 2-2 3.5h4L12 2Z" />
                    <path d="m10 5.5-4 1.5L4 11l6-1 2-4.5Z" />
                    <path d="m14 5.5 4 1.5 2 4-6-1-2-4.5Z" />
                    <path d="M10 10 4 11l2 5 4-1V10Z" />
                    <path d="M14 10 20 11l-2 5-4-1V10Z" />
                    <path d="m10 15 2 3 2-3-4 0Z" />
                    <path d="m10 15-4 1 1 4 3-5Z" />
                    <path d="m14 15 4 1-1 4-3-5Z" />
                    <path d="m12 18 0 4" />
                  </svg>
                </div>
                <div className="absolute bottom-40 right-10 opacity-10 -rotate-12 animate-pulse">
                  <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <path d="m12 2-2 3.5h4L12 2Z" />
                    <path d="m10 5.5-4 1.5L4 11l6-1 2-4.5Z" />
                    <path d="m14 5.5 4 1.5 2 4-6-1-2-4.5Z" />
                    <path d="M10 10 4 11l2 5 4-1V10Z" />
                    <path d="M14 10 20 11l-2 5-4-1V10Z" />
                    <path d="m10 15 2 3 2-3-4 0Z" />
                    <path d="m10 15-4 1 1 4 3-5Z" />
                    <path d="m14 15 4 1-1 4-3-5Z" />
                    <path d="m12 18 0 4" />
                  </svg>
                </div>

                {/* Animated Blobs */}
                <div 
                  className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 animate-pulse" 
                  style={{ backgroundColor: settings.primaryColor }}
                ></div>
                <div 
                  className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full blur-[120px] opacity-30 animate-pulse" 
                  style={{ backgroundColor: settings.primaryColor }}
                ></div>

                {/* Large Decorative Text (Background) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-15deg] opacity-[0.03] whitespace-nowrap select-none">
                  <p className="text-[300px] font-black uppercase leading-none tracking-tighter italic">PIRUÁ</p>
                </div>
              </div>

              <div className="relative flex-1 flex flex-col items-center justify-between p-6 md:p-10 z-10">
                {/* Header: Crest & School Name */}
                <div className="w-full flex items-center justify-between">
                  <div className="flex items-center gap-3 bg-black/40 backdrop-blur-xl p-2 md:p-3 rounded-2xl border border-white/10 shadow-2xl">
                    <div className="w-10 h-10 md:w-14 md:h-14 bg-white p-1.5 rounded-xl shadow-inner">
                      {settings.schoolCrest ? (
                        <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full bg-theme-primary rounded-lg flex items-center justify-center text-black font-black text-lg">P</div>
                      )}
                    </div>
                    <div className="text-left pr-2">
                      <h4 className="text-white font-black uppercase tracking-tighter text-xs md:text-sm leading-none">Piruá Esporte Clube</h4>
                      <p className="text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: settings.primaryColor }}>Formando Campeões</p>
                    </div>
                  </div>

                  <div className="bg-black/40 backdrop-blur-xl px-4 py-2 rounded-2xl border border-white/10 shadow-2xl">
                    <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">#ANIVERSARIANTE</p>
                  </div>
                </div>

                {/* Center: Photo & Name */}
                <div className="flex flex-col items-center w-full relative">
                  {/* Large "FELIZ" background text */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none">
                    <h2 className="text-[120px] md:text-[200px] font-black uppercase italic tracking-tighter text-white">FELIZ</h2>
                  </div>

                  <div className="relative mb-6 md:mb-10">
                    {/* Decorative Hexagon Frame */}
                    <div className="absolute -inset-4 md:-inset-8 border-2 border-white/10 rotate-45 rounded-[40px]"></div>
                    <div className="absolute -inset-4 md:-inset-8 border-2 border-white/10 -rotate-45 rounded-[40px]"></div>
                    
                    {/* Main Photo Container with Modern Mask */}
                    <div 
                      className="w-48 h-48 md:w-72 md:h-72 bg-zinc-900 rounded-[48px] border-[8px] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.8)] relative z-10 rotate-3 group-hover:rotate-0 transition-transform duration-500" 
                      style={{ borderColor: 'white' }}
                    >
                      {selectedPerson.photo ? (
                        <img src={selectedPerson.photo} className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-700" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-700">
                          <UserCircle size={120} strokeWidth={1} />
                        </div>
                      )}
                      
                      {/* Photo Overlay Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                    </div>

                    {/* Birthday Badge - Modern Pill Style */}
                    <div 
                      className="absolute -bottom-4 -right-4 px-6 py-3 rounded-2xl flex items-center gap-2 shadow-2xl z-20 -rotate-6 border-2 border-white"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      <Cake size={20} className="text-black" />
                      <p className="text-xs md:text-sm font-black text-black uppercase tracking-tighter">PARABÉNS!</p>
                    </div>
                  </div>

                  <div className="text-center space-y-2 w-full z-20">
                    <h2 className="text-4xl md:text-7xl font-black uppercase tracking-tighter italic leading-none text-white drop-shadow-2xl">
                      FELIZ <span style={{ color: settings.primaryColor }}>ANIVERSÁRIO</span>
                    </h2>
                    
                    <div className="flex items-center gap-4 justify-center">
                      <div className="h-px flex-1 bg-gradient-to-r from-transparent to-white/20"></div>
                      <h3 className="text-xl md:text-4xl font-black text-white uppercase tracking-tight bg-black/40 backdrop-blur-md px-6 py-2 rounded-xl border border-white/10 shadow-xl">
                        {selectedPerson.name}
                      </h3>
                      <div className="h-px flex-1 bg-gradient-to-l from-transparent to-white/20"></div>
                    </div>
                  </div>
                </div>

                {/* Footer: Message */}
                <div className="w-full relative">
                  {/* Decorative Field Lines */}
                  <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 border border-white/5 rounded-full"></div>

                  <div className="w-full text-center bg-black/40 backdrop-blur-xl p-4 md:p-6 rounded-[32px] border border-white/10 shadow-2xl relative overflow-hidden">
                    {/* Corner Accents */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-theme-primary/30 rounded-tl-2xl"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-theme-primary/30 rounded-br-2xl"></div>

                    <p className="text-xs md:text-base text-zinc-100 font-bold max-w-[90%] mx-auto italic leading-tight relative z-10">
                      "QUE SEU NOVO CICLO SEJA REPLETO DE VITÓRIAS, SAÚDE E MUITOS GOLS DENTRO E FORA DE CAMPO!"
                    </p>
                    
                    <div className="mt-4 flex items-center justify-center gap-2 md:gap-3">
                      <span className="text-[8px] md:text-[10px] font-black text-theme-primary uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/5">#PiruáEC</span>
                      <span className="text-[8px] md:text-[10px] font-black text-theme-primary uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/5">#BaseForte</span>
                      <span className="text-[8px] md:text-[10px] font-black text-theme-primary uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg border border-white/5">#FamíliaPiruá</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Edge Accents */}
              <div className="absolute top-0 right-0 w-1.5 h-full opacity-50" style={{ backgroundColor: settings.primaryColor }}></div>
              <div className="absolute top-0 left-0 w-1.5 h-full opacity-50" style={{ backgroundColor: settings.primaryColor }}></div>
              
              {/* Scanline Effect */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_2px,3px_100%]"></div>
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
