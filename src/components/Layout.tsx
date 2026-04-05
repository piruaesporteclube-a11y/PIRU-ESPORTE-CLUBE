import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  ClipboardCheck, 
  Cake, 
  Trophy, 
  Settings as SettingsIcon, 
  FileText,
  Menu,
  X,
  ChevronRight,
  LogOut,
  UserCheck,
  ClipboardList,
  CreditCard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';

import { User } from '../types';

type NavItem = {
  id: string;
  label: string;
  icon: React.ElementType;
  roles: ("admin" | "student")[];
};

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: Trophy, roles: ['admin', 'student'] },
  { id: 'athletes', label: 'Atletas', icon: Users, roles: ['admin'] },
  { id: 'professors', label: 'Comissão Técnica', icon: UserCheck, roles: ['admin'] },
  { id: 'attendance', label: 'Chamada', icon: ClipboardCheck, roles: ['admin'] },
  { id: 'events', label: 'Eventos', icon: Calendar, roles: ['admin'] },
  { id: 'birthdays', label: 'Aniversariantes', icon: Cake, roles: ['admin'] },
  { id: 'documents', label: 'Documentos', icon: FileText, roles: ['admin'] },
  { id: 'anamnesis', label: 'Anamnese', icon: ClipboardList, roles: ['admin'] },
  { id: 'membership-card', label: 'Carteirinha', icon: CreditCard, roles: ['admin'] },
  { id: 'sponsors', label: 'Patrocinadores', icon: Trophy, roles: ['admin'] },
  { id: 'modalities', label: 'Modalidades', icon: ClipboardCheck, roles: ['admin'] },
  { id: 'settings', label: 'Configurações', icon: SettingsIcon, roles: ['admin'] },
  
  // Student items
  { id: 'my-data', label: 'Meus Dados', icon: UserPlus, roles: ['student'] },
  { id: 'my-anamnesis', label: 'Minha Saúde', icon: ClipboardCheck, roles: ['student'] },
  { id: 'my-card', label: 'Minha Carteirinha', icon: FileText, roles: ['student'] },
];

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  user: User | null;
  onLogout: () => void;
}

export default function Layout({ children, activeTab, setActiveTab, user, onLogout }: LayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { settings } = useTheme();

  const filteredNavItems = navItems.filter(item => user && item.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-theme-primary selection:text-black">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black/80 backdrop-blur-md sticky top-0 z-50 safe-top">
        <div className="flex items-center gap-3">
          {settings?.schoolCrest ? (
            <img src={settings.schoolCrest} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-sm">P</div>
          )}
          <h1 className="font-black text-lg tracking-tighter uppercase">Piruá E.C.</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400"
          aria-label="Abrir menu"
        >
          <Menu size={24} />
        </button>
      </header>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-black border-r border-zinc-800 sticky top-0 h-screen">
          <div className="flex flex-col h-full p-6">
            <div className="flex items-center gap-3 mb-10 px-2">
              {settings?.schoolCrest ? (
                <img src={settings.schoolCrest} alt="Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-xl">P</div>
              )}
              <div>
                <h1 className="font-black text-xl tracking-tighter uppercase">Piruá E.C.</h1>
                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{user?.role === 'admin' ? 'Gestão de Base' : 'Portal do Aluno'}</p>
              </div>
            </div>

            <div className="mb-8 px-4 py-4 bg-zinc-900/50 rounded-[1.5rem] border border-theme-primary/10 shadow-inner">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Usuário</p>
              <p className="text-sm font-black truncate text-theme-primary uppercase tracking-tight">{user?.name}</p>
            </div>

            <nav className="flex-1 space-y-1">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all duration-300 group relative overflow-hidden",
                    activeTab === item.id 
                      ? "bg-theme-primary text-black font-black shadow-lg shadow-theme-primary/20" 
                      : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
                  )}
                >
                  <item.icon size={20} className={cn(
                    "transition-transform duration-300 group-hover:scale-110 relative z-10",
                    activeTab === item.id ? "text-black" : "text-zinc-600 group-hover:text-theme-primary"
                  )} />
                  <span className="relative z-10 uppercase text-xs tracking-widest">{item.label}</span>
                  {activeTab === item.id && (
                    <motion.div 
                      layoutId="activeNav"
                      className="absolute inset-0 bg-theme-primary"
                      transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-zinc-900">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-4 text-zinc-500 hover:text-red-500 transition-all rounded-2xl hover:bg-red-500/5 group"
              >
                <LogOut size={20} className="group-hover:-translate-x-1 transition-transform" />
                <span className="uppercase text-xs font-bold tracking-widest">Sair do Sistema</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar (Drawer) */}
        <AnimatePresence>
          {isMenuOpen && (
            <>
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMenuOpen(false)}
                className="fixed inset-0 bg-black/90 backdrop-blur-md z-[70] lg:hidden"
              />
              <motion.aside 
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 z-[80] w-[85%] max-w-sm bg-black border-r border-zinc-800 lg:hidden flex flex-col"
              >
                <div className="flex flex-col h-full p-6 safe-top">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-3">
                      {settings?.schoolCrest ? (
                        <img src={settings.schoolCrest} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-10 h-10 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-lg">P</div>
                      )}
                      <h1 className="font-black text-lg tracking-tighter uppercase">Piruá E.C.</h1>
                    </div>
                    <button 
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 bg-zinc-900 hover:bg-zinc-800 rounded-xl text-zinc-400 transition-colors"
                      aria-label="Fechar menu"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <div className="mb-8 px-5 py-5 bg-zinc-900 rounded-[2rem] border border-theme-primary/10">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] mb-1">Usuário Conectado</p>
                    <p className="text-base font-black text-theme-primary uppercase tracking-tight">{user?.name}</p>
                    <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-1">{user?.role === 'admin' ? 'Gestão Administrativa' : 'Portal do Atleta'}</p>
                  </div>

                  <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
                    {filteredNavItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMenuOpen(false);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 px-5 py-4 rounded-[1.5rem] transition-all duration-300",
                          activeTab === item.id 
                            ? "bg-theme-primary text-black font-black shadow-xl shadow-theme-primary/20" 
                            : "text-zinc-500 hover:bg-zinc-900 hover:text-white"
                        )}
                      >
                        <item.icon size={22} className={cn(
                          activeTab === item.id ? "text-black" : "text-zinc-600"
                        )} />
                        <span className="uppercase text-sm font-bold tracking-widest">{item.label}</span>
                        {activeTab === item.id && <ChevronRight size={18} className="ml-auto" />}
                      </button>
                    ))}
                  </nav>

                  <div className="mt-auto pt-6 border-t border-zinc-900">
                    <button 
                      onClick={onLogout}
                      className="w-full flex items-center gap-4 px-5 py-5 text-zinc-500 hover:text-red-500 transition-all rounded-[1.5rem] hover:bg-red-500/5"
                    >
                      <LogOut size={22} />
                      <span className="uppercase text-sm font-bold tracking-widest">Sair da Conta</span>
                    </button>
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:h-screen lg:overflow-y-auto bg-black p-4 sm:p-6 lg:p-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="max-w-6xl mx-auto"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Overlay for mobile menu */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          aside, header, button, .no-print {
            display: none !important;
          }
          main {
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-only, .list-print-only {
            display: block !important;
          }
          .card {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
        }

        .safe-top {
          padding-top: env(safe-area-inset-top);
        }

        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
}
