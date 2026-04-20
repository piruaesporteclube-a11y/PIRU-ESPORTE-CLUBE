import React from 'react';
import { 
  LogOut,
  ArrowLeft,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../contexts/ThemeContext';
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

  return (
    <div className="min-h-screen bg-black text-white font-sans selection:bg-theme-primary selection:text-black flex flex-col">
      {/* Sleek Top Header */}
      <header className="bg-black/80 backdrop-blur-md border-b border-zinc-800 sticky top-0 z-50 px-4 sm:px-8 h-20 flex items-center justify-between safe-top">
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
                style={{ height: '51px', textAlign: 'center' }}
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-12 h-12 bg-theme-primary rounded-full flex items-center justify-center text-black font-bold text-xl group-hover:scale-110 transition-transform">P</div>
            )}
            <div className="hidden sm:block">
              <h1 className="font-black text-xl tracking-tighter uppercase leading-none">Piruá E.C.</h1>
              <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">{user?.role === 'admin' ? 'Gestão Administrativa' : 'Portal do Atleta'}</p>
            </div>
          </div>

          {activeTab !== 'dashboard' && (
            <button 
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-theme-primary rounded-xl transition-all border border-zinc-800 group"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-xs font-black uppercase tracking-widest hidden xs:block">Início</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-4 sm:gap-6">
          <div className="hidden lg:flex flex-col items-end mr-2">
            <p className="text-xs font-black text-zinc-500 uppercase tracking-widest leading-none">Conectado como</p>
            <p className="text-base font-black text-theme-primary uppercase tracking-tight">{user?.name}</p>
          </div>
          
          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 sm:px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl transition-all border border-red-500/20 group"
            title="Sair do sistema"
          >
            <LogOut size={22} className="group-hover:translate-x-1 transition-transform" />
            <span className="text-sm font-black uppercase tracking-widest hidden sm:block">Sair</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 bg-black p-4 sm:p-8 lg:p-12 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Global Theme Overrides */}
      <style>{`
        @media print {
          header, button, .no-print { display: none !important; }
          main { padding: 0 !important; margin: 0 !important; }
        }
        .safe-top { padding-top: env(safe-area-inset-top); }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
      `}</style>
    </div>
  );
}
