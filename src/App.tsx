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
import { Athlete, User, Professor, Event, Settings } from './types';
import { api, clearCache } from './api';
import { Trophy, Users, Calendar, ClipboardCheck, Cake, FileText, Settings as SettingsIcon, UserCheck, Activity, CreditCard, X, UserPlus, AlertTriangle, Link as LinkIcon, QrCode, Instagram, MessageCircle, ClipboardList } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { Toaster, toast } from 'sonner';

const Dashboard = ({ stats, athletes, events, user, settings, setActiveTab, setIsAthleteFormOpen }: { 
  stats: any, 
  athletes: Athlete[], 
  events: Event[], 
  user: User, 
  settings: Settings,
  setActiveTab: (tab: string) => void,
  setIsAthleteFormOpen: (open: boolean) => void
}) => {
  if (user.role === 'student') {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Olá, {user.name}</h2>
            <p className="text-zinc-400">Bem-vindo ao seu portal do atleta no Piruá E.C.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            <button onClick={() => setActiveTab('my-data')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
            <div className="p-3 lg:p-4 bg-theme-primary/10 text-theme-primary rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
              <UserPlus size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Meus Dados</h3>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Atualize suas informações cadastrais</p>
            </div>
          </button>
 
            <button onClick={() => setActiveTab('my-anamnesis')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
            <div className="p-3 lg:p-4 bg-green-500/10 text-green-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
              <ClipboardCheck size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Minha Saúde</h3>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Preencha sua ficha de anamnese</p>
            </div>
          </button>

          <button onClick={() => setActiveTab('my-card')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
            <div className="p-3 lg:p-4 bg-blue-500/10 text-blue-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
              <CreditCard size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Carteirinha</h3>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Visualize sua carteirinha oficial</p>
            </div>
          </button>

          <button onClick={() => setActiveTab('lineups')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
            <div className="p-3 lg:p-4 bg-green-500/10 text-green-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
              <Users size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Escalações</h3>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Veja se você foi selecionado para jogos</p>
            </div>
          </button>
 
          <button onClick={() => setActiveTab('events')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
            <div className="p-3 lg:p-4 bg-purple-500/10 text-purple-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
              <Calendar size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Eventos</h3>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Veja os próximos eventos e jogos</p>
            </div>
          </button>

          <button onClick={() => setActiveTab('trainings')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
            <div className="p-3 lg:p-4 bg-theme-primary/10 text-theme-primary rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
              <ClipboardList size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Treinos</h3>
              <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Confira a agenda de treinamentos</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
          {settings.instagram && (
            <a 
              href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-zinc-900/40 border border-pink-500/30 p-6 rounded-3xl shadow-xl hover:border-pink-500/60 transition-all group flex items-center gap-4"
            >
              <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl group-hover:scale-110 transition-transform">
                <Instagram size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">Instagram</h3>
                <p className="text-[10px] text-zinc-500">Siga-nos para novidades</p>
              </div>
            </a>
          )}
          {settings.whatsapp && settings.whatsapp.replace(/\D/g, '') && (
            <a 
              href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-zinc-900/40 border border-green-500/30 p-6 rounded-3xl shadow-xl hover:border-green-500/60 transition-all group flex items-center gap-4"
            >
              <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl group-hover:scale-110 transition-transform">
                <MessageCircle size={24} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-widest">WhatsApp</h3>
                <p className="text-[10px] text-zinc-500">Fale conosco agora</p>
              </div>
            </a>
          )}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Painel de Controle</h2>
          <p className="text-zinc-400">Bem-vindo ao sistema de gestão do Piruá Esporte Clube</p>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-bold text-theme-primary uppercase">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          <p className="text-xs text-zinc-500">Temporada 2026</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
          <div className="flex items-center gap-4 mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 bg-theme-primary/10 text-theme-primary rounded-2xl group-hover:scale-110 transition-transform">
              <Users size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Atletas Totais</h3>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white">{stats.athletes}</p>
        </div>
        <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
          <div className="flex items-center gap-4 mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 bg-green-500/10 text-green-500 rounded-2xl group-hover:scale-110 transition-transform">
              <UserCheck size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Atletas Ativos</h3>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white">{stats.active}</p>
        </div>
        <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
          <div className="flex items-center gap-4 mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
              <Calendar size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Eventos</h3>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white">{stats.events}</p>
        </div>
        <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
          <div className="flex items-center gap-4 mb-3 sm:mb-4">
            <div className="p-2.5 sm:p-3 bg-purple-500/10 text-purple-500 rounded-2xl group-hover:scale-110 transition-transform">
              <Trophy size={20} className="sm:w-6 sm:h-6" />
            </div>
            <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Ranking</h3>
          </div>
          <p className="text-3xl sm:text-4xl font-black text-white">#1</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-zinc-900/40 border border-theme-primary/30 rounded-3xl p-8 shadow-xl">
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <Activity size={20} className="text-theme-primary" />
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <button onClick={() => setIsAthleteFormOpen(true)} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
              <Users size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Novo Atleta</span>
            </button>
            <button onClick={() => setActiveTab('attendance')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
              <ClipboardCheck size={20} className="text-green-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Fazer Chamada</span>
            </button>
            <button onClick={() => setActiveTab('categories')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
              <ClipboardList size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Categorias (SUB)</span>
            </button>
            <button onClick={() => { setActiveTab('attendance'); localStorage.setItem('auto_scan', 'true'); }} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
              <QrCode size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Chamada QR</span>
            </button>
            <button onClick={() => setActiveTab('events')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
              <Calendar size={20} className="text-blue-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Novo Evento</span>
            </button>
            <button onClick={() => setActiveTab('documents')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
              <FileText size={20} className="text-purple-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Documentos</span>
            </button>
            <button 
              onClick={() => {
                const link = `${window.location.origin}/?register=true`;
                navigator.clipboard.writeText(link);
                toast.success('Link de matrícula copiado!');
              }}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center"
            >
              <LinkIcon size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Link Matrícula</span>
            </button>
            <button 
              onClick={() => {
                const link = `${window.location.origin}/`;
                navigator.clipboard.writeText(link);
                toast.success('Link do Portal do Atleta copiado!');
              }}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center"
            >
              <UserCheck size={20} className="text-blue-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Link Portal</span>
            </button>
            <button 
              onClick={() => {
                const link = `${window.location.origin}/?anamnesis=true`;
                navigator.clipboard.writeText(link);
                toast.success('Link de anamnese copiado!');
              }}
              className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center"
            >
              <ClipboardCheck size={20} className="text-green-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
              <span className="text-[10px] sm:text-xs font-bold uppercase">Link Anamnese</span>
            </button>
          </div>
        </div>

        <div className="bg-zinc-900/40 border border-theme-primary/30 rounded-3xl p-8 shadow-xl overflow-hidden relative">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Cake size={120} />
          </div>
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <Cake size={20} className="text-pink-500" />
            Aniversariantes
          </h3>
          <Birthdays />
        </div>

        <div className="bg-zinc-900/40 border border-theme-primary/30 rounded-3xl p-8 shadow-xl lg:col-span-2">
          <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
            <LinkIcon size={20} className="text-theme-primary" />
            Redes Sociais & Contato
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {settings.instagram && (
              <a 
                href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-800/50 border border-pink-500/20 p-6 rounded-2xl hover:border-pink-500/50 transition-all group flex items-center gap-4"
              >
                <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl group-hover:scale-110 transition-transform">
                  <Instagram size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">Instagram</h4>
                  <p className="text-xs text-zinc-500">@pirua_ec</p>
                </div>
              </a>
            )}
            {settings.whatsapp && settings.whatsapp.replace(/\D/g, '') && (
              <a 
                href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-800/50 border border-green-500/20 p-6 rounded-2xl hover:border-green-500/50 transition-all group flex items-center gap-4"
              >
                <div className="p-3 bg-green-500/10 text-green-500 rounded-xl group-hover:scale-110 transition-transform">
                  <MessageCircle size={24} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white uppercase tracking-widest">WhatsApp</h4>
                  <p className="text-xs text-zinc-500">Suporte e Informações</p>
                </div>
              </a>
            )}
          </div>
        </div>
      </div>
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
      api.checkAthleteLineups(user.athlete_id).then(events => {
        if (events.length > 0) {
          toast.success(`Você foi escalado para ${events.length} evento(s)!`, {
            description: 'Confira os detalhes na aba Escalações.',
            duration: 10000,
            action: {
              label: 'Ver Agora',
              onClick: () => setActiveTab('lineups')
            }
          });
        }
      });
    }
  }, [user?.id, user?.athlete_id]);

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
          if (user.role === 'student') {
            return (
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Olá, {user.name}</h2>
                    <p className="text-zinc-400">Bem-vindo ao seu portal do atleta no Piruá E.C.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                    <button onClick={() => setActiveTab('my-data')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
                    <div className="p-3 lg:p-4 bg-theme-primary/10 text-theme-primary rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <UserPlus size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Meus Dados</h3>
                      <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Atualize suas informações cadastrais</p>
                    </div>
                  </button>
 
                    <button onClick={() => setActiveTab('my-anamnesis')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
                    <div className="p-3 lg:p-4 bg-green-500/10 text-green-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <ClipboardCheck size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Minha Saúde</h3>
                      <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Preencha sua ficha de anamnese</p>
                    </div>
                  </button>

                  <button onClick={() => setActiveTab('my-card')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
                    <div className="p-3 lg:p-4 bg-blue-500/10 text-blue-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <CreditCard size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Carteirinha</h3>
                      <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Visualize sua carteirinha oficial</p>
                    </div>
                  </button>

                  <button onClick={() => setActiveTab('lineups')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
                    <div className="p-3 lg:p-4 bg-green-500/10 text-green-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <Users size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Escalações</h3>
                      <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Veja se você foi selecionado para jogos</p>
                    </div>
                  </button>
 
                  <button onClick={() => setActiveTab('events')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
                    <div className="p-3 lg:p-4 bg-purple-500/10 text-purple-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <Calendar size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Eventos</h3>
                      <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Veja os próximos eventos e jogos</p>
                    </div>
                  </button>

                  <button onClick={() => setActiveTab('trainings')} className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-3 sm:gap-4">
                    <div className="p-3 lg:p-4 bg-theme-primary/10 text-theme-primary rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <ClipboardList size={24} className="sm:w-7 sm:h-7 lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-sm sm:text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Treinos</h3>
                      <p className="text-[9px] sm:text-[10px] lg:text-xs text-zinc-500">Confira a agenda de treinamentos</p>
                    </div>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  {settings.instagram && (
                    <a 
                      href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-zinc-900/40 border border-pink-500/30 p-6 rounded-3xl shadow-xl hover:border-pink-500/60 transition-all group flex items-center gap-4"
                    >
                      <div className="p-3 bg-pink-500/10 text-pink-500 rounded-2xl group-hover:scale-110 transition-transform">
                        <Instagram size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">Instagram</h3>
                        <p className="text-[10px] text-zinc-500">Siga-nos para novidades</p>
                      </div>
                    </a>
                  )}
                  {settings.whatsapp && settings.whatsapp.replace(/\D/g, '') && (
                    <a 
                      href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-zinc-900/40 border border-green-500/30 p-6 rounded-3xl shadow-xl hover:border-green-500/60 transition-all group flex items-center gap-4"
                    >
                      <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl group-hover:scale-110 transition-transform">
                        <MessageCircle size={24} />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white uppercase tracking-widest">WhatsApp</h3>
                        <p className="text-[10px] text-zinc-500">Fale conosco agora</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>
            );
          }
          return (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Painel de Controle</h2>
                  <p className="text-zinc-400">Bem-vindo ao sistema de gestão do Piruá Esporte Clube</p>
                </div>
                <div className="hidden md:block text-right">
                  <p className="text-sm font-bold text-theme-primary uppercase">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <p className="text-xs text-zinc-500">Temporada 2026</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 bg-theme-primary/10 text-theme-primary rounded-2xl group-hover:scale-110 transition-transform">
                      <Users size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Atletas Totais</h3>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-white">{stats.athletes}</p>
                </div>
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 bg-green-500/10 text-green-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <UserCheck size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Atletas Ativos</h3>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-white">{stats.active}</p>
                </div>
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <Calendar size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Eventos</h3>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-white">{stats.events}</p>
                </div>
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-5 sm:p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-3 sm:mb-4">
                    <div className="p-2.5 sm:p-3 bg-purple-500/10 text-purple-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <Trophy size={20} className="sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-[10px] sm:text-xs font-bold text-zinc-400 uppercase tracking-widest">Ranking</h3>
                  </div>
                  <p className="text-3xl sm:text-4xl font-black text-white">#1</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/40 border border-theme-primary/30 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={20} className="text-theme-primary" />
                    Ações Rápidas
                  </h3>
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <button onClick={() => setIsAthleteFormOpen(true)} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
                      <Users size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Novo Atleta</span>
                    </button>
                    <button onClick={() => setActiveTab('attendance')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
                      <ClipboardCheck size={20} className="text-green-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Fazer Chamada</span>
                    </button>
                    <button onClick={() => setActiveTab('categories')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
                      <ClipboardList size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Categorias (SUB)</span>
                    </button>
                    <button onClick={() => { setActiveTab('attendance'); localStorage.setItem('auto_scan', 'true'); }} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
                      <QrCode size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Chamada QR</span>
                    </button>
                    <button onClick={() => setActiveTab('events')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
                      <Calendar size={20} className="text-blue-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Novo Evento</span>
                    </button>
                    <button onClick={() => setActiveTab('documents')} className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center">
                      <FileText size={20} className="text-purple-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Documentos</span>
                    </button>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/?register=true`;
                        navigator.clipboard.writeText(link);
                        toast.success('Link de matrícula copiado!');
                      }}
                      className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center"
                    >
                      <LinkIcon size={20} className="text-theme-primary group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Link Matrícula</span>
                    </button>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/`;
                        navigator.clipboard.writeText(link);
                        toast.success('Link do Portal do Atleta copiado!');
                      }}
                      className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center"
                    >
                      <UserCheck size={20} className="text-blue-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Link Portal</span>
                    </button>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/?anamnesis=true`;
                        navigator.clipboard.writeText(link);
                        toast.success('Link de anamnese copiado!');
                      }}
                      className="flex flex-col items-center justify-center p-4 sm:p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-2 sm:gap-3 group text-center"
                    >
                      <ClipboardCheck size={20} className="text-green-500 group-hover:scale-110 transition-transform sm:w-6 sm:h-6" />
                      <span className="text-[10px] sm:text-xs font-bold uppercase">Link Anamnese</span>
                    </button>
                  </div>
                </div>

                <div className="bg-zinc-900/40 border border-theme-primary/30 rounded-3xl p-8 shadow-xl overflow-hidden relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Cake size={120} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Cake size={20} className="text-pink-500" />
                    Aniversariantes
                  </h3>
                  <Birthdays />
                </div>

                <div className="bg-zinc-900/40 border border-theme-primary/30 rounded-3xl p-8 shadow-xl lg:col-span-2">
                  <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                    <LinkIcon size={20} className="text-theme-primary" />
                    Redes Sociais & Contato
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {settings.instagram && (
                      <a 
                        href={settings.instagram.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram.replace('@', '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-zinc-800/50 border border-pink-500/20 p-6 rounded-2xl hover:border-pink-500/50 transition-all group flex items-center gap-4"
                      >
                        <div className="p-3 bg-pink-500/10 text-pink-500 rounded-xl group-hover:scale-110 transition-transform">
                          <Instagram size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-widest">Instagram</h4>
                          <p className="text-xs text-zinc-500">@pirua_ec</p>
                        </div>
                      </a>
                    )}
                    {settings.whatsapp && settings.whatsapp.replace(/\D/g, '') && (
                      <a 
                        href={`https://wa.me/55${settings.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-zinc-800/50 border border-green-500/20 p-6 rounded-2xl hover:border-green-500/50 transition-all group flex items-center gap-4"
                      >
                        <div className="p-3 bg-green-500/10 text-green-500 rounded-xl group-hover:scale-110 transition-transform">
                          <MessageCircle size={24} />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white uppercase tracking-widest">WhatsApp</h4>
                          <p className="text-xs text-zinc-500">Suporte e Informações</p>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
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
                        <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
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
                        <span className="font-bold uppercase text-xs tracking-widest">Voltar</span>
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
          return <Attendance athletes={athletes} />;
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
            <span className="font-bold uppercase text-xs tracking-widest">Voltar ao Início</span>
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
