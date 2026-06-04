import React, { useState } from 'react';
import { api } from '../api';
import { User, AuthResponse } from '../types';
import { Trophy, User as UserIcon, Lock, UserPlus, ArrowRight, ShieldCheck, Shield, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { cn } from '../utils';

interface LoginProps {
  onLogin: (auth: AuthResponse) => void;
  onRegisterClick: () => void;
  onProfessorRegisterClick?: () => void;
}

export default function Login({ onLogin, onRegisterClick, onProfessorRegisterClick }: LoginProps) {
  const [loginType, setLoginType] = useState<'student' | 'admin'>('student');
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.loginWithGoogle();
      onLogin(res);
    } catch (err: any) {
      if (err.message?.includes('popup-closed-by-user')) {
        console.warn("Google login cancelled or popup closed by user:", err);
        setError('O login foi cancelado ou a janela foi fechada. Se o problema persistir, certifique-se de permitir pop-ups ou tente abrir o sistema em uma nova aba.');
      } else {
        console.error("Erro no login Google:", err);
        if (err.message?.includes('unauthorized-domain')) {
          setError('Este domínio não está autorizado no Firebase Console. Adicione este domínio em Authentication > Settings > Authorized domains.');
        } else if (err.message?.includes('operation-not-allowed')) {
          setError('O login com Google não está ativado no Firebase Console.');
        } else {
          setError(err.message || 'Erro ao entrar com Google. Verifique sua conta.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const ringColor = loginType === 'student' ? 'focus:ring-theme-primary/50 focus:border-theme-primary' : 'focus:ring-yellow-500/50 focus:border-yellow-500';
  const iconFocusColor = loginType === 'student' ? 'group-focus-within:text-theme-primary' : 'group-focus-within:text-theme-primary';

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className={cn(
          "absolute top-[-10%] left-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-all duration-700",
          loginType === 'student' ? 'bg-theme-primary/10' : 'bg-yellow-500/10'
        )} />
        <div className={cn(
          "absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] blur-[120px] rounded-full transition-all duration-700",
          loginType === 'student' ? 'bg-theme-primary/5' : 'bg-yellow-500/5'
        )} />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className={cn(
            "inline-flex items-center justify-center p-4 bg-black border rounded-3xl mb-6 shadow-2xl transition-all duration-500",
            loginType === 'student' 
              ? 'border-theme-primary/30 shadow-theme-primary/5' 
              : 'border-l-2 border-r-2 border-t border-b border-l-theme-primary border-r-theme-primary border-t-zinc-800 border-b-zinc-800 shadow-yellow-500/10'
          )}>
            {settings?.schoolCrest ? (
              <img src={settings.schoolCrest} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Trophy size={48} className={loginType === 'student' ? 'text-theme-primary' : 'text-theme-primary'} />
            )}
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter mb-2">Piruá E.C.</h1>
          <p className="text-zinc-500 font-bold uppercase text-xs tracking-[0.2em]">Sistema de Gestão Esportiva</p>
        </div>

        <div className={cn(
          "bg-black backdrop-blur-xl border p-8 rounded-[2.5rem] shadow-2xl transition-all duration-500",
          loginType === 'student' 
            ? 'border-theme-primary/20 shadow-theme-primary/5' 
            : 'border-l-2 border-r-2 border-t border-b border-l-theme-primary border-r-theme-primary border-t-zinc-800 border-b-zinc-800 shadow-[0_0_20px_rgba(234,179,8,0.07)]'
        )}>
          {/* Custom Tabs with Life and Color */}
          <div className="grid grid-cols-2 p-1 bg-zinc-900/60 rounded-2xl mb-8 border border-zinc-800/80">
            <button
              type="button"
              onClick={() => setLoginType('student')}
              className={cn(
                "py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                loginType === 'student' 
                  ? "bg-theme-primary text-black shadow-lg shadow-theme-primary/25 font-black scale-[1.02]" 
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Users size={16} />
              Portal Aluno
            </button>
            <button
              type="button"
              onClick={() => setLoginType('admin')}
              className={cn(
                "py-3 text-xs font-black uppercase tracking-wider rounded-xl transition-all duration-300 flex items-center justify-center gap-2",
                loginType === 'admin' 
                  ? "bg-zinc-950 border border-theme-primary text-theme-primary shadow-lg shadow-theme-primary/10 font-black scale-[1.02]" 
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Shield size={16} />
              Portal ADM / Prof
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                {loginType === 'student' ? 'Usuário (CPF do Aluno)' : 'Usuário (CPF Adm ou Professor)'}
              </label>
              <div className="relative group">
                <div className={cn(
                  "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 transition-colors",
                  iconFocusColor
                )}>
                  <UserIcon size={18} />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl text-white focus:outline-none focus:ring-2 transition-all",
                    ringColor
                  )}
                  placeholder="000.000.000-00"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-2 ml-1">
                {loginType === 'student' ? 'Senha (CPF do Aluno)' : 'Senha (CPF do Adm/Professor)'}
              </label>
              <div className="relative group">
                <div className={cn(
                  "absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 transition-colors",
                  iconFocusColor
                )}>
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={cn(
                    "w-full pl-12 pr-4 py-4 bg-zinc-800/50 border border-zinc-700 rounded-2xl text-white focus:outline-none focus:ring-2 transition-all",
                    ringColor
                  )}
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-500 text-xs font-bold text-center flex flex-col gap-2">
                <span>{error}</span>
                <a 
                  href="https://wa.me/5537991243101" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="mt-2 text-theme-primary hover:underline flex items-center justify-center gap-1"
                >
                  Suporte: (37) 99124-3101
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={cn(
                "w-full py-4 font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50",
                loginType === 'student' 
                  ? "bg-theme-primary text-black hover:opacity-90 shadow-theme-primary/20" 
                  : "bg-zinc-950 border-2 border-theme-primary hover:bg-theme-primary hover:text-black text-theme-primary shadow-theme-primary/10"
              )}
            >
              {loading ? 'Entrando...' : (
                <>
                  {loginType === 'student' ? 'Acessar Portal do Aluno' : 'Acessar Painel ADM / Professor'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-4 bg-white hover:bg-zinc-100 text-black font-black rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              <img src="https://www.google.com/favicon.ico" className="w-5 h-5" />
              Entrar com Google
            </button>

          </form>

          <div className="mt-8 pt-8 border-t border-zinc-800 flex flex-col gap-4">
            {loginType === 'student' ? (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 text-center font-bold">
                  É aluno novo do Piruá? Faça sua matrícula:
                </p>
                <button
                  onClick={() => {
                    window.history.pushState({}, '', '/?register=true');
                    onRegisterClick();
                  }}
                  className="w-full py-4 bg-zinc-805/40 border border-zinc-800 hover:border-theme-primary/30 bg-zinc-900/50 hover:bg-zinc-900 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                  <UserPlus size={20} className="text-theme-primary" />
                  Cadastre aqui (Matrícula Atleta)
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500 text-center font-bold">
                  Professor ou comissão técnica? Faça pré-cadastro:
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (onProfessorRegisterClick) {
                      window.history.pushState({}, '', '/?professor_registration=true');
                      onProfessorRegisterClick();
                    } else {
                      window.location.href = '/?professor_registration=true';
                    }
                  }}
                  className="w-full py-4 bg-zinc-805/40 border border-zinc-800 hover:border-theme-primary/30 bg-zinc-900/50 hover:bg-zinc-900 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 group"
                >
                  <UserPlus size={20} className="text-theme-primary" />
                  Pré-cadastro de Comissão Técnica
                </button>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2 text-zinc-650 mt-2">
              <div className="flex items-center gap-2 text-zinc-600">
                <ShieldCheck size={14} />
                <span className="text-[10px] font-bold uppercase tracking-widest">Acesso Seguro</span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  if (confirm("Isso irá limpar todos os dados salvos no navegador e recarregar a página. Continuar?")) {
                    api.clearPersistence();
                  }
                }}
                className="text-[10px] font-bold uppercase tracking-widest text-zinc-600 hover:text-theme-primary transition-colors underline decoration-dotted"
              >
                Limpar Sistema
              </button>
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
