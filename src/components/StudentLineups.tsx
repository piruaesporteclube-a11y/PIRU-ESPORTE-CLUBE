import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event } from '../types';
import { Calendar, Users, MapPin, Clock } from 'lucide-react';
import EventsManagement from './EventsManagement';

export default function StudentLineups({ athleteId }: { athleteId: string }) {
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
      const events = await api.getEvents();
      setLineupEvents(events.sort((a, b) => b.start_date.localeCompare(a.start_date)));
      
      // Fetch summaries for each event
      events.forEach(async (event) => {
        try {
          const { athletes } = await api.getLineup(event.id, 0);
          setLineupSummaries(prev => ({ ...prev, [event.id]: athletes.map(a => a.name) }));
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
        <EventsManagement role="student" events={[selectedEvent]} />
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
            const isUserEscalated = lineupSummaries[event.id]?.some(name => name.toLowerCase().includes(athleteId.toLowerCase())) || lineupSummaries[event.id]?.length > 0;
            
            return (
              <div key={event.id} className="bg-zinc-900 border border-theme-primary/20 rounded-3xl p-6 hover:border-theme-primary/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                    <Calendar size={24} />
                  </div>
                  <div className="flex gap-2">
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
                  className="w-full py-3 bg-theme-primary text-black font-black rounded-xl uppercase tracking-widest text-xs hover:opacity-90 transition-all"
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
