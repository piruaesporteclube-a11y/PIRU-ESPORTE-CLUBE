import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Professor, Event, getSubCategory } from '../types';
import { Users, User, Trash2, Search, Plus, Save, FileText, Calendar, ChevronRight, Clock, MapPin, Eye } from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import EventsManagement from './EventsManagement';

export default function LineupManagement({ setActiveTab, setSelectedEventIdForTravel }: { setActiveTab?: (tab: string) => void, setSelectedEventIdForTravel?: (id: string | null) => void }) {
  const [activeSubTab, setActiveSubTab] = useState<'history' | 'templates'>('history');
  const [events, setEvents] = useState<Event[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [isNewTemplateModalOpen, setIsNewTemplateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [selectedAthleteIds, setSelectedAthleteIds] = useState<string[]>([]);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [athleteFilterSub, setAthleteFilterSub] = useState('Todos');
  const [athleteSearchTerm, setAthleteSearchTerm] = useState('');

  const handleSaveNewTemplate = async () => {
    if (!newTemplateName.trim()) {
      toast.error('Informe um nome para o modelo');
      return;
    }
    if (selectedAthleteIds.length === 0) {
      toast.error('Selecione pelo menos um atleta');
      return;
    }
    try {
      await api.saveNamedLineup(newTemplateName, selectedAthleteIds, selectedStaffIds);
      toast.success('Modelo criado com sucesso!');
      setIsNewTemplateModalOpen(false);
      setNewTemplateName('');
      setSelectedAthleteIds([]);
      setSelectedStaffIds([]);
      loadData();
    } catch (error) {
      toast.error('Erro ao salvar modelo.');
    }
  };

  const toggleAthlete = (id: string) => {
    if (selectedAthleteIds.includes(id)) {
      setSelectedAthleteIds(selectedAthleteIds.filter(aid => aid !== id));
    } else {
      setSelectedAthleteIds([...selectedAthleteIds, id]);
    }
  };

  const toggleStaff = (id: string) => {
    if (selectedStaffIds.includes(id)) {
      setSelectedStaffIds(selectedStaffIds.filter(sid => sid !== id));
    } else {
      setSelectedStaffIds([...selectedStaffIds, id]);
    }
  };

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
          {activeSubTab === 'templates' && (
            <button
              onClick={() => setIsNewTemplateModalOpen(true)}
              className="mr-2 px-4 py-2 bg-theme-primary/10 text-theme-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-theme-primary hover:text-black transition-all flex items-center gap-2"
            >
              <Plus size={14} />
              Novo Modelo
            </button>
          )}
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

      {selectedEvent ? (
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedEvent(null)}
            className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all font-bold uppercase text-xs tracking-widest flex items-center gap-2"
          >
            <ChevronRight className="rotate-180" size={14} />
            Voltar para Histórico
          </button>
          <EventsManagement 
            role="admin" 
            events={[selectedEvent]} 
            athletes={athletes} 
            initialOpenLineupEvent={selectedEvent}
          />
        </div>
      ) : isLoading ? (
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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedEvent(event)}
                      className="flex items-center gap-2 px-4 py-2 bg-theme-primary/10 text-theme-primary rounded-xl hover:bg-theme-primary hover:text-black transition-all text-[10px] font-black uppercase tracking-widest"
                    >
                      <Users size={14} />
                      Escalação
                    </button>
                    {setActiveTab && setSelectedEventIdForTravel && (
                      <button 
                        onClick={() => {
                          setSelectedEventIdForTravel(event.id);
                          setActiveTab('travel-list');
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-xl hover:bg-blue-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
                      >
                        <MapPin size={14} />
                        Viagem
                      </button>
                    )}
                  </div>
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

      {isNewTemplateModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
              <div>
                <h3 className="text-xl font-black text-white uppercase tracking-tighter">Novo Modelo de Escalação</h3>
                <p className="text-zinc-500 text-xs font-bold uppercase tracking-widest">Crie um modelo reutilizável</p>
              </div>
              <button 
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
              >
                <Trash2 size={20} className="rotate-45" />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              <div>
                <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Nome do Modelo</label>
                <input 
                  type="text"
                  placeholder="EX: TIME TITULAR SUB-17, BASE 2024..."
                  className="w-full px-4 py-3 bg-black border border-zinc-800 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 font-bold uppercase text-sm"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Users size={14} className="text-theme-primary" />
                      Atletas ({selectedAthleteIds.length})
                    </h4>
                    <div className="flex gap-2">
                      <select 
                        value={athleteFilterSub}
                        onChange={(e) => setAthleteFilterSub(e.target.value)}
                        className="bg-black border border-zinc-800 rounded-lg px-2 py-1 text-[10px] text-zinc-400 font-bold uppercase outline-none focus:border-theme-primary/50"
                      >
                        <option value="Todos">SUB - TODOS</option>
                        {['SUB-07', 'SUB-09', 'SUB-11', 'SUB-13', 'SUB-15', 'SUB-17', 'SUB-20'].map(sub => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={12} />
                    <input 
                      type="text"
                      placeholder="FILTRAR POR NOME..."
                      className="w-full pl-9 pr-4 py-2 bg-black border border-zinc-800 rounded-xl text-white text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-theme-primary/30"
                      value={athleteSearchTerm}
                      onChange={(e) => setAthleteSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="bg-black/50 border border-zinc-800 rounded-2xl p-2 h-64 overflow-y-auto space-y-1">
                    {athletes
                      .filter(a => (a.confirmation !== 'Pendente') && (athleteFilterSub === 'Todos' || getSubCategory(a.birth_date) === athleteFilterSub) && (a.name.toLowerCase().includes(athleteSearchTerm.toLowerCase()) || (a.nickname && a.nickname.toLowerCase().includes(athleteSearchTerm.toLowerCase()))))
                      .map(athlete => (
                        <button
                          key={athlete.id}
                          onClick={() => toggleAthlete(athlete.id)}
                          className={cn(
                            "w-full flex items-center justify-between p-2 rounded-xl transition-all",
                            selectedAthleteIds.includes(athlete.id) 
                              ? "bg-theme-primary/10 border border-theme-primary/30" 
                              : "hover:bg-zinc-800/50 border border-transparent"
                          )}
                        >
                          <div className="flex items-center gap-2 text-left">
                            <div className="w-8 h-8 bg-zinc-800 rounded-full flex-shrink-0 overflow-hidden border border-zinc-700">
                              {athlete.photo ? (
                                <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-zinc-600">
                                  <User size={14} />
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-white uppercase truncate w-32">{athlete.nickname || athlete.name}</p>
                              <p className="text-[8px] text-zinc-500 font-black">{getSubCategory(athlete.birth_date)}</p>
                            </div>
                          </div>
                          {selectedAthleteIds.includes(athlete.id) && <Plus size={14} className="text-theme-primary rotate-45" />}
                        </button>
                      ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                    <User size={14} className="text-theme-primary" />
                    Comissão ({selectedStaffIds.length})
                  </h4>
                  <div className="bg-black/50 border border-zinc-800 rounded-2xl p-2 h-[312px] overflow-y-auto space-y-1 mt-[44px]">
                    {professors.map(prof => (
                      <button
                        key={prof.id}
                        onClick={() => toggleStaff(prof.id)}
                        className={cn(
                          "w-full flex items-center justify-between p-2 rounded-xl transition-all",
                          selectedStaffIds.includes(prof.id) 
                            ? "bg-theme-primary/10 border border-theme-primary/30" 
                            : "hover:bg-zinc-800/50 border border-transparent"
                        )}
                      >
                        <div className="flex items-center gap-2 text-left">
                          <div className="w-8 h-8 bg-zinc-800 rounded-lg flex-shrink-0 flex items-center justify-center border border-zinc-700">
                            <User size={14} className="text-zinc-500" />
                          </div>
                          <p className="text-[10px] font-bold text-white uppercase">{prof.name}</p>
                        </div>
                        {selectedStaffIds.includes(prof.id) && <Plus size={14} className="text-theme-primary rotate-45" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-zinc-800 bg-zinc-900/50 flex items-center justify-end gap-3">
              <button 
                onClick={() => setIsNewTemplateModalOpen(false)}
                className="px-6 py-3 text-zinc-500 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveNewTemplate}
                className="px-8 py-3 bg-theme-primary text-black rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-theme-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
              >
                <Save size={16} />
                Salvar Modelo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
