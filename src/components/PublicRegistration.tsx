import React, { useState } from 'react';
import { api } from '../api';
import { Athlete, Anamnesis } from '../types';
import { CheckCircle2, ArrowRight, ClipboardCheck, UserPlus, Save, UserCircle, Upload, ClipboardList, AlertCircle, MessageCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../utils';

interface PublicRegistrationProps {
  onCancel: () => void;
  onComplete: () => void;
}

export default function PublicRegistration({ onCancel, onComplete }: PublicRegistrationProps) {
  const [step, setStep] = useState<'form' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const { settings } = useTheme();
  
  const [athleteData, setAthleteData] = useState<Partial<Athlete>>({
    name: '',
    birth_date: '',
    doc: '',
    street: '',
    number: '',
    neighborhood: '',
    city: '',
    uf: '',
    jersey_number: '',
    photo: '',
    contact: '',
    guardian_name: '',
    guardian_doc: '',
    guardian_phone: '',
    status: 'Ativo'
  });

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
    pathologies: '[]'
  });

  const [newAthlete, setNewAthlete] = useState<Athlete | null>(null);

  const pathologiesList = [
    { id: 'TDAH', label: 'TDAH (Transtorno do Déficit de Atenção e Hiperatividade)' },
    { id: 'TEA', label: 'TEA (Autismo)' },
    { id: 'TOD', label: 'TOD (Transtorno Opositor e Desafiador)' },
    { id: 'DI', label: 'DI (Déficit Intelectual)' },
    { id: 'ANSIEDADE', label: 'Ansiedade' },
  ];

  const handlePathologyToggle = (pathId: string) => {
    const current = JSON.parse(anamnesisData.pathologies || '[]');
    const next = current.includes(pathId) 
      ? current.filter((id: string) => id !== pathId)
      : [...current, pathId];
    setAnamnesisData({ ...anamnesisData, pathologies: JSON.stringify(next) });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'photo' | 'doc_photo') => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Increased to 1MB for documents
        toast.error("O arquivo é muito grande. Por favor, escolha um arquivo com menos de 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAthleteData(prev => ({ ...prev, [field]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 1. Register Athlete
      const athlete = await api.register(athleteData);
      setNewAthlete(athlete);

      // 2. Save Anamnesis
      await api.saveAnamnesis({
        ...anamnesisData,
        athlete_id: athlete.id
      });

      toast.success("Matrícula realizada com sucesso!");
      setStep('success');
    } catch (err: any) {
      toast.error(`Erro ao realizar matrícula: ${err.message}`);
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
          className="max-w-md w-full bg-zinc-900 border border-theme-primary/20 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl relative overflow-hidden"
        >
          {/* Background Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-green-500/10 blur-[100px] -z-10 rounded-full"></div>

          <div className="flex justify-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ 
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1
              }}
              className="relative"
            >
              <div className="p-6 bg-green-500/10 text-green-500 rounded-full">
                <CheckCircle2 size={80} strokeWidth={3} />
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1.5 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="absolute inset-0 bg-green-500/20 rounded-full -z-10"
              ></motion.div>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-2"
          >
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Matrícula Realizada!</h2>
            <p className="text-zinc-400">
              Seja bem-vindo ao Piruá E.C., <span className="text-theme-primary font-bold">{newAthlete?.name}</span>! 
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-zinc-800/50 p-6 rounded-3xl border border-zinc-700 text-left relative group"
          >
            <div className="absolute top-4 right-4 text-green-500/50">
              <ClipboardCheck size={20} />
            </div>
            <p className="text-[10px] font-bold text-zinc-500 uppercase mb-3 tracking-widest">Dados de Acesso ao Portal</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Usuário (CPF):</span>
                <span className="text-sm text-white font-mono font-bold">{newAthlete?.doc}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500">Senha Inicial:</span>
                <span className="text-sm text-white font-mono font-bold">{newAthlete?.doc}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-4 italic border-t border-zinc-700/50 pt-3">
              * Utilize seu CPF (apenas números) para realizar o primeiro acesso.
            </p>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onComplete}
            className="w-full py-5 bg-theme-primary hover:opacity-90 text-black rounded-2xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-3 text-lg uppercase tracking-tighter"
          >
            Acessar Minha Conta
            <ArrowRight size={20} />
          </motion.button>
        </motion.div>
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
          <p className="text-zinc-400">Preencha a ficha de inscrição e anamnese abaixo para se tornar um atleta do Piruá Esporte Clube</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Athlete Data */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
              <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                <UserPlus size={20} />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">1. Ficha de Inscrição</h2>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Photo & Document Upload */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col items-center gap-4 p-6 bg-zinc-800/30 border border-zinc-800 rounded-3xl">
                  <div className="relative group">
                    {athleteData.photo ? (
                      <img src={athleteData.photo} className="w-[120px] h-[160px] object-cover rounded-xl border-2 border-theme-primary shadow-lg shadow-theme-primary/20" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-[120px] h-[160px] bg-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-700 group-hover:border-theme-primary transition-colors">
                        <UserCircle size={48} />
                        <span className="text-[10px] mt-2 font-bold uppercase">Foto 3x4</span>
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                      <Upload className="text-white" />
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e, 'photo')} />
                    </label>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Foto do Atleta (3x4)</p>
                </div>

                <div className="flex flex-col items-center gap-4 p-6 bg-zinc-800/30 border border-zinc-800 rounded-3xl">
                  <div className="relative group">
                    {athleteData.doc_photo ? (
                      athleteData.doc_photo.startsWith('data:image') ? (
                        <img src={athleteData.doc_photo} className="w-[120px] h-[160px] object-cover rounded-xl border-2 border-theme-primary shadow-lg shadow-theme-primary/20" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-[120px] h-[160px] bg-zinc-800/50 rounded-xl flex flex-col items-center justify-center text-theme-primary border-2 border-theme-primary shadow-lg shadow-theme-primary/20">
                          <ClipboardCheck size={48} />
                          <span className="text-[10px] mt-2 font-bold uppercase">Doc Enviado</span>
                        </div>
                      )
                    ) : (
                      <div className="w-[120px] h-[160px] bg-zinc-800 rounded-xl flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-zinc-700 group-hover:border-theme-primary transition-colors">
                        <Upload size={48} />
                        <span className="text-[10px] mt-2 font-bold uppercase">Doc (RG/CPF)</span>
                      </div>
                    )}
                    <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer rounded-xl">
                      <Upload className="text-white" />
                      <input type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => handleFileUpload(e, 'doc_photo')} />
                    </label>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Documento (RG/CPF)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Dados Pessoais</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
                      <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.name} onChange={e => setAthleteData({...athleteData, name: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nascimento</label>
                        <input required type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.birth_date} onChange={e => setAthleteData({...athleteData, birth_date: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">NUMERO DO UNIFORME</label>
                        <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.jersey_number} onChange={e => setAthleteData({...athleteData, jersey_number: e.target.value})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">CPF/RG</label>
                      <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.doc} onChange={e => setAthleteData({...athleteData, doc: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">WhatsApp Aluno</label>
                      <input type="text" placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.contact} onChange={e => setAthleteData({...athleteData, contact: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Endereço</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Rua</label>
                        <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.street} onChange={e => setAthleteData({...athleteData, street: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nº</label>
                        <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.number} onChange={e => setAthleteData({...athleteData, number: e.target.value})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Bairro</label>
                        <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.neighborhood} onChange={e => setAthleteData({...athleteData, neighborhood: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Cidade</label>
                        <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.city} onChange={e => setAthleteData({...athleteData, city: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">UF</label>
                        <input type="text" maxLength={2} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.uf} onChange={e => setAthleteData({...athleteData, uf: e.target.value})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Responsável Legal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome do Responsável</label>
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.guardian_name} onChange={e => setAthleteData({...athleteData, guardian_name: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">CPF Responsável</label>
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.guardian_doc} onChange={e => setAthleteData({...athleteData, guardian_doc: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">WhatsApp Responsável</label>
                      <input type="text" placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.guardian_phone} onChange={e => setAthleteData({...athleteData, guardian_phone: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Anamnesis Data */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
              <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                <ClipboardCheck size={20} />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">2. Ficha de Saúde (Anamnese)</h2>
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
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={anamnesisData.sleep_time} onChange={e => setAnamnesisData({...anamnesisData, sleep_time: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Tem dificuldade de acordar cedo?</label>
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={anamnesisData.wake_up_difficulty} onChange={e => setAnamnesisData({...anamnesisData, wake_up_difficulty: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Pratica outro exercício físico?</label>
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={anamnesisData.other_exercises} onChange={e => setAnamnesisData({...anamnesisData, other_exercises: e.target.value})} />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em] flex items-center gap-2">
                    <AlertCircle size={16} />
                    Histórico Médico
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Já fraturou algum membro?</label>
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={anamnesisData.fractures} onChange={e => setAnamnesisData({...anamnesisData, fractures: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Faz algum tratamento médico?</label>
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={anamnesisData.medical_treatment} onChange={e => setAnamnesisData({...anamnesisData, medical_treatment: e.target.value})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Faz uso de medicação controlada?</label>
                      <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={anamnesisData.controlled_medication} onChange={e => setAnamnesisData({...anamnesisData, controlled_medication: e.target.value})} />
                    </div>
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
                    <div key={item.key}>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">{item.label}</label>
                      <input type="text" className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-sm focus:ring-2 focus:ring-theme-primary/50 outline-none" value={(anamnesisData as any)[item.key]} onChange={e => setAnamnesisData({...anamnesisData, [item.key]: e.target.value})} />
                    </div>
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
              </div>
            </div>
          </div>

          <div className="flex justify-center pt-8">
            <button 
              type="submit"
              disabled={loading}
              className="w-full max-w-md py-5 bg-theme-primary hover:opacity-90 text-black rounded-[2rem] font-black transition-all shadow-2xl shadow-theme-primary/20 flex items-center justify-center gap-3 disabled:opacity-50 text-lg uppercase tracking-tighter"
            >
              {loading ? 'Processando Matrícula...' : (
                <>
                  <Save size={24} />
                  Finalizar Matrícula
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
