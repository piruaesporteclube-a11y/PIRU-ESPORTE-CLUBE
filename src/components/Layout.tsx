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
  UserCheck
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
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {settings?.schoolCrest ? (
            <img src={settings.schoolCrest} alt="Logo" className="w-8 h-8 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-8 h-8 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-sm">P</div>
          )}
          <h1 className="font-bold text-base tracking-tight">Piruá E.C.</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors text-zinc-400"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Sidebar Desktop / Mobile Drawer */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-[60] w-72 bg-black border-r border-zinc-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:w-64",
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full p-4 lg:p-6">
            <div className="flex items-center justify-between mb-8 px-2">
              <div className="flex items-center gap-3">
                {settings?.schoolCrest ? (
                  <img src={settings.schoolCrest} alt="Logo" className="w-10 h-10 lg:w-12 lg:h-12 object-contain" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 lg:w-12 lg:h-12 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-lg lg:text-xl">P</div>
                )}
                <div>
                  <h1 className="font-bold text-lg lg:text-xl tracking-tight">Piruá E.C.</h1>
                  <p className="text-[10px] lg:text-xs text-zinc-500">{user?.role === 'admin' ? 'Gestão de Base' : 'Portal do Aluno'}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMenuOpen(false)}
                className="lg:hidden p-2 hover:bg-zinc-800 rounded-lg text-zinc-500"
              >
                <X size={20} />
              </button>
            </div>

            <div className="mb-6 px-2 py-3 bg-zinc-900/30 rounded-2xl border border-theme-primary/20">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Usuário</p>
              <p className="text-sm font-bold truncate text-theme-primary">{user?.name}</p>
            </div>

            <nav className="flex-1 space-y-2">
              {filteredNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
                    activeTab === item.id 
                      ? "bg-theme-primary text-black font-bold shadow-lg shadow-theme-primary/30" 
                      : "text-zinc-400 hover:bg-theme-primary/10 hover:text-theme-primary"
                  )}
                >
                  <item.icon size={20} className={cn(
                    "transition-transform group-hover:scale-110",
                    activeTab === item.id ? "text-black" : "text-zinc-500"
                  )} />
                  {item.label}
                  {activeTab === item.id && <ChevronRight size={16} className="ml-auto" />}
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-4 border-t border-zinc-800">
              <button 
                onClick={onLogout}
                className="w-full flex items-center gap-3 px-4 py-3 text-zinc-500 hover:text-red-400 transition-colors rounded-xl hover:bg-red-400/10"
              >
                <LogOut size={20} />
                Sair
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-h-screen lg:h-screen lg:overflow-y-auto bg-black p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-6xl mx-auto pb-20 lg:pb-0"
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
            background: white !important;
            color: black !important;
          }
          .print-only, .list-print-only {
            display: block !important;
          }
          .card {
            box-shadow: none !important;
            border: 1px solid #eee !important;
          }
        }
      `}</style>
    </div>
  );
}
