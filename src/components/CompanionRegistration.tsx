import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { Event } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { UserPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function CompanionRegistration() {
  const { eventId } = useParams<{ eventId: string }>();
  const { settings } = useTheme();
  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    doc: ''
  });

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      const events = await api.getEvents();
      const found = events.find(e => e.id === eventId);
      if (found) {
        setEvent(found);
      }
    } catch (error) {
      console.error("Error loading event:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    if (!formData.name || !formData.doc) {
      toast.error("Por favor, preencha todos os campos.");
      return;
    }

    try {
      setIsSubmitting(true);
      await api.saveCompanion({
        event_id: eventId,
        name: formData.name.toUpperCase(),
        doc: formData.doc.replace(/\D/g, '')
      });
      setSubmitted(true);
      toast.success("Cadastro realizado com sucesso!");
    } catch (error) {
      console.error("Error registering companion:", error);
      toast.error("Erro ao realizar cadastro. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 text-theme-primary animate-spin" />
          <p className="text-zinc-500 font-bold uppercase tracking-widest animate-pulse">Carregando formulário...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-red-500/30 p-8 rounded-[2.5rem] text-center max-w-md w-full">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Evento não encontrado</h2>
          <p className="text-zinc-500">O link acessado é inválido ou o evento não está mais disponível.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-green-500/30 p-8 rounded-[2.5rem] text-center max-w-md w-full">
          <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">Cadastro Confirmado!</h2>
          <p className="text-zinc-500 mb-6 font-medium">Sua presença como acompanhante para o evento <span className="text-theme-primary font-bold">{event.name}</span> foi registrada.</p>
          <button 
            onClick={() => setSubmitted(false)}
            className="w-full py-4 bg-zinc-800 text-white font-black rounded-2xl border border-zinc-700 hover:border-theme-primary transition-all uppercase tracking-widest text-sm"
          >
            Cadastrar outro acompanhante
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 mb-6 relative">
            {settings?.schoolCrest ? (
              <img 
                src={settings.schoolCrest} 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full bg-theme-primary rounded-3xl flex items-center justify-center text-4xl font-black text-black italic">P</div>
            )}
          </div>
          <h1 className="text-3xl font-black text-white text-center uppercase tracking-tighter leading-none mb-2">Lista de Viagem</h1>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-sm text-center">Cadastro de Acompanhante</p>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-theme-primary opacity-50" />
          
          <div className="mb-8 p-4 bg-black/50 border border-zinc-800 rounded-2xl">
            <p className="text-[10px] text-zinc-500 font-black uppercase tracking-[0.2em] mb-1">Evento Destino</p>
            <h3 className="text-lg font-black text-theme-primary uppercase italic">{event.name}</h3>
            <p className="text-xs text-zinc-500 uppercase font-bold tracking-widest">{event.city} - {event.uf}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  placeholder="EX: MARIA APARECIDA DA SILVA"
                  className="w-full px-5 py-4 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-medium"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 px-1">RG ou CPF</label>
                <input 
                  type="text" 
                  required
                  placeholder="DIGITE APENAS NÚMEROS"
                  className="w-full px-5 py-4 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-medium"
                  value={formData.doc}
                  onChange={e => setFormData({...formData, doc: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full py-5 bg-theme-primary text-black font-black rounded-2xl shadow-[0_10px_20px_rgba(234,179,8,0.2)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Processando...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Confirmar Cadastro
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] text-zinc-600 font-bold uppercase tracking-widest leading-relaxed">
            Ao confirmar, você declara que os dados fornecidos são verdadeiros e autoriza a inclusão do seu nome na lista de passageiros.
          </p>
        </div>

        <div className="mt-8 text-center">
          <p className="text-zinc-500 font-bold text-xs uppercase tracking-widest">© {new Date().getFullYear()} Piruá Esporte Clube - Todos os direitos reservados</p>
        </div>
      </div>
    </div>
  );
}
