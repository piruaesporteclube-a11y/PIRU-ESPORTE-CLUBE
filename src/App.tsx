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
import WhatsAppIntegration from './components/WhatsAppIntegration';
import CategoryList from './components/CategoryList';
import LineupManagement from './components/LineupManagement';
import StudentLineups from './components/StudentLineups';
import StudentPresenceHistory from './components/StudentPresenceHistory';
import ChampionshipManagement from './components/ChampionshipManagement';
import PublicTeamRegistration from './components/PublicTeamRegistration';
import Login from './components/Login';
import PublicRegistration from './components/PublicRegistration';
import PublicProfessorRegistration from './components/PublicProfessorRegistration';
import PublicAnamnesis from './components/PublicAnamnesis';
import TeamPortal from './components/TeamPortal';
import PublicEventCheckin from './components/PublicEventCheckin';
import OfficialLetterGenerator from './components/OfficialLetterGenerator';
import TravelList from './components/TravelList';
import CompanionRegistration from './components/CompanionRegistration';
import ActivityManagement from './components/ActivityManagement';
import SuspendedAthletes from './components/SuspendedAthletes';
import UniformManagement from './components/UniformManagement';
import AnnouncementFlyer from './components/AnnouncementFlyer';
import SchoolReportManagement from './components/SchoolReportManagement';
import { AccessAudit } from './components/AccessAudit';
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { Athlete, User, Professor, Event, Settings, OfficialLetter, Companion, EventMatchScore } from './types';
import { api, clearCache } from './api';
import { Trophy, Users, Calendar, ClipboardCheck, Cake, FileText, Settings as SettingsIcon, UserCheck, Activity, CreditCard, X, UserPlus, AlertTriangle, Link as LinkIcon, QrCode, Instagram, MessageCircle, ClipboardList, Clock, History, ShieldAlert, Pause } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';
import { Toaster, toast } from 'sonner';
import { format } from 'date-fns';
import { navItems } from './navigation';
import { cn } from './utils';

const getCardColorClasses = (colorClass: string | undefined, isSelected: boolean, catId?: string) => {
  const c = colorClass || '';
  const isRed = c.includes('red') || c.includes('rose') || catId === 'office';
  const isGreen = c.includes('green') || c.includes('emerald') || catId === 'arena';
  const isBlue = c.includes('blue') || c.includes('sky') || catId === 'training';
  const isPink = c.includes('pink') || catId === 'external';
  const isIndigo = c.includes('indigo');
  const isPurple = c.includes('purple') || catId === 'community';
  const isAmber = c.includes('amber') || c.includes('yellow') || c.includes('primary') || catId === 'command' || catId === 'student';

  const cursorClass = isSelected ? 'cursor-default' : 'cursor-pointer';

  if (isSelected) {
    if (isRed) {
      return `bg-gradient-to-br from-zinc-950 via-zinc-900 to-rose-950/40 border-rose-500 shadow-[0_0_24px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/40 scale-[1.03] ${cursorClass}`;
    }
    if (isGreen) {
      return `bg-gradient-to-br from-zinc-950 via-zinc-900 to-emerald-950/40 border-emerald-500 shadow-[0_0_24px_rgba(16,185,129,0.25)] ring-1 ring-emerald-500/30 scale-[1.03] ${cursorClass}`;
    }
    if (isBlue) {
      return `bg-gradient-to-br from-zinc-950 via-zinc-900 to-sky-950/40 border-sky-500 shadow-[0_0_24px_rgba(14,165,233,0.25)] ring-1 ring-sky-500/30 scale-[1.03] ${cursorClass}`;
    }
    if (isPink) {
      return `bg-gradient-to-br from-zinc-950 via-zinc-900 to-pink-950/40 border-pink-500 shadow-[0_0_24px_rgba(236,72,153,0.25)] ring-1 ring-pink-500/30 scale-[1.03] ${cursorClass}`;
    }
    if (isIndigo) {
      return `bg-gradient-to-br from-zinc-950 via-zinc-900 to-indigo-950/40 border-indigo-500 shadow-[0_0_24px_rgba(99,102,241,0.25)] ring-1 ring-indigo-500/30 scale-[1.03] ${cursorClass}`;
    }
    if (isPurple) {
      return `bg-gradient-to-br from-zinc-950 via-zinc-900 to-purple-950/40 border-purple-500 shadow-[0_0_24px_rgba(168,85,247,0.25)] ring-1 ring-purple-500/30 scale-[1.03] ${cursorClass}`;
    }
    return `bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-950/45 border-amber-500 shadow-[0_0_25px_rgba(251,191,36,0.3)] ring-1 ring-amber-500/40 scale-[1.03] ${cursorClass}`;
  }

  // Hover states matching
  if (isRed) {
    return `bg-gradient-to-b from-zinc-950/80 to-zinc-900/60 border-zinc-800/80 hover:bg-gradient-to-tr hover:from-zinc-900 hover:to-rose-950/20 hover:border-rose-500/50 hover:shadow-[0_8px_32px_rgba(244,63,94,0.12)] hover:-translate-y-1.5 ${cursorClass}`;
  }
  if (isGreen) {
    return `bg-gradient-to-b from-zinc-950/80 to-zinc-900/60 border-zinc-800/80 hover:bg-gradient-to-tr hover:from-zinc-900 hover:to-emerald-950/20 hover:border-emerald-400/50 hover:shadow-[0_8px_32px_rgba(16,185,129,0.12)] hover:-translate-y-1.5 ${cursorClass}`;
  }
  if (isBlue) {
    return `bg-gradient-to-b from-zinc-950/80 to-zinc-900/60 border-zinc-800/80 hover:bg-gradient-to-tr hover:from-zinc-900 hover:to-sky-950/20 hover:border-sky-400/50 hover:shadow-[0_8px_32px_rgba(14,165,233,0.12)] hover:-translate-y-1.5 ${cursorClass}`;
  }
  if (isPink) {
    return `bg-gradient-to-b from-zinc-950/80 to-zinc-900/60 border-zinc-800/80 hover:bg-gradient-to-tr hover:from-zinc-900 hover:to-pink-950/20 hover:border-pink-400/50 hover:shadow-[0_8px_32px_rgba(236,72,153,0.12)] hover:-translate-y-1.5 ${cursorClass}`;
  }
  if (isIndigo) {
    return `bg-gradient-to-b from-zinc-950/80 to-zinc-900/60 border-zinc-800/80 hover:bg-gradient-to-tr hover:from-zinc-900 hover:to-indigo-950/20 hover:border-indigo-400/50 hover:shadow-[0_8px_32px_rgba(99,102,241,0.12)] hover:-translate-y-1.5 ${cursorClass}`;
  }
  if (isPurple) {
    return `bg-gradient-to-b from-zinc-950/80 to-zinc-900/60 border-zinc-800/80 hover:bg-gradient-to-tr hover:from-zinc-900 hover:to-purple-950/20 hover:border-purple-400/50 hover:shadow-[0_8px_32px_rgba(168,85,247,0.12)] hover:-translate-y-1.5 ${cursorClass}`;
  }
  
  return `bg-gradient-to-b from-zinc-950/80 to-zinc-900/60 border-zinc-800/80 hover:bg-gradient-to-tr hover:from-zinc-900 hover:to-amber-950/25 hover:border-amber-400/50 hover:shadow-[0_8px_32px_rgba(251,191,36,0.12)] hover:-translate-y-1.5 ${cursorClass}`;
};

const getIconBgClass = (colorClass: string | undefined, isSelected: boolean, catId?: string) => {
  const c = colorClass || '';
  const isRed = c.includes('red') || c.includes('rose') || catId === 'office';
  const isGreen = c.includes('green') || c.includes('emerald') || catId === 'arena';
  const isBlue = c.includes('blue') || c.includes('sky') || catId === 'training';
  const isPink = c.includes('pink') || catId === 'external';
  const isIndigo = c.includes('indigo');
  const isPurple = c.includes('purple') || catId === 'community';
  const isAmber = c.includes('amber') || c.includes('yellow') || c.includes('primary') || catId === 'command' || catId === 'student';

  if (isSelected) {
    if (isRed) return 'bg-gradient-to-br from-rose-500 to-amber-300 text-black shadow-md shadow-rose-500/30 font-black';
    if (isGreen) return 'bg-gradient-to-br from-emerald-500 to-yellow-300 text-black shadow-md shadow-emerald-500/30 font-black';
    if (isBlue) return 'bg-gradient-to-br from-sky-500 to-yellow-300 text-black shadow-md shadow-sky-500/30 font-black';
    if (isPink) return 'bg-gradient-to-br from-pink-500 to-amber-300 text-black shadow-md shadow-pink-500/30 font-black';
    if (isIndigo) return 'bg-gradient-to-br from-indigo-500 to-yellow-300 text-black shadow-md shadow-indigo-500/30 font-black';
    if (isPurple) return 'bg-gradient-to-br from-purple-500 to-pink-300 text-white shadow-md shadow-purple-500/30 font-black';
    return 'bg-gradient-to-br from-amber-500 to-yellow-300 text-black shadow-md shadow-theme-primary/35 font-black';
  }

  if (isRed) return 'bg-rose-500/10 text-rose-450 group-hover:bg-gradient-to-br group-hover:from-rose-500 group-hover:to-amber-300 group-hover:text-black transition-all duration-300';
  if (isGreen) return 'bg-emerald-500/10 text-emerald-400 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-yellow-300 group-hover:text-black transition-all duration-300';
  if (isBlue) return 'bg-sky-500/10 text-sky-400 group-hover:bg-gradient-to-br group-hover:from-sky-500 group-hover:to-yellow-300 group-hover:text-black transition-all duration-300';
  if (isPink) return 'bg-pink-500/10 text-pink-400 group-hover:bg-gradient-to-br group-hover:from-pink-500 group-hover:to-amber-300 group-hover:text-black transition-all duration-300';
  if (isIndigo) return 'bg-indigo-500/10 text-indigo-400 group-hover:bg-gradient-to-br group-hover:from-indigo-500 group-hover:to-yellow-300 group-hover:text-black transition-all duration-300';
  if (isPurple) return 'bg-purple-500/10 text-purple-400 group-hover:bg-gradient-to-br group-hover:from-purple-500 group-hover:to-pink-300 group-hover:text-white transition-all duration-300';

  return 'bg-amber-500/10 text-amber-400 group-hover:bg-gradient-to-br group-hover:from-amber-500 group-hover:to-yellow-300 group-hover:text-black transition-all duration-300';
};

const getStatConfig = (label: string, statsVal: number) => {
  switch (label) {
    case 'Atletas Ativos':
      return {
        label: 'Atletas Ativos',
        value: statsVal,
        icon: UserCheck,
        color: 'text-emerald-400',
        bgGrad: 'rgba(16,185,129,0.06)',
        borderColor: 'group-hover:border-emerald-500/40',
        shadow: 'hover:shadow-[0_0_30px_rgba(16,185,129,0.08)]',
        accentBorder: 'border-emerald-500/10 group-hover:border-emerald-500/30',
        badge: 'Ativos',
        badgeColor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        glowingDot: 'bg-emerald-500',
        iconBg: 'bg-emerald-500/10 text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black'
      };
    case 'Suspensos':
      return {
        label: 'Suspensos',
        value: statsVal,
        icon: AlertTriangle,
        color: 'text-rose-400',
        bgGrad: 'rgba(244,63,94,0.06)',
        borderColor: 'group-hover:border-rose-500/40',
        shadow: 'hover:shadow-[0_0_30px_rgba(244,63,94,0.08)]',
        accentBorder: 'border-rose-500/10 group-hover:border-rose-500/30',
        badge: 'Suspensões',
        badgeColor: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
        glowingDot: 'bg-rose-500',
        iconBg: 'bg-rose-500/10 text-rose-400 group-hover:bg-rose-500 group-hover:text-black'
      };
    case 'Eventos':
      return {
        label: 'Eventos',
        value: statsVal,
        icon: Calendar,
        color: 'text-sky-400',
        bgGrad: 'rgba(14,165,233,0.06)',
        borderColor: 'group-hover:border-sky-500/40',
        shadow: 'hover:shadow-[0_0_30px_rgba(14,165,233,0.08)]',
        accentBorder: 'border-sky-500/10 group-hover:border-sky-500/30',
        badge: 'Eventos',
        badgeColor: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        glowingDot: 'bg-sky-500',
        iconBg: 'bg-sky-500/10 text-sky-400 group-hover:bg-sky-500 group-hover:text-black'
      };
    default:
      return {
        label: 'Atletas Totais',
        value: statsVal,
        icon: Users,
        color: 'text-theme-primary',
        bgGrad: 'rgba(251,191,36,0.06)',
        borderColor: 'group-hover:border-theme-primary/40',
        shadow: 'hover:shadow-[0_0_30px_rgba(251,191,36,0.08)]',
        accentBorder: 'border-theme-primary/10 group-hover:border-theme-primary/30',
        badge: 'Cadastros',
        badgeColor: 'bg-theme-primary/10 text-theme-primary border-theme-primary/25',
        glowingDot: 'bg-theme-primary',
        iconBg: 'bg-theme-primary/10 text-theme-primary group-hover:bg-theme-primary group-hover:text-black'
      };
  }
};

const Dashboard = ({ stats, athletes, professors, events, user, settings, activeTab, setActiveTab, setIsAthleteFormOpen }: { 
  stats: any, 
  athletes: Athlete[], 
  professors: Professor[],
  events: Event[], 
  user: User, 
  settings: Settings,
  activeTab: string,
  setActiveTab: (tab: string) => void,
  setIsAthleteFormOpen: (open: boolean) => void
}) => {
  const [upcomingActivities, setUpcomingActivities] = useState<any[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(false);

  useEffect(() => {
    if (user.role === 'student' || user.role === 'professor') {
      loadUpcoming();
    }
  }, [user.id]);

  const loadUpcoming = async () => {
    setIsLoadingActivities(true);
    try {
      const [trainings, allEvents] = await Promise.all([
        api.getTrainings(),
        api.getEvents()
      ]);

      const now = new Date();
      const todayStr = format(now, 'yyyy-MM-dd');

      const futureTrainings = trainings
        .filter(t => t.date >= todayStr)
        .map(t => ({ ...t, type: 'training' }));

      const futureEvents = allEvents
        .filter(e => e.start_date >= todayStr)
        .map(e => ({ ...e, type: 'event' }));

      const combined = [...futureTrainings, ...futureEvents]
        .sort((a, b) => {
          const dateA = (a as any).date || (a as any).start_date;
          const dateB = (b as any).date || (b as any).start_date;
          return dateA.localeCompare(dateB);
        })
        .slice(0, 3);

      setUpcomingActivities(combined);
    } catch (error) {
      console.error("Error loading upcoming activities:", error);
    } finally {
      setIsLoadingActivities(false);
    }
  };

  const filteredNavItems = navItems
    .filter(item => user && item.roles.includes(user.role) && item.id !== 'dashboard');

  const copyLinks = [
    { label: 'Link Matrícula', icon: LinkIcon, color: 'text-theme-primary', url: `${window.location.origin}/?register=true` },
    { label: 'Auto-Cadastro Comissão', icon: UserCheck, color: 'text-indigo-500', url: `${window.location.origin}/?professor_registration=true` },
    { label: 'Link Portal', icon: LinkIcon, color: 'text-blue-500', url: `${window.location.origin}/` },
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
          <div className="flex flex-wrap items-center gap-4">
            <button 
              onClick={() => setActiveTab('my-data')}
              className="flex items-center gap-2 px-6 py-3 bg-theme-primary text-black rounded-2xl font-black uppercase text-xs tracking-tighter hover:opacity-90 transition-all shadow-lg shadow-theme-primary/20"
            >
              <UserPlus size={18} />
              Atualizar Meus Dados
            </button>
            <div className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-3xl border border-zinc-800">
             <div className="text-right">
               <p className="text-sm font-black text-theme-primary uppercase">{new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}</p>
               <p className="text-xs sm:text-sm text-zinc-500 font-bold uppercase tracking-widest">{new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}</p>
             </div>
             <div className="w-12 h-12 bg-theme-primary rounded-2xl flex items-center justify-center text-black font-black">
               {new Date().getDate()}
             </div>
            </div>
          </div>
        </section>

        {upcomingActivities.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-6 w-1.5 bg-theme-primary rounded-full" />
                <h3 className="text-2xl font-black text-white uppercase tracking-tighter">Próximos Compromissos</h3>
              </div>
              <button 
                onClick={() => setActiveTab('lineups')}
                className="text-xs font-black text-theme-primary uppercase tracking-widest hover:underline"
              >
                Ver Agenda Completa
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {upcomingActivities.map((act, idx) => (
                <div key={idx} className="bg-zinc-900 border border-zinc-800 p-6 rounded-[2rem] hover:border-theme-primary/30 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className={cn(
                        "p-3 rounded-2xl",
                        act.type === 'training' ? "bg-orange-500/10 text-orange-500" : "bg-blue-500/10 text-blue-500"
                      )}>
                        {act.type === 'training' ? <ClipboardList size={24} /> : <Trophy size={24} />}
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-zinc-800 rounded-lg text-zinc-500">
                        {act.type === 'training' ? 'Treino' : 'Evento/Jogo'}
                      </div>
                    </div>
                    <h4 className="text-lg font-black text-white uppercase mb-2 line-clamp-1">{act.name || 'Sessão de Treino'}</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase">
                        <Calendar size={14} className="text-zinc-600" />
                        {act.date || act.start_date}
                      </div>
                      <div className="flex items-center gap-2 text-zinc-500 text-xs font-bold uppercase">
                        <Clock size={14} className="text-zinc-600" />
                        {act.start_time}
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveTab(act.type === 'training' ? 'trainings' : 'lineups')}
                    className="mt-6 w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-black rounded-xl uppercase text-[10px] tracking-widest transition-colors"
                  >
                    Ver Detalhes
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-12">
          {[
            { id: 'student', label: 'Dados & Identidade', color: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]', text: 'text-amber-400', cardColor: 'text-amber-500' },
            { id: 'office', label: 'Documentação & Saúde', color: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]', text: 'text-rose-400', cardColor: 'text-rose-500' },
            { id: 'arena', label: 'Minhas Competições', color: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)]', text: 'text-emerald-400', cardColor: 'text-emerald-500' },
            { id: 'training', label: 'Treinos & Agenda', color: 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.25)]', text: 'text-sky-400', cardColor: 'text-sky-500' },
            { id: 'community', label: 'Comunidade & Social', color: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.25)]', text: 'text-purple-400', cardColor: 'text-purple-500' },
          ].map((cat) => {
            const items = filteredNavItems.filter(item => item.category === cat.id);
            if (items.length === 0) return null;
            
            // Additional links for specific categories in student view
            const additionalItems = [];
            if (cat.id === 'student') {
              if (settings.instagram) {
                additionalItems.push(
                  <a 
                    key="instagram"
                    href={settings.instagram?.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram?.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                      getCardColorClasses('text-pink-500', false)
                    )}
                  >
                    <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                      <Instagram size={110} />
                    </div>
                    <div className={cn(
                      "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                      getIconBgClass('text-pink-500', false)
                    )}>
                      <Instagram className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">Instagram</span>
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#a1a1aa] opacity-60 group-hover:opacity-100 transition-opacity">Siga @piruaec</p>
                    </div>
                  </a>
                );
              }
              if (settings.whatsapp && settings.whatsapp.replace(/\D/g, '')) {
                additionalItems.push(
                  <a 
                    key="whatsapp"
                    href={`https://wa.me/55${settings.whatsapp?.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                      getCardColorClasses('text-green-500', false)
                    )}
                  >
                    <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                      <MessageCircle size={110} />
                    </div>
                    <div className={cn(
                      "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                      getIconBgClass('text-green-500', false)
                    )}>
                      <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">WhatsApp</span>
                      <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#a1a1aa] opacity-60 group-hover:opacity-100 transition-opacity">Fale Conosco</p>
                    </div>
                  </a>
                );
              }
            }

            if (items.length === 0 && additionalItems.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-6">
                <div className="flex items-center justify-between border-b border-zinc-800/85 pb-3">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-7 w-2 rounded-full", cat.color)} />
                    <h3 className={cn("text-xl sm:text-2xl font-black uppercase tracking-tighter transition-colors duration-300", cat.text)}>
                      {cat.label}
                    </h3>
                  </div>
                  <span className={cn("text-xs font-black px-2.5 py-1 rounded-lg border bg-zinc-950/60 uppercase tracking-widest border-zinc-800/80", cat.text)}>
                    {items.length + (cat.id === 'student' ? additionalItems.length : 0)} {(items.length + (cat.id === 'student' ? additionalItems.length : 0)) === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                  {items.map((item) => {
                    const isSelected = activeTab === item.id;
                    const itemColor = item.color || cat.cardColor;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                          getCardColorClasses(itemColor, isSelected, cat.id)
                        )}
                      >
                        {/* Ghost background icon */}
                        <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                          <item.icon size={110} />
                        </div>
                        
                        {/* Selected Indicator Dot */}
                        {isSelected && (
                          <div className={cn(
                            "absolute top-3.5 right-3.5 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]",
                            itemColor.replace('text-', 'bg-')
                          )} />
                        )}

                        <div className={cn(
                          "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                          getIconBgClass(itemColor, isSelected, cat.id)
                        )}>
                          <item.icon className={cn(
                            "w-7 h-7 sm:w-8 sm:h-8 transition-transform",
                            isSelected ? "scale-110" : "group-hover:scale-110"
                          )} />
                        </div>
                        <div className="space-y-1">
                          <span className={cn(
                            "text-base sm:text-lg font-black tracking-tight block leading-tight transition-colors duration-300",
                            isSelected ? (itemColor.includes('theme-primary') ? 'text-theme-primary' : itemColor) : "text-white"
                          )}>
                            {item.label}
                          </span>
                          {item.description && (
                            <p className={cn(
                              "text-[10px] sm:text-xs font-black uppercase tracking-widest transition-opacity duration-300",
                              isSelected ? `${itemColor.includes('theme-primary') ? 'text-theme-primary/80' : itemColor} opacity-90` : "text-[#a1a1aa] opacity-60 group-hover:opacity-100"
                            )}>
                              {item.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                  {additionalItems}
                </div>
              </div>
            );
          })}
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
            <Birthdays athletes={athletes} professors={professors} />
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
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {[
          { label: 'Atletas Totais', value: stats.athletes },
          { label: 'Atletas Ativos', value: stats.active },
          { label: 'Suspensos', value: stats.suspended },
          { label: 'Eventos', value: stats.events },
        ].map((item, idx) => {
          const config = getStatConfig(item.label, item.value);
          const IconComponent = config.icon;
          
          return (
            <div 
              key={idx} 
              className={cn(
                "group relative overflow-hidden rounded-[2rem] border bg-gradient-to-b from-zinc-900 to-zinc-950/90 p-5 sm:p-6 transition-all duration-300 flex flex-col justify-between min-h-[140px] sm:min-h-[160px] border-zinc-800/80 cursor-default",
                config.borderColor,
                config.shadow
              )}
            >
              {/* Background ambient radial gradient */}
              <div 
                className="absolute -right-16 -top-16 w-32 h-32 rounded-full blur-[40px] pointer-events-none transition-all duration-500 opacity-60 group-hover:scale-150 group-hover:opacity-100"
                style={{ background: config.bgGrad }}
              />
              
              {/* Ghost background icon */}
              <div className="absolute right-4 bottom-4 text-white opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                <IconComponent size={96} />
              </div>

              {/* Card Header (Badge & Glowing Dot) */}
              <div className="flex items-center justify-between gap-2 z-10">
                <span className={cn(
                  "px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-full border",
                  config.badgeColor
                )}>
                  {config.badge}
                </span>
                <span className="flex h-2 w-2 relative">
                  <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", config.glowingDot)} />
                  <span className={cn("relative inline-flex rounded-full h-2 w-2", config.glowingDot)} />
                </span>
              </div>

              {/* Card Body & Icon */}
              <div className="flex items-end justify-between mt-6 sm:mt-8 z-10">
                <div className="space-y-1 text-left">
                  <p className="text-[10px] sm:text-xs font-black text-zinc-400 uppercase tracking-widest leading-none">
                    {config.label}
                  </p>
                  <p className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                    {config.value}
                  </p>
                </div>
                
                <div className={cn(
                  "p-3 rounded-2xl transition-all duration-300 border",
                  config.iconBg,
                  config.accentBorder
                )}>
                  <IconComponent size={20} className="sm:size-6" />
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Central Hub - Grouped by Category */}
      <section className="space-y-12">
        {[
          { id: 'command', label: 'Painel de Comando', color: 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.25)]', text: 'text-amber-400', cardColor: 'text-amber-500' },
          { id: 'arena', label: 'Arena & Competição', color: 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.25)]', text: 'text-emerald-400', cardColor: 'text-emerald-500' },
          { id: 'training', label: 'Centro de Treinamento', color: 'bg-sky-500 shadow-[0_0_12px_rgba(14,165,233,0.25)]', text: 'text-sky-400', cardColor: 'text-sky-500' },
          { id: 'office', label: 'Gabinete & Saúde', color: 'bg-rose-500 shadow-[0_0_12px_rgba(244,63,94,0.25)]', text: 'text-rose-400', cardColor: 'text-rose-500' },
          { id: 'community', label: 'Social & Relacionamento', color: 'bg-purple-500 shadow-[0_0_12px_rgba(168,85,247,0.25)]', text: 'text-purple-400', cardColor: 'text-purple-500' },
        ].map((cat) => {
          const items = filteredNavItems.filter(item => item.category === cat.id);
          
          // Additional items for specific categories
          const additionalItems = [];
          if (cat.id === 'command') {
            additionalItems.push(
              <button 
                key="new-athlete"
                type="button"
                onClick={() => setIsAthleteFormOpen(true)} 
                className={cn(
                  "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                  getCardColorClasses('text-theme-primary', false, 'command')
                )}
              >
                <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                  <UserPlus size={110} />
                </div>
                <div className={cn(
                  "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                  getIconBgClass('text-theme-primary', false, 'command')
                )}>
                  <UserPlus className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
                </div>
                <div className="space-y-1">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight transition-colors duration-300 group-hover:text-theme-primary">
                    Novo Atleta
                  </span>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#a1a1aa] opacity-65 group-hover:opacity-100 transition-opacity">
                    Matrícula
                  </p>
                </div>
              </button>
            );
          }

          if (cat.id === 'community') {
            if (settings.instagram) {
              additionalItems.push(
                <a 
                  key="instagram"
                  href={settings.instagram?.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram?.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                    getCardColorClasses('text-pink-500', false, 'community')
                  )}
                >
                  <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                    <Instagram size={110} />
                  </div>
                  <div className={cn(
                    "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                    getIconBgClass('text-pink-500', false, 'community')
                  )}>
                    <Instagram className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">Instagram</span>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#a1a1aa] opacity-65 group-hover:opacity-100 transition-opacity">Social</p>
                  </div>
                </a>
              );
            }
            if (settings.whatsapp && settings.whatsapp.replace(/\D/g, '')) {
              additionalItems.push(
                <a 
                  key="whatsapp"
                  href={`https://wa.me/55${settings.whatsapp?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                    getCardColorClasses('text-green-500', false, 'community')
                  )}
                >
                  <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                    <MessageCircle size={110} />
                  </div>
                  <div className={cn(
                    "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                    getIconBgClass('text-green-500', false, 'community')
                  )}>
                    <MessageCircle className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">WhatsApp</span>
                    <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#a1a1aa] opacity-65 group-hover:opacity-100 transition-opacity">Suporte</p>
                  </div>
                </a>
              );
            }
          }

          if (items.length === 0 && additionalItems.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800/85 pb-3">
                <div className="flex items-center gap-3">
                  <div className={cn("h-7 w-2 rounded-full", cat.color)} />
                  <h4 className={cn("text-xl sm:text-2xl font-black uppercase tracking-tighter transition-colors duration-300", cat.text)}>
                    {cat.label}
                  </h4>
                </div>
                <span className={cn("text-xs font-black px-2.5 py-1 rounded-lg border bg-zinc-950/60 uppercase tracking-widest border-zinc-800/80", cat.text)}>
                  {items.length + (cat.id === 'command' || cat.id === 'community' ? additionalItems.length : 0)} {(items.length + (cat.id === 'command' || cat.id === 'community' ? additionalItems.length : 0)) === 1 ? 'item' : 'itens'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {items.map((item) => {
                  const isSelected = activeTab === item.id;
                  const itemColor = item.color || cat.cardColor;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveTab(item.id)}
                      className={cn(
                        "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                        getCardColorClasses(itemColor, isSelected, cat.id)
                      )}
                    >
                      {/* Ghost background icon */}
                      <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                        <item.icon size={110} />
                      </div>
                      
                      {/* Selected Indicator Dot */}
                      {isSelected && (
                        <div className={cn(
                          "absolute top-3.5 right-3.5 w-2 h-2 rounded-full animate-pulse shadow-[0_0_8px_currentColor]",
                          itemColor.replace('text-', 'bg-')
                        )} />
                      )}

                      <div className={cn(
                        "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                        getIconBgClass(itemColor, isSelected, cat.id)
                      )}>
                        <item.icon className={cn(
                          "w-7 h-7 sm:w-8 sm:h-8 transition-transform",
                          isSelected ? "scale-110" : "group-hover:scale-110"
                        )} />
                      </div>
                      <div className="space-y-1">
                        <span className={cn(
                          "text-base sm:text-lg font-black tracking-tight block leading-tight transition-colors duration-300",
                          isSelected ? (itemColor.includes('theme-primary') ? 'text-theme-primary' : itemColor) : "text-white"
                        )}>
                          {item.label}
                        </span>
                        {item.description && (
                          <p className={cn(
                            "text-[10px] sm:text-xs font-black uppercase tracking-widest transition-opacity duration-300",
                            isSelected ? `${itemColor.includes('theme-primary') ? 'text-theme-primary/80' : itemColor} opacity-90` : "text-[#a1a1aa] opacity-60 group-hover:opacity-100"
                          )}>
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
                {additionalItems}
              </div>
            </div>
          );
        })}

        {/* Quick Links Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800/85 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-7 w-2 bg-pink-500 shadow-[0_0_12px_rgba(236,72,153,0.25)] rounded-full" />
              <h4 className="text-xl sm:text-2xl font-black text-pink-400 uppercase tracking-tighter">Links de Acesso Externo</h4>
            </div>
            <span className="text-xs font-black px-2.5 py-1 rounded-lg border bg-zinc-950/60 uppercase tracking-widest text-pink-400 border-zinc-800/80">
              {copyLinks.length} {copyLinks.length === 1 ? 'atalho' : 'atalhos'}
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {copyLinks.map((link, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(link.url);
                  toast.success(`${link.label} copiado!`);
                }}
                className={cn(
                  "flex flex-col items-center justify-center p-5 sm:p-6 shadow-2xl border transition-all duration-300 group text-center gap-4 relative overflow-hidden rounded-3xl",
                  getCardColorClasses('text-pink-500', false, 'external')
                )}
              >
                <div className="absolute -right-6 -bottom-6 opacity-[0.02] group-hover:opacity-[0.08] transition-all duration-300 pointer-events-none group-hover:scale-110">
                  <link.icon size={110} />
                </div>
                <div className={cn(
                  "p-4 sm:p-5 rounded-2xl transition-all duration-300",
                  getIconBgClass('text-pink-500', false, 'external')
                )}>
                  <link.icon className="w-7 h-7 sm:w-8 sm:h-8 transition-transform group-hover:scale-110" />
                </div>
                <div className="space-y-1">
                  <span className="text-base sm:text-lg font-black tracking-tight text-white block leading-tight">{link.label}</span>
                  <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#a1a1aa] opacity-65 group-hover:opacity-100 transition-opacity">Copiar Link</p>
                </div>
              </button>
            ))}
          </div>
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
          <Birthdays athletes={athletes} professors={professors} />
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
          {import.meta.env.DEV && (
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

import QuotaBanner from './components/QuotaBanner';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('pirua_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Error parsing user from localStorage", e);
      localStorage.removeItem('pirua_user');
    }
    return null;
  });
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = localStorage.getItem('pirua_user');
      if (saved) {
        const parsed = JSON.parse(saved);
        return (parsed.role === 'student' || parsed.role === 'professor') ? 'my-card' : 'dashboard';
      }
    } catch (e) {
      console.error("Error parsing user for activeTab from localStorage", e);
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
  const [isProfessorRegistration, setIsProfessorRegistration] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('professor_registration') === 'true';
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
  const [isTravelRegistration, setIsTravelRegistration] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('travel-registration') === 'true' || window.location.pathname.startsWith('/cadastro-acompanhante/');
  });
  const [checkinEventId, setCheckinEventId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('eventId');
  });
  const [companionEventId, setCompanionEventId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('eventId')) return params.get('eventId');
    const path = window.location.pathname;
    if (path.startsWith('/cadastro-acompanhante/')) {
      return path.split('/cadastro-acompanhante/')[1];
    }
    return null;
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
  const [selectedEventIdForTravel, setSelectedEventIdForTravel] = useState<string | null>(null);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [stats, setStats] = useState({ athletes: 0, active: 0, suspended: 0, events: 0 });
  const [myAthleteData, setMyAthleteData] = useState<Athlete | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    // Optimized data fetching to save Firestore quota
    if (!user?.id) return;

    if (user.role === 'admin' || user.role === 'professor') {
      // Use getAthletes which has a 15-minute cache to significantly reduce read operations
      api.getAthletes().then(data => {
        setAthletes(data);
        setStats(prev => ({
          ...prev,
          athletes: data.length,
          active: data.filter(a => a.status === 'Ativo').length,
          suspended: data.filter(a => a.status === 'Suspenso').length
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

      if (user.role === 'professor' && user.professor_id) {
        // Fetch professor data and map it to an athlete-like structure for generic components
        const loadProfessorData = async () => {
          try {
            const me = await api.getProfessor(user.professor_id!);
            if (me) {
              const mappedAsAthlete: Athlete = {
                id: me.id,
                name: me.name,
                birth_date: me.birth_date,
                doc: me.doc,
                gender: "Masculino", // Default
                street: me.street,
                number: me.number,
                neighborhood: me.neighborhood,
                city: me.city,
                uf: me.uf,
                jersey_number: "00",
                photo: me.photo,
                contact: me.phone,
                email: user.email || "",
                guardian_name: "COMISSÃO",
                guardian_doc: "",
                guardian_phone: me.phone,
                status: "Ativo",
                modality: "Comissão Técnica"
              };
              setMyAthleteData(mappedAsAthlete);
            }
          } catch (error) {
            console.error("Error loading professor data:", error);
          }
        };
        loadProfessorData();
      }
    } else if (user.role === 'student' && user.athlete_id && !settings?.studentAccessPaused) {
      // Students only subscribe to their own document, which is very efficient
        const unsubscribe = api.subscribeToAthlete(user.athlete_id, (data) => {
          if (data) {
            setMyAthleteData(data);
            setAthletes(prev => (prev.length === 1 && prev[0].id === data.id) ? (JSON.stringify(prev[0]) === JSON.stringify(data) ? prev : [data]) : [data]);
          }
        });
      return () => unsubscribe();
    }
  }, [user?.id, user?.role, user?.athlete_id, user?.professor_id, settings?.studentAccessPaused]); // Re-subscribe if user changes

  useEffect(() => {
    if (user?.role === 'student' && user.athlete_id && athletes.length > 0) {
      const me = athletes.find(a => a.id === user.athlete_id);
      if (me) setMyAthleteData(me);
    }
  }, [user, athletes]);

  useEffect(() => {
    if (user?.role === 'student' && user.athlete_id && !settings?.studentAccessPaused) {
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
  }, [user?.id, user?.athlete_id, setActiveTab, settings?.studentAccessPaused]);

  useEffect(() => {
    // Listen for login errors and notify admin
    if (user?.role === 'admin') {
      const q = query(collection(db, "login_errors"), orderBy("created_at", "desc"), limit(1));
      let isFirstLoad = true;
      
      const unsubscribe = onSnapshot(q, (snapshot) => {
        if (isFirstLoad) {
          isFirstLoad = false;
          return;
        }
        
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const error = change.doc.data();
            toast.error("Tentativa de login falhou!", {
              description: `O usuário ${error.doc_attempted} não conseguiu logar: ${error.error_message}`,
              duration: 8000,
              icon: <ShieldAlert className="text-red-500" />,
              action: {
                label: 'Ver Auditoria',
                onClick: () => setActiveTab('access-audit')
              }
            });
          }
        });
      }, (error) => {
        console.warn("Login errors subscription quota exceeded:", error);
      });
      
      return () => unsubscribe();
    }
  }, [user?.role, setActiveTab]);

  useEffect(() => {
    // Sync user state with Firebase Auth
    const unsubscribe = api.onAuthChange(async (firebaseUser) => {
      if (!firebaseUser) {
        // If Firebase Auth says no user, but we have one in state, clear it
        // unless it's the emergency-token admin (which is local only)
        const saved = localStorage.getItem('pirua_user');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            if (parsed.token !== 'emergency-token') {
              setUser(null);
              localStorage.removeItem('pirua_user');
            }
          } catch (e) {
            setUser(null);
            localStorage.removeItem('pirua_user');
          }
        } else {
          setUser(null);
        }
      } else if (!user) {
        // If we have a Firebase user but no local app state, attempt recovery
        try {
          const userData = await api.getUserDoc(firebaseUser.uid);
          if (userData) {
            const token = await firebaseUser.getIdToken();
            const userWithToken = { ...userData, token };
            setUser(userWithToken);
            localStorage.setItem('pirua_user', JSON.stringify(userWithToken));
          }
        } catch (error) {
          console.error("Session recovery failed:", error);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const initAuth = async () => {
    try {
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
    } catch (e) {
      console.error("Error during initAuth", e);
      localStorage.removeItem('pirua_user');
    } finally {
      setIsAuthLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const handleLogin = (auth: any) => {
    if (!auth || !auth.user) {
      console.error("Login failed: missing auth data", auth);
      return;
    }
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
              professors={professors}
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
                    active: data.filter(a => a.status === 'Ativo').length,
                    suspended: data.filter(a => a.status === 'Suspenso').length
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
                    athletes={athletes}
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
                    athletes={athletes}
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
                  }} 
                  standalone
                  userRole={user.role}
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
        case 'attendance-history':
          return <StudentPresenceHistory athleteId={user.athlete_id || user.professor_id || ''} />;
        case 'suspended-athletes':
          return <SuspendedAthletes athletes={athletes} />;
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
                  athletes={athletes}
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
                  includeProfessors
                  athletes={athletes}
                  professors={professors}
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
          return (user.role === 'admin' || user.role === 'professor')
            ? <LineupManagement setActiveTab={setActiveTab} setSelectedEventIdForTravel={setSelectedEventIdForTravel} /> 
            : <StudentLineups athleteId={user.athlete_id || ''} athleteName={myAthleteData?.name || ''} />;
        case 'events':
          return <EventsManagement athletes={athletes} events={events} role={user?.role} loggedInUserId={user?.id} />;
        case 'birthdays':
          return <Birthdays athletes={athletes} professors={professors} />;
        case 'documents':
          return <Documents />;
        case 'sponsors':
          return <SponsorManager user={user} />;
        case 'modalities':
          return <ModalityList />;
        case 'contacts':
          return <ContactList athletes={athletes} />;
        case 'whatsapp':
          return <WhatsAppIntegration athletes={athletes} />;
        case 'activities':
          return <ActivityManagement role={user?.role} />;
        case 'trainings':
          return <TrainingManagement athletes={athletes} role={user?.role} />;
        case 'official-letters':
          return <OfficialLetterGenerator />;
        case 'uniforms':
        case 'uniform-request':
          return <UniformManagement user={user} athletes={athletes} />;
        case 'travel-list':
          return <TravelList athletes={athletes} professors={professors} role={user?.role} initialEventId={selectedEventIdForTravel} />;
        case 'announcements':
          return <AnnouncementFlyer />;
        case 'school-reports':
          return <SchoolReportManagement user={user} athletes={athletes} />;
        case 'access-audit':
          return <AccessAudit />;
        case 'settings':
          return <SettingsComponent />;
        default:
          return (
            <Dashboard 
              stats={stats} 
              athletes={athletes} 
              professors={professors}
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
      const isProfReg = params.get('professor_registration') === 'true';
      const queryTeamReg = params.get('register-team');
      const queryPortal = params.get('team-portal');
      
      const isTeamReg = !!queryTeamReg || window.location.pathname.startsWith('/register-team/');
      const isPortal = !!queryPortal || window.location.pathname.startsWith('/team-portal/');
      const isTravelReg = params.get('travel-registration') === 'true' || window.location.pathname.startsWith('/cadastro-acompanhante/');
      
      const teamId = queryTeamReg || queryPortal || 
                    (window.location.pathname.startsWith('/register-team/') ? window.location.pathname.split('/register-team/')[1] : 
                    window.location.pathname.startsWith('/team-portal/') ? window.location.pathname.split('/team-portal/')[1] : null);

      const tEventId = params.get('eventId') || (window.location.pathname.startsWith('/cadastro-acompanhante/') ? window.location.pathname.split('/cadastro-acompanhante/')[1] : null);
      
      console.log('URL Change detected. isRegistering:', isReg, 'isAnamnesisOnly:', isAna, 'isTeamRegistration:', isTeamReg, 'isTeamPortal:', isPortal, 'teamId:', teamId);
      setIsRegistering(isReg);
      setIsAnamnesisOnly(isAna);
      setIsProfessorRegistration(isProfReg);
      setIsTeamRegistration(isTeamReg);
      setIsTeamPortal(isPortal);
      setTeamChampionshipId(teamId);
      setIsTravelRegistration(isTravelReg);
      setCompanionEventId(tEventId);
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

  if (isProfessorRegistration) {
    return (
      <ErrorBoundary>
        <PublicProfessorRegistration />
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

  if (isTravelRegistration) {
    return (
      <ErrorBoundary>
        <CompanionRegistration eventId={companionEventId || undefined} />
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
        onProfessorRegisterClick={() => setIsProfessorRegistration(true)}
      />
    );
  }

  if (user?.role === 'student' && settings?.studentAccessPaused) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-center select-none font-sans">
          <div className="max-w-md w-full bg-zinc-950 border border-amber-500/30 rounded-3xl p-8 shadow-2xl shadow-amber-500/5 space-y-6 flex flex-col items-center">
            <div className="p-4 bg-amber-500/10 text-amber-500 rounded-full animate-pulse border border-amber-500/20">
              <Pause size={48} />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-black text-white uppercase tracking-tight">Portal Temporariamente Pausado</h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                {settings.studentAccessPauseMessage || "Olá! O acesso do portal para alunos foi temporariamente suspenso pela administração do clube para otimização do sistema e economia de leitura de dados. Retornaremos em breve!"}
              </p>
            </div>
            <div className="w-full pt-4 border-t border-zinc-900">
              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-2xl font-bold uppercase tracking-widest text-xs transition-all border border-zinc-800 cursor-pointer"
              >
                Sair do Portal
              </button>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <QuotaBanner />
      <Layout activeTab={activeTab} setActiveTab={setActiveTab} user={user} onLogout={handleLogout}>
        {renderContent()}
        {isAthleteFormOpen && (
          <AthleteForm 
            athlete={editingAthlete} 
            onClose={() => { setIsAthleteFormOpen(false); setEditingAthlete(null); }} 
            onSave={(updatedAthlete) => { 
              setIsAthleteFormOpen(false); 
              setEditingAthlete(null); 
              if (updatedAthlete) {
                setAthletes(prev => prev.map(a => a.id === updatedAthlete.id ? updatedAthlete : a));
                if (user?.role === 'student' && user.athlete_id === updatedAthlete.id) {
                  setMyAthleteData(updatedAthlete);
                }
              }
            }} 
          />
        )}
        <Toaster position="top-right" richColors />
      </Layout>
    </ErrorBoundary>
  );
}
