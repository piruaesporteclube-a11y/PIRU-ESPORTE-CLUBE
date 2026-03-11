import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Event, Athlete, getSubCategory, categories } from '../types';
import { Calendar, Plus, MapPin, Clock, Users, Save, Printer, X, ChevronRight } from 'lucide-react';
import { cn } from '../utils';

export default function EventsManagement() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLineupOpen, setIsLineupOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [lineupAthletes, setLineupAthletes] = useState<Athlete[]>([]);
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>([]);
  const [filterSub, setFilterSub] = useState('Todos');

  const [formData, setFormData] = useState<Partial<Event>>({
    name: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    uf: '',
    start_date: '',
    end_date: '',
    start_time: '',
    end_time: ''
  });

  useEffect(() => {
    loadEvents();
    api.getAthletes().then(setAthletes);
  }, []);

  const loadEvents = async () => {
    const data = await api.getEvents();
    setEvents(data);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.saveEvent(formData);
    setIsFormOpen(false);
    setFormData({ name: '', street: '', number: '', neighborhood: '', city: '', uf: '', start_date: '', end_date: '', start_time: '', end_time: '' });
    loadEvents();
  };

  const handleOpenLineup = async (event: Event) => {
    setSelectedEvent(event);
    const lineup = await api.getLineup(event.id);
    setLineupAthletes(lineup);
    setSelectedAthletes(lineup.map(a => a.id));
    setIsLineupOpen(true);
  };

  const handleConfirmAthlete = async (athleteId: string, status: string) => {
    if (selectedEvent) {
      await api.confirmLineup(selectedEvent.id, athleteId, status);
      const updatedLineup = await api.getLineup(selectedEvent.id);
      setLineupAthletes(updatedLineup);
    }
  };

  const toggleAthlete = (id: string) => {
    if (selectedAthletes.includes(id)) {
      setSelectedAthletes(selectedAthletes.filter(aid => aid !== id));
    } else if (selectedAthletes.length < 22) {
      setSelectedAthletes([...selectedAthletes, id]);
    } else {
      alert('Limite máximo de 22 atletas atingido.');
    }
  };

  const handleSaveLineup = async () => {
    if (selectedEvent) {
      await api.saveLineup(selectedEvent.id, selectedAthletes);
      const updatedLineup = await api.getLineup(selectedEvent.id);
      setLineupAthletes(updatedLineup);
      // Optional: show a success message or just keep modal open
    }
  };

  const filteredAthletes = athletes.filter(a => (filterSub === 'Todos' || getSubCategory(a.birth_date) === filterSub) && a.status === 'Ativo');

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-bold text-white">Gestão de Eventos</h2>
          <p className="text-zinc-400 text-sm">Cadastre eventos e escale seus atletas</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors"
        >
          <Plus size={18} />
          Novo Evento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
        {events.map((event) => (
          <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-theme-primary/50 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                <Calendar size={24} />
              </div>
              <button 
                onClick={() => handleOpenLineup(event)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                <Users size={16} />
                Escalação
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2 uppercase">{event.name}</h3>
            <div className="space-y-2 text-sm text-zinc-400">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-zinc-600" />
                {event.city}/{event.uf} - {event.neighborhood}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-zinc-600" />
                {event.start_date} às {event.start_time}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Event Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-2xl rounded-3xl shadow-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Novo Evento</h2>
              <button onClick={() => setIsFormOpen(false)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
                <X size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Evento</label>
                  <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data Início</label>
                    <input required type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Horário Início</label>
                    <input required type="time" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data Fim</label>
                    <input required type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Horário Fim</label>
                    <input required type="time" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.end_time} onChange={e => setFormData({...formData, end_time: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Rua</label>
                    <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nº</label>
                    <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.number} onChange={e => setFormData({...formData, number: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Cidade</label>
                    <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">UF</label>
                    <input type="text" maxLength={2} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase" value={formData.uf} onChange={e => setFormData({...formData, uf: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20">Salvar Evento</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lineup Modal */}
      {isLineupOpen && selectedEvent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-5xl rounded-3xl shadow-2xl my-8 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800 no-print">
              <div>
                <h2 className="text-xl font-bold text-white uppercase">Escalação: {selectedEvent.name}</h2>
                <p className="text-xs text-zinc-500">Selecione até 22 atletas ({selectedAthletes.length}/22)</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => window.print()} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"><Printer size={20} /></button>
                <button onClick={() => setIsLineupOpen(false)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
                  <X size={18} className="group-hover:rotate-90 transition-transform" />
                  <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 no-print">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Selection Area */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Selecionar Atletas</h3>
                    <select 
                      className="px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:outline-none"
                      value={filterSub}
                      onChange={(e) => setFilterSub(e.target.value)}
                    >
                      <option value="Todos">Todas as Categorias</option>
                      {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredAthletes.map(a => (
                      <button
                        key={a.id}
                        onClick={() => toggleAthlete(a.id)}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-2xl border transition-all text-left",
                          selectedAthletes.includes(a.id) 
                            ? "bg-theme-primary/10 border-theme-primary text-theme-primary" 
                            : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"
                        )}
                      >
                        <div className="w-10 h-10 bg-zinc-700 rounded-full overflow-hidden flex-shrink-0">
                          {a.photo && <img src={a.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold truncate text-sm uppercase">{a.name}</p>
                          <p className="text-[10px] opacity-70">#{a.jersey_number} - {getSubCategory(a.birth_date)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Confirmation Area */}
                <div className="space-y-6 border-l border-zinc-800 pl-8">
                  <h3 className="text-sm font-bold text-theme-primary uppercase tracking-widest">Confirmação de Atletas</h3>
                  <div className="space-y-4">
                    {lineupAthletes.length === 0 ? (
                      <p className="text-zinc-500 text-xs italic">Salve a escalação para gerenciar as confirmações.</p>
                    ) : (
                      lineupAthletes.map(a => (
                        <div key={a.id} className="bg-zinc-800/50 border border-zinc-800 p-4 rounded-2xl space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-zinc-700 rounded-full overflow-hidden">
                              {a.photo && <img src={a.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold truncate text-xs uppercase">{a.name}</p>
                              <p className="text-[10px] text-zinc-500">#{a.jersey_number}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <div className="flex-1 flex flex-col gap-1">
                              <span className="text-[8px] text-zinc-500 uppercase text-center">Vai?</span>
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleConfirmAthlete(a.id, 'Confirmado')}
                                  className={cn(
                                    "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                    a.confirmation === 'Confirmado' ? "bg-green-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                  )}
                                >
                                  Sim
                                </button>
                                <button 
                                  onClick={() => handleConfirmAthlete(a.id, 'Recusado')}
                                  className={cn(
                                    "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                    a.confirmation === 'Recusado' ? "bg-red-500 text-black" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                  )}
                                >
                                  Não
                                </button>
                                <button 
                                  onClick={() => handleConfirmAthlete(a.id, 'Pendente')}
                                  className={cn(
                                    "flex-1 py-1 px-2 rounded-lg text-[10px] font-bold uppercase transition-all",
                                    a.confirmation === 'Pendente' ? "bg-zinc-600 text-white" : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
                                  )}
                                >
                                  ?
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 flex justify-between items-center no-print">
              <p className="text-xs text-zinc-500 italic">Dica: Salve a escalação antes de gerenciar as confirmações.</p>
              <div className="flex gap-3">
                <button onClick={() => setIsLineupOpen(false)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Fechar</button>
                <button onClick={handleSaveLineup} className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center gap-2">
                  <Save size={20} />
                  Salvar Escalação
                </button>
              </div>
            </div>

            {/* Print View */}
            <div className="hidden print-only p-12 text-black bg-white">
              <div className="text-center mb-8 border-b-4 border-black pb-4">
                <h1 className="text-4xl font-black uppercase">Piruá Esporte Clube</h1>
                <h2 className="text-2xl font-bold uppercase mt-2">Folha de Escalação</h2>
              </div>
              <div className="grid grid-cols-2 gap-8 mb-8">
                <div>
                  <p className="font-black uppercase text-sm">Evento:</p>
                  <p className="text-xl font-bold">{selectedEvent.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-black uppercase text-sm">Data:</p>
                  <p className="text-xl font-bold">{selectedEvent.start_date}</p>
                </div>
              </div>
              <table className="w-full border-collapse border-2 border-black">
                <thead>
                  <tr className="bg-zinc-200">
                    <th className="border-2 border-black p-2 text-center w-12">Nº</th>
                    <th className="border-2 border-black p-2 text-left">Nome Completo</th>
                    <th className="border-2 border-black p-2 text-center w-32">Nasc.</th>
                    <th className="border-2 border-black p-2 text-center w-32">RG/CPF</th>
                    <th className="border-2 border-black p-2 text-center w-16">Camisa</th>
                    <th className="border-2 border-black p-2 text-center w-24">Confirmado</th>
                  </tr>
                </thead>
                <tbody>
                  {lineupAthletes.map((a, idx) => (
                    <tr key={a.id}>
                      <td className="border-2 border-black p-2 text-center">{idx + 1}</td>
                      <td className="border-2 border-black p-2 font-bold uppercase">{a.name}</td>
                      <td className="border-2 border-black p-2 text-center">{a.birth_date}</td>
                      <td className="border-2 border-black p-2 text-center">{a.doc}</td>
                      <td className="border-2 border-black p-2 text-center font-bold">#{a.jersey_number}</td>
                      <td className="border-2 border-black p-2 text-center text-[10px] font-bold uppercase">{a.confirmation}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 22 - lineupAthletes.length) }).map((_, i) => (
                    <tr key={`empty-${i}`} className="h-10">
                      <td className="border-2 border-black p-2 text-center">{lineupAthletes.length + i + 1}</td>
                      <td className="border-2 border-black p-2"></td>
                      <td className="border-2 border-black p-2"></td>
                      <td className="border-2 border-black p-2"></td>
                      <td className="border-2 border-black p-2"></td>
                      <td className="border-2 border-black p-2"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-12 text-center">
                <div className="w-64 border-t-2 border-black mx-auto pt-2 font-bold uppercase">Assinatura do Responsável Técnico</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
