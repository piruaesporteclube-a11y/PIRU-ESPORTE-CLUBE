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
import SettingsComponent from './components/Settings';
import MembershipCard from './components/MembershipCard';
import Login from './components/Login';
import PublicRegistration from './components/PublicRegistration';
import { Athlete, User } from './types';
import { api } from './api';
import { Trophy, Users, Calendar, ClipboardCheck, Cake, FileText, Settings as SettingsIcon, UserCheck, Activity, CreditCard, X, UserPlus, AlertTriangle, Link as LinkIcon, QrCode } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { Toaster, toast } from 'sonner';

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
  const [activeTab, setActiveTab] = useState('dashboard');
  const { settings } = useTheme();
  const [isAthleteFormOpen, setIsAthleteFormOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const isReg = params.get('register') === 'true';
    console.log('Initial isRegistering:', isReg);
    return isReg;
  });
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [selectedAthleteForAnamnesis, setSelectedAthleteForAnamnesis] = useState<Athlete | null>(null);
  const [selectedAthleteForCard, setSelectedAthleteForCard] = useState<Athlete | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [stats, setStats] = useState({ athletes: 0, active: 0, events: 0 });
  const [myAthleteData, setMyAthleteData] = useState<Athlete | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for athletes to ensure the dashboard and lists are always up to date
    // This is useful for both admins (stats/list) and students (my-data)
    const unsubscribe = api.subscribeToAthletes((data) => {
      setAthletes(data);
      if (user?.role === 'admin') {
        setStats(prev => ({
          ...prev,
          athletes: data.length,
          active: data.filter(a => a.status === 'Ativo').length
        }));
      }
    });
    return () => unsubscribe();
  }, [user?.id]); // Re-subscribe if user changes

  useEffect(() => {
    if (user?.role === 'student' && user.athlete_id && athletes.length > 0) {
      const me = athletes.find(a => a.id === user.athlete_id);
      if (me) setMyAthleteData(me);
    }
  }, [user, athletes]);

  useEffect(() => {
    if (user?.role === 'admin') {
      api.getEvents().then(events => {
        setStats(prev => ({ ...prev, events: events.length }));
      });
    }
  }, [user]);

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
    setActiveTab('dashboard');
  };

  const handleLogout = async () => {
    await api.logout();
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
                    <button onClick={() => setActiveTab('my-data')} className="bg-zinc-900/40 border border-theme-primary/30 p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-4">
                    <div className="p-3 lg:p-4 bg-theme-primary/10 text-theme-primary rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <UserPlus size={28} className="lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Meus Dados</h3>
                      <p className="text-[10px] lg:text-xs text-zinc-500">Atualize suas informações cadastrais</p>
                    </div>
                  </button>
 
                    <button onClick={() => setActiveTab('my-anamnesis')} className="bg-zinc-900/40 border border-theme-primary/30 p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-4">
                    <div className="p-3 lg:p-4 bg-green-500/10 text-green-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <ClipboardCheck size={28} className="lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Minha Saúde</h3>
                      <p className="text-[10px] lg:text-xs text-zinc-500">Preencha sua ficha de anamnese</p>
                    </div>
                  </button>
 
                    <button onClick={() => setActiveTab('my-card')} className="bg-zinc-900/40 border border-theme-primary/30 p-6 lg:p-8 rounded-3xl lg:rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-4">
                    <div className="p-3 lg:p-4 bg-blue-500/10 text-blue-500 rounded-2xl lg:rounded-3xl group-hover:scale-110 transition-transform">
                      <CreditCard size={28} className="lg:w-8 lg:h-8" />
                    </div>
                    <div>
                      <h3 className="text-base lg:text-lg font-bold text-white uppercase tracking-widest mb-1">Carteirinha</h3>
                      <p className="text-[10px] lg:text-xs text-zinc-500">Visualize sua carteirinha oficial</p>
                    </div>
                  </button>
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl group-hover:scale-110 transition-transform">
                      <Users size={24} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Atletas Totais</h3>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.athletes}</p>
                </div>
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-green-500/10 text-green-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <UserCheck size={24} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Atletas Ativos</h3>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.active}</p>
                </div>
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-blue-500/10 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <Calendar size={24} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Eventos</h3>
                  </div>
                  <p className="text-4xl font-black text-white">{stats.events}</p>
                </div>
                <div className="bg-zinc-900/40 border border-theme-primary/30 p-6 rounded-3xl shadow-xl hover:border-theme-primary/60 transition-all group">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="p-3 bg-purple-500/10 text-purple-500 rounded-2xl group-hover:scale-110 transition-transform">
                      <Trophy size={24} />
                    </div>
                    <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest">Ranking</h3>
                  </div>
                  <p className="text-4xl font-black text-white">#1</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-zinc-900/40 border border-theme-primary/30 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-6 uppercase tracking-widest flex items-center gap-2">
                    <Activity size={20} className="text-theme-primary" />
                    Ações Rápidas
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={() => setIsAthleteFormOpen(true)} className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group">
                      <Users className="text-theme-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Novo Atleta</span>
                    </button>
                    <button onClick={() => setActiveTab('attendance')} className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group">
                      <ClipboardCheck className="text-green-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Fazer Chamada</span>
                    </button>
                    <button onClick={() => { setActiveTab('attendance'); localStorage.setItem('auto_scan', 'true'); }} className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group">
                      <QrCode className="text-theme-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Chamada QR</span>
                    </button>
                    <button onClick={() => setActiveTab('events')} className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group">
                      <Calendar className="text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Novo Evento</span>
                    </button>
                    <button onClick={() => setActiveTab('documents')} className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group">
                      <FileText className="text-purple-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Documentos</span>
                    </button>
                    <button 
                      onClick={() => {
                        const link = `${window.location.origin}/?register=true`;
                        navigator.clipboard.writeText(link);
                        toast.success('Link de matrícula copiado!');
                      }}
                      className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group col-span-2"
                    >
                      <LinkIcon className="text-theme-primary group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Copiar Link de Matrícula</span>
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
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 no-print">
                <div className="bg-black border border-theme-primary/20 p-6 rounded-3xl shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-4 uppercase flex items-center gap-2">
                    <Activity size={20} className="text-theme-primary" />
                    Ficha de Anamnese
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">Selecione um atleta para visualizar ou editar sua ficha de saúde.</p>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none"
                      onChange={(e) => {
                        const id = e.target.value;
                        api.getAthletes().then(list => {
                          const a = list.find(item => item.id === id);
                          if (a) setSelectedAthleteForAnamnesis(a);
                        });
                      }}
                    >
                      <option value="">Selecionar Atleta</option>
                      {stats.athletes > 0 && <AthleteOptions />}
                    </select>
                  </div>
                </div>
                <div className="bg-black border border-theme-primary/20 p-6 rounded-3xl shadow-xl">
                  <h3 className="text-lg font-bold text-white mb-4 uppercase flex items-center gap-2">
                    <CreditCard size={20} className="text-theme-primary" />
                    Carteirinha
                  </h3>
                  <p className="text-sm text-zinc-400 mb-4">Gere a carteirinha oficial do atleta com QR Code para chamada.</p>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:outline-none"
                      onChange={(e) => {
                        const id = e.target.value;
                        api.getAthletes().then(list => {
                          const a = list.find(item => item.id === id);
                          if (a) setSelectedAthleteForCard(a);
                        });
                      }}
                    >
                      <option value="">Selecionar Atleta</option>
                      {stats.athletes > 0 && <AthleteOptions />}
                    </select>
                  </div>
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
        case 'my-data':
          return (
            <div className="max-w-4xl mx-auto">
              {myAthleteData ? (
                <AthleteForm 
                  athlete={myAthleteData} 
                  onClose={() => setActiveTab('dashboard')} 
                  onSave={() => {
                    setActiveTab('dashboard');
                  }} 
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
                <AnamnesisForm athlete={myAthleteData} onSave={() => setActiveTab('dashboard')} />
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
        case 'professors':
          return <ProfessorManagement />;
        case 'attendance':
          return <Attendance athletes={athletes} />;
        case 'events':
          return <EventsManagement />;
        case 'birthdays':
          return <Birthdays />;
        case 'documents':
          return <Documents />;
        case 'settings':
          return <SettingsComponent />;
        default:
          return <div>Em desenvolvimento...</div>;
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
      console.log('URL Change detected. isRegistering:', isReg);
      if (isReg) {
        setIsRegistering(true);
      } else {
        setIsRegistering(false);
      }
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

function AthleteOptions() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  useEffect(() => { api.getAthletes().then(setAthletes); }, []);
  return (
    <>
      {athletes.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
    </>
  );
}
