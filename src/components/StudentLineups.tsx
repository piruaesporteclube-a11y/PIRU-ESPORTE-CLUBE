import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event } from '../types';
import { Calendar, Users, MapPin, Clock } from 'lucide-react';
import EventsManagement from './EventsManagement';

export default function StudentLineups({ athleteId, athleteName }: { athleteId: string, athleteName: string }) {
  const [lineupEvents, setLineupEvents] = useState<Event[]>([]);
  const [lineupSummaries, setLineupSummaries] = useState<Record<string, string[]>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);

  useEffect(() => {
    if (athleteId) {
      loadLineups();
    }
  }, [athleteId]);

  const loadLineups = async () => {
    setIsLoading(true);
    try {
      const allEvents = await api.getEvents();
      // Only show future events or recent ones (last 30 days) to keep it clean
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentEvents = allEvents.filter(e => new Date(e.start_date) >= thirtyDaysAgo);
      
      setLineupEvents(recentEvents.sort((a, b) => b.start_date.localeCompare(a.start_date)));
      
      // Fetch summaries for ALL lineups and matches of each event
      recentEvents.forEach(async (event) => {
        try {
          const summaries: string[] = [];
          
          // Check generic lineups (indices 0 to 9)
          for (let i = 0; i <= 9; i++) {
            const { athletes } = await api.getLineup(event.id, i);
            if (athletes.length > 0) {
              summaries.push(...athletes.map(a => a.name));
            }
          }
          
          // Check match specific lineups
          const matches = await api.getEventMatches(event.id);
          for (const match of matches) {
            const { athletes } = await api.getLineup(event.id, 0, match.id);
            if (athletes.length > 0) {
              summaries.push(...athletes.map(a => a.name));
            }
          }
          
          // Unique names
          const uniqueNames = Array.from(new Set(summaries));
          setLineupSummaries(prev => ({ ...prev, [event.id]: uniqueNames }));
        } catch (err) {
          console.error(`Error fetching summary for event ${event.id}:`, err);
        }
      });
    } catch (error) {
      console.error('Error loading student lineups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  if (selectedEvent) {
    return (
      <div className="space-y-6">
        <button 
          onClick={() => setSelectedEvent(null)}
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all font-bold uppercase text-xs tracking-widest"
        >
          ← Voltar para Minhas Escalações
        </button>
        <EventsManagement 
          role="student" 
          events={[selectedEvent]} 
          initialOpenLineupEvent={selectedEvent}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Agenda & Resultados</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Confira os eventos, escalações e resultados dos jogos</p>
        </div>
      </div>

      {lineupEvents.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
          <Calendar size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum evento agendado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {lineupEvents.map(event => {
            const isUserEscalated = athleteName && lineupSummaries[event.id]?.some(name => name.toLowerCase().includes(athleteName.toLowerCase()));
            
            return (
              <div key={event.id} className={cn(
                "bg-zinc-900 border rounded-3xl p-6 hover:border-theme-primary/50 transition-all group",
                isUserEscalated ? "border-theme-primary" : "border-zinc-800"
              )}>
                <div className="flex justify-between items-start mb-4">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    isUserEscalated ? "bg-theme-primary/20 text-theme-primary" : "bg-zinc-800 text-zinc-500"
                  )}>
                    <Calendar size={24} />
                  </div>
                  <div className="flex gap-2">
                    {isUserEscalated && (
                      <div className="px-3 py-1 bg-theme-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest">
                        Você está escalado!
                      </div>
                    )}
                    <div className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      Evento
                    </div>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 uppercase">{event.name}</h3>
                <div className="space-y-2 text-sm text-zinc-400 mb-6">
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-zinc-600" />
                    {event.city}/{event.uf} - {event.neighborhood}
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock size={14} className="text-zinc-600" />
                    {event.start_date} às {event.start_time}
                  </div>
                  {lineupSummaries[event.id] && lineupSummaries[event.id].length > 0 && (
                    <div className="pt-3 border-t border-zinc-800/50 mt-3">
                      <p className="text-[9px] font-black text-theme-primary uppercase tracking-widest mb-1">Equipe Escalada:</p>
                      <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
                        {lineupSummaries[event.id].join(' • ')}
                      </p>
                    </div>
                  )}
                </div>
                <button 
                  onClick={() => setSelectedEvent(event)}
                  className={cn(
                    "w-full py-3 font-black rounded-xl uppercase tracking-widest text-xs transition-all",
                    isUserEscalated ? "bg-theme-primary text-black" : "bg-zinc-800 text-white hover:bg-zinc-700"
                  )}
                >
                  Visualizar Escalação
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
