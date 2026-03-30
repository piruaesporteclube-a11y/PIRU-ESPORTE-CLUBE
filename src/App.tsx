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
import { Athlete, User } from './types';
import { api } from './api';
import { Trophy, Users, Calendar, ClipboardCheck, Cake, FileText, Settings as SettingsIcon, UserCheck, Activity, CreditCard, X, UserPlus, AlertTriangle } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('pirua_user');
    if (saved) return JSON.parse(saved);
    return null;
  });
  const [activeTab, setActiveTab] = useState('dashboard');
  const { settings } = useTheme();
  const [isAthleteFormOpen, setIsAthleteFormOpen] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | null>(null);
  const [selectedAthleteForAnamnesis, setSelectedAthleteForAnamnesis] = useState<Athlete | null>(null);
  const [selectedAthleteForCard, setSelectedAthleteForCard] = useState<Athlete | null>(null);
  const [stats, setStats] = useState({ athletes: 0, active: 0, events: 0 });
  const [myAthleteData, setMyAthleteData] = useState<Athlete | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const storedUser = localStorage.getItem('pirua_user');
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        if (parsedUser.token !== 'emergency-token') {
          setUser(parsedUser);
          setIsAuthLoading(false);
          return;
        }
      }

      if (!user) {
        try {
          // Auto-login as admin for "free access"
          const res = await api.login('05504043689', '05504043689');
          if (res.token !== "emergency-token") {
            setUser(res.user);
            localStorage.setItem('pirua_user', JSON.stringify(res.user));
          }
        } catch (err) {
          console.error("Auto-login failed:", err);
        }
      }
      setIsAuthLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadStats();
      if (user.role === 'student' && user.athlete_id) {
        loadMyData(user.athlete_id);
      }
    }
  }, [user]);

  const loadStats = async () => {
    if (user?.role !== 'admin') return;
    const [athletes, events] = await Promise.all([api.getAthletes(), api.getEvents()]);
    setStats({
      athletes: athletes.length,
      active: athletes.filter(a => a.status === 'Ativo').length,
      events: events.length
    });
  };

  const loadMyData = async (id: string) => {
    const athletes = await api.getAthletes();
    const me = athletes.find(a => a.id === id);
    if (me) setMyAthleteData(me);
  };

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <button onClick={() => setActiveTab('my-data')} className="bg-zinc-900/40 border border-theme-primary/30 p-8 rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-4">
                    <div className="p-4 bg-theme-primary/10 text-theme-primary rounded-3xl group-hover:scale-110 transition-transform">
                      <UserPlus size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-1">Meus Dados</h3>
                      <p className="text-xs text-zinc-500">Atualize suas informações cadastrais</p>
                    </div>
                  </button>

                    <button onClick={() => setActiveTab('my-anamnesis')} className="bg-zinc-900/40 border border-theme-primary/30 p-8 rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-4">
                    <div className="p-4 bg-green-500/10 text-green-500 rounded-3xl group-hover:scale-110 transition-transform">
                      <ClipboardCheck size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-1">Minha Saúde</h3>
                      <p className="text-xs text-zinc-500">Preencha sua ficha de anamnese</p>
                    </div>
                  </button>

                    <button onClick={() => setActiveTab('my-card')} className="bg-zinc-900/40 border border-theme-primary/30 p-8 rounded-[2.5rem] shadow-xl hover:border-theme-primary/60 transition-all group flex flex-col items-center text-center gap-4">
                    <div className="p-4 bg-blue-500/10 text-blue-500 rounded-3xl group-hover:scale-110 transition-transform">
                      <CreditCard size={32} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white uppercase tracking-widest mb-1">Carteirinha</h3>
                      <p className="text-xs text-zinc-500">Visualize sua carteirinha oficial</p>
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
                    <button onClick={() => setActiveTab('events')} className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group">
                      <Calendar className="text-blue-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Novo Evento</span>
                    </button>
                    <button onClick={() => setActiveTab('documents')} className="flex flex-col items-center justify-center p-6 bg-zinc-800 hover:bg-zinc-700 rounded-2xl transition-all gap-3 group">
                      <FileText className="text-purple-500 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold uppercase">Documentos</span>
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
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] flex items-center justify-center p-4 overflow-y-auto no-print">
                  <div className="relative w-full max-w-2xl">
                    <div className="flex justify-end mb-4">
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
                    loadMyData(user.athlete_id!);
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
          return <Attendance />;
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
    <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
      {renderContent()}
      {isAthleteFormOpen && (
        <AthleteForm 
          athlete={editingAthlete} 
          onClose={() => { setIsAthleteFormOpen(false); setEditingAthlete(null); }} 
          onSave={() => { setIsAthleteFormOpen(false); setEditingAthlete(null); loadStats(); }} 
        />
      )}
    </Layout>
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
