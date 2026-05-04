import React, { useState } from 'react';
import { api } from '../api';
import { Athlete, Anamnesis, User } from '../types';
import { CheckCircle2, ArrowRight, ClipboardCheck, UserPlus, Save, UserCircle, Upload, ClipboardList, AlertCircle, MessageCircle } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';
import { cn, compressImage as globalCompressImage } from '../utils';

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
    nickname: '',
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
    email: '',
    guardian_name: '',
    guardian_doc: '',
    guardian_phone: '',
    school: '',
    school_shift: undefined,
    status: 'Inativo',
    modality: '',
    gender: 'Masculino'
  });

  const [newAthlete, setNewAthlete] = useState<Athlete | null>(null);
  const [newUser, setNewUser] = useState<User | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Immediate type check
      if (!file.type.startsWith('image/')) {
        toast.error("O arquivo selecionado não é uma imagem válida. Por favor, escolha um arquivo JPG ou PNG.");
        return;
      }

      // Check for extremely large raw files (e.g. > 10MB) to prevent browser hang
      if (file.size > 10 * 1024 * 1024) {
        toast.error("A imagem é excessivamente grande. Por favor, utilize um arquivo menor que 10MB.");
        return;
      }

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Show loading state for compression
        const toastId = toast.loading("Otimizando foto para o sistema...");
        
        try {
          // Always compress to ensure it fits Firestore limits and is standardized
          const compressed = await globalCompressImage(base64, 400, 400, 0.6);
          
          setAthleteData(prev => ({ ...prev, photo: compressed }));
          toast.success("Foto processada com sucesso!", { id: toastId });
        } catch (err) {
          console.error("Erro ao processar imagem:", err);
          toast.error("Erro ao processar a foto. Tente outro arquivo.", { id: toastId });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields are filled
    const requiredAthleteFields: (keyof Athlete)[] = [
      'name', 'nickname', 'birth_date', 'doc', 'street', 'number', 
      'neighborhood', 'city', 'uf', 'photo', 'contact', 'email', 'jersey_number',
      'guardian_name', 'guardian_doc', 'guardian_phone', 'modality', 'gender'
    ];
    
    const missingAthlete = requiredAthleteFields.filter(f => !athleteData[f]);
    if (missingAthlete.length > 0) {
      const fieldLabels: Record<string, string> = {
        name: 'Nome', nickname: 'Apelido', birth_date: 'Nascimento', doc: 'CPF/RG',
        street: 'Rua', number: 'Número', neighborhood: 'Bairro', city: 'Cidade',
        uf: 'UF', photo: 'Foto', contact: 'WhatsApp', jersey_number: 'Uniforme',
        guardian_name: 'Nome do Responsável', guardian_doc: 'Documento do Responsável',
        guardian_phone: 'WhatsApp do Responsável', modality: 'Modalidade'
      };
      const missingLabels = missingAthlete.map(f => fieldLabels[f] || f).join(', ');
      toast.error(`Por favor, preencha os campos: ${missingLabels}`);
      return;
    }

    if (athleteData.photo && !athleteData.photo.startsWith('data:')) {
      toast.error("A foto ainda está sendo processada. Por favor, aguarde um momento.");
      return;
    }

    setLoading(true);
    try {
      // Register Athlete only
      const { athlete, user } = await api.register(athleteData);
      setNewAthlete(athlete);
      setNewUser(user);

      toast.success("Matrícula realizada com sucesso!");
      setStep('success');
    } catch (err: any) {
      console.error("Erro completo na matrícula:", err);
      
      let errorMessage = "Erro ao realizar matrícula. Tente novamente.";
      
      if (err.message?.includes("permission-denied") || err.message?.includes("insufficient permissions")) {
        errorMessage = "O sistema recusou os dados. Verifique se a foto não é muito grande ou se há campos inválidos.";
      } else if (err.message?.includes("email-already-in-use")) {
        errorMessage = "Este CPF já está cadastrado no sistema.";
      } else if (err.message) {
        errorMessage = `Erro: ${err.message}`;
      }

      toast.error(
        <div className="flex flex-col gap-2">
          <span>{errorMessage}</span>
          <a 
            href="https://wa.me/5537991243101" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white underline font-bold"
          >
            Suporte: (37) 99124-3101
          </a>
        </div>, 
        { duration: 8000 }
      );
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
            <h2 className="text-3xl font-black text-white uppercase tracking-tighter">Matrícula Solicitada!</h2>
            <p className="text-zinc-400 uppercase">
              Seja bem-vindo ao Piruá E.C., <span className="text-theme-primary font-bold">{newAthlete?.name}</span>! 
            </p>
            <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl mt-4">
              <p className="text-sm text-amber-500 font-bold uppercase">
                Sua matrícula está em análise pelo administrador. 
              </p>
              <p className="text-[10px] text-zinc-400 uppercase mt-1">
                Você poderá acessar o portal assim que seu cadastro for aprovado.
              </p>
            </div>
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
                <span className="text-xs text-zinc-500 uppercase">Usuário (CPF):</span>
                <span className="text-sm text-white font-mono font-bold">{newAthlete?.doc}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-zinc-500 uppercase">Senha Inicial:</span>
                <span className="text-sm text-white font-mono font-bold">{newAthlete?.doc}</span>
              </div>
            </div>
            <p className="text-[10px] text-zinc-500 mt-4 italic border-t border-zinc-700/50 pt-3 uppercase">
              * Utilize seu CPF (apenas números) para realizar o primeiro acesso.
            </p>
          </motion.div>

          <motion.button 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onComplete()}
            className="w-full py-5 bg-theme-primary hover:opacity-90 text-black rounded-2xl font-black transition-all shadow-lg shadow-theme-primary/20 flex items-center justify-center gap-3 text-lg uppercase tracking-tighter"
          >
            Fazer Login
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
        <div className="text-center space-y-4 relative">
          <div className="flex justify-center">
            {settings.schoolCrest ? (
              <img src={settings.schoolCrest} alt="Escudo" className="h-24 w-auto object-contain" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-20 h-20 bg-theme-primary rounded-full flex items-center justify-center text-black font-black text-3xl">P</div>
            )}
          </div>
          <h1 className="text-4xl font-black text-white uppercase tracking-tighter">Portal de Matrícula</h1>
          <p className="text-zinc-400 uppercase">Preencha a ficha de inscrição abaixo para se tornar um atleta do Piruá Esporte Clube</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Athlete Data */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-[2.5rem] overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-zinc-800 bg-zinc-900/80 flex items-center gap-3">
              <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                <UserPlus size={20} />
              </div>
              <h2 className="text-xl font-bold text-white uppercase tracking-widest">Ficha de Inscrição</h2>
            </div>
            
            <div className="p-8 space-y-8">
              {/* Photo Upload */}
              <div className="flex justify-center">
                <div className="flex flex-col items-center gap-4 p-6 bg-zinc-800/30 border border-zinc-800 rounded-3xl w-full max-w-sm">
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
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleFileUpload(e)} />
                    </label>
                  </div>
                  <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Foto do Atleta (3x4)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Dados Pessoais</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome Completo</label>
                        <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.name} onChange={e => setAthleteData({...athleteData, name: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Apelido</label>
                        <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.nickname} onChange={e => setAthleteData({...athleteData, nickname: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nascimento</label>
                        <input required type="date" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.birth_date} onChange={e => setAthleteData({...athleteData, birth_date: e.target.value})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">NUMERO DO UNIFORME</label>
                        <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.jersey_number} onChange={e => setAthleteData({...athleteData, jersey_number: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">CPF/RG</label>
                      <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.doc} onChange={e => setAthleteData({...athleteData, doc: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">WhatsApp Aluno</label>
                      <input required type="text" placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.contact} onChange={e => setAthleteData({...athleteData, contact: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">E-mail (Login/Notificações)</label>
                      <input required type="email" placeholder="atleta@email.com" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none" value={athleteData.email} onChange={e => setAthleteData({...athleteData, email: e.target.value.toLowerCase()})} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Escola onde Estuda</label>
                        <input type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.school} onChange={e => setAthleteData({...athleteData, school: e.target.value.toUpperCase()})} placeholder="NOME DA ESCOLA" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Turno Escolar</label>
                        <select 
                          className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                          value={athleteData.school_shift || ''}
                          onChange={e => setAthleteData({...athleteData, school_shift: e.target.value as any})}
                        >
                          <option value="">SELECIONE O TURNO</option>
                          <option value="Manhã">MANHÃ</option>
                          <option value="Tarde">TARDE</option>
                          <option value="Noite">NOITE</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Sexo</label>
                      <select 
                        required 
                        className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" 
                        value={athleteData.gender || 'Masculino'} 
                        onChange={e => setAthleteData({...athleteData, gender: e.target.value as any})}
                      >
                        <option value="Masculino">Masculino</option>
                        <option value="Feminino">Feminino</option>
                      </select>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Posições / Funções (Selecione uma ou mais)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {["Goleiro", "Zagueiro", "Lateral", "Volante", "Meia", "Atacante", "Ponta", "Líbero"].map(p => {
                          const isSelected = athleteData.position?.split(', ').includes(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              onClick={() => {
                                const current = athleteData.position ? athleteData.position.split(', ') : [];
                                let next;
                                if (current.includes(p)) {
                                  next = current.filter(item => item !== p);
                                } else {
                                  next = [...current, p];
                                }
                                setAthleteData({...athleteData, position: next.join(', ')});
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all text-center",
                                isSelected 
                                  ? "bg-theme-primary border-theme-primary text-black" 
                                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                              )}
                            >
                              {p}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-2">Modalidades Esportivas (Selecione uma ou mais)</label>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {["Futebol de Campo", "Futsal", "Volêi", "Corrida de Rua", "Outros"].map(m => {
                          const isSelected = athleteData.modality?.split(', ').includes(m);
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => {
                                const current = athleteData.modality ? athleteData.modality.split(', ') : [];
                                let next;
                                if (current.includes(m)) {
                                  next = current.filter(item => item !== m);
                                } else {
                                  next = [...current, m];
                                }
                                setAthleteData({...athleteData, modality: next.join(', ')});
                              }}
                              className={cn(
                                "px-4 py-2 rounded-xl border text-[10px] font-black uppercase transition-all",
                                isSelected 
                                  ? "bg-theme-primary border-theme-primary text-black" 
                                  : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"
                              )}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Endereço</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Rua</label>
                        <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.street} onChange={e => setAthleteData({...athleteData, street: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nº</label>
                        <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.number} onChange={e => setAthleteData({...athleteData, number: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Bairro</label>
                        <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.neighborhood} onChange={e => setAthleteData({...athleteData, neighborhood: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Cidade</label>
                        <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.city} onChange={e => setAthleteData({...athleteData, city: e.target.value.toUpperCase()})} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">UF</label>
                        <input required type="text" maxLength={2} className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.uf} onChange={e => setAthleteData({...athleteData, uf: e.target.value.toUpperCase()})} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 space-y-4 pt-4 border-t border-zinc-800">
                  <h3 className="text-xs font-black text-theme-primary uppercase tracking-[0.2em]">Responsável Legal</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">Nome do Responsável</label>
                      <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.guardian_name} onChange={e => setAthleteData({...athleteData, guardian_name: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">CPF Responsável</label>
                      <input required type="text" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.guardian_doc} onChange={e => setAthleteData({...athleteData, guardian_doc: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-zinc-500 uppercase mb-1">WhatsApp Responsável</label>
                      <input required type="text" placeholder="(00) 00000-0000" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase" value={athleteData.guardian_phone} onChange={e => setAthleteData({...athleteData, guardian_phone: e.target.value.toUpperCase()})} />
                    </div>
                  </div>
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
