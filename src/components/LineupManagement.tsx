import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor, Event, getSubCategory } from '../types';
import { Users, User, Trash2, Search, Plus, Save, FileText, Calendar, ChevronRight, Clock, MapPin } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';

export default function LineupManagement() {
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'templates'>('history');
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, templatesData, athletesData, professorsData] = await Promise.all([
        api.getEvents(),
        api.getNamedLineups(),
        api.getAthletes(),
        api.getProfessors()
      ]);
      setEvents(eventsData.sort((a, b) => b.start_date.localeCompare(a.start_date)));
      setTemplates(templatesData);
      setAthletes(athletesData);
      setProfessors(professorsData);
    } catch (error) {
      console.error('Error loading lineup data:', error);
      toast.error('Erro ao carregar dados das escalações.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este modelo de escalação?')) return;
    try {
      await api.deleteNamedLineup(id);
      toast.success('Modelo excluído com sucesso!');
      loadData();
    } catch (error) {
      toast.error('Erro ao excluir modelo.');
    }
  };

  const filteredEvents = events.filter(e => 
    e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.city.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Escalações</h2>
          <p className="text-zinc-400 text-sm">Gerencie modelos e consulte o histórico de escalações</p>
        </div>
        <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800">
          <button
            onClick={() => setActiveSubTab('history')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
              activeSubTab === 'history' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Histórico
          </button>
          <button
            onClick={() => setActiveSubTab('templates')}
            className={cn(
              "px-6 py-2 rounded-xl text-xs font-black transition-all uppercase tracking-widest",
              activeSubTab === 'templates' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
            )}
          >
            Modelos
          </button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
        <input
          type="text"
          placeholder={activeSubTab === 'history' ? "PESQUISAR EVENTOS..." : "PESQUISAR MODELOS..."}
          className="w-full pl-12 pr-4 py-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase font-bold text-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
        </div>
      ) : activeSubTab === 'history' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredEvents.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
              <Calendar size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum evento encontrado</p>
            </div>
          ) : (
            filteredEvents.map(event => (
              <div key={event.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-theme-primary/30 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                    <Calendar size={24} />
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Data</p>
                    <p className="text-sm font-bold text-white">{event.start_date}</p>
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-4 uppercase truncate">{event.name}</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <MapPin size={14} className="text-zinc-600" />
                    {event.city}/{event.uf}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <Clock size={14} className="text-zinc-600" />
                    {event.start_time}
                  </div>
                </div>
                <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <div className="flex -space-x-2">
                    {/* Just a visual representation of athletes */}
                    {[1, 2, 3].map(i => (
                      <div key={i} className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center">
                        <User size={14} className="text-zinc-500" />
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-zinc-900 bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500">
                      +
                    </div>
                  </div>
                  <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">Ver Detalhes na Guia Eventos</p>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.length === 0 ? (
            <div className="col-span-full py-20 text-center bg-zinc-900/50 rounded-3xl border border-dashed border-zinc-800">
              <FileText size={48} className="mx-auto text-zinc-700 mb-4" />
              <p className="text-zinc-500 font-bold uppercase tracking-widest">Nenhum modelo salvo</p>
              <p className="text-zinc-600 text-xs mt-2 uppercase">Crie modelos a partir da escalação de um evento</p>
            </div>
          ) : (
            filteredTemplates.map(template => (
              <div key={template.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-theme-primary/30 transition-all group relative">
                <button 
                  onClick={() => handleDeleteTemplate(template.id)}
                  className="absolute top-4 right-4 p-2 text-zinc-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
                <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl w-fit mb-4">
                  <Users size={24} />
                </div>
                <h3 className="text-lg font-bold text-white mb-2 uppercase truncate pr-8">{template.name}</h3>
                <div className="space-y-1 mb-6">
                  <p className="text-xs text-zinc-500 uppercase font-bold">
                    {template.athlete_ids?.length || 0} Atletas
                  </p>
                  <p className="text-xs text-zinc-500 uppercase font-bold">
                    {template.staff_ids?.length || 0} Comissão
                  </p>
                </div>
                <div className="flex flex-wrap gap-1 mb-6">
                  {template.athlete_ids?.slice(0, 5).map((aid: string) => {
                    const athlete = athletes.find(a => a.id === aid);
                    return athlete ? (
                      <span key={aid} className="px-2 py-1 bg-zinc-800 rounded-lg text-[9px] font-bold text-zinc-400 uppercase">
                        {athlete.nickname || athlete.name.split(' ')[0]}
                      </span>
                    ) : null;
                  })}
                  {template.athlete_ids?.length > 5 && (
                    <span className="px-2 py-1 bg-zinc-800 rounded-lg text-[9px] font-bold text-zinc-500">
                      +{template.athlete_ids.length - 5}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
                  Criado em: {template.created_at?.toDate ? template.created_at.toDate().toLocaleDateString() : 'Recentemente'}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
