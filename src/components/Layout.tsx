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
  { id: 'professors', label: 'Professores', icon: UserCheck, roles: ['admin'] },
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
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-theme-primary selection:text-black">
      {/* Mobile Header */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-black sticky top-0 z-50">
        <div className="flex items-center gap-3">
          {settings?.schoolCrest ? (
            <img src={settings.schoolCrest} alt="Logo" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-10 h-10 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold">P</div>
          )}
          <h1 className="font-bold text-lg tracking-tight">Piruá E.C.</h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {isMenuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <div className="flex">
        {/* Sidebar Desktop */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-40 w-64 bg-black border-r border-zinc-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto",
          isMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <div className="flex flex-col h-full p-4">
            <div className="hidden lg:flex items-center gap-3 mb-8 px-2">
              {settings?.schoolCrest ? (
                <img src={settings.schoolCrest} alt="Logo" className="w-12 h-12 object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-12 h-12 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-xl">P</div>
              )}
              <div>
                <h1 className="font-bold text-xl tracking-tight">Piruá E.C.</h1>
                <p className="text-xs text-zinc-500">{user?.role === 'admin' ? 'Gestão de Base' : 'Portal do Aluno'}</p>
              </div>
            </div>

            <div className="mb-6 px-2 py-3 bg-zinc-900/50 rounded-2xl border border-zinc-800">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Usuário</p>
              <p className="text-sm font-bold truncate text-theme-primary">{user?.name}</p>
            </div>

            <nav className="flex-1 space-y-1">
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
                      ? "bg-theme-primary text-black font-semibold shadow-lg shadow-theme-primary/20" 
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
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
        <main className="flex-1 min-h-screen lg:h-screen lg:overflow-y-auto bg-zinc-950 p-4 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
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
          .print-only {
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
