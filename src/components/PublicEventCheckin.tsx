import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Event } from '../types';
import { CheckCircle2, Search, User, X, AlertCircle, Loader2, Calendar, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface PublicEventCheckinProps {
  eventId: string;
  onBack: () => void;
}

export default function PublicEventCheckin({ eventId, onBack }: PublicEventCheckinProps) {
  const [event, setEvent] = useState<Event | null>(null);
  const [athleteId, setAthleteId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verifiedAthlete, setVerifiedAthlete] = useState<Athlete | null>(null);

  useEffect(() => {
    loadEvent();
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const events = await api.getEvents();
      const found = events.find(e => e.id === eventId);
      if (found) {
        setEvent(found);
      } else {
        toast.error("Evento não encontrado.");
        onBack();
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar dados do evento.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!athleteId.trim()) return;

    try {
      setIsSubmitting(true);
      const athletes = await api.getAthletes();
      const normalizedId = athleteId.toUpperCase();
      const athlete = athletes.find(a => 
        a.id.toUpperCase().startsWith(normalizedId) || 
        a.doc.includes(athleteId)
      );

      if (athlete) {
        setVerifiedAthlete(athlete);
      } else {
        toast.error("Atleta não encontrado. Verifique sua matrícula ou CPF.");
        setVerifiedAthlete(null);
      }
    } catch (err) {
      toast.error("Erro ao verificar atleta.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckin = async () => {
    if (!verifiedAthlete || !event) return;

    try {
      setIsSubmitting(true);
      
      // Check if already checked in
      const existing = await api.getAttendance(event.start_date, verifiedAthlete.id, undefined, event.id);
      if (existing.length > 0) {
        toast.info("Você já realizou o check-in para este evento!");
        setVerifiedAthlete(null);
        setAthleteId('');
        return;
      }

      await api.saveAttendance({
        athlete_id: verifiedAthlete.id,
        event_id: event.id,
        date: event.start_date,
        status: 'Presente',
        justification: "Check-in via QR Code"
      });

      toast.success(`Check-in realizado com sucesso! Bem-vindo, ${verifiedAthlete.name}!`);
      setVerifiedAthlete(null);
      setAthleteId('');
    } catch (err: any) {
      toast.error(`Erro ao realizar check-in: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <Loader2 className="w-8 h-8 text-theme-primary animate-spin" />
      </div>
    );
  }

  if (!event) return null;

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center justify-center font-sans">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex p-4 bg-theme-primary/10 text-theme-primary rounded-3xl mb-2">
            <CheckCircle2 size={40} />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter italic">Check-in Oficial</h1>
          <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl space-y-3">
            <h2 className="text-xl font-black text-theme-primary uppercase">{event.name}</h2>
            <div className="flex flex-col gap-2 text-zinc-400 text-sm font-bold uppercase tracking-widest">
              <div className="flex items-center gap-2">
                <Calendar size={16} />
                {event.start_date}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={16} />
                {event.start_time} - {event.end_time}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                {event.city}/{event.uf}
              </div>
            </div>
          </div>
        </div>

        {/* Form Container */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden">
          {!verifiedAthlete ? (
            <form onSubmit={handleVerify} className="space-y-6 relative z-10">
              <div className="space-y-4 text-center">
                <p className="text-zinc-400 text-sm font-medium">Informe sua matrícula ou CPF para confirmar sua presença no evento.</p>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="MATRÍCULA OU CPF"
                    autoFocus
                    className="w-full pl-12 pr-4 py-4 bg-black border-2 border-zinc-800 rounded-2xl text-white font-black focus:outline-none focus:border-theme-primary/50 transition-all uppercase placeholder:text-zinc-700"
                    value={athleteId}
                    onChange={(e) => setAthleteId(e.target.value)}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={isSubmitting || !athleteId.trim()}
                className="w-full py-5 bg-theme-primary text-black font-black rounded-2xl hover:opacity-90 transition-all uppercase tracking-tighter shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : "Verificar Atleta"}
              </button>
            </form>
          ) : (
            <div className="space-y-8 relative z-10 text-center animate-in fade-in zoom-in duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="w-24 h-24 bg-zinc-800 rounded-full overflow-hidden border-4 border-theme-primary">
                  {verifiedAthlete.photo ? (
                    <img src={verifiedAthlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-600">
                      <User size={48} />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="text-2xl font-black uppercase tracking-tighter">{verifiedAthlete.name}</h3>
                  <p className="text-theme-primary font-black uppercase tracking-widest text-xs">Atleta Escolinha Piruá</p>
                </div>
              </div>

              <div className="space-y-3">
                <button 
                  onClick={handleCheckin}
                  disabled={isSubmitting}
                  className="w-full py-5 bg-green-500 text-white font-black rounded-2xl hover:bg-green-600 transition-all uppercase tracking-tighter shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={24} className="animate-spin" /> : "Confirmar Check-in"}
                </button>
                <button 
                  onClick={() => setVerifiedAthlete(null)}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-zinc-800 text-zinc-400 font-bold rounded-2xl hover:bg-zinc-700 transition-all uppercase tracking-widest text-xs"
                >
                  Não é você? Tentar outro
                </button>
              </div>
            </div>
          )}

          {/* Background pattern */}
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <CheckCircle2 size={120} />
          </div>
        </div>

        <button 
          onClick={onBack}
          className="w-full text-zinc-600 hover:text-zinc-400 font-bold uppercase tracking-widest text-xs transition-colors"
        >
          Voltar ao Portal
        </button>

        <p className="text-center text-zinc-700 text-[10px] font-black uppercase tracking-widest">
          Piruá Esporte Clube • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}
