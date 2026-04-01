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
              className="w-[350px] h-[350px] md:w-[600px] md:h-[600px] overflow-hidden relative shadow-2xl flex flex-col" 
              style={{ backgroundColor: settings.secondaryColor }}
            >
              {/* Background Layers */}
              <div className="absolute inset-0 pointer-events-none">
                {/* Main Gradient */}
                <div 
                  className="absolute inset-0 opacity-60" 
                  style={{ 
                    background: `radial-gradient(circle at center, ${settings.primaryColor}33, transparent, ${settings.secondaryColor}44)` 
                  }}
                ></div>
                
                {/* Animated Blobs */}
                <div 
                  className="absolute -top-20 -right-20 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40 animate-pulse" 
                  style={{ backgroundColor: settings.primaryColor }}
                ></div>
                <div 
                  className="absolute -bottom-20 -left-20 w-[400px] h-[400px] rounded-full blur-[100px] opacity-40 animate-pulse" 
                  style={{ backgroundColor: settings.primaryColor }}
                ></div>

                {/* Pattern Overlay */}
                <div className="absolute inset-0 opacity-[0.15]" style={{ backgroundImage: `radial-gradient(${settings.primaryColor} 2px, transparent 2px)`, backgroundSize: '24px 24px' }}></div>
                
                {/* Large Decorative Text (Background) */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-[-10deg] opacity-[0.05] whitespace-nowrap select-none">
                  <p className="text-[250px] font-black uppercase leading-none tracking-tighter">GOOOL!</p>
                </div>

                {/* Floating Elements (Decorative) */}
                <div className="absolute top-10 right-20 w-8 h-8 rounded-full border-4 border-white/10 rotate-12"></div>
                <div className="absolute bottom-20 left-10 w-12 h-12 rounded-full border-2 border-dashed border-white/10 animate-spin-slow"></div>
                <div className="absolute top-1/3 left-10 w-4 h-4 bg-theme-primary/20 rounded-sm rotate-45"></div>
              </div>

              <div className="relative flex-1 flex flex-col items-center justify-between p-8 md:p-12 z-10">
                {/* Header: Crest & School Name */}
                <div className="flex items-center gap-4 self-start bg-black/20 backdrop-blur-md p-3 rounded-2xl border border-white/5">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-white p-2 rounded-xl shadow-xl">
                    {settings.schoolCrest ? (
                      <img src={settings.schoolCrest} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full bg-theme-primary rounded-lg flex items-center justify-center text-black font-black text-xl">P</div>
                    )}
                  </div>
                  <div className="text-left">
                    <h4 className="text-white font-black uppercase tracking-tighter text-sm md:text-base leading-none">Piruá Esporte Clube</h4>
                    <p className="text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]" style={{ color: settings.primaryColor }}>Formando Campeões</p>
                  </div>
                </div>

                {/* Center: Photo & Name */}
                <div className="flex flex-col items-center w-full">
                  <div className="relative mb-8">
                    {/* Decorative Rings */}
                    <div className="absolute -inset-6 border-4 border-dashed rounded-full opacity-30 animate-spin-slow" style={{ borderColor: settings.primaryColor }}></div>
                    <div className="absolute -inset-10 border-2 border-dotted rounded-full opacity-20 animate-spin-slow-reverse" style={{ borderColor: settings.primaryColor }}></div>
                    
                    {/* Main Photo Container */}
                    <div 
                      className="w-52 h-52 md:w-80 md:h-80 bg-zinc-800 rounded-full border-[12px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.6)] relative z-10" 
                      style={{ borderColor: 'white' }}
                    >
                      {selectedPerson.photo ? (
                        <img src={selectedPerson.photo} className="w-full h-full object-cover scale-110" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-zinc-600">
                          <UserCircle size={140} strokeWidth={1} />
                        </div>
                      )}
                    </div>

                    {/* Birthday Badge */}
                    <div 
                      className="absolute -bottom-2 -right-2 w-20 h-20 md:w-28 md:h-28 rounded-full flex flex-col items-center justify-center shadow-2xl z-20 rotate-12 border-4 border-white"
                      style={{ backgroundColor: settings.primaryColor }}
                    >
                      <Cake size={32} className="text-black mb-1" />
                      <p className="text-[10px] md:text-xs font-black text-black uppercase leading-none">PARABÉNS!</p>
                    </div>
                  </div>

                  <div className="text-center space-y-3 w-full">
                    <div className="relative inline-block">
                      <h2 className="text-5xl md:text-8xl font-black uppercase tracking-tighter italic leading-[0.75] text-white drop-shadow-[0_5px_15px_rgba(0,0,0,0.5)]">
                        FELIZ<br />
                        <span style={{ color: settings.primaryColor }}>ANIVERSÁRIO</span>
                      </h2>
                    </div>
                    
                    <div className="flex items-center gap-6 justify-center py-4">
                      <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: settings.primaryColor }}></div>
                      <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight drop-shadow-lg">{selectedPerson.name}</h3>
                      <div className="h-1.5 w-12 rounded-full" style={{ backgroundColor: settings.primaryColor }}></div>
                    </div>
                  </div>
                </div>

                {/* Footer: Message */}
                <div className="w-full text-center bg-black/30 backdrop-blur-md p-6 rounded-3xl border border-white/5">
                  <p className="text-sm md:text-lg text-zinc-100 font-bold max-w-[90%] mx-auto italic leading-tight">
                    "Que seu novo ciclo seja repleto de vitórias, saúde e muitos gols dentro e fora de campo!"
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <div className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">#PiruáEC</p>
                    </div>
                    <div className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">#BaseForte</p>
                    </div>
                    <div className="px-4 py-1.5 bg-white/10 rounded-full border border-white/10">
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-widest">#FamíliaPiruá</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side Accent */}
              <div className="absolute top-0 right-0 w-2 h-full" style={{ backgroundColor: settings.primaryColor }}></div>
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
