import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { api } from '../api';
import { Athlete, EventMatch, ChampionshipMatch, Championship, ChampionshipTeam } from '../types';
import { getSubCategory } from '../types';
import { 
  Trophy, 
  Search, 
  Filter, 
  User, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Award, 
  AlertCircle, 
  TrendingUp, 
  X, 
  Sparkles, 
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';

interface TopScorersProps {
  athletes?: Athlete[];
}

interface ScorerGoalDetail {
  matchId: string;
  matchType: 'event' | 'championship';
  date: string;
  category: string;
  matchName: string;
  goalsCount: number;
}

interface AggregatedScorer {
  playerName: string;
  athleteId?: string;
  athlete?: Athlete;
  goals: number;
  category: string;
  goalsDetail: ScorerGoalDetail[];
}

export function parseScorersString(scorersStr: string): { name: string; goals: number }[] {
  if (!scorersStr || typeof scorersStr !== 'string') return [];
  
  const results: { name: string; goals: number }[] = [];
  const parts = scorersStr.split(/[,;]/);
  
  for (let part of parts) {
    part = part.trim();
    if (!part) continue;
    
    let goals = 1;
    let name = part;
    
    // Pattern 1: Name (number) or Name (number gols)
    const parenMatch = part.match(/(.+?)\s*\(\s*(\d+)\s*(?:gol|gols)?\s*\)/i);
    // Pattern 2: Name xNumber or Name Numberx or Name - Number
    const xMatch = part.match(/(.+?)\s*[-xX]\s*(\d+)\s*$/) || part.match(/(.+?)\s*(\d+)\s*[-xX]\s*$/);
    const hyphenMatch = part.match(/(.+?)\s*-\s*(\d+)\s*$/);
    const endNumberMatch = part.match(/(.+?)\s+(\d+)\s*$/);
    
    if (parenMatch) {
      name = parenMatch[1].trim();
      goals = parseInt(parenMatch[2], 10) || 1;
    } else if (xMatch) {
      name = xMatch[1].trim();
      goals = parseInt(xMatch[2], 10) || 1;
    } else if (hyphenMatch) {
      name = hyphenMatch[1].trim();
      goals = parseInt(hyphenMatch[2], 10) || 1;
    } else if (endNumberMatch) {
      const possibleName = endNumberMatch[1].trim();
      if (!possibleName.toUpperCase().startsWith("SUB") && !possibleName.toUpperCase().endsWith("SUB")) {
        name = possibleName;
        goals = parseInt(endNumberMatch[2], 10) || 1;
      }
    }
    
    name = name.trim();
    if (name) {
      results.push({ name, goals });
    }
  }
  
  return results;
}

const normalizeName = (name: string) => 
  name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

const findAthlete = (name: string, athletes: Athlete[]): Athlete | undefined => {
  const searchName = normalizeName(name);
  
  // 1. Try exact name match
  let athlete = athletes.find(a => normalizeName(a.name) === searchName);
  if (athlete) return athlete;
  
  // 2. Try nickname match
  athlete = athletes.find(a => a.nickname && normalizeName(a.nickname) === searchName);
  if (athlete) return athlete;
  
  // 3. Try partial name match
  athlete = athletes.find(a => {
    const aName = normalizeName(a.name);
    return aName.includes(searchName) || searchName.includes(aName);
  });
  if (athlete) return athlete;

  // 4. Try first and last name parts
  athlete = athletes.find(a => {
    const partsA = normalizeName(a.name).split(/\s+/);
    const partsB = searchName.split(/\s+/);
    return partsA.some(p => partsB.includes(p) && p.length > 2);
  });
  
  return athlete;
};

export default function TopScorers({ athletes: athletesProp }: TopScorersProps) {
  const [athletes, setAthletes] = useState<Athlete[]>(athletesProp || []);
  const [eventMatches, setEventMatches] = useState<EventMatch[]>([]);
  const [championshipMatches, setChampionshipMatches] = useState<ChampionshipMatch[]>([]);
  const [championships, setChampionships] = useState<Championship[]>([]);
  const [championshipTeams, setChampionshipTeams] = useState<ChampionshipTeam[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [selectedMatchType, setSelectedMatchType] = useState('all'); // 'all', 'event', 'championship'
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Detail Modal
  const [selectedScorer, setSelectedScorer] = useState<AggregatedScorer | null>(null);

  // Load Data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        
        // 1. Load Athletes if not passed
        let currentAthletes = athletes;
        if (!athletesProp || athletesProp.length === 0) {
          currentAthletes = await api.getAthletes();
          setAthletes(currentAthletes);
        }

        // 2. Load Event Matches
        const eventsMatchesData = await api.getAllEventMatches();
        setEventMatches(eventsMatchesData);

        // 3. Load Championships
        const champs = await api.getChampionships();
        setChampionships(champs);

        // 4. Load Championship Matches
        const champsMatches = await api.getChampionshipMatches();
        setChampionshipMatches(champsMatches);

        // 5. Load Championship Teams
        const teamsList: ChampionshipTeam[] = [];
        await Promise.all(champs.map(async (c) => {
          try {
            const teams = await api.getChampionshipTeams(c.id);
            teamsList.push(...teams);
          } catch (err) {
            console.error(`Error loading teams for champ ${c.id}:`, err);
          }
        }));
        setChampionshipTeams(teamsList);

      } catch (error) {
        console.error("Error loading data for top scorers:", error);
        toast.error("Erro ao carregar dados da artilharia.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [athletesProp]);

  // Aggregate scorers based on fetched data
  const allScorers = React.useMemo(() => {
    const scorersMap = new Map<string, {
      playerName: string;
      goals: number;
      category: string;
      goalsDetail: ScorerGoalDetail[];
    }>();

    const addGoal = (
      rawName: string, 
      goalsCount: number, 
      category: string, 
      detail: ScorerGoalDetail
    ) => {
      if (!rawName || !rawName.trim()) return;
      const normKey = normalizeName(rawName);
      
      const existing = scorersMap.get(normKey);
      if (existing) {
        existing.goals += goalsCount;
        existing.goalsDetail.push(detail);
        if (rawName !== rawName.toLowerCase() && rawName.length >= existing.playerName.length) {
          existing.playerName = rawName;
        }
      } else {
        scorersMap.set(normKey, {
          playerName: rawName,
          goals: goalsCount,
          category: category,
          goalsDetail: [detail]
        });
      }
    };

    // 1. Process Event Matches
    eventMatches.forEach(match => {
      const category = match.category || 'Outros';
      
      if (match.scorers_a) {
        const parsed = parseScorersString(match.scorers_a);
        parsed.forEach(p => {
          addGoal(p.name, p.goals, category, {
            matchId: match.id,
            matchType: 'event',
            date: match.date || '',
            category,
            matchName: `${match.team_a_name || 'Time A'} ${match.score_a || 0} x ${match.score_b || 0} ${match.team_b_name || 'Time B'} (Amistoso)`,
            goalsCount: p.goals
          });
        });
      }
      if (match.scorers_b) {
        const parsed = parseScorersString(match.scorers_b);
        parsed.forEach(p => {
          addGoal(p.name, p.goals, category, {
            matchId: match.id,
            matchType: 'event',
            date: match.date || '',
            category,
            matchName: `${match.team_a_name || 'Time A'} ${match.score_a || 0} x ${match.score_b || 0} ${match.team_b_name || 'Time B'} (Amistoso)`,
            goalsCount: p.goals
          });
        });
      }
    });

    // 2. Process Championship Matches
    championshipMatches.forEach(match => {
      const category = match.category || 'Outros';
      const champ = championships.find(c => c.id === match.championship_id);
      const champName = champ ? champ.name : 'Campeonato';
      
      const teamA = championshipTeams.find(t => t.id === match.team_a_id);
      const teamB = championshipTeams.find(t => t.id === match.team_b_id);
      const teamAName = teamA ? teamA.name : 'Time A';
      const teamBName = teamB ? teamB.name : 'Time B';

      if (match.match_report?.goals && Array.isArray(match.match_report.goals)) {
        const matchGoalsMap = new Map<string, number>();
        match.match_report.goals.forEach(goal => {
          if (!goal.player_name) return;
          const norm = normalizeName(goal.player_name);
          matchGoalsMap.set(norm, (matchGoalsMap.get(norm) || 0) + 1);
        });

        matchGoalsMap.forEach((count, normKey) => {
          const firstGoal = match.match_report!.goals.find(g => normalizeName(g.player_name) === normKey);
          const rawName = firstGoal ? firstGoal.player_name : normKey;
          
          addGoal(rawName, count, category, {
            matchId: match.id,
            matchType: 'championship',
            date: match.date || '',
            category,
            matchName: `${teamAName} ${match.score_a || 0} x ${match.score_b || 0} ${teamBName} (${champName})`,
            goalsCount: count
          });
        });
      }
    });

    // 3. Enrich with athlete cards
    const resultList: AggregatedScorer[] = [];
    scorersMap.forEach((value) => {
      const athlete = findAthlete(value.playerName, athletes);
      resultList.push({
        playerName: athlete ? athlete.name : value.playerName,
        athleteId: athlete?.id,
        athlete,
        goals: value.goals,
        category: athlete ? getSubCategory(athlete.birth_date) : value.category,
        goalsDetail: value.goalsDetail.sort((a, b) => b.date.localeCompare(a.date))
      });
    });

    return resultList.sort((a, b) => {
      if (b.goals !== a.goals) return b.goals - a.goals;
      return a.playerName.localeCompare(b.playerName);
    });
  }, [athletes, eventMatches, championshipMatches, championships, championshipTeams]);

  // Distinct Categories derived from scorers and athletes
  const categoriesList = React.useMemo(() => {
    const list = new Set<string>();
    allScorers.forEach(s => {
      if (s.category) list.add(s.category);
    });
    return ['Todos', ...Array.from(list).sort()];
  }, [allScorers]);

  // Filtered List
  const filteredScorers = React.useMemo(() => {
    return allScorers.filter(scorer => {
      // 1. Search term (matches player name or nickname or custom category)
      const nameMatch = normalizeName(scorer.playerName).includes(normalizeName(searchTerm)) ||
        (scorer.athlete?.nickname && normalizeName(scorer.athlete.nickname).includes(normalizeName(searchTerm)));
      
      // 2. Category Match
      const categoryMatch = selectedCategory === 'Todos' || scorer.category === selectedCategory;

      // 3. Match type match
      const typeMatch = selectedMatchType === 'all' || scorer.goalsDetail.some(d => d.matchType === selectedMatchType);

      return nameMatch && categoryMatch && typeMatch;
    }).map(scorer => {
      // If filtering by Match Type, we only calculate goals for that specific type
      if (selectedMatchType !== 'all') {
        const filteredDetails = scorer.goalsDetail.filter(d => d.matchType === selectedMatchType);
        const filteredGoalsCount = filteredDetails.reduce((sum, d) => sum + d.goalsCount, 0);
        return {
          ...scorer,
          goals: filteredGoalsCount,
          goalsDetail: filteredDetails
        };
      }
      return scorer;
    }).filter(scorer => scorer.goals > 0) // Keep only those with goals in the active selection
      .sort((a, b) => b.goals - a.goals); // Re-sort in case goal counts shifted from filtering
  }, [allScorers, searchTerm, selectedCategory, selectedMatchType]);

  // Reset page on filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, selectedMatchType]);

  // Pagination bounds
  const totalPages = Math.ceil(filteredScorers.length / itemsPerPage);
  const paginatedScorers = React.useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredScorers.slice(start, start + itemsPerPage);
  }, [filteredScorers, currentPage]);

  // Top 3 for Podium
  const podiumScorers = React.useMemo(() => {
    return filteredScorers.slice(0, 3);
  }, [filteredScorers]);

  return (
    <div className="space-y-8 select-none font-sans max-w-7xl mx-auto">
      
      {/* Header section with Trophy styling */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-950 border border-zinc-900 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="flex items-center gap-5 relative z-10">
          <div className="p-4 bg-amber-500/15 border border-amber-500/30 text-amber-500 rounded-2xl shadow-lg shadow-amber-500/10">
            <Trophy size={32} className="animate-bounce" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter flex items-center gap-2">
              Central de Artilheiros
              <Sparkles size={18} className="text-amber-400" />
            </h1>
            <p className="text-zinc-500 text-xs md:text-sm uppercase tracking-widest font-semibold mt-1">
              Gols salvos de amistosos, eventos e campeonatos internos
            </p>
          </div>
        </div>

        <div className="flex flex-col text-left md:text-right relative z-10 bg-zinc-900/50 border border-zinc-800 p-4 rounded-2xl md:max-w-xs">
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total de Gols Registrados</span>
          <span className="text-3xl font-black text-white mt-1">
            {allScorers.reduce((sum, s) => sum + s.goals, 0)} GOLS
          </span>
          <span className="text-[10px] text-zinc-400 uppercase tracking-widest mt-1">
            em {eventMatches.length + championshipMatches.length} partidas disputadas
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-24 flex flex-col items-center justify-center bg-zinc-950 border border-zinc-900 rounded-[2.5rem]">
          <div className="w-12 h-12 border-4 border-amber-500/20 border-t-amber-500 rounded-full animate-spin mb-4" />
          <p className="text-zinc-500 text-sm uppercase tracking-widest font-bold">Compilando dados dos artilheiros...</p>
        </div>
      ) : (
        <>
          {/* Podium section */}
          {podiumScorers.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* 2nd Place */}
              {podiumScorers[1] && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  onClick={() => setSelectedScorer(podiumScorers[1])}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group cursor-pointer flex flex-col items-center text-center order-2 md:order-1 self-end md:h-[280px] justify-between"
                >
                  <div className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 bg-zinc-900 border border-zinc-800 text-zinc-400 font-black text-lg rounded-xl">
                    2º
                  </div>
                  
                  <div className="flex flex-col items-center mt-4">
                    <div className="relative w-20 h-20 rounded-full bg-zinc-900 border-2 border-zinc-400 p-1 flex items-center justify-center overflow-hidden mb-3">
                      {podiumScorers[1].athlete?.photo ? (
                        <img src={podiumScorers[1].athlete.photo} alt={podiumScorers[1].playerName} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="text-zinc-600" size={32} />
                      )}
                    </div>
                    <h3 className="font-extrabold text-white text-base uppercase tracking-tight line-clamp-1 group-hover:text-zinc-300 transition-colors">
                      {podiumScorers[1].athlete?.nickname || podiumScorers[1].playerName.split(' ')[0]}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                      {podiumScorers[1].category}
                    </p>
                  </div>

                  <div className="mt-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Award size={16} className="text-zinc-400" />
                    <span className="text-xl font-black text-white">{podiumScorers[1].goals}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">gols</span>
                  </div>
                </motion.div>
              )}

              {/* 1st Place - Golden King */}
              {podiumScorers[0] && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  onClick={() => setSelectedScorer(podiumScorers[0])}
                  className="bg-gradient-to-b from-amber-950/20 to-zinc-950 border-2 border-amber-500/40 hover:border-amber-500/60 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group cursor-pointer flex flex-col items-center text-center order-1 md:order-2 md:h-[320px] justify-between shadow-amber-500/5"
                >
                  <div className="absolute top-4 right-4 text-amber-500 animate-pulse">
                    <Sparkles size={20} />
                  </div>
                  
                  <div className="absolute top-4 left-4 flex items-center justify-center w-12 h-12 bg-amber-500/10 border border-amber-500/30 text-amber-500 font-black text-xl rounded-xl">
                    1º
                  </div>

                  <div className="flex flex-col items-center">
                    <div className="relative w-24 h-24 rounded-full bg-zinc-900 border-4 border-amber-500 p-1 flex items-center justify-center overflow-hidden mb-4 shadow-lg shadow-amber-500/20">
                      {podiumScorers[0].athlete?.photo ? (
                        <img src={podiumScorers[0].athlete.photo} alt={podiumScorers[0].playerName} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="text-amber-500" size={40} />
                      )}
                    </div>
                    <h3 className="font-black text-white text-lg uppercase tracking-tighter line-clamp-1 group-hover:text-amber-400 transition-colors">
                      {podiumScorers[0].athlete?.nickname || podiumScorers[0].playerName}
                    </h3>
                    <p className="text-xs text-amber-500 font-bold uppercase tracking-widest mt-1">
                      {podiumScorers[0].category}
                    </p>
                  </div>

                  <div className="mt-4 bg-amber-500/15 border border-amber-500/30 px-6 py-2.5 rounded-2xl flex items-center gap-2">
                    <Trophy size={18} className="text-amber-400" />
                    <span className="text-2xl font-black text-amber-400">{podiumScorers[0].goals}</span>
                    <span className="text-xs font-bold text-amber-500 uppercase">gols</span>
                  </div>
                </motion.div>
              )}

              {/* 3rd Place */}
              {podiumScorers[2] && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  onClick={() => setSelectedScorer(podiumScorers[2])}
                  className="bg-zinc-950 border border-zinc-800 hover:border-zinc-700 p-6 rounded-[2rem] shadow-xl relative overflow-hidden group cursor-pointer flex flex-col items-center text-center order-3 md:order-3 self-end md:h-[280px] justify-between"
                >
                  <div className="absolute top-4 left-4 flex items-center justify-center w-10 h-10 bg-zinc-900 border border-zinc-800 text-amber-700 font-black text-lg rounded-xl">
                    3º
                  </div>

                  <div className="flex flex-col items-center mt-4">
                    <div className="relative w-20 h-20 rounded-full bg-zinc-900 border-2 border-amber-700 p-1 flex items-center justify-center overflow-hidden mb-3">
                      {podiumScorers[2].athlete?.photo ? (
                        <img src={podiumScorers[2].athlete.photo} alt={podiumScorers[2].playerName} className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <User className="text-zinc-600" size={32} />
                      )}
                    </div>
                    <h3 className="font-extrabold text-white text-base uppercase tracking-tight line-clamp-1 group-hover:text-zinc-300 transition-colors">
                      {podiumScorers[2].athlete?.nickname || podiumScorers[2].playerName.split(' ')[0]}
                    </h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest mt-0.5">
                      {podiumScorers[2].category}
                    </p>
                  </div>

                  <div className="mt-4 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl flex items-center gap-2">
                    <Award size={16} className="text-amber-700" />
                    <span className="text-xl font-black text-white">{podiumScorers[2].goals}</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">gols</span>
                  </div>
                </motion.div>
              )}

            </div>
          )}

          {/* Filters section */}
          <div className="bg-zinc-950 border border-zinc-900 p-6 rounded-3xl space-y-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search input */}
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-4 top-3.5 text-zinc-500" />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="BUSCAR ARTILHEIRO OU APELIDO..." 
                  className="w-full pl-11 pr-4 py-3 bg-zinc-900 border border-zinc-800 rounded-2xl text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/50 transition-colors uppercase text-xs tracking-wider"
                />
              </div>

              {/* Category selector */}
              <div className="w-full lg:w-64 relative">
                <Filter size={16} className="absolute left-4 top-4 text-zinc-500 pointer-events-none" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:border-amber-500/50 text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer"
                >
                  <option value="Todos">TODAS AS CATEGORIAS</option>
                  {categoriesList.filter(c => c !== 'Todos').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
                <div className="absolute right-4 top-4.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-500 w-0 h-0" />
              </div>

              {/* Competition type selector */}
              <div className="w-full lg:w-64 relative">
                <TrendingUp size={16} className="absolute left-4 top-4 text-zinc-500 pointer-events-none" />
                <select
                  value={selectedMatchType}
                  onChange={(e) => setSelectedMatchType(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-zinc-900 border border-zinc-800 rounded-2xl text-white focus:outline-none focus:border-amber-500/50 text-xs font-bold uppercase tracking-wider appearance-none cursor-pointer"
                >
                  <option value="all">TODOS OS JOGOS</option>
                  <option value="event">AMISTOSOS / EVENTOS</option>
                  <option value="championship">CAMPEONATOS INTERNOS</option>
                </select>
                <div className="absolute right-4 top-4.5 pointer-events-none border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-zinc-500 w-0 h-0" />
              </div>
            </div>
          </div>

          {/* Main Leaderboard Table */}
          <div className="bg-zinc-950 border border-zinc-900 rounded-[2rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-900 flex justify-between items-center bg-zinc-950/80">
              <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Classificação Geral</span>
              <span className="text-xs font-bold text-zinc-500 uppercase">{filteredScorers.length} Atletas Listados</span>
            </div>

            {filteredScorers.length === 0 ? (
              <div className="p-16 text-center space-y-4">
                <AlertCircle className="mx-auto text-zinc-700 animate-pulse" size={48} />
                <div className="space-y-1">
                  <p className="text-white font-extrabold uppercase text-sm tracking-wide">Nenhum artilheiro encontrado</p>
                  <p className="text-zinc-500 text-xs">Tente ajustar seus filtros de busca ou categoria.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-500 text-[10px] font-black uppercase tracking-widest bg-zinc-900/15">
                      <th className="py-4 px-6 text-center w-16">Pos</th>
                      <th className="py-4 px-6">Atleta / Jogador</th>
                      <th className="py-4 px-6">Categoria</th>
                      <th className="py-4 px-6">Partidas com Gol</th>
                      <th className="py-4 px-6 text-right w-32">Gols</th>
                      <th className="py-4 px-6 text-center w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-900">
                    <AnimatePresence mode="popLayout">
                      {paginatedScorers.map((scorer, index) => {
                        const rank = (currentPage - 1) * itemsPerPage + index + 1;
                        const isTop3 = rank <= 3;
                        
                        return (
                          <motion.tr 
                            key={scorer.playerName + '-' + scorer.category}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="hover:bg-zinc-900/20 transition-colors group"
                          >
                            {/* Position cell */}
                            <td className="py-4 px-6 text-center font-bold">
                              {isTop3 ? (
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg font-black text-xs ${
                                  rank === 1 ? 'bg-amber-500/10 border border-amber-500/30 text-amber-500' :
                                  rank === 2 ? 'bg-zinc-400/10 border border-zinc-400/30 text-zinc-400' :
                                  'bg-amber-800/10 border border-amber-800/30 text-amber-700'
                                }`}>
                                  {rank}
                                </span>
                              ) : (
                                <span className="text-zinc-500 font-bold text-sm">{rank}</span>
                              )}
                            </td>

                            {/* Player name & avatar cell */}
                            <td className="py-4 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center overflow-hidden">
                                  {scorer.athlete?.photo ? (
                                    <img src={scorer.athlete.photo} alt={scorer.playerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <User size={18} className="text-zinc-600" />
                                  )}
                                </div>
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-extrabold text-white text-sm group-hover:text-amber-500 transition-colors uppercase">
                                      {scorer.playerName}
                                    </span>
                                    {scorer.athlete?.nickname && (
                                      <span className="text-[10px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded-md border border-zinc-800 font-bold uppercase tracking-wider">
                                        {scorer.athlete.nickname}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                      {scorer.athlete?.position || 'Jogador'}
                                    </span>
                                    {scorer.athlete?.jersey_number && (
                                      <span className="text-[9px] text-amber-500 font-black">
                                        Nº {scorer.athlete.jersey_number}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Category cell */}
                            <td className="py-4 px-6">
                              <span className="text-xs text-zinc-300 font-bold uppercase tracking-wider bg-zinc-900/50 border border-zinc-800/80 px-2.5 py-1 rounded-lg">
                                {scorer.category}
                              </span>
                            </td>

                            {/* Games scored cell */}
                            <td className="py-4 px-6 text-sm text-zinc-400 font-semibold">
                              {scorer.goalsDetail.length} {scorer.goalsDetail.length === 1 ? 'partida' : 'partidas'}
                            </td>

                            {/* Total Goals cell */}
                            <td className="py-4 px-6 text-right font-black text-lg text-white">
                              <div className="flex items-center justify-end gap-1.5">
                                <span className={isTop3 ? 'text-amber-500 font-black text-xl' : ''}>
                                  {scorer.goals}
                                </span>
                                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                                  {scorer.goals === 1 ? 'gol' : 'gols'}
                                </span>
                              </div>
                            </td>

                            {/* Action cell */}
                            <td className="py-4 px-6 text-center">
                              <button 
                                onClick={() => setSelectedScorer(scorer)}
                                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white rounded-lg text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                              >
                                Detalhes
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="p-6 border-t border-zinc-900 flex flex-col sm:flex-row justify-between items-center gap-4 bg-zinc-950">
                <span className="text-xs text-zinc-500 font-bold uppercase">
                  Página {currentPage} de {totalPages}
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors cursor-pointer"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button 
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    className="p-2 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 disabled:pointer-events-none text-zinc-400 hover:text-white rounded-xl border border-zinc-800 transition-colors cursor-pointer"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Goal details modal */}
      <AnimatePresence>
        {selectedScorer && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[100] flex items-center justify-center p-4 overflow-y-auto no-print">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 border border-zinc-900 w-full max-w-xl rounded-[2.5rem] overflow-hidden shadow-2xl relative"
            >
              <button 
                onClick={() => setSelectedScorer(null)}
                className="absolute top-6 right-6 p-2 bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl transition-all cursor-pointer group z-10"
              >
                <X size={18} className="group-hover:rotate-90 transition-transform" />
              </button>

              {/* Modal Header banner */}
              <div className="relative p-8 bg-gradient-to-b from-zinc-900 to-zinc-950 border-b border-zinc-900 flex items-center gap-6">
                <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />
                
                <div className="relative w-20 h-20 rounded-2xl bg-zinc-900 border-2 border-amber-500/30 p-1 flex items-center justify-center overflow-hidden shrink-0">
                  {selectedScorer.athlete?.photo ? (
                    <img src={selectedScorer.athlete.photo} alt={selectedScorer.playerName} className="w-full h-full object-cover rounded-xl" referrerPolicy="no-referrer" />
                  ) : (
                    <User size={32} className="text-zinc-600" />
                  )}
                </div>

                <div className="space-y-1 relative z-10">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">
                      {selectedScorer.playerName}
                    </h2>
                    {selectedScorer.athlete?.nickname && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                        {selectedScorer.athlete.nickname}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-400 font-extrabold uppercase tracking-widest flex items-center gap-1.5">
                    {selectedScorer.athlete?.position || 'Jogador'}
                    <span className="text-zinc-700">•</span>
                    <span className="text-amber-500 font-bold">{selectedScorer.category}</span>
                  </p>
                  
                  {selectedScorer.athlete?.jersey_number && (
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                      Camisa Número <span className="text-white font-bold">{selectedScorer.athlete.jersey_number}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Stats Highlights Grid */}
              <div className="grid grid-cols-2 divide-x divide-zinc-900 border-b border-zinc-900 bg-zinc-950">
                <div className="p-6 flex flex-col items-center text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Total de Gols</span>
                  <span className="text-4xl font-black text-white mt-1 flex items-center gap-1.5">
                    {selectedScorer.goals}
                    <Trophy size={20} className="text-amber-500" />
                  </span>
                </div>
                <div className="p-6 flex flex-col items-center text-center">
                  <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Partidas com Gol</span>
                  <span className="text-4xl font-black text-white mt-1">
                    {selectedScorer.goalsDetail.length}
                  </span>
                </div>
              </div>

              {/* Goals list */}
              <div className="p-6 space-y-4 max-h-[350px] overflow-y-auto bg-zinc-950/40">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Histórico de Gols</h3>
                
                <div className="space-y-2.5">
                  {selectedScorer.goalsDetail.map((goal, i) => (
                    <div 
                      key={goal.matchId + '-' + i}
                      className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-700/80 p-4 rounded-2xl flex items-center justify-between gap-4 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-white uppercase block line-clamp-1">
                          {goal.matchName}
                        </span>
                        
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase tracking-widest ${
                            goal.matchType === 'championship' 
                              ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' 
                              : 'bg-blue-500/10 border border-blue-500/20 text-blue-400'
                          }`}>
                            {goal.matchType === 'championship' ? 'Campeonato' : 'Amistoso'}
                          </span>
                          
                          <span className="text-[10px] text-zinc-500 font-semibold uppercase tracking-wider flex items-center gap-1">
                            <Calendar size={10} />
                            {goal.date ? goal.date.split('-').reverse().join('/') : 'Data n/d'}
                          </span>

                          <span className="text-[10px] text-zinc-500 font-bold uppercase">
                            • {goal.category}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 bg-zinc-950 border border-zinc-800 px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-right">
                        <span className="text-base font-black text-amber-500">{goal.goalsCount}</span>
                        <span className="text-[10px] font-bold text-zinc-500 uppercase">
                          {goal.goalsCount === 1 ? 'gol' : 'gols'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 bg-zinc-900/30 border-t border-zinc-900 text-center">
                <button 
                  onClick={() => setSelectedScorer(null)}
                  className="w-full py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer border border-zinc-800"
                >
                  Fechar Detalhes
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
