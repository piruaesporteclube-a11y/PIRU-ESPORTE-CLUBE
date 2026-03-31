import React, { useState } from 'react';
import AthleteForm from './AthleteForm';
import AnamnesisForm from './AnamnesisForm';
import { Athlete } from '../types';
import { CheckCircle2, ArrowRight, ClipboardCheck, UserPlus } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

interface PublicRegistrationProps {
  onCancel: () => void;
  onComplete: () => void;
}

export default function PublicRegistration({ onCancel, onComplete }: PublicRegistrationProps) {
  const [step, setStep] = useState<'basic' | 'anamnesis' | 'success'>('basic');
  const [newAthlete, setNewAthlete] = useState<Athlete | null>(null);
  const { settings } = useTheme();

  const handleRegisterSuccess = (athlete: Athlete) => {
    setNewAthlete(athlete);
    setStep('anamnesis');
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-zinc-900 border border-theme-primary/20 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl">
          <div className="flex justify-center">
            <div className="p-4 bg-green-500/10 text-green-500 rounded-full animate-bounce">
              <CheckCircle2 size={64} />
            </div>
          </div>
          <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Cadastro Concluído!</h2>
          <p className="text-zinc-400">
            Seja bem-vindo ao Piruá E.C., <span className="text-theme-primary font-bold">{newAthlete?.name}</span>! 
            Seu cadastro e ficha de saúde foram salvos com sucesso.
          </p>
          <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700 text-left">
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-2">Dados de Acesso</p>
            <p className="text-xs text-zinc-300">Usuário: <span className="text-white font-mono">{newAthlete?.doc}</span></p>
            <p className="text-xs text-zinc-300">Senha: <span className="text-white font-mono">{newAthlete?.doc}</span></p>
            <p className="text-[10px] text-zinc-500 mt-2 italic">* Use seu CPF (apenas números) para entrar.</p>
          </div>
          <button 
            onClick={onComplete}
            className="w-full py-4 bg-theme-primary hover:opacity-90 text-black rounded-2xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-2"
          >
            Ir para o Login
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            {settings.schoolCrest ? (
              <img src={settings.schoolCrest} alt="Escudo" className="h-24 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 bg-theme-primary rounded-full flex items-center justify-center text-black font-black text-3xl">P</div>
            )}
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Portal de Matrícula</h1>
          <p className="text-zinc-400">Preencha os dados abaixo para se tornar um atleta do Piruá Esporte Clube</p>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <div className={`flex items-center gap-2 ${step === 'basic' ? 'text-theme-primary' : 'text-zinc-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${step === 'basic' ? 'border-theme-primary bg-theme-primary/10' : 'border-zinc-700'}`}>1</div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Dados Pessoais</span>
            </div>
            <div className="w-12 h-[2px] bg-zinc-800" />
            <div className={`flex items-center gap-2 ${step === 'anamnesis' ? 'text-theme-primary' : 'text-zinc-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold border-2 ${step === 'anamnesis' ? 'border-theme-primary bg-theme-primary/10' : 'border-zinc-700'}`}>2</div>
              <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:block">Ficha de Saúde</span>
            </div>
          </div>
        </div>

        {step === 'basic' ? (
          <div className="relative">
            <AthleteForm 
              isRegistration={true}
              onClose={onCancel}
              onSave={() => {}} // Not used in registration mode
              onRegisterSuccess={(athlete) => handleRegisterSuccess(athlete as Athlete)}
            />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-zinc-900/50 border border-theme-primary/20 p-6 rounded-3xl flex items-center gap-4">
              <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
                <ClipboardCheck size={24} />
              </div>
              <div>
                <h3 className="text-white font-bold uppercase tracking-widest">Quase lá, {newAthlete?.name}!</h3>
                <p className="text-xs text-zinc-400">Agora, preencha sua ficha de anamnese para completar o cadastro.</p>
              </div>
            </div>
            <AnamnesisForm 
              athlete={newAthlete!} 
              onSave={() => setStep('success')} 
            />
          </div>
        )}
      </div>
    </div>
  );
}
