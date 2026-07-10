import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event, Athlete, Professor } from '../types';
import { cn } from '../utils';
import { Calendar, Users, MapPin, Clock, Trophy, Award, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import EventsManagement from './EventsManagement';
import { toast } from 'sonner';

function LineupSummary({ eventId, athletesList, professorsList }: { eventId: string, athletesList: Athlete[], professorsList: Professor[] }) {
  const [summary, setSummary] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getAllEventLineups(eventId, athletesList, professorsList)
      .then(allLineups => {
        if (!active) return;
        const names: string[] = [];
        allLineups.forEach(l => {
          names.push(...l.athletes.map(a => a.name));
        });
        setSummary(Array.from(new Set(names)));
      })
      .catch(err => console.error(`Error loading lineup summary for event ${eventId}:`, err))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [eventId, athletesList, professorsList]);

  if (loading) {
    return (
      <div className="pt-3 border-t border-zinc-800/50 mt-3 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-theme-primary animate-ping"></div>
        <p className="text-[9px] font-bold text-zinc-600 uppercase tracking-widest">Carregando escalação...</p>
      </div>
    );
  }

  if (summary.length === 0) return null;

  return (
    <div className="pt-3 border-t border-zinc-800/50 mt-3">
      <p className="text-[9px] font-black text-theme-primary uppercase tracking-widest mb-1">Equipe Escalada:</p>
      <p className="text-[10px] text-zinc-500 line-clamp-2 leading-relaxed">
        {summary.join(' • ')}
      </p>
    </div>
  );
}

export default function StudentLineups({ athleteId, athleteName }: { athleteId: string, athleteName: string }) {
  const [lineupEvents, setLineupEvents] = useState<Event[]>([]);
  const [myEscalatedEventIds, setMyEscalatedEventIds] = useState<Set<string>>(new Set());
  const [confirmations, setConfirmations] = useState<Record<string, { confirmation: string, lineup_index: number }>>({});
  const [athletesList, setAthletesList] = useState<Athlete[]>([]);
  const [professorsList, setProfessorsList] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');

  useEffect(() => {
    if (athleteId) {
      loadLineups();
    }
  }, [athleteId]);

  // Real-time subscription to always update escalating status in real-time
  useEffect(() => {
    if (!athleteId) return;
    
    const unsubscribe = api.subscribeToAthleteLineups(athleteId, (escalatedEvents) => {
      const escalatedIds = new Set(escalatedEvents.map(e => e.id));
      setMyEscalatedEventIds(escalatedIds);
    });
    
    return () => unsubscribe();
  }, [athleteId]);

  // Real-time subscription to update confirmation statuses
  useEffect(() => {
    if (!athleteId) return;

    const unsubscribe = api.subscribeToAthleteLineupConfirmations(athleteId, (mapping) => {
      setConfirmations(mapping);
    });

    return () => unsubscribe();
  }, [athleteId]);

  const loadLineups = async () => {
    setIsLoading(true);
    try {
      const allEvents = await api.getEvents();
      setLineupEvents(allEvents.sort((a, b) => b.start_date.localeCompare(a.start_date)));
      
      const [athletes, professors] = await Promise.all([
        api.getAthletes(),
        api.getProfessors()
      ]);

      setAthletesList(athletes);
      setProfessorsList(professors);
    } catch (error) {
      console.error('Error loading student lineups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmPresence = async (eventId: string, confirmationStatus: 'Confirmado' | 'Recusado', lineupIndex: number = 0) => {
    try {
      await api.confirmLineup(eventId, athleteId, 'athlete', confirmationStatus, lineupIndex);
      toast.success(confirmationStatus === 'Confirmado' 
        ? "Presença confirmada com sucesso para este evento!" 
        : "Sua recusa para este evento foi registrada com sucesso."
      );
    } catch (error) {
      console.error("Error updating event confirmation:", error);
      toast.error("Erro ao registrar confirmação.");
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
          className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all font-bold uppercase text-xs tracking-widest cursor-pointer"
        >
          ← Voltar para Minhas Escalações
        </button>
        <EventsManagement 
          role="student" 
          events={[selectedEvent]} 
          initialOpenLineupEvent={selectedEvent}
          loggedInUserId={athleteId}
        />
      </div>
    );
  }

  const displayedEvents = lineupEvents.filter(event => {
    if (filter === 'mine') {
      return myEscalatedEventIds.has(event.id);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic">Minhas Escalações</h2>
          <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Confira os eventos, convocações e resultados dos jogos</p>
        </div>

        {/* Filter Toggle */}
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 w-fit self-start md:self-auto">
          <button
            onClick={() => setFilter('mine')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex items-center gap-2 cursor-pointer",
              filter === 'mine' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            <Award size={14} />
            Minhas Convocações ({myEscalatedEventIds.size})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest flex items-center gap-2 cursor-pointer",
              filter === 'all' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            <Calendar size={14} />
            Todos ({lineupEvents.length})
          </button>
        </div>
      </div>

      {displayedEvents.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800 px-4">
          <Trophy size={48} className="mx-auto text-zinc-700 mb-4 animate-pulse" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm">
            {filter === 'mine' ? 'Você não está escalado em nenhum evento no momento' : 'Nenhum evento agendado'}
          </p>
          {filter === 'mine' && lineupEvents.length > 0 && (
            <button
              onClick={() => setFilter('all')}
              className="mt-4 px-6 py-2 bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-theme-primary text-zinc-400 hover:text-white rounded-xl transition-all font-black uppercase text-xs tracking-widest cursor-pointer"
            >
              Ver todos os eventos
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {displayedEvents.map(event => {
            const isUserEscalated = myEscalatedEventIds.has(event.id);
            const userConfObj = confirmations[event.id];
            const userConfirmation = userConfObj?.confirmation || 'Pendente';
            const lineupIndex = userConfObj?.lineup_index || 0;
            
            return (
              <div key={event.id} className={cn(
                "bg-zinc-900 border rounded-3xl p-6 hover:border-theme-primary/50 transition-all flex flex-col justify-between group",
                isUserEscalated ? "border-theme-primary/60 shadow-[0_0_20px_rgba(235,255,0,0.05)]" : "border-zinc-800"
              )}>
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className={cn(
                      "p-3 rounded-2xl",
                      isUserEscalated ? "bg-theme-primary/20 text-theme-primary" : "bg-zinc-800 text-zinc-500"
                    )}>
                      <Calendar size={24} />
                    </div>
                    <div className="flex gap-2">
                      {isUserEscalated && (
                        <div className="px-3 py-1 bg-theme-primary text-black rounded-lg text-[10px] font-black uppercase tracking-widest animate-pulse">
                          Você está escalado!
                        </div>
                      )}
                      <div className="px-3 py-1 bg-zinc-800 text-zinc-400 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        Evento
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2 uppercase">{event.name}</h3>
                  <div className="space-y-2 text-sm text-zinc-400 mb-4">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-zinc-650" />
                      {event.city}/{event.uf} - {event.neighborhood}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-zinc-650" />
                      {event.start_date} às {event.start_time}
                    </div>
                    
                    {/* Lazy loaded summary box */}
                    <LineupSummary 
                      eventId={event.id} 
                      athletesList={athletesList} 
                      professorsList={professorsList} 
                    />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-zinc-800/80 mt-4">
                  {/* Actionable Confirmation Panel for Scaled Athlete */}
                  {isUserEscalated && (
                    <div className="p-4 bg-zinc-950/50 border border-zinc-800/80 rounded-2xl space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest flex items-center gap-1">
                          Sua Confirmação:
                        </span>
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-lg flex items-center gap-1",
                          userConfirmation === 'Confirmado' ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                          userConfirmation === 'Recusado' ? "bg-red-500/10 text-red-400 border border-red-500/20" :
                          "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {userConfirmation === 'Confirmado' && <CheckCircle2 size={10} />}
                          {userConfirmation === 'Recusado' && <XCircle size={10} />}
                          {userConfirmation === 'Pendente' && <AlertCircle size={10} />}
                          {userConfirmation}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleConfirmPresence(event.id, 'Confirmado', lineupIndex)}
                          disabled={userConfirmation === 'Confirmado'}
                          className={cn(
                            "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            userConfirmation === 'Confirmado' 
                              ? "bg-green-500 text-black opacity-90 cursor-default" 
                              : "bg-zinc-900 hover:bg-green-500 text-zinc-400 hover:text-black border border-zinc-800 hover:border-green-500"
                          )}
                        >
                          <CheckCircle2 size={12} />
                          Confirmar
                        </button>
                        <button
                          onClick={() => handleConfirmPresence(event.id, 'Recusado', lineupIndex)}
                          disabled={userConfirmation === 'Recusado'}
                          className={cn(
                            "py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                            userConfirmation === 'Recusado' 
                              ? "bg-red-500 text-black opacity-90 cursor-default" 
                              : "bg-zinc-900 hover:bg-red-500 text-zinc-400 hover:text-black border border-zinc-800 hover:border-red-500"
                          )}
                        >
                          <XCircle size={12} />
                          Recusar
                        </button>
                      </div>
                    </div>
                  )}

                  <button 
                    onClick={() => setSelectedEvent(event)}
                    className={cn(
                      "w-full py-3 font-black rounded-xl uppercase tracking-widest text-xs transition-all cursor-pointer",
                      isUserEscalated ? "bg-theme-primary text-black" : "bg-zinc-800 text-white hover:bg-zinc-700"
                    )}
                  >
                    Visualizar Escalação
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
