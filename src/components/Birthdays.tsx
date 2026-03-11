import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor } from '../types';
import { Cake, Instagram, Share2, Download, UserCircle, Calendar } from 'lucide-react';
import { format, isSameDay, isSameMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

export default function Birthdays() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const { settings } = useTheme();
  const [selectedPerson, setSelectedPerson] = useState<Athlete | Professor | null>(null);

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

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Aniversariantes</h2>
        <p className="text-zinc-400 text-sm">Comemore o aniversário dos nossos atletas e professores</p>
      </div>

      {/* Today's Birthdays */}
      <section className="space-y-4">
        <h3 className="text-lg font-bold text-theme-primary flex items-center gap-2 uppercase tracking-widest">
          <Cake size={20} />
          Aniversariantes do Dia
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {todayBirthdays.map((person) => (
            <div key={person.id} className="bg-zinc-900 border border-theme-primary/30 p-4 rounded-2xl flex items-center gap-4 shadow-lg shadow-theme-primary/5">
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
            <div className="col-span-full p-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl text-center text-zinc-500 italic">
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
            <div key={person.id} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-3">
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
            <div className="w-[350px] h-[350px] md:w-[500px] md:h-[500px] border-4 rounded-3xl overflow-hidden relative shadow-2xl" style={{ backgroundColor: settings.secondaryColor, borderColor: settings.primaryColor }}>
              {/* Background Elements */}
              <div className="absolute inset-0 opacity-20 pointer-events-none">
                <div className="absolute top-0 left-0 w-full h-full" style={{ background: `radial-gradient(circle at center, ${settings.primaryColor}33, transparent, transparent)` }}></div>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 rounded-full blur-[100px]" style={{ backgroundColor: settings.primaryColor }}></div>
              </div>

              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center">
                <div className="w-32 h-32 md:w-48 md:h-48 bg-zinc-800 rounded-full border-4 overflow-hidden mb-6 shadow-2xl" style={{ borderColor: settings.primaryColor, boxShadow: `0 0 40px ${settings.primaryColor}33` }}>
                  {selectedPerson.photo ? (
                    <img src={selectedPerson.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-500">
                      <UserCircle size={80} />
                    </div>
                  )}
                </div>
                
                <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tighter mb-2" style={{ color: settings.primaryColor }}>Feliz Aniversário!</h2>
                <h3 className="text-xl md:text-3xl font-black text-white uppercase mb-4">{selectedPerson.name}</h3>
                
                <div className="w-16 h-1 mb-4" style={{ backgroundColor: settings.primaryColor }}></div>
                
                <p className="text-sm md:text-lg text-zinc-400 font-bold uppercase tracking-widest">Piruá Esporte Clube</p>
                <p className="text-xs md:text-sm text-zinc-500 mt-2">Desejamos muita saúde, paz e muitos gols!</p>
              </div>

              {/* Logo Overlay */}
              <div className="absolute top-6 right-6 w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-black font-black text-xl md:text-2xl shadow-lg" style={{ backgroundColor: settings.primaryColor }}>
                {settings.schoolCrest ? (
                  <img src={settings.schoolCrest} className="w-full h-full object-contain p-2" referrerPolicy="no-referrer" />
                ) : (
                  "P"
                )}
              </div>
            </div>

            <div className="mt-6 flex justify-center gap-4">
              <button 
                onClick={() => window.print()}
                className="flex items-center gap-2 px-6 py-3 bg-white text-black font-black rounded-xl hover:bg-zinc-200 transition-colors"
              >
                <Download size={20} />
                Salvar Imagem
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
