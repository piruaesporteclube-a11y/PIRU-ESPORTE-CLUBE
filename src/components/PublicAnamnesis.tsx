import React, { useState } from 'react';
import { api } from '../api';
import { Athlete, Anamnesis } from '../types';
import { CheckCircle2, ArrowRight, ClipboardCheck, Save, ClipboardList, AlertCircle, Search, User, X } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface PublicAnamnesisProps {
  onCancel: () => void;
  onComplete: () => void;
}

const YesNoField = ({ label, value, onChange, placeholder = "Especifique se necessário..." }: { label: string, value: string, onChange: (val: string) => void, placeholder?: string }) => {
  const safeValue = value || '';
  const isNo = safeValue === 'NÃO';
  const isYes = safeValue !== '' && safeValue !== 'NÃO';
  
  return (
    <div className="space-y-2">
      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">{label}</label>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange('SIM')}
          className={cn(
            "flex-1 py-2 rounded-xl text-[10px] font-black transition-all border tracking-widest",
            isYes ? "bg-theme-primary text-black border-theme-primary" : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600"
          )}
        >
          SIM
        </button>
        <button
          type="button"
          onClick={() => onChange('NÃO')}
          className={cn(
            "flex-1 py-2 rounded-xl text-[10px] font-black transition-all border tracking-widest",
            isNo ? "bg-red-500/20 text-red-500 border-red-500/50" : "bg-zinc-800 text-zinc-500 border-zinc-700 hover:border-zinc-600"
          )}
        >
          NÃO
        </button>
      </div>
      {isYes && (
        <input
          type="text"
          placeholder={placeholder}
          className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase animate-in fade-in slide-in-from-top-1"
          value={safeValue === 'SIM' ? '' : safeValue}
          onChange={e => onChange(e.target.value.toUpperCase() || 'SIM')}
        />
      )}
    </div>
  );
};

export default function PublicAnamnesis({ onCancel, onComplete }: PublicAnamnesisProps) {
  const [step, setStep] = useState<'search' | 'form' | 'success'>('search');
  const [loading, setLoading] = useState(false);
  const { settings } = useTheme();
  const [searchCpf, setSearchCpf] = useState('');
  const [athlete, setAthlete] = useState<Athlete | null>(null);
  
  const [anamnesisData, setAnamnesisData] = useState<Partial<Anamnesis>>({
    sleep_time: '',
    wake_up_difficulty: '',
    fractures: '',
    medical_treatment: '',
    controlled_medication: '',
    other_exercises: '',
    respiratory_problems: '',
    cardiac_problems: '',
    allergies: '',
    hypertension: '',
    hypotension: '',
    epilepsy: '',
    diabetes: '',
    food_restriction: '',
    medication_restriction: '',
    pathologies: '[]',
    pathologies_description: ''
  });

  const pathologiesList = [
    { id: 'TDAH', label: 'TDAH (Transtorno do Déficit de Atenção e Hiperatividade)' },
    { id: 'TEA', label: 'TEA (Autismo)' },
    { id: 'TOD', label: 'TOD (Transtorno Opositor e Desafiador)' },
    { id: 'DI', label: 'DI (Déficit Intelectual)' },
    { id: 'ANSIEDADE', label: 'Ansiedade' },
    { id: 'OUTROS', label: 'Outros' },
  ];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = searchCpf.replace(/\D/g, '');
    if (normalized.length < 11) {
      toast.error("CPF inválido");
      return;
    }

    setLoading(true);
    try {
      const athletes = await api.getAthletes();
      const found = athletes.find(a => a.doc.replace(/\D/g, '') === normalized);
      
      if (found) {
        setAthlete(found);
        // Load existing anamnesis if any
        const existing = await api.getAnamnesis(found.id);
        if (existing && existing.sleep_time) {
          setAnamnesisData(existing);
        } else {
          setAnamnesisData(prev => ({ ...prev, athlete_id: found.id }));
        }
        setStep('form');
      } else {
        toast.error("Atleta não encontrado. Verifique o CPF ou realize a matrícula primeiro.");
      }
    } catch (err) {
      toast.error("Erro ao buscar atleta.");
    } finally {
      setLoading(false);
    }
  };

  const handlePathologyToggle = (pathId: string) => {
    const current = JSON.parse(anamnesisData.pathologies || '[]');
    const next = current.includes(pathId) 
      ? current.filter((id: string) => id !== pathId)
      : [...current, pathId];
    setAnamnesisData({ ...anamnesisData, pathologies: JSON.stringify(next) });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!athlete) return;

    const requiredAnamnesisFields: (keyof Anamnesis)[] = [
      'sleep_time', 'wake_up_difficulty', 'fractures', 'medical_treatment',
      'controlled_medication', 'other_exercises', 'respiratory_problems',
      'cardiac_problems', 'allergies', 'hypertension', 'hypotension',
      'epilepsy', 'diabetes', 'food_restriction', 'medication_restriction'
    ];

    const missingAnamnesis = requiredAnamnesisFields.filter(f => !anamnesisData[f]);
    const pathologies = JSON.parse(anamnesisData.pathologies || '[]');
    const missingPathologyDesc = pathologies.includes('OUTROS') && !anamnesisData.pathologies_description;

    if (missingAnamnesis.length > 0 || missingPathologyDesc) {
      toast.error("Por favor, responda todas as perguntas e descreva as patologias se selecionou 'OUTROS'.");
      return;
    }

    setLoading(true);
    try {
      await api.saveAnamnesis({ ...anamnesisData, athlete_id: athlete.id });
      toast.success("Ficha de saúde atualizada!");
      setStep('success');
    } catch (err) {
      toast.error("Erro ao salvar ficha de saúde.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 'success') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-zinc-900 border border-theme-primary/20 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl"
        >
          <div className="flex justify-center">
            <div className="p-6 bg-green-500/10 text-green-500 rounded-full">
              <CheckCircle2 size={80} strokeWidth={3} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Ficha Enviada!</h2>
            <p className="text-zinc-400 uppercase">
              Obrigado, <span className="text-theme-primary font-bold">{athlete?.name}</span>. Suas informações de saúde foram atualizadas.
            </p>
          </div>
          <button 
            onClick={() => onComplete()}
            className="w-full py-5 bg-theme-primary text-black rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3"
          >
            Voltar ao Início
            <ArrowRight size={20} />
          </button>
        </motion.div>
      </div>
    );
  }

  if (step === 'search') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              {settings.schoolCrest ? (
                <img src={settings.schoolCrest} alt="Escudo" className="h-24 w-auto object-contain" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-20 h-20 bg-theme-primary rounded-full flex items-center justify-center text-black font-black text-3xl">P</div>
              )}
            </div>
            <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Ficha de Saúde</h1>
            <p className="text-zinc-400 uppercase text-sm">Identifique-se para preencher sua ficha de anamnese</p>
          </div>

          <form onSubmit={handleSearch} className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] space-y-6 shadow-2xl">
            <div>
              <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2 tracking-widest">Digite seu CPF</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                <input 
                  required 
                  type="text" 
                  placeholder="000.000.000-00"
                  className="w-full pl-12 pr-4 py-4 bg-zinc-800 border border-zinc-700 rounded-2xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none text-lg font-mono"
                  value={searchCpf}
                  onChange={e => setSearchCpf(e.target.value)}
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-theme-primary text-black rounded-2xl font-black uppercase tracking-tighter flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {loading ? 'Buscando...' : (
                <>
                  Continuar
                  <ArrowRight size={20} />
                </>
              )}
            </button>
            <button 
              type="button"
              onClick={onCancel}
              className="w-full py-3 text-zinc-500 font-bold uppercase text-xs tracking-widest hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between bg-zinc-900/50 p-6 rounded-3xl border border-zinc-800">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-zinc-800 rounded-2xl overflow-hidden border border-zinc-700">
              {athlete?.photo ? (
                <img src={athlete.photo} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-zinc-600"><User size={32} /></div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">{athlete?.name}</h2>
              <p className="text-xs text-zinc-500 uppercase tracking-widest">CPF: {athlete?.doc}</p>
            </div>
          </div>
          <button onClick={() => setStep('search')} className="p-2 text-zinc-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
          <div className="p-6 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
            <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
              <ClipboardCheck size={20} />
            </div>
            <h2 className="text-xl font-bold text-white uppercase tracking-widest">Ficha de Saúde (Anamnese)</h2>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em] flex items-center gap-2">
                  <ClipboardList size={16} />
                  Hábitos e Rotina
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Qual horário o atleta dorme?</label>
                    <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={anamnesisData.sleep_time || ''} onChange={e => setAnamnesisData({...anamnesisData, sleep_time: e.target.value.toUpperCase()})} />
                  </div>
                  <YesNoField 
                    label="Tem dificuldade de acordar cedo?"
                    value={anamnesisData.wake_up_difficulty || ''}
                    onChange={val => setAnamnesisData({...anamnesisData, wake_up_difficulty: val})}
                  />
                  <YesNoField 
                    label="Pratica outro exercício físico?"
                    value={anamnesisData.other_exercises || ''}
                    onChange={val => setAnamnesisData({...anamnesisData, other_exercises: val})}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em] flex items-center gap-2">
                  <AlertCircle size={16} />
                  Histórico Médico
                </h3>
                <div className="space-y-4">
                  <YesNoField 
                    label="Já fraturou algum membro?"
                    value={anamnesisData.fractures || ''}
                    onChange={val => setAnamnesisData({...anamnesisData, fractures: val})}
                  />
                  <YesNoField 
                    label="Faz algum tratamento médico?"
                    value={anamnesisData.medical_treatment || ''}
                    onChange={val => setAnamnesisData({...anamnesisData, medical_treatment: val})}
                  />
                  <YesNoField 
                    label="Faz uso de medicação controlada?"
                    value={anamnesisData.controlled_medication || ''}
                    onChange={val => setAnamnesisData({...anamnesisData, controlled_medication: val})}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-zinc-800">
              <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Condições de Saúde</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Problemas Respiratórios', key: 'respiratory_problems' },
                  { label: 'Problemas Cardíacos', key: 'cardiac_problems' },
                  { label: 'Alergias', key: 'allergies' },
                  { label: 'Hipertensão', key: 'hypertension' },
                  { label: 'Hipotensão', key: 'hypotension' },
                  { label: 'Epilepsia', key: 'epilepsy' },
                  { label: 'Diabetes', key: 'diabetes' },
                  { label: 'Restrição Alimentar', key: 'food_restriction' },
                  { label: 'Restrição Medicamentos', key: 'medication_restriction' },
                ].map((item) => (
                  <YesNoField 
                    key={item.key}
                    label={item.label}
                    value={(anamnesisData as any)[item.key] || ''}
                    onChange={val => setAnamnesisData({...anamnesisData, [item.key]: val})}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-zinc-800">
              <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Patologias (Doenças)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {pathologiesList.map((path) => {
                  const isActive = JSON.parse(anamnesisData.pathologies || '[]').includes(path.id);
                  return (
                    <button key={path.id} type="button" onClick={() => handlePathologyToggle(path.id)} className={cn("flex items-center gap-3 p-4 rounded-2xl border transition-all text-left", isActive ? "bg-theme-primary/10 border-theme-primary text-theme-primary" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600")}>
                      <div className={cn("w-5 h-5 rounded flex items-center justify-center border", isActive ? "bg-theme-primary border-theme-primary" : "border-zinc-600")}>
                        {isActive && <Save size={12} className="text-black" />}
                      </div>
                      <span className="text-xs font-bold uppercase">{path.label}</span>
                    </button>
                  );
                })}
              </div>
              {JSON.parse(anamnesisData.pathologies || '[]').includes('OUTROS') && (
                <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Descreva outras patologias</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase min-h-[100px]"
                    value={anamnesisData.pathologies_description || ''}
                    onChange={e => setAnamnesisData({...anamnesisData, pathologies_description: e.target.value.toUpperCase()})}
                    placeholder="DESCREVA AQUI..."
                  />
                </div>
              )}
            </div>

            <div className="flex justify-center pt-8">
              <button 
                type="submit"
                disabled={loading}
                className="w-full max-w-md py-5 bg-theme-primary text-black rounded-[2rem] font-black uppercase tracking-tighter flex items-center justify-center gap-3 disabled:opacity-50 shadow-2xl shadow-theme-primary/20"
              >
                {loading ? 'Salvando...' : (
                  <>
                    <Save size={24} />
                    Salvar Ficha de Saúde
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
