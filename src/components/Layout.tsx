import React, { useState } from 'react';
import { 
  LogOut,
  ArrowLeft,
  Instagram,
  Menu,
  X,
  Crown,
  Flame,
  Zap,
  Sparkles,
  ChevronRight,
  MessageCircle,
  LayoutGrid
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { navItems } from '../navigation';
import { cn } from '../utils';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout }: LayoutProps) {
  const { settings } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mode = settings?.systemLayoutMode || 'gold_classic';

  // Filter items accessible by current user role
  const accessibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  // Primary dock items
  const primaryDockItems = accessibleNavItems.filter(item => 
    ['dashboard', 'athletes', 'attendance', 'lineups', 'trainings', 'championships', 'system-layouts', 'settings'].includes(item.id)
  );

  // Nav categories definition for grouped sidebar
  const categoryGroups = [
    { id: 'command', label: 'Painel de Comando', color: 'text-amber-400', badgeBg: 'bg-amber-400/20' },
    { id: 'arena', label: 'Arena & Competição', color: 'text-emerald-400', badgeBg: 'bg-emerald-400/20' },
    { id: 'training', label: 'Centro de Treinamento', color: 'text-sky-400', badgeBg: 'bg-sky-400/20' },
    { id: 'office', label: 'Gabinete & Saúde', color: 'text-rose-400', badgeBg: 'bg-rose-400/20' },
    { id: 'community', label: 'Social & Relacionamento', color: 'text-purple-400', badgeBg: 'bg-purple-400/20' },
    { id: 'student', label: 'Área do Aluno', color: 'text-amber-400', badgeBg: 'bg-amber-400/20' },
  ];

  return (
    <div className={cn(
      "min-h-screen text-white font-sans selection:bg-theme-primary selection:text-black transition-colors duration-500",
      mode === 'cyber_neon' ? "bg-slate-950" : 
      mode === 'crimson_fire' ? "bg-[#0f0404]" : 
      mode === 'royal_purple' ? "bg-[#09030f]" : "bg-black"
    )}>

      {/* ========================================================================= */}
      {/* LAYOUT 2: TACTICAL CYAN - COLUNA DO LADO ESQUERDO (LEFT SIDEBAR)           */}
      {/* ========================================================================= */}
      {mode === 'tactical_cyan' ? (
        <div className="flex min-h-screen relative">
          {/* Desktop Left Sidebar Column */}
          <aside className="hidden lg:flex flex-col w-72 bg-zinc-950 border-r border-sky-900/40 p-4 sticky top-0 h-screen z-50 justify-between shrink-0 shadow-2xl overflow-y-auto">
            <div className="space-y-5">
              {/* Brand Banner */}
              <div 
                onClick={() => setActiveTab('dashboard')} 
                className="flex items-center gap-3 p-3 bg-zinc-900/90 rounded-2xl border border-sky-500/30 cursor-pointer group hover:border-sky-400 transition-all"
              >
                {settings?.schoolCrest && settings.schoolCrest.trim() !== "" ? (
                  <img src={settings.schoolCrest} alt="Logo" className="w-10 h-10 object-contain shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 bg-sky-400 rounded-xl flex items-center justify-center text-black font-black text-lg shrink-0">P</div>
                )}
                <div className="min-w-0">
                  <h1 className="font-black text-base tracking-tight uppercase text-white truncate">Piruá E.C.</h1>
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-sky-400">
                    <Zap size={10} /> Painel Lateral Tático
                  </span>
                </div>
              </div>

              {/* Column Navigation Buttons Grouped by Category */}
              <div className="space-y-4">
                {categoryGroups.map(cat => {
                  const catItems = accessibleNavItems.filter(item => item.category === cat.id);
                  if (catItems.length === 0) return null;

                  return (
                    <div key={cat.id} className="space-y-1">
                      <div className="flex items-center justify-between px-2.5 py-1 border-b border-zinc-900 mb-1">
                        <span className={cn("text-[10px] font-black uppercase tracking-wider", cat.color)}>
                          {cat.label}
                        </span>
                        <span className="text-[9px] font-black text-zinc-500 bg-zinc-900/90 px-1.5 py-0.5 rounded">
                          {catItems.length}
                        </span>
                      </div>
                      {catItems.map(item => {
                        const Icon = item.icon;
                        const isSelected = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setActiveTab(item.id)}
                            className={cn(
                              "w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer group text-left",
                              isSelected 
                                ? "bg-sky-500 text-black shadow-lg shadow-sky-500/25 font-black" 
                                : "text-zinc-400 hover:text-white hover:bg-zinc-900/90"
                            )}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Icon size={16} className={cn("shrink-0", isSelected ? "text-black" : "text-sky-400")} />
                              <span className="truncate">{item.label}</span>
                            </div>
                            {isSelected && <ChevronRight size={14} className="text-black shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sidebar User Info & Logout */}
            <div className="pt-4 border-t border-zinc-900 mt-4 space-y-2">
              <div className="flex items-center justify-between px-2">
                <div className="min-w-0">
                  <p className="text-[9px] font-black uppercase text-zinc-500">Operador Tático</p>
                  <p className="text-xs font-black text-sky-400 truncate">{user?.name}</p>
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 cursor-pointer"
                  title="Sair do sistema"
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </aside>

          {/* Right Main Area */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Topbar */}
            <header className="lg:hidden bg-zinc-950/90 backdrop-blur-md border-b border-sky-900/30 px-4 h-16 flex items-center justify-between sticky top-0 z-40">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
                {settings?.schoolCrest && <img src={settings.schoolCrest} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />}
                <span className="font-black text-sm uppercase text-white">Piruá Tático</span>
              </div>
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 bg-zinc-900 border border-zinc-800 text-sky-400 rounded-xl"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </header>

            {/* Mobile Slide Drawer */}
            {mobileMenuOpen && (
              <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-end">
                <div className="w-4/5 max-w-sm bg-zinc-950 border-l border-sky-900/40 p-6 flex flex-col justify-between h-full overflow-y-auto">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b border-zinc-900 pb-4">
                      <span className="font-black uppercase text-sky-400 text-sm">Menu Tático</span>
                      <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-400"><X size={20} /></button>
                    </div>
                    <div className="space-y-4">
                      {categoryGroups.map(cat => {
                        const catItems = accessibleNavItems.filter(item => item.category === cat.id);
                        if (catItems.length === 0) return null;

                        return (
                          <div key={cat.id} className="space-y-1">
                            <div className="flex items-center justify-between px-2 py-1 border-b border-zinc-900 mb-1">
                              <span className={cn("text-[10px] font-black uppercase tracking-wider", cat.color)}>
                                {cat.label}
                              </span>
                              <span className="text-[9px] font-black text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                                {catItems.length}
                              </span>
                            </div>
                            {catItems.map(item => {
                              const Icon = item.icon;
                              const isSelected = activeTab === item.id;
                              return (
                                <button
                                  key={item.id}
                                  onClick={() => { setActiveTab(item.id); setMobileMenuOpen(false); }}
                                  className={cn(
                                    "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-black uppercase text-left transition-all",
                                    isSelected ? "bg-sky-500 text-black" : "text-zinc-300 hover:bg-zinc-900"
                                  )}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <Icon size={16} className={isSelected ? "text-black" : "text-sky-400"} />
                                    <span className="truncate">{item.label}</span>
                                  </div>
                                  {isSelected && <ChevronRight size={14} className="text-black shrink-0" />}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <button onClick={onLogout} className="w-full py-3 bg-red-500/20 text-red-500 rounded-xl font-bold uppercase text-xs">
                    Sair do Sistema
                  </button>
                </div>
              </div>
            )}

            {/* Right Column Content */}
            <main className="flex-1 p-4 sm:p-8 lg:p-10 w-full max-w-7xl mx-auto">
              {children}
            </main>
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* OTHER LAYOUT MODES (Gold Classic, Cyber Neon, Crimson Fire, Royal Purple)   */
        /* ========================================================================= */
        <div className="min-h-screen flex flex-col">
          {/* LAYOUT 1: GOLD CLASSIC */}
          {mode === 'gold_classic' && (
            <header className="bg-black/90 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50 px-4 sm:px-8 h-20 flex items-center justify-between safe-top shadow-xl">
              <div className="flex items-center gap-4 sm:gap-6">
                <div 
                  onClick={() => setActiveTab('dashboard')} 
                  className="flex items-center gap-4 cursor-pointer group"
                >
                  {settings?.schoolCrest && settings.schoolCrest.trim() !== "" ? (
                    <img 
                      src={settings.schoolCrest} 
                      alt="Logo" 
                      className="object-contain group-hover:scale-110 transition-transform" 
                      style={{ height: '51px' }}
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <div className="w-12 h-12 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-xl group-hover:scale-110 transition-transform">P</div>
                  )}
                  <div className="hidden sm:block">
                    <h1 className="font-black text-xl tracking-tighter uppercase leading-none text-white">Piruá E.C.</h1>
                    <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                      {user?.role === 'admin' ? 'Gestão Administrativa' : user?.role === 'professor' ? 'Portal da Comissão' : 'Portal do Atleta'}
                    </p>
                  </div>
                </div>

                {activeTab !== 'dashboard' && (
                  <button 
                    onClick={() => setActiveTab('dashboard')}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-theme-primary rounded-xl transition-all border border-zinc-800 group cursor-pointer"
                  >
                    <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest hidden xs:block">Início</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-4 sm:gap-6">
                {settings.instagram && (
                  <a 
                    href={settings.instagram?.startsWith('http') ? settings.instagram : `https://instagram.com/${settings.instagram?.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hidden md:flex items-center gap-2 p-3 bg-pink-500/10 text-pink-500 hover:bg-pink-500 hover:text-white rounded-xl transition-all border border-pink-500/20 group"
                    title="Seguir no Instagram"
                  >
                    <Instagram size={22} className="group-hover:scale-110 transition-transform" />
                  </a>
                )}

                <div className="hidden lg:flex flex-col items-end mr-2">
                  <p className="text-xs font-black text-zinc-500 uppercase tracking-widest leading-none">Conectado como</p>
                  <p className="text-base font-black text-theme-primary uppercase tracking-tight">{user?.name}</p>
                </div>
                
                <button 
                  onClick={onLogout}
                  className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 group cursor-pointer"
                  title="Sair do sistema"
                >
                  <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
                  <span className="text-sm font-black uppercase tracking-widest hidden sm:block">Sair</span>
                </button>
              </div>
            </header>
          )}

          {/* LAYOUT 3: CYBER NEON */}
          {mode === 'cyber_neon' && (
            <>
              <header className="sticky top-3 z-50 px-4 sm:px-8 max-w-7xl mx-auto w-full">
                <div className="bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-3xl p-3 px-6 flex items-center justify-between shadow-[0_0_25px_rgba(16,185,129,0.15)]">
                  <div 
                    onClick={() => setActiveTab('dashboard')} 
                    className="flex items-center gap-3 cursor-pointer group"
                  >
                    {settings?.schoolCrest && (
                      <img src={settings.schoolCrest} alt="Logo" className="w-9 h-9 object-contain group-hover:scale-110 transition-transform" referrerPolicy="no-referrer" />
                    )}
                    <div>
                      <h1 className="font-black text-base uppercase text-white tracking-tight flex items-center gap-1.5">
                        Piruá Futuro <Sparkles size={14} className="text-emerald-400" />
                      </h1>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" /> Dock Flutuante
                    </span>
                    
                    <button 
                      onClick={onLogout} 
                      className="p-2.5 bg-red-500/10 text-red-400 rounded-2xl hover:bg-red-500/20 transition-all border border-red-500/20 cursor-pointer"
                      title="Sair"
                    >
                      <LogOut size={18} />
                    </button>
                  </div>
                </div>
              </header>

              {/* Floating Bottom Dock */}
              <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-xl w-[92%] sm:w-auto">
                <div className="bg-slate-900/90 backdrop-blur-2xl border border-emerald-500/40 rounded-full p-2 px-4 shadow-[0_0_35px_rgba(16,185,129,0.25)] flex items-center justify-center gap-2 overflow-x-auto no-scrollbar">
                  {primaryDockItems.map(item => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "p-3 rounded-full transition-all flex items-center gap-2 cursor-pointer shrink-0 relative group",
                          isSelected 
                            ? "bg-emerald-400 text-black shadow-[0_0_15px_rgba(16,185,129,0.5)] scale-110 font-black" 
                            : "text-slate-400 hover:text-white hover:bg-slate-800/80"
                        )}
                        title={item.label}
                      >
                        <Icon size={18} />
                        {isSelected && (
                          <span className="text-[10px] font-black uppercase tracking-wider pr-1 hidden sm:inline">
                            {item.label}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* LAYOUT 4: CRIMSON FIRE */}
          {mode === 'crimson_fire' && (
            <header className="bg-[#180808] border-b border-red-900/50 sticky top-0 z-50 shadow-2xl">
              {/* Marquee Ticker */}
              <div className="bg-gradient-to-r from-red-600 via-rose-600 to-red-700 text-black py-1 px-4 text-[10px] font-black uppercase tracking-widest flex items-center justify-between overflow-hidden">
                <div className="flex items-center gap-2 animate-pulse font-black">
                  <Flame size={12} /> PIRUÁ E.C. • PAINEL COMPETITIVO • GARRA & DESEMPENHO
                </div>
                <span className="hidden md:inline font-bold">TEMPORADA OFICIAL</span>
              </div>

              <div className="px-4 sm:px-8 py-3 flex items-center justify-between max-w-7xl mx-auto">
                <div onClick={() => setActiveTab('dashboard')} className="flex items-center gap-3 cursor-pointer">
                  {settings?.schoolCrest && <img src={settings.schoolCrest} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />}
                  <div>
                    <h1 className="font-black text-xl uppercase tracking-tighter text-white leading-none">PIRUÁ CARMIM</h1>
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-0.5">Arena de Competição</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <p className="text-[10px] font-black text-zinc-500 uppercase">Operador</p>
                    <p className="text-sm font-black text-red-500 uppercase">{user?.name}</p>
                  </div>
                  <button onClick={onLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black uppercase text-xs rounded-xl transition-all shadow-lg cursor-pointer">
                    Sair
                  </button>
                </div>
              </div>

              {/* Category Pills Header Bar */}
              <div className="border-t border-red-900/40 bg-black/60 px-4 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-1 max-w-7xl mx-auto py-2">
                  {accessibleNavItems.slice(0, 10).map(item => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "px-3.5 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer",
                          isSelected 
                            ? "bg-red-600 text-white shadow-md shadow-red-600/30" 
                            : "text-zinc-400 hover:text-white hover:bg-red-950/40"
                        )}
                      >
                        <Icon size={14} className={isSelected ? "text-white" : "text-red-500"} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>
          )}

          {/* LAYOUT 5: ROYAL PURPLE */}
          {mode === 'royal_purple' && (
            <header className="bg-[#0e0417] border-b border-purple-900/50 sticky top-0 z-50 shadow-2xl">
              <div className="px-4 sm:px-8 h-20 flex items-center justify-between max-w-7xl mx-auto">
                <div onClick={() => setActiveTab('dashboard')} className="flex items-center gap-4 cursor-pointer">
                  {settings?.schoolCrest ? (
                    <div className="p-1 rounded-full bg-gradient-to-tr from-purple-500 to-amber-400 shadow-lg">
                      <img src={settings.schoolCrest} alt="Logo" className="w-10 h-10 object-contain rounded-full bg-black p-1" referrerPolicy="no-referrer" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 bg-purple-600 rounded-full flex items-center justify-center text-white font-black text-xl shadow-lg">P</div>
                  )}
                  <div>
                    <h1 className="font-black text-xl uppercase tracking-tighter text-white flex items-center gap-2">
                      Piruá Imperial <Crown size={18} className="text-amber-400" />
                    </h1>
                    <p className="text-[10px] font-black text-purple-400 uppercase tracking-widest">Portal de Prestígio</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-3 px-4 py-2 rounded-2xl bg-purple-950/60 border border-purple-800/60">
                    <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                    <span className="text-xs font-black text-purple-300 uppercase">{user?.name}</span>
                  </div>
                  <button 
                    onClick={onLogout}
                    className="px-4 py-2.5 bg-purple-900/40 hover:bg-purple-800/60 text-purple-300 rounded-2xl border border-purple-700/50 text-xs font-black uppercase tracking-wider cursor-pointer transition-all"
                  >
                    Sair
                  </button>
                </div>
              </div>

              {/* Scrollable Pill Navigation Bar */}
              <div className="bg-black/40 border-t border-purple-950 px-4 py-2 overflow-x-auto no-scrollbar">
                <div className="flex items-center gap-2 max-w-7xl mx-auto">
                  {accessibleNavItems.map(item => {
                    const Icon = item.icon;
                    const isSelected = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
                        className={cn(
                          "px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-2 cursor-pointer shrink-0",
                          isSelected 
                            ? "bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-lg shadow-purple-600/30" 
                            : "bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 border border-purple-900/30"
                        )}
                      >
                        <Icon size={14} className={isSelected ? "text-white" : "text-amber-400"} />
                        {item.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </header>
          )}

          {/* MAIN CONTENT AREA */}
          <main className={cn(
            "flex-1 overflow-x-clip transition-all duration-300 w-full max-w-7xl mx-auto",
            mode === 'cyber_neon' ? "p-4 sm:p-8 pb-28" : "p-4 sm:p-8 lg:p-12"
          )}>
            {children}
          </main>
        </div>
      )}

      {/* Global CSS for Print and Scrollbars */}
      <style>{`
        @media print {
          header, aside, button, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
        .safe-top { padding-top: env(safe-area-inset-top); }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}
