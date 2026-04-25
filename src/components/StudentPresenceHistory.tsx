import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Attendance, Training, Event } from '../types';
import { ClipboardCheck, Calendar, Clock, MapPin, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../utils';

export default function StudentPresenceHistory({ athleteId }: { athleteId: string }) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'present' | 'absent'>('all');

  useEffect(() => {
    if (athleteId) {
      loadHistory();
    }
  }, [athleteId]);

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const [attData, trainingData, eventData] = await Promise.all([
        api.getAttendance(undefined, athleteId),
        api.getTrainings(),
        api.getEvents()
      ]);
      
      setAttendance(attData.sort((a, b) => b.date.localeCompare(a.date)));
      setTrainings(trainingData);
      setEvents(eventData);
    } catch (error) {
      console.error('Error loading presence history:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAttendanceStats = () => {
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'Presente').length;
    const absent = attendance.filter(a => a.status === 'Faltou').length;
    const percent = total > 0 ? Math.round((present / total) * 100) : 0;
    
    return { total, present, absent, percent };
  };

  const stats = getAttendanceStats();

  const filteredAttendance = attendance.filter(a => {
    if (filter === 'present') return a.status === 'Presente';
    if (filter === 'absent') return a.status === 'Faltou';
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white uppercase tracking-tighter">Meu Histórico de Presença</h2>
          <p className="text-zinc-400 text-sm">Acompanhe sua frequência em treinos e eventos</p>
        </div>
        
        <div className="flex items-center gap-2 bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
          <button 
            onClick={() => setFilter('all')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all",
              filter === 'all' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Todos
          </button>
          <button 
            onClick={() => setFilter('present')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all",
              filter === 'present' ? "bg-green-500 text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Presenças
          </button>
          <button 
            onClick={() => setFilter('absent')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all",
              filter === 'absent' ? "bg-red-500 text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Faltas
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Registros', value: stats.total, color: 'text-white' },
          { label: 'Presenças', value: stats.present, color: 'text-green-500' },
          { label: 'Faltas', value: stats.absent, color: 'text-red-500' },
          { label: 'Frequência', value: `${stats.percent}%`, color: 'text-theme-primary' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl">
            <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className={cn("text-2xl font-black", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {filteredAttendance.length === 0 ? (
        <div className="py-20 text-center bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
          <ClipboardCheck size={48} className="mx-auto text-zinc-700 mb-4" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum registro de presença encontrado</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAttendance.map((record) => {
            const training = record.training_id ? trainings.find(t => t.id === record.training_id) : null;
            const event = record.event_id ? events.find(e => e.id === record.event_id) : null;
            const title = training ? `Treino: ${training.date}` : (event ? `Evento: ${event.name}` : 'Chamada Geral');
            
            return (
              <div key={record.id} className="bg-zinc-900 border border-zinc-800 p-5 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "p-3 rounded-2xl",
                    record.status === 'Presente' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {record.status === 'Presente' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white uppercase text-sm">{title}</h3>
                    <div className="flex flex-wrap items-center gap-3 mt-1">
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold">
                        <Calendar size={12} />
                        {record.date}
                      </div>
                      {record.arrival_time && (
                        <div className="flex items-center gap-1 text-[10px] text-zinc-500 uppercase font-bold">
                          <Clock size={12} />
                          Check-in: {record.arrival_time}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  {record.justification && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 rounded-xl border border-zinc-700 text-zinc-400 text-[10px] font-medium max-w-[200px]">
                      <AlertCircle size={12} />
                      <span className="truncate">{record.justification}</span>
                    </div>
                  )}
                  <div className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                    record.status === 'Presente' ? "bg-green-500 text-black" : "bg-red-500 text-black"
                  )}>
                    {record.status}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
