import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor } from '../types';
import { Cake, Instagram, Share2, Download, UserCircle, Calendar } from 'lucide-react';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';
import html2canvas from 'html2canvas';

export default function Birthdays() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const { settings } = useTheme();
  const [selectedPerson, setSelectedPerson] = useState<Athlete | Professor | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [a, p] = await Promise.all([api.getAthletes(), api.getProfessors()]);
    setAthletes(a);
    setProfessors(p);
  };

  const today = new Date();
  const todayBirthdays = [...athletes, ...professors].filter(p => isSameDay(parseISO(p.birth_date), today));
  const monthBirthdays = [...athletes, ...professors].filter(p => isSameMonth(parseISO(p.birth_date), today) && !isSameDay(parseISO(p.birth_date), today));

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
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Erro ao gerar imagem. Tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Aniversariantes</h2>
        <p className="text-zinc-400 text-sm">Comemore o aniversário dos nossos atletas e membros da comissão técnica</p>
      </div>

      {/* Today's Birthdays */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2 uppercase tracking-widest">
          <Cake size={20} />
          Aniversariantes do Dia
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
                <p className="text-xs text-zinc-400">Parabéns pelo seu dia!</p>
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
          Aniversariantes do Mês ({format(today, 'MMMM', { locale: ptBR })})
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
                <p className="text-[10px] text-zinc-500">Dia {format(parseISO(person.birth_date), 'dd')}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Instagram Post Modal */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4">
          <div className="relative">
            <button 
              onClick={() => setSelectedPerson(null)}
              className="absolute -top-12 right-0 text-white hover:text-theme-primary transition-colors"
            >
              Fechar
            </button>
            
            {/* The Post Layout (1080x1080 aspect) */}
            <div id="birthday-card" className="w-[350px] h-[450px] md:w-[500px] md:h-[650px] border-4 rounded-3xl overflow-hidden relative shadow-2xl flex flex-col" style={{ backgroundColor: settings.secondaryColor, borderColor: settings.primaryColor }}>
              {/* Background Elements */}
              <div className="absolute inset-0 opacity-30 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full" style={{ background: `radial-gradient(circle at 50% 30%, ${settings.primaryColor}44, transparent, transparent)` }}></div>
                <div className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full blur-[120px]" style={{ backgroundColor: settings.primaryColor }}></div>
                <div className="absolute -top-20 -left-20 w-80 h-80 rounded-full blur-[120px]" style={{ backgroundColor: settings.primaryColor }}></div>
                
                {/* Decorative dots/stars */}
                <div className="absolute inset-0" style={{ backgroundImage: `radial-gradient(${settings.primaryColor}33 1px, transparent 1px)`, backgroundSize: '20px 20px' }}></div>
              </div>

              <div className="relative flex-1 flex flex-col items-center justify-center p-8 text-center z-10">
                {/* School Crest at top */}
                <div className="mb-6">
                  {settings.schoolCrest ? (
                    <img src={settings.schoolCrest} className="w-16 h-16 md:w-24 md:h-24 object-contain mx-auto" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-16 h-16 md:w-24 md:h-24 rounded-full bg-theme-primary flex items-center justify-center text-black font-black text-2xl">P</div>
                  )}
                </div>

                <div className="relative mb-8">
                  <div className="w-40 h-40 md:w-64 md:h-64 bg-zinc-800 rounded-full border-8 overflow-hidden shadow-2xl relative z-10" style={{ borderColor: settings.primaryColor, boxShadow: `0 0 50px ${settings.primaryColor}44` }}>
                    {selectedPerson.photo ? (
                      <img src={selectedPerson.photo} className="w-full h-full object-cover scale-110" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-zinc-500">
                        <UserCircle size={100} />
                      </div>
                    )}
                  </div>
                  {/* Decorative ring */}
                  <div className="absolute -inset-4 border-2 border-dashed rounded-full animate-spin-slow opacity-50" style={{ borderColor: settings.primaryColor }}></div>
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter italic leading-none" style={{ color: settings.primaryColor }}>
                    Feliz<br />Aniversário!
                  </h2>
                  <div className="h-1 w-24 mx-auto my-4" style={{ backgroundColor: settings.primaryColor }}></div>
                  <h3 className="text-2xl md:text-4xl font-black text-white uppercase tracking-tight">{selectedPerson.name}</h3>
                </div>
                
                <div className="mt-8 space-y-1">
                  <p className="text-sm md:text-lg text-zinc-400 font-bold uppercase tracking-[0.3em]">Piruá Esporte Clube</p>
                  <p className="text-xs md:text-sm text-zinc-500 italic">"Desejamos muita saúde, paz e muitos gols na sua vida!"</p>
                </div>
              </div>

              {/* Bottom Banner */}
              <div className="h-16 flex items-center justify-center font-black uppercase tracking-widest text-xs md:text-sm" style={{ backgroundColor: settings.primaryColor, color: settings.secondaryColor }}>
                Comemore com a gente! #PiruáEC
              </div>
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
