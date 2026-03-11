import React, { useState } from 'react';
import { api } from '../api';
import { User, AuthResponse } from '../types';
import { Trophy, User as UserIcon, Lock, UserPlus, ArrowRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { isSupabaseConfigured } from '../lib/supabase';

interface LoginProps {
  onLogin: (auth: AuthResponse) => void;
  onRegisterClick: () => void;
}

export default function Login({ onLogin, onRegisterClick }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { settings } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.login(username, password);
      onLogin(res);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar login. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      const res = await api.loginGuest();
      onLogin(res);
    } catch (err: any) {
      setError('Erro ao entrar como visitante.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-theme-primary/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-theme-primary/5 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center p-4 bg-zinc-900 border border-zinc-800 rounded-3xl mb-6 shadow-2xl">
            {settings?.schoolCrest ? (
              <img src={settings.schoolCrest} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Trophy size={48} className="text-theme-primary" />
            )}
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Piruá E.C.</h1>
          <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em]">Sistema de Gestão Esportiva</p>
        </div>

        <div className="bg-zinc-900/50 backdrop-blur-xl border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Usuário (CPF)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-theme-primary transition-colors">
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all"
                  placeholder="000.000.000-00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">Senha (CPF)</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-theme-primary transition-colors">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl text-white focus:outline-none focus:ring-2 focus:ring-theme-primary/50 focus:border-theme-primary transition-all"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center">
                {error}
              </div>
            )}

            {!isSupabaseConfigured && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-200/70 leading-relaxed">
                  <strong>Banco de dados não configurado.</strong> Por favor, adicione as chaves <strong>VITE_SUPABASE_URL</strong> e <strong>VITE_SUPABASE_ANON_KEY</strong> nas configurações do projeto.
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isSupabaseConfigured}
              className="w-full py-4 bg-theme-primary hover:opacity-90 text-black font-black rounded-2xl transition-all shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? 'Entrando...' : (
                <>
                  Acessar Sistema
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={loading}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 font-bold rounded-2xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 border border-zinc-700/50"
            >
              Entrar como Visitante (Demo)
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-zinc-800 flex flex-col gap-4">
            <div className="bg-zinc-800/30 p-4 rounded-2xl border border-zinc-700/50">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2">Acesso Administrativo Padrão:</p>
              <p className="text-[10px] text-zinc-400">CPF: <span className="text-theme-primary">05504043689</span></p>
              <p className="text-[10px] text-zinc-400">Senha: <span className="text-theme-primary">05504043689</span></p>
              <div className="mt-2 pt-2 border-t border-zinc-800/50">
                <p className="text-[10px] text-zinc-500 italic">Dica: Use <span className="text-theme-primary">demo / demo</span> para acesso de emergência offline.</p>
              </div>
            </div>

            <button
              onClick={onRegisterClick}
              disabled={!isSupabaseConfigured}
              className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <UserPlus size={20} className="text-theme-primary" />
              Cadastre aqui
            </button>
            
            <div className="flex items-center justify-center gap-2 text-zinc-600">
              <ShieldCheck size={14} />
              <span className="text-[10px] font-bold uppercase tracking-widest">Acesso Seguro</span>
            </div>
          </div>
        </div>

        <p className="mt-8 text-center text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
          &copy; 2026 Piruá Esporte Clube. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
}
