import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import AthleteList from './components/AthleteList';
import AthleteForm from './components/AthleteForm';
import ProfessorManagement from './components/ProfessorManagement';
import Attendance from './components/Attendance';
import Birthdays from './components/Birthdays';
import EventsManagement from './components/EventsManagement';
import AnamnesisForm from './components/AnamnesisForm';
import Documents from './components/Documents';
import SponsorManager from './components/SponsorManager';
import ModalityList from './components/ModalityList';
import TrainingManagement from './components/TrainingManagement';
import SettingsComponent from './components/Settings';
import AthleteSearchSelect from './components/AthleteSearchSelect';
import MembershipCard from './components/MembershipCard';
import ContactList from './components/ContactList';
import CategoryList from './components/CategoryList';
import LineupManagement from './components/LineupManagement';
import StudentLineups from './components/StudentLineups';
import ChampionshipManagement from './components/ChampionshipManagement';
import PublicTeamRegistration from './components/PublicTeamRegistration';
import Login from './components/Login';
import PublicRegistration from './components/PublicRegistration';
import PublicAnamnesis from './components/PublicAnamnesis';
import TeamPortal from './components/TeamPortal';
import PublicEventCheckin from './components/PublicEventCheckin';
import { Athlete, User, Professor, Event, Settings } from './types';
import { api, clearCache } from './api';
import { Trophy, Users, Calendar, ClipboardCheck, Cake, FileText, Settings as SettingsIcon, UserCheck, Activity, CreditCard, X, UserPlus, AlertTriangle, Link as LinkIcon, QrCode, Instagram, MessageCircle, ClipboardList } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { Toaster, toast } from 'sonner';
import { navItems } from './navigation';

const Dashboard = ({ stats, athletes, events, user, settings, activeTab, setActiveTab, setIsAthleteFormOpen }: { 
  stats: any, 
  athletes: Athlete[], 
  events: Event[], 
  user: User, 
  settings: Settings,
  activeTab: string,
  setActiveTab: (tab: string) => void,
  setIsAthleteFormOpen: (open: boolean) => void
}) => {
  const filteredNavItems = navItems
    .filter(item => user && item.roles.includes(user.role) && item.id !== 'dashboard')
    .sort((a, b) => a.label.localeCompare(b.label));

  const copyLinks = [
    { label: 'Link Matrícula', icon: LinkIcon, color: 'text-theme-primary', url: `${window.location.origin}/?register=true` },
    { label: 'Link Portal', icon: UserCheck, color: 'text-blue-500', url: `${window.location.origin}/` },
    { label: 'Link Anamnese', icon: ClipboardCheck, color: 'text-green-500', url: `${window.location.origin}/?anamnesis=true` },
    { label: 'Link Equipes', icon: Trophy, color: 'text-purple-500', url: `${window.location.origin}/?team_registration=true` },
  ];

  if (user.role === 'student') {
    return (
      <div className="space-y-12">
        <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">
              Olá, {user.name.split(' ')[0]}
            </h2>
            <p className="text-zinc-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis text-sm sm:text-base">Bem-vindo ao seu portal oficial de atleta.</p>
          </div>
          <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800">
             <div className="text-right">
               <p className="text-sm font-black text-theme-primary uppercase">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
               <p className="text-xs sm:text-sm text-zinc-500 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
             </div>
             <div className="w-12 h-12 bg-theme-primary rounded-2xl flex items-center justify-center text-black font-black">
               {new Date().getDate()}
             </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-3 mb-8">
            <div className="h-8 w-2 bg-theme-primary rounded-full" />
            <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Minha Jornada</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {filteredNavItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl border transition-all group text-center gap-4 relative overflow-hidden rounded-3xl ${activeTab === item.id ? 'bg-zinc-800 border-theme-primary/50' : 'bg-zinc-900 border-zinc-800 hover:border-theme-primary/50 hover:bg-zinc-800'}`}
              >
                <div className={`p-4 sm:p-5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-theme-primary text-black' : `bg-zinc-800 group-hover:bg-theme-primary group-hover:text-black ${item.color || 'text-theme-primary'}`}`}>
                  <item.icon className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
                </div>
                <div className="space-y-1">
                  <span className={`text-base sm:text-lg font-black tracking-tight block leading-tight ${activeTab === item.id ? 'text-theme-primary' : 'text-white'}`}>{item.label}</span>
                  {item.description && <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-opacity ${activeTab === item.id ? 'text-theme-primary opacity-100' : 'text-zinc-500 opacity-60 group-hover:opacity-100'}`}>{item.description}</p>}
                </div>
              </button>
            ))}

            {settings.instagram && (
              <a 
                href={settings.instagram?.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram?.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-900 shadow-xl border border-zinc-800 hover:border-pink-500/50 hover:bg-zinc-800/80 rounded-[2rem] transition-all group text-center gap-3 relative overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-pink-500/10 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all">
                  <Instagram className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />
                </div>
                <div className="space-y-1">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">Instagram</span>
                  <p className="text-sm sm:text-base text-zinc-500 font-medium tracking-tight opacity-70 group-hover:opacity-100 transition-opacity uppercase">Siga @piruaec</p>
                </div>
              </a>
            )}

            {settings.whatsapp && settings.whatsapp.replace(/\D/g, '') && (
              <a 
                href={`https://wa.me/55${settings.whatsapp?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-900 shadow-xl border border-zinc-800 hover:border-green-500/50 hover:bg-zinc-800/80 rounded-[2rem] transition-all group text-center gap-3 relative overflow-hidden"
              >
                <div className="p-4 rounded-2xl bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all">
                  <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />
                </div>
                <div className="space-y-1">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">WhatsApp</span>
                  <p className="text-sm sm:text-base text-zinc-500 font-medium tracking-tight opacity-70 group-hover:opacity-100 transition-opacity uppercase">Fale Conosco</p>
                </div>
              </a>
            )}
          </div>
        </section>

        <section>
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
              <Cake size={160} />
            </div>
            <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
              <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl">
                <Cake size={24} />
              </div>
              Aniversariantes do Mês
            </h3>
            <Birthdays />
          </div>
        </section>
      </div>
    );
  }
  return (
    <div className="space-y-12 pb-12">
      {/* Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase tracking-tighter leading-none mb-2">Painel de Controle</h2>
          <p className="text-zinc-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis text-sm sm:text-base">Gestão centralizada do Piruá Esporte Clube.</p>
        </div>
        <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800">
           <div className="text-right">
             <p className="text-sm font-black text-theme-primary uppercase">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
             <p className="text-xs sm:text-sm text-zinc-500 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
           </div>
           <div className="w-12 h-12 bg-theme-primary rounded-2xl flex items-center justify-center text-black font-black">
             {new Date().getDate()}
           </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Atletas Totais', value: stats.athletes, icon: Users, color: 'text-theme-primary' },
          { label: 'Atletas Ativos', value: stats.active, icon: UserCheck, color: 'text-green-500' },
          { label: 'Eventos', value: stats.events, icon: Calendar, color: 'text-blue-500' },
          { label: 'Ranking', value: '#1', icon: Trophy, color: 'text-purple-500' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-zinc-900/40 border border-zinc-800 p-5 sm:p-6 rounded-[2rem] hover:border-theme-primary/30 transition-all group overflow-hidden relative">
            <stat.icon size={32} className={`absolute -right-2 -bottom-2 opacity-5 ${stat.color} group-hover:scale-110 group-hover:opacity-10 transition-all sm:w-10 sm:h-10`} />
            <p className="text-sm sm:text-base font-black text-zinc-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <p className="text-2xl sm:text-3xl font-black text-white">{stat.value}</p>
          </div>
        ))}
      </section>

      {/* Central Hub */}
      <section>
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-2 bg-theme-primary rounded-full" />
          <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Ações & Gestão</h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {filteredNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-4 sm:p-6 shadow-2xl border transition-all group text-center gap-4 relative overflow-hidden rounded-3xl ${activeTab === item.id ? 'bg-zinc-800 border-theme-primary/50' : 'bg-zinc-900 border-zinc-800 hover:border-theme-primary/50 hover:bg-zinc-800'}`}
            >
              <div className={`p-4 sm:p-5 rounded-2xl transition-all ${activeTab === item.id ? 'bg-theme-primary text-black' : `bg-zinc-800 group-hover:bg-theme-primary group-hover:text-black ${item.color || 'text-theme-primary'}`}`}>
                <item.icon className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
              </div>
              <div className="space-y-1">
                <span className={`text-base sm:text-lg font-black tracking-tight block leading-tight ${activeTab === item.id ? 'text-theme-primary' : 'text-white'}`}>{item.label}</span>
                {item.description && <p className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-opacity ${activeTab === item.id ? 'text-theme-primary opacity-100' : 'text-zinc-500 opacity-60 group-hover:opacity-100'}`}>{item.description}</p>}
              </div>
            </button>
          ))}

          {settings.instagram && (
            <a 
              href={settings.instagram?.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram?.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-900 shadow-xl border border-zinc-800 hover:border-pink-500/50 hover:bg-zinc-800/80 rounded-3xl transition-all group text-center gap-3 relative overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-pink-500/10 text-pink-500 group-hover:bg-pink-500 group-hover:text-white transition-all">
                <Instagram className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />
              </div>
              <div className="space-y-1">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white block leading-tight">Instagram</span>
                <p className="text-sm sm:text-base text-zinc-500 font-medium tracking-tight opacity-70 group-hover:opacity-100 transition-opacity uppercase font-black tracking-widest text-[10px]">Social</p>
              </div>
            </a>
          )}

          {settings.whatsapp && settings.whatsapp.replace(/\D/g, '') && (
            <a 
              href={`https://wa.me/55${settings.whatsapp?.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-900 shadow-xl border border-zinc-800 hover:border-green-500/50 hover:bg-zinc-800/80 rounded-3xl transition-all group text-center gap-3 relative overflow-hidden"
            >
              <div className="p-4 rounded-2xl bg-green-500/10 text-green-500 group-hover:bg-green-500 group-hover:text-white transition-all">
                <MessageCircle className="w-6 h-6 sm:w-7 sm:h-7 transition-transform group-hover:scale-110" />
              </div>
              <div className="space-y-1">
                <span className="text-lg sm:text-xl font-black tracking-tight text-white block leading-tight">WhatsApp</span>
                <p className="text-sm sm:text-base text-zinc-500 font-medium tracking-tight opacity-70 group-hover:opacity-100 transition-opacity uppercase font-black tracking-widest text-[10px]">Suporte</p>
              </div>
            </a>
          )}

          <button 
            onClick={() => setIsAthleteFormOpen(true)} 
            className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-900 shadow-2xl border border-zinc-800 hover:border-theme-primary/50 hover:bg-zinc-800 transition-all group text-center gap-4 relative overflow-hidden rounded-3xl"
          >
            <div className="p-4 rounded-2xl bg-zinc-800 group-hover:bg-theme-primary group-hover:text-black transition-all text-zinc-400">
              <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
            </div>
            <div className="space-y-1">
              <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">Novo Atleta</span>
              <p className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 transition-opacity uppercase">Matrícula</p>
            </div>
          </button>

          {copyLinks.map((link, idx) => (
            <button
              key={idx}
              onClick={() => {
                navigator.clipboard.writeText(link.url);
                toast.success(`${link.label} copiado!`);
              }}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-900 shadow-xl border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/80 rounded-3xl transition-all group text-center gap-3 relative overflow-hidden"
            >
              <div className={`p-4 rounded-2xl bg-zinc-800/80 ${link.color} group-hover:scale-110 transition-transform`}>
                <link.icon className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <div className="space-y-1">
                <span className="text-lg sm:text-xl font-black tracking-tight text-zinc-400 block leading-tight">{link.label}</span>
                <p className="text-[10px] sm:text-xs text-zinc-600 font-bold uppercase tracking-widest">Link</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Widgets */}
      <section>
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-[2.5rem] p-8 shadow-xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
            <Cake size={160} />
          </div>
          <h3 className="text-2xl font-black text-white mb-8 uppercase tracking-tighter flex items-center gap-3">
            <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl">
              <Cake size={24} />
            </div>
            Aniversariantes
          </h3>
          <Birthdays />
        </div>
      </section>
    </div>
  );
};

class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error: any}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-8 text-center">
          <AlertTriangle size={64} className="text-red-500 mb-4" />
          <h1 className="text-2xl font-black text-white uppercase mb-2">Ops! Algo deu errado.</h1>
          <p className="text-zinc-500 mb-6 max-w-md">Ocorreu um erro inesperado na aplicação. Por favor, tente recarregar a página.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-8 py-4 bg-theme-primary text-black font-black rounded-2xl uppercase tracking-tighter"
          >
            Recarregar Página
          </button>
          {process.env.NODE_ENV === 'development' && (
            <pre className="mt-8 p-4 bg-zinc-900 border border-zinc-800 rounded-xl text-red-400 text-left text-xs overflow-auto max-w-full">
              {this.state.error?.toString()}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pirua_user');
    if (saved) return JSON.parse(saved);
    return null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('pirua_user');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.role === 'student' ? 'my-card' : 'dashboard';
    }
    return 'dashboard';
  });
  const { settings } = useTheme();
  const [isAthleteFormOpen, setIsAthleteFormOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const isReg = params.get('register') === 'true';
    console.log('Initial isRegistering:', isReg);
    return isReg;
  });
  const [isAnamnesisOnly, setIsAnamnesisOnly] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('anamnesis') === 'true';
  });
  const [isTeamRegistration, setIsTeamRegistration] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('register-team') || window.location.pathname.startsWith('/register-team/');
  });
  const [isTeamPortal, setIsTeamPortal] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.has('team-portal') || window.location.pathname.startsWith('/team-portal/');
  });
  const [isEventCheckin, setIsEventCheckin] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('checkin') === 'true' && params.has('eventId');
  });
  const [checkinEventId, setCheckinEventId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId');
  });
  const [teamChampionshipId, setTeamChampionshipId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('register-team') || params.get('team-portal');
    if (queryId) return queryId;

    const path = window.location.pathname;
    if (path.startsWith('/register-team/')) {
      return path.split('/register-team/')[1];
    }
    if (path.startsWith('/team-portal/')) {
      return path.split('/team-portal/')[1];
    }
    return null;
  });
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [selectedAthleteForAnamnesis, setSelectedAthleteForAnamnesis] = useState<Athlete | null>(null);
  const [selectedAthleteForCard, setSelectedAthleteForCard] = useState<Athlete | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ athletes: 0, active: 0, events: 0 });
  const [myAthleteData, setMyAthleteData] = useState<Athlete | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Optimized data fetching to save Firestore quota
    if (!user?.id) return;

    if (user.role === 'admin') {
      // Use getAthletes which has a 15-minute cache to significantly reduce read operations
      api.getAthletes().then(data => {
        setAthletes(data);
        setStats(prev => ({
          ...prev,
          athletes: data.length,
          active: data.filter(a => a.status === 'Ativo').length
        }));
      }).catch(err => {
        console.error("Erro ao carregar atletas para o dashboard:", err);
      });

      // Fetch professors and events at top level to share between components
      api.getProfessors().then(setProfessors).catch(err => console.error("Erro ao carregar professores:", err));
      api.getEvents().then(data => {
        setEvents(data);
        setStats(prev => ({ ...prev, events: data.length }));
      }).catch(err => console.error("Erro ao carregar eventos:", err));
    } else if (user.role === 'student' && user.athlete_id) {
      // Students only subscribe to their own document, which is very efficient
      const unsubscribe = api.subscribeToAthlete(user.athlete_id, (data) => {
        if (data) {
          setMyAthleteData(data);
          setAthletes([data]);
        }
      });
      return () => unsubscribe();
    }
  }, [user?.id, user?.role, user?.athlete_id]); // Re-subscribe if user changes

  useEffect(() => {
    if (user?.role === 'student' && user.athlete_id && athletes.length > 0) {
      const me = athletes.find(a => a.id === user.athlete_id);
      if (me) setMyAthleteData(me);
    }
  }, [user, athletes]);

  useEffect(() => {
    if (user?.role === 'student' && user.athlete_id) {
      let previousCount = -1;
      const unsubscribe = api.subscribeToAthleteLineups(user.athlete_id, (events) => {
        // Only show toast if count increased (new escalation)
        // and it's not the initial load (previousCount !== -1)
        if (previousCount !== -1 && events.length > previousCount) {
          const diff = events.length - previousCount;
          toast.success("Nova Escalação!", {
            description: `Você foi escalado para ${diff === 1 ? 'um novo evento' : `${diff} novos eventos`}. Confira na aba Escalações.`,
            duration: 10000,
            action: {
              label: 'Ver Agora',
              onClick: () => setActiveTab('lineups')
            }
          });
        } else if (previousCount === -1 && events.length > 0) {
          // Optional: Inform about existing pending lineups on first load
          // But maybe only if they are very recent? 
          // For now let's just do it for new ones as requested: "quando forem escalados"
        }
        previousCount = events.length;
      });
      return () => unsubscribe();
    }
  }, [user?.id, user?.athlete_id, setActiveTab]);

  useEffect(() => {
    // Sync user state with Firebase Auth
    const unsubscribe = api.onAuthChange((firebaseUser) => {
      if (!firebaseUser) {
        // If Firebase Auth says no user, but we have one in state, clear it
        // unless it's the emergency-token admin (which is local only)
        const saved = localStorage.getItem('pirua_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.token !== 'emergency-token') {
            setUser(null);
            localStorage.removeItem('pirua_user');
          }
        } else {
          setUser(null);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const initAuth = async () => {
    const storedUser = localStorage.getItem('pirua_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      // Verify if the token is still valid or if it's the emergency one
      if (parsedUser.token === 'emergency-token') {
        setUser(parsedUser);
      } else {
        // For regular users, we rely on onAuthStateChanged to set the user
        // but we can set it initially from storage for better UX
        setUser(parsedUser);
      }
    }
    setIsAuthLoading(false);
  };

  useEffect(() => {
    initAuth();
  }, []);

  const handleLogin = (auth: any) => {
    setUser(auth.user);
    localStorage.setItem('pirua_user', JSON.stringify(auth.user));
    setActiveTab(auth.user.role === 'student' ? 'my-card' : 'dashboard');
  };

  const handleLogout = async () => {
    await api.logout();
    clearCache();
    // Instead of null, we keep the default admin or just clear storage
    localStorage.removeItem('pirua_user');
    window.location.reload(); // Reload to reset state to default admin
  };

  // Removed login check for "free access"

  const renderContent = () => {
    const content = (() => {
      switch (activeTab) {
        case 'dashboard':
          return (
            <Dashboard 
              stats={stats} 
              athletes={athletes} 
              events={events} 
              user={user} 
              settings={settings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setIsAthleteFormOpen={setIsAthleteFormOpen}
            />
          );
        case 'athletes':
          return (
            <div className="space-y-6">
              <AthleteList 
                athletes={athletes}
                onAdd={() => setIsAthleteFormOpen(true)} 
                onEdit={(a) => { setEditingAthlete(a); setIsAthleteFormOpen(true); }} 
                onRefresh={async () => {
                  const data = await api.getAthletes();
                  setAthletes(data);
                  setStats(prev => ({
                    ...prev,
                    athletes: data.length,
                    active: data.filter(a => a.status === 'Ativo').length
                  }));
                }}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                <div className="bg-black border border-theme-primary/20 p-6 rounded-3xl shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-4 uppercase flex items-center gap-2">
                    <Activity size={20} className="text-theme-primary" />
                    Ficha de Anamnese
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">Selecione um atleta para visualizar ou editar sua ficha de saúde.</p>
                  <AthleteSearchSelect 
                    onSelect={(a) => setSelectedAthleteForAnamnesis(a)}
                    selectedAthleteId={selectedAthleteForAnamnesis?.id}
                    placeholder="SELECIONAR ATLETA..."
                  />
                </div>
                <div className="bg-black border border-theme-primary/20 p-6 rounded-3xl shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-4 uppercase flex items-center gap-2">
                    <CreditCard size={20} className="text-theme-primary" />
                    Carteirinha
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">Gere a carteirinha oficial do atleta com QR Code para chamada.</p>
                  <AthleteSearchSelect 
                    onSelect={(a) => setSelectedAthleteForCard(a)}
                    selectedAthleteId={selectedAthleteForCard?.id}
                    placeholder="SELECIONAR ATLETA..."
                  />
                </div>
              </div>

              {selectedAthleteForAnamnesis && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto no-print">
                  <div className="relative w-full max-w-4xl">
                    <div className="flex justify-end mb-4">
                      <button 
                        onClick={() => setSelectedAthleteForAnamnesis(null)} 
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-theme-primary hover:border-theme-primary/50 rounded-xl transition-all group"
                      >
                        <X size={18} className="group-hover:rotate-90 transition-transform" />
                        <span className="font-bold uppercase text-sm tracking-widest">Voltar</span>
                      </button>
                    </div>
                    <AnamnesisForm athlete={selectedAthleteForAnamnesis} onSave={() => setSelectedAthleteForAnamnesis(null)} />
                  </div>
                </div>
              )}

              {selectedAthleteForCard && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto">
                  <div className="relative w-full max-w-2xl">
                    <div className="flex justify-end mb-4 no-print">
                      <button 
                        onClick={() => setSelectedAthleteForCard(null)} 
                        className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-theme-primary hover:border-theme-primary/50 rounded-xl transition-all group"
                      >
                        <X size={18} className="group-hover:rotate-90 transition-transform" />
                        <span className="font-bold uppercase text-sm tracking-widest">Voltar</span>
                      </button>
                    </div>
                    <div className="bg-black p-8 rounded-3xl border border-theme-primary/20">
                      <MembershipCard athlete={selectedAthleteForCard} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        case 'categories':
          return (
            <CategoryList 
              athletes={athletes} 
              onAddAthlete={() => setIsAthleteFormOpen(true)}
              onEditAthlete={(a) => { setEditingAthlete(a); setIsAthleteFormOpen(true); }}
              onRefresh={async () => {
                const data = await api.getAthletes();
                setAthletes(data);
              }}
            />
          );
        case 'my-data':
          return (
            <div className="max-w-4xl mx-auto">
              {myAthleteData ? (
                <AthleteForm 
                  athlete={myAthleteData} 
                  onClose={() => setActiveTab('dashboard')} 
                  onSave={() => {
                    setActiveTab('dashboard');
                    toast.success("Dados atualizados com sucesso!");
                  }} 
                  standalone
                />
              ) : (
                <div className="p-12 text-center bg-black rounded-3xl border border-zinc-800">
                  <p className="text-zinc-500">Carregando seus dados...</p>
                </div>
              )}
            </div>
          );
        case 'my-anamnesis':
          return (
            <div className="max-w-4xl mx-auto">
              {myAthleteData ? (
                <AnamnesisForm 
                  athlete={myAthleteData} 
                  onSave={() => {
                    setActiveTab('dashboard');
                    toast.success("Ficha de saúde atualizada!");
                  }} 
                  standalone
                />
              ) : (
                <div className="p-12 text-center bg-black rounded-3xl border border-zinc-800">
                  <p className="text-zinc-500">Carregando seus dados...</p>
                </div>
              )}
            </div>
          );
        case 'my-card':
          return (
            <div className="max-w-2xl mx-auto bg-black p-8 rounded-[2.5rem] border border-theme-primary/20 shadow-2xl">
              {myAthleteData ? (
                <MembershipCard athlete={myAthleteData} />
              ) : (
                <div className="p-12 text-center">
                  <p className="text-zinc-500">Carregando sua carteirinha...</p>
                </div>
              )}
            </div>
          );
        case 'anamnesis':
          return (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Ficha de Saúde (Anamnese)</h2>
                    <p className="text-sm text-zinc-500 uppercase tracking-widest">Selecione um atleta para preencher ou visualizar a ficha</p>
                  </div>
                </div>
                <AthleteSearchSelect 
                  onSelect={(a) => setSelectedAthleteForAnamnesis(a)}
                  selectedAthleteId={selectedAthleteForAnamnesis?.id}
                />
              </div>
              {selectedAthleteForAnamnesis && (
                <div className="animate-in fade-in slide-in-from-top-4">
                  <AnamnesisForm 
                    athlete={selectedAthleteForAnamnesis} 
                    onSave={() => {
                      toast.success("Ficha de anamnese salva com sucesso!");
                      setSelectedAthleteForAnamnesis(null);
                    }} 
                  />
                </div>
              )}
            </div>
          );
        case 'membership-card':
          return (
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
                <div className="flex items-center gap-4 mb-6">
                  <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                    <CreditCard size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">Gerar Carteirinha</h2>
                    <p className="text-sm text-zinc-500 uppercase tracking-widest">Selecione um atleta para gerar a carteirinha oficial</p>
                  </div>
                </div>
                <AthleteSearchSelect 
                  onSelect={(a) => setSelectedAthleteForCard(a)}
                  selectedAthleteId={selectedAthleteForCard?.id}
                />
              </div>
              {selectedAthleteForCard && (
                <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-top-4">
                  <div className="bg-black p-8 rounded-[2.5rem] border border-theme-primary/20 shadow-2xl">
                    <MembershipCard athlete={selectedAthleteForCard} />
                  </div>
                </div>
              )}
            </div>
          );
        case 'professors':
          return <ProfessorManagement professors={professors} />;
        case 'attendance':
          return <Attendance athletes={athletes} role={user?.role} />;
        case 'championships':
          return <ChampionshipManagement />;
        case 'lineups':
          return user.role === 'admin' ? <LineupManagement /> : <StudentLineups athleteId={user.athlete_id || ''} />;
        case 'events':
          return <EventsManagement athletes={athletes} events={events} role={user?.role} />;
        case 'birthdays':
          return <Birthdays athletes={athletes} />;
        case 'documents':
          return <Documents />;
        case 'sponsors':
          return <SponsorManager />;
        case 'modalities':
          return <ModalityList />;
        case 'contacts':
          return <ContactList athletes={athletes} />;
        case 'trainings':
          return <TrainingManagement athletes={athletes} role={user?.role} />;
        case 'settings':
          return <SettingsComponent />;
        default:
          return (
            <Dashboard 
              stats={stats} 
              athletes={athletes} 
              events={events} 
              user={user} 
              settings={settings}
              activeTab={activeTab}
              setActiveTab={setActiveTab}
              setIsAthleteFormOpen={setIsAthleteFormOpen}
            />
          );
      }
    })();

    if (activeTab === 'dashboard') return content;

    return (
      <div className="space-y-6">
        <div className="no-print">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-black border border-zinc-800 text-zinc-400 hover:text-theme-primary hover:border-theme-primary/50 rounded-xl transition-all group"
            >
            <Trophy size={18} className="group-hover:scale-110 transition-transform" />
            <span className="font-bold uppercase text-sm tracking-widest">Voltar ao Início</span>
          </button>
        </div>
        {content}
      </div>
    );
  };

  useEffect(() => {
    const checkRegisterParam = () => {
      const params = new URLSearchParams(window.location.search);
      const isReg = params.get('register') === 'true';
      const isAna = params.get('anamnesis') === 'true';
      const queryTeamReg = params.get('register-team');
      const queryPortal = params.get('team-portal');
      
      const isTeamReg = !!queryTeamReg || window.location.pathname.startsWith('/register-team/');
      const isPortal = !!queryPortal || window.location.pathname.startsWith('/team-portal/');
      
      const teamId = queryTeamReg || queryPortal || 
                    (window.location.pathname.startsWith('/register-team/') ? window.location.pathname.split('/register-team/')[1] : 
                    window.location.pathname.startsWith('/team-portal/') ? window.location.pathname.split('/team-portal/')[1] : null);
      
      console.log('URL Change detected. isRegistering:', isReg, 'isAnamnesisOnly:', isAna, 'isTeamRegistration:', isTeamReg, 'isTeamPortal:', isPortal, 'teamId:', teamId);
      setIsRegistering(isReg);
      setIsAnamnesisOnly(isAna);
      setIsTeamRegistration(isTeamReg);
      setIsTeamPortal(isPortal);
      setTeamChampionshipId(teamId);
    };

    checkRegisterParam();
    window.addEventListener('popstate', checkRegisterParam);
    // Also listen for pushState/replaceState if they happen
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    
    window.history.pushState = function() {
      originalPushState.apply(this, arguments as any);
      checkRegisterParam();
    };
    
    window.history.replaceState = function() {
      originalReplaceState.apply(this, arguments as any);
      checkRegisterParam();
    };

    return () => {
      window.removeEventListener('popstate', checkRegisterParam);
      window.history.pushState = originalPushState;
      window.history.replaceState = originalReplaceState;
    };
  }, []);

  // Priority 1: Registration (Show even during auth loading if param is present)
  if (isRegistering) {
    return (
      <ErrorBoundary>
        <PublicRegistration 
          onCancel={() => {
            setIsRegistering(false);
            window.history.replaceState({}, '', window.location.pathname);
          }} 
          onComplete={() => {
            setIsRegistering(false);
            window.history.replaceState({}, '', window.location.pathname);
            toast.success("Matrícula realizada com sucesso! Agora você pode entrar no portal usando seu CPF.");
          }} 
        />
      </ErrorBoundary>
    );
  }

  if (isAnamnesisOnly) {
    return (
      <ErrorBoundary>
        <PublicAnamnesis 
          onCancel={() => {
            setIsAnamnesisOnly(false);
            window.history.replaceState({}, '', window.location.pathname);
          }} 
          onComplete={() => {
            setIsAnamnesisOnly(false);
            window.history.replaceState({}, '', window.location.pathname);
            toast.success("Ficha de saúde enviada com sucesso!");
          }} 
        />
      </ErrorBoundary>
    );
  }

  if (isTeamPortal) {
    return (
      <ErrorBoundary>
        <TeamPortal 
          championshipId={teamChampionshipId || undefined} 
          onBack={() => {
            setIsTeamPortal(false);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isTeamRegistration) {
    return (
      <ErrorBoundary>
        <PublicTeamRegistration 
          championshipId={teamChampionshipId || undefined} 
          onBack={() => {
            setIsTeamRegistration(false);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isEventCheckin && checkinEventId) {
    return (
      <ErrorBoundary>
        <PublicEventCheckin 
          eventId={checkinEventId} 
          onBack={() => {
            setIsEventCheckin(false);
            setCheckinEventId(null);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isEventCheckin && checkinEventId) {
    return (
      <ErrorBoundary>
        <PublicEventCheckin 
          eventId={checkinEventId} 
          onBack={() => {
            setIsEventCheckin(false);
            setCheckinEventId(null);
            window.history.replaceState({}, '', window.location.pathname);
          }}
        />
      </ErrorBoundary>
    );
  }

  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-theme-primary animate-pulse font-black uppercase tracking-widest">
          Iniciando Sistema...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Login 
        onLogin={handleLogin} 
        onRegisterClick={() => setIsRegistering(true)} 
      />
    );
  }

  return (
    <ErrorBoundary>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
        {renderContent()}
        {isAthleteFormOpen && (
          <AthleteForm 
            athlete={editingAthlete} 
            onClose={() => { setIsAthleteFormOpen(false); setEditingAthlete(null); }} 
            onSave={() => { setIsAthleteFormOpen(false); setEditingAthlete(null); }} 
          />
        )}
        <Toaster position="top-right" richColors />
      </Layout>
    </ErrorBoundary>
  );
}
