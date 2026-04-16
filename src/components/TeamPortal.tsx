import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { 
  Trophy, 
  Users, 
  Calendar, 
  Clock, 
  MapPin, 
  Shield, 
  User, 
  Search, 
  ChevronRight, 
  AlertCircle,
  CheckCircle2,
  ArrowLeft
} from 'lucide-react';
import { api } from '../api';
import { Championship, ChampionshipTeam, ChampionshipMatch } from '../types';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

interface TeamPortalProps {
  championshipId?: string;
}

export const TeamPortal: React.FC<TeamPortalProps> = ({ championshipId: propChampionshipId }) => {
  const { championshipId: urlChampionshipId } = useParams<{ championshipId: string }>();
  const championshipId = propChampionshipId || urlChampionshipId;

  const [cpf, setCpf] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [championship, setChampionship] = useState<Championship | null>(null);
  const [teams, setTeams] = useState<ChampionshipTeam[]>([]);
  const [allChampionshipTeams, setAllChampionshipTeams] = useState<ChampionshipTeam[]>([]);
  const [matches, setMatches] = useState<ChampionshipMatch[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<ChampionshipTeam | null>(null);
  const [activeTab, setActiveTab] = useState<'roster' | 'matches'>('roster');

  useEffect(() => {
    if (championshipId) {
      fetchChampionshipDetails();
    }
  }, [championshipId]);

  const fetchChampionshipDetails = async () => {
    try {
      const allChampionships = await api.getChampionships();
      const found = allChampionships.find(c => c.id === championshipId);
      if (found) {
        setChampionship(found);
        // Load all teams to show opponent details
        const allTeams = await api.getChampionshipTeams(found.id);
        setAllChampionshipTeams(allTeams);
      }
    } catch (error) {
      console.error("Error fetching championship:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!championshipId) return;

    setLoading(true);
    try {
      const normalizedCpf = cpf.replace(/\D/g, '');
      const foundTeams = await api.getChampionshipTeamsByResponsibleDoc(championshipId, normalizedCpf);
      if (foundTeams.length > 0) {
        setTeams(foundTeams);
        setIsAuthenticated(true);
        setSelectedTeam(foundTeams[0]);
        
        // Fetch matches for the championship
        const allMatches = await api.getChampionshipMatches(championshipId);
        setMatches(allMatches);
        
        toast.success("Acesso concedido!");
      } else {
        toast.error("Nenhuma equipe encontrada para este CPF neste campeonato.");
      }
    } catch (error) {
      toast.error("Erro ao validar acesso.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !championship) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-theme-primary"></div>
      </div>
    );
  }

  if (!championship) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Campeonato não encontrado</h1>
          <p className="text-zinc-400 mb-6">O link que você acessou parece estar inválido ou o campeonato foi removido.</p>
        </div>
      </div>
    );
  }

  // Check if competition is active (only during competition)
  // The user said: "o acesso ao portal da esquipe ficará disponivel apenas durante a competição"
  // We can assume "Em Andamento" means active.
  const isCompetitionActive = championship.status === "Em Andamento";

  if (!isCompetitionActive && !isAuthenticated) {
     // If not active, show message
     return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full text-center">
          <Clock className="w-16 h-16 text-theme-primary mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Portal Indisponível</h1>
          <p className="text-zinc-400 mb-6">
            O portal da equipe só fica disponível durante a realização da competição.
            Status atual: <span className="text-theme-primary font-bold">{championship.status}</span>
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 max-w-md w-full shadow-2xl"
        >
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-theme-primary/10 rounded-full flex items-center justify-center">
              <Shield className="w-10 h-10 text-theme-primary" />
            </div>
          </div>
          
          <h1 className="text-2xl font-black text-white text-center mb-2 uppercase tracking-tight">Portal da Equipe</h1>
          <p className="text-zinc-400 text-center mb-8 text-sm">Acesse com o CPF do responsável pela equipe cadastrada.</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-zinc-500 uppercase tracking-widest mb-2">CPF do Responsável</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input 
                  required
                  type="text"
                  placeholder="000.000.000-00"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl pl-12 pr-4 py-4 text-white focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all font-bold"
                  value={cpf}
                  onChange={e => setCpf(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-theme-primary hover:bg-theme-primary/90 disabled:opacity-50 text-black font-black py-4 rounded-2xl transition-all uppercase tracking-widest flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black"></div>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Acessar Portal
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">{championship.name}</p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAuthenticated(false)}
              className="p-2 hover:bg-zinc-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-6 h-6 text-zinc-400" />
            </button>
            <div>
              <h2 className="text-lg font-black uppercase tracking-tight leading-none">{championship.name}</h2>
              <p className="text-xs text-theme-primary font-bold uppercase tracking-widest mt-1">Portal da Equipe</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {teams.length > 1 && (
              <select 
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-theme-primary/50"
                value={selectedTeam?.id}
                onChange={(e) => setSelectedTeam(teams.find(t => t.id === e.target.value) || teams[0])}
              >
                {teams.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            )}
            <div className="hidden sm:flex items-center gap-2 bg-zinc-800 px-3 py-2 rounded-xl border border-zinc-700">
              <User className="w-4 h-4 text-theme-primary" />
              <span className="text-xs font-bold uppercase tracking-wider">{selectedTeam?.responsible_name.split(' ')[0]}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Team Hero */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Trophy className="w-32 h-32" />
          </div>
          
          <div className="flex flex-col md:flex-row items-center gap-8 relative z-10">
            <div className="w-32 h-32 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 overflow-hidden shadow-2xl">
              {selectedTeam?.logo ? (
                <img src={selectedTeam.logo} alt={selectedTeam.name} className="w-full h-full object-contain p-2" />
              ) : (
                <Shield className="w-16 h-16 text-zinc-600" />
              )}
            </div>
            
            <div className="text-center md:text-left">
              <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-3">
                <span className="bg-theme-primary/10 text-theme-primary text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-theme-primary/20">
                  {selectedTeam?.category}
                </span>
                <span className="bg-zinc-800 text-zinc-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-zinc-700">
                  {selectedTeam?.status}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter mb-2">{selectedTeam?.name}</h1>
              <p className="text-zinc-400 font-medium">Responsável: <span className="text-white">{selectedTeam?.responsible_name}</span></p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-zinc-900 p-2 rounded-2xl border border-zinc-800 inline-flex">
          <button 
            onClick={() => setActiveTab('roster')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'roster' ? 'bg-theme-primary text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Users className="w-4 h-4" />
            Elenco
          </button>
          <button 
            onClick={() => setActiveTab('matches')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              activeTab === 'matches' ? 'bg-theme-primary text-black' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Partidas
          </button>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'roster' ? (
            <motion.div 
              key="roster"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-8"
            >
              {/* Staff */}
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-theme-primary" />
                  Comissão Técnica
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {selectedTeam?.staff.map((member, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl flex items-center gap-4">
                      <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700">
                        <User className="w-6 h-6 text-zinc-500" />
                      </div>
                      <div>
                        <p className="font-black uppercase text-sm leading-none mb-1">{member.name}</p>
                        <p className="text-[10px] font-black text-theme-primary uppercase tracking-widest">{member.role}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Players */}
              <div>
                <h3 className="text-xl font-black uppercase tracking-tight mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-theme-primary" />
                  Atletas ({selectedTeam?.players.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {selectedTeam?.players.map((player, idx) => (
                    <div key={idx} className="bg-zinc-900 border border-zinc-800 p-4 rounded-2xl group hover:border-theme-primary/50 transition-all">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-16 h-16 bg-zinc-800 rounded-xl flex items-center justify-center border border-zinc-700 overflow-hidden shrink-0">
                          {player.photo ? (
                            <img src={player.photo} alt={player.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-8 h-8 text-zinc-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="font-black uppercase text-sm leading-tight mb-1 truncate">{player.name}</p>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Nº {player.jersey_number || '--'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="pt-3 border-t border-zinc-800 flex justify-between items-center">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{player.birth_date}</span>
                        <CheckCircle2 className="w-4 h-4 text-green-500 opacity-50" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="matches"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="space-y-4"
            >
              {matches.length === 0 ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-12 text-center">
                  <Calendar className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400 font-bold uppercase tracking-widest">Nenhuma partida agendada ainda.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {matches
                    .filter(m => m.team_a_id === selectedTeam?.id || m.team_b_id === selectedTeam?.id)
                    .map((match) => (
                    <div key={match.id} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 hover:border-theme-primary/30 transition-all">
                      <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Team A */}
                        <div className="flex-1 flex flex-col items-center md:items-end gap-3 text-center md:text-right">
                          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 overflow-hidden">
                            {allChampionshipTeams.find(t => t.id === match.team_a_id)?.logo ? (
                              <img src={allChampionshipTeams.find(t => t.id === match.team_a_id)?.logo} className="w-full h-full object-contain p-2" />
                            ) : (
                              <Shield className="w-8 h-8 text-zinc-600" />
                            )}
                          </div>
                          <p className="font-black uppercase tracking-tight text-lg">
                            {allChampionshipTeams.find(t => t.id === match.team_a_id)?.name || 'Time A'}
                          </p>
                        </div>

                        {/* Score/Status */}
                        <div className="flex flex-col items-center gap-2 bg-zinc-800/50 px-8 py-4 rounded-2xl border border-zinc-700/50 min-w-[140px]">
                          <div className="flex items-center gap-4 text-3xl font-black tracking-tighter">
                            <span>{match.status === 'Finalizado' ? match.score_a : '-'}</span>
                            <span className="text-zinc-600 text-xl">X</span>
                            <span>{match.status === 'Finalizado' ? match.score_b : '-'}</span>
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            match.status === 'Em Andamento' ? 'bg-red-500 text-white animate-pulse' : 
                            match.status === 'Finalizado' ? 'bg-zinc-700 text-zinc-400' : 'bg-theme-primary text-black'
                          }`}>
                            {match.status}
                          </span>
                        </div>

                        {/* Team B */}
                        <div className="flex-1 flex flex-col items-center md:items-start gap-3 text-center md:text-left">
                          <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center border border-zinc-700 overflow-hidden">
                            {allChampionshipTeams.find(t => t.id === match.team_b_id)?.logo ? (
                              <img src={allChampionshipTeams.find(t => t.id === match.team_b_id)?.logo} className="w-full h-full object-contain p-2" />
                            ) : (
                              <Shield className="w-8 h-8 text-zinc-600" />
                            )}
                          </div>
                          <p className="font-black uppercase tracking-tight text-lg">
                            {allChampionshipTeams.find(t => t.id === match.team_b_id)?.name || 'Time B'}
                          </p>
                        </div>
                      </div>

                      <div className="mt-6 pt-6 border-t border-zinc-800 flex flex-wrap justify-center gap-6">
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Calendar className="w-4 h-4 text-theme-primary" />
                          <span className="text-xs font-bold uppercase tracking-widest">{match.date}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <Clock className="w-4 h-4 text-theme-primary" />
                          <span className="text-xs font-bold uppercase tracking-widest">{match.time}</span>
                        </div>
                        <div className="flex items-center gap-2 text-zinc-400">
                          <MapPin className="w-4 h-4 text-theme-primary" />
                          <span className="text-xs font-bold uppercase tracking-widest">{match.location}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default TeamPortal;
