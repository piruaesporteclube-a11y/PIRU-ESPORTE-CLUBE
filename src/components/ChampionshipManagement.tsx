import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Championship, ChampionshipTeam, ChampionshipMatch, categories } from '../types';
import { Trophy, Plus, Users, Calendar, MapPin, Clock, Save, X, Trash2, Search, Link as LinkIcon, Check, AlertCircle, ClipboardList, Trophy as TrophyIcon, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils';

export default function ChampionshipManagement() {
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [selectedChampionship, setSelectedChampionship] = useState<Championship | null>(null);
  const [view, setView] = useState<'list' | 'details'>('list');
  
  const [formData, setFormData] = useState<Partial<Championship>>({
    name: '',
    description: '',
    categories: [],
    dispute_format: 'Grupos + Mata-mata',
    status: 'Inscrições Abertas'
  });

  useEffect(() => {
    loadChampionships();
  }, []);

  const loadChampionships = async () => {
    const data = await api.getChampionships();
    setChampionships(data);
  };

  const handleCreateChampionship = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.categories?.length === 0) {
      toast.error("Selecione pelo menos uma categoria");
      return;
    }
    try {
      await api.saveChampionship(formData);
      toast.success("Campeonato salvo com sucesso!");
      setIsFormOpen(false);
      setFormData({ name: '', description: '', categories: [], dispute_format: 'Grupos + Mata-mata', status: 'Inscrições Abertas' });
      loadChampionships();
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  };

  const handleDeleteChampionship = async (id: string) => {
    if (confirm("Tem certeza que deseja excluir este campeonato?")) {
      try {
        await api.deleteChampionship(id);
        toast.success("Campeonato excluído!");
        loadChampionships();
      } catch (err: any) {
        toast.error(`Erro: ${err.message}`);
      }
    }
  };

  const toggleCategory = (cat: string) => {
    const current = formData.categories || [];
    if (current.includes(cat)) {
      setFormData({ ...formData, categories: current.filter(c => c !== cat) });
    } else {
      setFormData({ ...formData, categories: [...current, cat] });
    }
  };

  if (view === 'details' && selectedChampionship) {
    return (
      <ChampionshipDetails 
        championship={selectedChampionship} 
        onBack={() => {
          setView('list');
          setSelectedChampionship(null);
          loadChampionships();
        }} 
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Campeonatos</h2>
          <p className="text-zinc-400 text-sm">Gerencie torneios, inscrições e resultados</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black font-bold rounded-xl transition-colors"
        >
          <Plus size={18} />
          Novo Campeonato
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {championships.map((c) => (
          <div key={c.id} className="bg-black border border-theme-primary/20 rounded-3xl p-6 hover:border-theme-primary/50 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4">
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                c.status === 'Inscrições Abertas' ? "bg-green-500/10 text-green-500" :
                c.status === 'Em Andamento' ? "bg-blue-500/10 text-blue-500" : "bg-zinc-500/10 text-zinc-500"
              )}>
                {c.status}
              </span>
            </div>
            
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl w-fit mb-4">
              <Trophy size={24} />
            </div>
            
            <h3 className="text-xl font-bold text-white mb-2 uppercase">{c.name}</h3>
            <p className="text-sm text-zinc-400 mb-4 line-clamp-2">{c.description}</p>
            
            <div className="flex flex-wrap gap-1 mb-6">
              {c.categories.map(cat => (
                <span key={cat} className="px-2 py-0.5 bg-zinc-800 text-zinc-500 text-[9px] font-bold rounded-md uppercase">
                  {cat}
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  setSelectedChampionship(c);
                  setView('details');
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Gerenciar
              </button>
              <button 
                onClick={() => handleDeleteChampionship(c.id)}
                className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-500 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-black border border-theme-primary/20 w-full max-w-2xl rounded-3xl shadow-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b border-zinc-800">
              <h2 className="text-xl font-bold text-white">Novo Campeonato</h2>
              <button onClick={() => setIsFormOpen(false)} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all group">
                <X size={18} className="group-hover:rotate-90 transition-transform" />
                <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
              </button>
            </div>
            <form onSubmit={handleCreateChampionship} className="p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Nome do Campeonato</label>
                  <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value.toUpperCase()})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Descrição</label>
                  <textarea rows={3} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Forma de Disputa</label>
                    <select className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.dispute_format} onChange={e => setFormData({...formData, dispute_format: e.target.value as any})}>
                      <option value="Eliminatória">Eliminatória (Mata-mata)</option>
                      <option value="Pontos Corridos">Pontos Corridos</option>
                      <option value="Grupos + Mata-mata">Grupos + Mata-mata</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status Inicial</label>
                    <select className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                      <option value="Inscrições Abertas">Inscrições Abertas</option>
                      <option value="Em Andamento">Em Andamento</option>
                      <option value="Finalizado">Finalizado</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Início das Inscrições</label>
                    <input type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.registration_start} onChange={e => setFormData({...formData, registration_start: e.target.value})} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Fim das Inscrições</label>
                    <input type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50" value={formData.registration_end} onChange={e => setFormData({...formData, registration_end: e.target.value})} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 uppercase mb-2">Categorias</label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {categories.map(cat => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => toggleCategory(cat)}
                        className={cn(
                          "px-3 py-2 rounded-xl border text-[10px] font-black uppercase transition-all",
                          formData.categories?.includes(cat) 
                            ? "bg-theme-primary border-theme-primary text-black" 
                            : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Cancelar</button>
                <button type="submit" className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg shadow-theme-primary/20">Criar Campeonato</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ChampionshipDetails({ championship, onBack }: { championship: Championship, onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<'teams' | 'matches'>('teams');
  const [teams, setTeams] = useState<ChampionshipTeam[]>([]);
  const [matches, setMatches] = useState<ChampionshipMatch[]>([]);
  const [isMatchFormOpen, setIsMatchFormOpen] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<ChampionshipMatch | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<ChampionshipTeam | null>(null);

  useEffect(() => {
    loadData();
  }, [championship.id]);

  const loadData = async () => {
    const [teamsData, matchesData] = await Promise.all([
      api.getChampionshipTeams(championship.id),
      api.getChampionshipMatches(championship.id)
    ]);
    setTeams(teamsData);
    setMatches(matchesData);
  };

  const handleApproveTeam = async (team: ChampionshipTeam, status: "Aprovado" | "Recusado") => {
    try {
      await api.saveChampionshipTeam({ ...team, status });
      toast.success(`Inscrição ${status === 'Aprovado' ? 'aprovada' : 'recusada'}!`);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const registrationLink = `${window.location.origin}/register-team/${championship.id}`;
  const portalLink = `${window.location.origin}/team-portal/${championship.id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl transition-all">
            <X size={20} />
          </button>
          <div>
            <h2 className="text-2xl font-bold text-white uppercase">{championship.name}</h2>
            <p className="text-zinc-400 text-sm">{championship.dispute_format} • {championship.status}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(registrationLink);
              toast.success("Link de inscrição copiado!");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors uppercase tracking-widest"
          >
            <LinkIcon size={14} />
            Inscrição
          </button>
          <button 
            onClick={() => {
              navigator.clipboard.writeText(portalLink);
              toast.success("Link do portal da equipe copiado!");
            }}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors uppercase tracking-widest"
          >
            <Shield size={14} />
            Portal Equipe
          </button>
          <button 
            onClick={() => setIsMatchFormOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-theme-primary hover:opacity-90 text-black text-xs font-black rounded-xl transition-colors uppercase tracking-widest"
          >
            <Plus size={14} />
            Nova Partida
          </button>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-zinc-900 rounded-2xl w-fit">
        <button 
          onClick={() => setActiveTab('teams')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all",
            activeTab === 'teams' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
          )}
        >
          Times e Inscrições
        </button>
        <button 
          onClick={() => setActiveTab('matches')}
          className={cn(
            "px-6 py-2 rounded-xl text-sm font-bold transition-all",
            activeTab === 'matches' ? "bg-theme-primary text-black" : "text-zinc-500 hover:text-white"
          )}
        >
          Partidas e Resultados
        </button>
      </div>

      {activeTab === 'teams' ? (
        <div className="grid grid-cols-1 gap-4">
          {teams.length === 0 && (
            <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-3xl p-12 text-center">
              <Users className="mx-auto text-zinc-700 mb-4" size={48} />
              <p className="text-zinc-500">Nenhum time inscrito ainda.</p>
              <p className="text-zinc-600 text-sm mt-2">Compartilhe o link de inscrição para receber cadastros.</p>
            </div>
          )}
          {teams.map(team => (
            <div key={team.id} className="bg-black border border-zinc-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden flex-shrink-0 border border-zinc-700">
                  {team.logo ? <img src={team.logo} className="w-full h-full object-cover" /> : <TrophyIcon className="w-full h-full p-4 text-zinc-700" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white uppercase">{team.name}</h3>
                  <p className="text-xs text-theme-primary font-black uppercase tracking-widest">{team.category}</p>
                  <p className="text-[10px] text-zinc-500 mt-1 uppercase font-bold">
                    {team.players.length} Jogadores • {team.staff.length} Comissão
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {team.status === 'Pendente' ? (
                  <>
                    <button 
                      onClick={() => handleApproveTeam(team, 'Aprovado')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-black text-xs font-black rounded-xl transition-all uppercase tracking-widest"
                    >
                      <Check size={14} />
                      Aprovar
                    </button>
                    <button 
                      onClick={() => handleApproveTeam(team, 'Recusado')}
                      className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-black text-xs font-black rounded-xl transition-all uppercase tracking-widest"
                    >
                      <X size={14} />
                      Recusar
                    </button>
                  </>
                ) : (
                  <span className={cn(
                    "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest",
                    team.status === 'Aprovado' ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {team.status}
                  </span>
                )}
                <button 
                  onClick={() => {
                    // Show team members modal
                    setSelectedTeam(team);
                  }}
                  className="p-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl transition-colors"
                >
                  <ClipboardList size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {matches.map(match => {
            const teamA = teams.find(t => t.id === match.team_a_id);
            const teamB = teams.find(t => t.id === match.team_b_id);
            return (
              <div key={match.id} className="bg-black border border-zinc-800 rounded-3xl p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                  <div className="flex-1 flex items-center justify-end gap-4 text-right">
                    <div>
                      <p className="font-bold text-white uppercase">{teamA?.name || 'Time A'}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{match.category}</p>
                    </div>
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-700">
                      {teamA?.logo ? <img src={teamA.logo} className="w-full h-full object-cover" /> : <TrophyIcon className="w-full h-full p-3 text-zinc-700" />}
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-4 bg-zinc-900 px-6 py-3 rounded-2xl border border-zinc-800">
                      <span className="text-3xl font-black text-white">{match.score_a}</span>
                      <span className="text-zinc-600 font-bold">X</span>
                      <span className="text-3xl font-black text-white">{match.score_b}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      <span className="flex items-center gap-1"><Calendar size={12} /> {match.date}</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {match.time}</span>
                    </div>
                  </div>

                  <div className="flex-1 flex items-center justify-start gap-4 text-left">
                    <div className="w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden flex-shrink-0 border border-zinc-700">
                      {teamB?.logo ? <img src={teamB.logo} className="w-full h-full object-cover" /> : <TrophyIcon className="w-full h-full p-3 text-zinc-700" />}
                    </div>
                    <div>
                      <p className="font-bold text-white uppercase">{teamB?.name || 'Time B'}</p>
                      <p className="text-[10px] text-zinc-500 uppercase font-bold">{match.category}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-zinc-800 flex justify-center gap-3">
                  <button 
                    onClick={() => {
                      setSelectedMatch(match);
                      setIsMatchFormOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold rounded-xl transition-colors uppercase tracking-widest"
                  >
                    Editar Placar
                  </button>
                  <button 
                    onClick={() => {
                      setSelectedMatch(match);
                      setIsReportOpen(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-black text-xs font-black rounded-xl transition-all uppercase tracking-widest"
                  >
                    Súmula da Partida
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Match Form Modal */}
      {isMatchFormOpen && (
        <MatchForm 
          championship={championship} 
          teams={teams} 
          match={selectedMatch}
          onClose={() => {
            setIsMatchFormOpen(false);
            setSelectedMatch(null);
          }}
          onSave={() => {
            setIsMatchFormOpen(false);
            setSelectedMatch(null);
            loadData();
          }}
        />
      )}

      {/* Match Report Modal (Súmula) */}
      {isReportOpen && selectedMatch && (
        <MatchReportModal 
          match={selectedMatch}
          teams={teams}
          onClose={() => {
            setIsReportOpen(false);
            setSelectedMatch(null);
          }}
          onSave={() => {
            setIsReportOpen(false);
            setSelectedMatch(null);
            loadData();
          }}
        />
      )}

      {/* Team Details Modal */}
      {selectedTeam && (
        <TeamDetailsModal 
          team={selectedTeam} 
          onClose={() => setSelectedTeam(null)} 
        />
      )}
    </div>
  );
}

function MatchForm({ championship, teams, match, onClose, onSave }: { championship: Championship, teams: ChampionshipTeam[], match: ChampionshipMatch | null, onClose: () => void, onSave: () => void }) {
  const [formData, setFormData] = useState<Partial<ChampionshipMatch>>(match || {
    championship_id: championship.id,
    category: championship.categories[0],
    team_a_id: '',
    team_b_id: '',
    score_a: 0,
    score_b: 0,
    date: '',
    time: '',
    location: '',
    status: 'Agendado'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveChampionshipMatch(formData);
      toast.success("Partida salva!");
      onSave();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const filteredTeams = teams.filter(t => t.category === formData.category && t.status === 'Aprovado');

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-black border border-theme-primary/20 w-full max-w-2xl rounded-3xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white uppercase">{match ? 'Editar Partida' : 'Nova Partida'}</h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Categoria</label>
              <select className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                {championship.categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Status</label>
              <select className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as any})}>
                <option value="Agendado">Agendado</option>
                <option value="Em Andamento">Em Andamento</option>
                <option value="Finalizado">Finalizado</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 items-center">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Time A</label>
                <select required className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.team_a_id} onChange={e => setFormData({...formData, team_a_id: e.target.value})}>
                  <option value="">Selecione...</option>
                  {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Gols Time A</label>
                <input type="number" min="0" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.score_a} onChange={e => setFormData({...formData, score_a: parseInt(e.target.value) || 0})} />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Time B</label>
                <select required className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.team_b_id} onChange={e => setFormData({...formData, team_b_id: e.target.value})}>
                  <option value="">Selecione...</option>
                  {filteredTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Gols Time B</label>
                <input type="number" min="0" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.score_b} onChange={e => setFormData({...formData, score_b: parseInt(e.target.value) || 0})} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Data</label>
              <input required type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
            </div>
            <div>
              <label className="block text-xs font-bold text-zinc-400 uppercase mb-1">Horário</label>
              <input required type="time" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Cancelar</button>
            <button type="submit" className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg">Salvar Partida</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MatchReportModal({ match, teams, onClose, onSave }: { match: ChampionshipMatch, teams: ChampionshipTeam[], onClose: () => void, onSave: () => void }) {
  const [report, setReport] = useState<any>(match.match_report || { goals: [], cards: [], observations: '' });
  const teamA = teams.find(t => t.id === match.team_a_id);
  const teamB = teams.find(t => t.id === match.team_b_id);

  const handleAddGoal = (teamId: string) => {
    setReport({
      ...report,
      goals: [...report.goals, { team_id: teamId, player_name: '', minute: 0 }]
    });
  };

  const handleAddCard = (teamId: string, type: 'Amarelo' | 'Vermelho') => {
    setReport({
      ...report,
      cards: [...report.cards, { team_id: teamId, player_name: '', type, minute: 0 }]
    });
  };

  const handleSave = async () => {
    try {
      await api.saveChampionshipMatch({ ...match, match_report: report });
      toast.success("Súmula atualizada!");
      onSave();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-black border border-theme-primary/20 w-full max-w-4xl rounded-3xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white uppercase tracking-widest">Súmula da Partida</h2>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Team A Events */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                  {teamA?.logo ? <img src={teamA.logo} className="w-full h-full object-cover" /> : <TrophyIcon className="w-full h-full p-2 text-zinc-700" />}
                </div>
                <h3 className="font-bold text-white uppercase">{teamA?.name}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gols</h4>
                  <button onClick={() => handleAddGoal(match.team_a_id)} className="text-[10px] font-bold text-theme-primary uppercase">+ Adicionar</button>
                </div>
                {report.goals.filter((g: any) => g.team_id === match.team_a_id).map((g: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Nome do Atleta" 
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={g.player_name}
                      onChange={e => {
                        const newGoals = [...report.goals];
                        const idx = report.goals.indexOf(g);
                        newGoals[idx].player_name = e.target.value.toUpperCase();
                        setReport({...report, goals: newGoals});
                      }}
                    />
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-16 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={g.minute}
                      onChange={e => {
                        const newGoals = [...report.goals];
                        const idx = report.goals.indexOf(g);
                        newGoals[idx].minute = parseInt(e.target.value) || 0;
                        setReport({...report, goals: newGoals});
                      }}
                    />
                    <button 
                      onClick={() => {
                        const newGoals = report.goals.filter((_: any, index: number) => report.goals.indexOf(g) !== index);
                        setReport({...report, goals: newGoals});
                      }}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cartões</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleAddCard(match.team_a_id, 'Amarelo')} className="text-[10px] font-bold text-yellow-500 uppercase">+ Amarelo</button>
                    <button onClick={() => handleAddCard(match.team_a_id, 'Vermelho')} className="text-[10px] font-bold text-red-500 uppercase">+ Vermelho</button>
                  </div>
                </div>
                {report.cards.filter((c: any) => c.team_id === match.team_a_id).map((c: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className={cn("w-2 h-3 rounded-sm flex-shrink-0", c.type === 'Amarelo' ? "bg-yellow-500" : "bg-red-500")} />
                    <input 
                      type="text" 
                      placeholder="Nome do Atleta" 
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={c.player_name}
                      onChange={e => {
                        const newCards = [...report.cards];
                        const idx = report.cards.indexOf(c);
                        newCards[idx].player_name = e.target.value.toUpperCase();
                        setReport({...report, cards: newCards});
                      }}
                    />
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-16 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={c.minute}
                      onChange={e => {
                        const newCards = [...report.cards];
                        const idx = report.cards.indexOf(c);
                        newCards[idx].minute = parseInt(e.target.value) || 0;
                        setReport({...report, cards: newCards});
                      }}
                    />
                    <button 
                      onClick={() => {
                        const newCards = report.cards.filter((_: any, index: number) => report.cards.indexOf(c) !== index);
                        setReport({...report, cards: newCards});
                      }}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Team B Events */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
                  {teamB?.logo ? <img src={teamB.logo} className="w-full h-full object-cover" /> : <TrophyIcon className="w-full h-full p-2 text-zinc-700" />}
                </div>
                <h3 className="font-bold text-white uppercase">{teamB?.name}</h3>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Gols</h4>
                  <button onClick={() => handleAddGoal(match.team_b_id)} className="text-[10px] font-bold text-theme-primary uppercase">+ Adicionar</button>
                </div>
                {report.goals.filter((g: any) => g.team_id === match.team_b_id).map((g: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input 
                      type="text" 
                      placeholder="Nome do Atleta" 
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={g.player_name}
                      onChange={e => {
                        const newGoals = [...report.goals];
                        const idx = report.goals.indexOf(g);
                        newGoals[idx].player_name = e.target.value.toUpperCase();
                        setReport({...report, goals: newGoals});
                      }}
                    />
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-16 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={g.minute}
                      onChange={e => {
                        const newGoals = [...report.goals];
                        const idx = report.goals.indexOf(g);
                        newGoals[idx].minute = parseInt(e.target.value) || 0;
                        setReport({...report, goals: newGoals});
                      }}
                    />
                    <button 
                      onClick={() => {
                        const newGoals = report.goals.filter((_: any, index: number) => report.goals.indexOf(g) !== index);
                        setReport({...report, goals: newGoals});
                      }}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Cartões</h4>
                  <div className="flex gap-2">
                    <button onClick={() => handleAddCard(match.team_b_id, 'Amarelo')} className="text-[10px] font-bold text-yellow-500 uppercase">+ Amarelo</button>
                    <button onClick={() => handleAddCard(match.team_b_id, 'Vermelho')} className="text-[10px] font-bold text-red-500 uppercase">+ Vermelho</button>
                  </div>
                </div>
                {report.cards.filter((c: any) => c.team_id === match.team_b_id).map((c: any, i: number) => (
                  <div key={i} className="flex gap-2 items-center">
                    <div className={cn("w-2 h-3 rounded-sm flex-shrink-0", c.type === 'Amarelo' ? "bg-yellow-500" : "bg-red-500")} />
                    <input 
                      type="text" 
                      placeholder="Nome do Atleta" 
                      className="flex-1 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={c.player_name}
                      onChange={e => {
                        const newCards = [...report.cards];
                        const idx = report.cards.indexOf(c);
                        newCards[idx].player_name = e.target.value.toUpperCase();
                        setReport({...report, cards: newCards});
                      }}
                    />
                    <input 
                      type="number" 
                      placeholder="Min" 
                      className="w-16 px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-white"
                      value={c.minute}
                      onChange={e => {
                        const newCards = [...report.cards];
                        const idx = report.cards.indexOf(c);
                        newCards[idx].minute = parseInt(e.target.value) || 0;
                        setReport({...report, cards: newCards});
                      }}
                    />
                    <button 
                      onClick={() => {
                        const newCards = report.cards.filter((_: any, index: number) => report.cards.indexOf(c) !== index);
                        setReport({...report, cards: newCards});
                      }}
                      className="p-2 text-zinc-600 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">Observações da Partida</label>
            <textarea 
              rows={4} 
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-2xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-theme-primary/50"
              value={report.observations}
              onChange={e => setReport({...report, observations: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-zinc-800">
            <button type="button" onClick={onClose} className="px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-bold transition-colors">Cancelar</button>
            <button onClick={handleSave} className="px-8 py-3 bg-theme-primary hover:opacity-90 text-black rounded-xl font-black transition-all shadow-lg">Salvar Súmula</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamDetailsModal({ team, onClose }: { team: ChampionshipTeam, onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60] flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-black border border-theme-primary/20 w-full max-w-4xl rounded-3xl shadow-2xl my-8">
        <div className="flex items-center justify-between p-6 border-b border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-zinc-800 rounded-xl overflow-hidden border border-zinc-700">
              {team.logo ? <img src={team.logo} className="w-full h-full object-cover" /> : <TrophyIcon className="w-full h-full p-3 text-zinc-700" />}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white uppercase">{team.name}</h2>
              <p className="text-xs text-theme-primary font-black uppercase tracking-widest">{team.category}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                <p className="text-[10px] text-zinc-500 font-bold uppercase">Responsável: {team.responsible_name}</p>
                <p className="text-[10px] text-zinc-500 font-bold uppercase">WhatsApp: {team.responsible_phone}</p>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl transition-all"><X size={20} /></button>
        </div>
        
        <div className="p-6 space-y-8">
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest border-l-4 border-theme-primary pl-3">Jogadores ({team.players.length}/22)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.players.map((p, i) => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-zinc-800 rounded-full overflow-hidden flex-shrink-0">
                    {p.photo ? <img src={p.photo} className="w-full h-full object-cover" /> : <Users className="w-full h-full p-2 text-zinc-700" />}
                  </div>
                  <div>
                    <p className="font-bold text-white text-sm uppercase">{p.name}</p>
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] text-zinc-500 font-bold uppercase">{p.doc}</p>
                      {p.jersey_number && <span className="text-[10px] text-theme-primary font-black">#{p.jersey_number}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest border-l-4 border-theme-primary pl-3">Comissão Técnica ({team.staff.length}/3)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {team.staff.map((s, i) => (
                <div key={i} className="bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl">
                  <p className="font-bold text-white text-sm uppercase">{s.name}</p>
                  <p className="text-[10px] text-theme-primary font-bold uppercase tracking-widest">{s.role}</p>
                  <div className="flex flex-col mt-1">
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">{s.doc}</p>
                    {s.phone && <p className="text-[10px] text-zinc-500 font-bold uppercase">Zap: {s.phone}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
