import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { Athlete, Anamnesis, PlayerProfile, getSubCategory } from '../types';
import { 
  Save, 
  FileText, 
  X, 
  Dribbble, 
  Activity, 
  Heart, 
  ShieldAlert, 
  Award, 
  User, 
  Calendar, 
  TrendingUp, 
  Gauge, 
  Target, 
  Award as MedalIcon,
  ChevronRight,
  ClipboardList,
  Flame,
  Scale
} from 'lucide-react';
import { cn } from '../utils';
import { toast } from 'sonner';
import { useTheme } from '../contexts/ThemeContext';
import AthleteSearchSelect from './AthleteSearchSelect';
import { differenceInYears, parseISO } from 'date-fns';

interface PlayerProfileFormProps {
  athlete?: Athlete;
  onSave?: () => void;
  standalone?: boolean;
  userRole?: 'admin' | 'professor' | 'student';
  athletes?: Athlete[];
}

export default function PlayerProfileForm({ 
  athlete: propAthlete, 
  onSave, 
  standalone = false, 
  userRole = 'admin',
  athletes = [] 
}: PlayerProfileFormProps) {
  const { settings } = useTheme();
  const isStudent = userRole === 'student';
  
  const [selectedAthlete, setSelectedAthlete] = useState<Athlete | null>(propAthlete || null);
  const [profile, setProfile] = useState<Partial<PlayerProfile>>({});
  const [anamnesis, setAnamnesis] = useState<Partial<Anamnesis>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Sync selected athlete from props
  useEffect(() => {
    if (propAthlete) {
      setSelectedAthlete(propAthlete);
    }
  }, [propAthlete]);

  // Load Player Profile and Anamnesis data when selected athlete changes
  useEffect(() => {
    if (!selectedAthlete) {
      setProfile({});
      setAnamnesis({});
      return;
    }

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [profileData, anamnesisData] = await Promise.all([
          api.getPlayerProfile(selectedAthlete.id),
          api.getAnamnesis(selectedAthlete.id)
        ]);
        
        setProfile(profileData || { athlete_id: selectedAthlete.id });
        setAnamnesis(anamnesisData || { athlete_id: selectedAthlete.id });
      } catch (error) {
        console.error("Erro ao carregar dados da ficha técnica:", error);
        toast.error("Erro ao carregar informações da ficha técnica.");
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    setIsEditing(false);
  }, [selectedAthlete]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAthlete) return;

    setIsSaving(true);
    try {
      await api.savePlayerProfile({
        ...profile,
        athlete_id: selectedAthlete.id
      });
      toast.success("Ficha Técnica atualizada com sucesso!");
      setIsEditing(false);
      if (onSave) onSave();
    } catch (error) {
      console.error("Erro ao salvar ficha técnica:", error);
      toast.error("Erro ao salvar ficha técnica.");
    } finally {
      setIsSaving(false);
    }
  };

  const getAge = (birthDateString?: string) => {
    if (!birthDateString) return '';
    try {
      return differenceInYears(new Date(), parseISO(birthDateString));
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Selection Header - Only if not standalone and not student */}
      {!standalone && !isStudent && !propAthlete && (
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-[2.5rem] shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 bg-theme-primary/10 text-theme-primary rounded-2xl">
              <ClipboardList size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-white uppercase tracking-tighter">Ficha Técnica do Jogador</h2>
              <p className="text-sm text-zinc-500 uppercase tracking-widest">Selecione um atleta para gerenciar seu boletim técnico e físico</p>
            </div>
          </div>
          <AthleteSearchSelect 
            onSelect={(a) => setSelectedAthlete(a)}
            selectedAthleteId={selectedAthlete?.id}
            athletes={athletes}
          />
        </div>
      )}

      {selectedAthlete ? (
        <div className="space-y-8">
          {/* Main Card Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* COLUMN 1: ATHLETE CARD (PHOTO & BASIC DEMOGRAPHICS + ANAMNESIS MINI SUMMARY) */}
            <div className="lg:col-span-1 space-y-8">
              {/* Profile Card */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
                <div className="absolute top-4 right-4 bg-theme-primary/10 text-theme-primary border border-theme-primary/20 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full">
                  {selectedAthlete.birth_date ? getSubCategory(selectedAthlete.birth_date) : 'N/A'}
                </div>

                <div className="relative w-36 h-36 mt-4 mb-6 rounded-full overflow-hidden border-4 border-theme-primary/20 group">
                  {selectedAthlete.photo && selectedAthlete.photo !== "no-image" ? (
                    <img 
                      src={selectedAthlete.photo} 
                      alt={selectedAthlete.name} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800 text-zinc-500 flex items-center justify-center font-bold text-4xl uppercase">
                      {selectedAthlete.name?.substring(0, 2)}
                    </div>
                  )}
                </div>

                <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight mb-1">
                  {selectedAthlete.name}
                </h3>
                {selectedAthlete.nickname && (
                  <p className="text-sm font-bold text-theme-primary uppercase tracking-widest mb-4">
                    "{selectedAthlete.nickname}"
                  </p>
                )}

                <div className="w-full h-px bg-zinc-800/80 my-4" />

                <div className="w-full space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Nascimento / Idade</span>
                    <span className="text-zinc-200 font-bold">
                      {selectedAthlete.birth_date ? `${selectedAthlete.birth_date.split('-').reverse().join('/')} (${getAge(selectedAthlete.birth_date)} anos)` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Gênero</span>
                    <span className="text-zinc-200 font-bold uppercase">{selectedAthlete.gender || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Documento</span>
                    <span className="text-zinc-200 font-bold">{selectedAthlete.doc || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Nº Camisa</span>
                    <span className="text-zinc-200 font-bold">{selectedAthlete.jersey_number ? `#${selectedAthlete.jersey_number}` : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Modalidade</span>
                    <span className="text-zinc-200 font-bold uppercase">{selectedAthlete.modality || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-zinc-500 font-bold uppercase tracking-wider">Status</span>
                    <span className={cn(
                      "font-black uppercase text-[10px] px-2 py-0.5 rounded-md",
                      selectedAthlete.status === 'Ativo' ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                    )}>
                      {selectedAthlete.status || 'Ativo'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Anamnesis / Health summary */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-6 shadow-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/10 text-red-500 rounded-xl">
                    <Heart size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">Ficha de Saúde (Anamnese)</h4>
                    <p className="text-[10px] text-zinc-500 uppercase">Resumo de segurança médica do atleta</p>
                  </div>
                </div>
                
                <div className="w-full h-px bg-zinc-800" />

                {anamnesis.athlete_id ? (
                  <div className="space-y-3">
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Restrições Alimentares</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.food_restriction && anamnesis.food_restriction !== 'NÃO' ? anamnesis.food_restriction : 'Nenhuma restrição registrada'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Alergias Registradas</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.allergies && anamnesis.allergies !== 'NÃO' ? anamnesis.allergies : 'Nenhuma alergia registrada'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Problemas Cardíacos / Respiratórios</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {[
                          anamnesis.cardiac_problems && anamnesis.cardiac_problems !== 'NÃO' ? `Cardíaco: ${anamnesis.cardiac_problems}` : null,
                          anamnesis.respiratory_problems && anamnesis.respiratory_problems !== 'NÃO' ? `Respiratório: ${anamnesis.respiratory_problems}` : null
                        ].filter(Boolean).join(' | ') || 'Nenhum problema crônico reportado'}
                      </p>
                    </div>
                    <div className="p-3 bg-zinc-950 rounded-xl space-y-1">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest block">Medicações Controladas</span>
                      <p className="text-xs text-zinc-300 font-medium">
                        {anamnesis.controlled_medication && anamnesis.controlled_medication !== 'NÃO' ? anamnesis.controlled_medication : 'Nenhum medicamento de uso contínuo'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-zinc-950 rounded-xl text-center border border-dashed border-zinc-800">
                    <p className="text-xs text-zinc-500">Nenhum dado de anamnese preenchido para este atleta.</p>
                  </div>
                )}
              </div>
            </div>

            {/* COLUMN 2 & 3: DETAILS & EVALUATIONS */}
            <div className="lg:col-span-2 space-y-8">
              
              <form onSubmit={handleSave} className="space-y-8">
                {/* Section 1: Dados Contratuais e Origem */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6 relative">
                  
                  {/* Edit Toggle for Staff */}
                  {!isStudent && !isEditing && (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="absolute top-6 right-6 px-4 py-2 bg-theme-primary/10 text-theme-primary hover:bg-theme-primary hover:text-black border border-theme-primary/20 rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Editar Ficha
                    </button>
                  )}

                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <FileText size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">1. Dados de Registro e Origem</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Nacionalidade, posição e detalhes do vínculo esportivo</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      
                      {/* Nacionalidade */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nacionalidade</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: Brasileiro"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.nationality || ''}
                            onChange={e => setProfile(prev => ({ ...prev, nationality: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.nationality || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Naturalidade (Cidade/Estado de origem) */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Naturalidade (Origem)</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: São Paulo - SP"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.birth_place || ''}
                            onChange={e => setProfile(prev => ({ ...prev, birth_place: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.birth_place || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Posição Principal */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posição Principal</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: Centroavante"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.primary_position || ''}
                            onChange={e => setProfile(prev => ({ ...prev, primary_position: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-theme-primary" />
                            {profile.primary_position || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                      {/* Posição Secundária */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posição Secundária</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: Meia-Atacante"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.secondary_position || ''}
                            onChange={e => setProfile(prev => ({ ...prev, secondary_position: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.secondary_position || <span className="text-zinc-600">Nenhuma</span>}
                          </div>
                        )}
                      </div>

                      {/* Clube Atual */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Clube Atual</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: Piruá Esporte Clube"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.current_club || ''}
                            onChange={e => setProfile(prev => ({ ...prev, current_club: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.current_club || <span className="text-zinc-600">Sem Vínculo Externo</span>}
                          </div>
                        )}
                      </div>

                      {/* Tempo de Contrato */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Tempo de Contrato / Vínculo</label>
                        {isEditing ? (
                          <input
                            type="text"
                            placeholder="Ex: 2 Anos (Até Julho/2028)"
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.contract_duration || ''}
                            onChange={e => setProfile(prev => ({ ...prev, contract_duration: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                            {profile.contract_duration || <span className="text-zinc-600">Não informado</span>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 2: Características Físicas e Técnicas */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <Scale size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">2. Características Físicas e Técnicas</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Biometria, pé dominante e avaliação de habilidades chave</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="space-y-8">
                      {/* Biometrics row */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
                        {/* Altura */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Altura</label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Ex: 1.78 m"
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                              value={profile.height || ''}
                              onChange={e => setProfile(prev => ({ ...prev, height: e.target.value.toUpperCase() }))}
                            />
                          ) : (
                            <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                              {profile.height || <span className="text-zinc-600">--</span>}
                            </div>
                          )}
                        </div>

                        {/* Peso */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Peso</label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Ex: 72 kg"
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                              value={profile.weight || ''}
                              onChange={e => setProfile(prev => ({ ...prev, weight: e.target.value.toUpperCase() }))}
                            />
                          ) : (
                            <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                              {profile.weight || <span className="text-zinc-600">--</span>}
                            </div>
                          )}
                        </div>

                        {/* Envergadura */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Envergadura</label>
                          {isEditing ? (
                            <input
                              type="text"
                              placeholder="Ex: 1.82 m"
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                              value={profile.wingspan || ''}
                              onChange={e => setProfile(prev => ({ ...prev, wingspan: e.target.value.toUpperCase() }))}
                            />
                          ) : (
                            <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                              {profile.wingspan || <span className="text-zinc-600">--</span>}
                            </div>
                          )}
                        </div>

                        {/* Pé Bom */}
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pé Dominante</label>
                          {isEditing ? (
                            <select
                              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                              value={profile.dominant_foot || ''}
                              onChange={e => setProfile(prev => ({ ...prev, dominant_foot: e.target.value as any }))}
                            >
                              <option value="">SELECIONAR...</option>
                              <option value="Destro">DESTRO</option>
                              <option value="Canhoto">CANHOTO</option>
                              <option value="Ambidestro">AMBIDESTRO</option>
                            </select>
                          ) : (
                            <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-semibold uppercase">
                              {profile.dominant_foot || <span className="text-zinc-600">Não informado</span>}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="w-full h-px bg-zinc-800/50" />

                      {/* Technical Abilities block */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Award size={14} className="text-theme-primary" />
                          Habilidades Específicas
                        </h4>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                          {/* Qualidade no Passe */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Qualidade no Passe</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a qualidade no passe do atleta..."
                                rows={2}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_passing || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_passing: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[50px]">
                                {profile.skills_passing || <span className="text-zinc-600">Sem observações cadastradas</span>}
                              </div>
                            )}
                          </div>

                          {/* Cabeceio */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Cabeceio</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a habilidade de cabeceio..."
                                rows={2}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_heading || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_heading: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[50px]">
                                {profile.skills_heading || <span className="text-zinc-600">Sem observações cadastradas</span>}
                              </div>
                            )}
                          </div>

                          {/* Drible */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Drible / Recursos individuais</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a qualidade do drible..."
                                rows={2}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_dribbling || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_dribbling: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[50px]">
                                {profile.skills_dribbling || <span className="text-zinc-600">Sem observações cadastradas</span>}
                              </div>
                            )}
                          </div>

                          {/* Velocidade */}
                          <div className="space-y-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Velocidade / Arranque</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a explosão e velocidade do atleta..."
                                rows={2}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_speed || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_speed: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[50px]">
                                {profile.skills_speed || <span className="text-zinc-600">Sem observações cadastradas</span>}
                              </div>
                            )}
                          </div>

                          {/* Posicionamento Tático */}
                          <div className="space-y-2 sm:col-span-2">
                            <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Posicionamento Tático e Leitura de Espaço</label>
                            {isEditing ? (
                              <textarea
                                placeholder="Descreva a inteligência posicional e tática..."
                                rows={2}
                                className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                                value={profile.skills_tactical || ''}
                                onChange={e => setProfile(prev => ({ ...prev, skills_tactical: e.target.value.toUpperCase() }))}
                              />
                            ) : (
                              <div className="px-4 py-3 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[50px]">
                                {profile.skills_tactical || <span className="text-zinc-600">Sem observações cadastradas</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full h-px bg-zinc-800/50" />

                      {/* Tomada de Decisão */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                          <Gauge size={14} className="text-theme-primary" />
                          Índice de Tomada de Decisão (Leitura de jogo sob pressão)
                        </h4>
                        {isEditing ? (
                          <textarea
                            placeholder="Descreva como o jogador se comporta sob alta pressão e sua precisão na tomada de decisão rápida..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.decision_making || ''}
                            onChange={e => setProfile(prev => ({ ...prev, decision_making: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="p-4 bg-zinc-950 rounded-2xl text-xs text-zinc-300 font-medium uppercase border border-zinc-800/45 leading-relaxed">
                            {profile.decision_making || <span className="text-zinc-600">Sem avaliação cadastrada para tomada de decisão.</span>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Section 3: Histórico Médico e Físico */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-theme-primary/10 text-theme-primary rounded-xl">
                      <Activity size={18} />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white uppercase tracking-wider">3. Histórico Clínico e Performance Física</h3>
                      <p className="text-[10px] text-zinc-500 uppercase">Laudos de exames, acompanhamento de lesões e testes atléticos</p>
                    </div>
                  </div>

                  <div className="w-full h-px bg-zinc-800" />

                  {isLoading ? (
                    <div className="py-12 text-center text-zinc-500">Carregando informações...</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-6">
                      
                      {/* Exames de Rotina */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Exames de Rotina (Cardiológico, Pressão e Sangue)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Descreva as últimas avaliações cardiológicas, exames sanguíneos e controle de pressão arterial..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.routine_exams || ''}
                            onChange={e => setProfile(prev => ({ ...prev, routine_exams: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.routine_exams || <span className="text-zinc-600">Nenhum exame cadastrado recentemente.</span>}
                          </div>
                        )}
                      </div>

                      {/* Histórico de Lesões */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Histórico de Lesões e Cirurgias (Com tempos de recuperação)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Ex: Entorse de tornozelo grau 2 em 10/2025 - 4 semanas de molho. Cirurgia de apendicite em 2024..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.injury_history || ''}
                            onChange={e => setProfile(prev => ({ ...prev, injury_history: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.injury_history || <span className="text-zinc-600">Sem histórico de lesões severas registrado.</span>}
                          </div>
                        )}
                      </div>

                      {/* Teste de Performance */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Testes Físicos de Performance (Força, Velocidade e Resistência Aeróbia)</label>
                        {isEditing ? (
                          <textarea
                            placeholder="Descreva os resultados de salto, tempo de tiro de 30m, VO2 máx ou testes Yo-Yo..."
                            rows={3}
                            className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-xl text-white text-xs focus:ring-2 focus:ring-theme-primary/50 outline-none uppercase"
                            value={profile.performance_tests || ''}
                            onChange={e => setProfile(prev => ({ ...prev, performance_tests: e.target.value.toUpperCase() }))}
                          />
                        ) : (
                          <div className="px-4 py-4 bg-zinc-950 rounded-xl text-xs text-zinc-300 font-medium uppercase min-h-[60px] leading-relaxed">
                            {profile.performance_tests || <span className="text-zinc-600">Sem testes de performance registrados.</span>}
                          </div>
                        )}
                      </div>

                    </div>
                  )}
                </div>

                {/* Edit Controls / Save buttons */}
                {isEditing && (
                  <div className="flex justify-end gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        // Reset form
                        if (selectedAthlete) {
                          api.getPlayerProfile(selectedAthlete.id).then(data => {
                            setProfile(data || { athlete_id: selectedAthlete.id });
                          });
                        }
                      }}
                      className="px-6 py-3 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="flex items-center gap-2 px-6 py-3 bg-theme-primary hover:bg-theme-primary/90 text-black font-black uppercase tracking-wider rounded-xl text-xs transition-all disabled:opacity-50"
                    >
                      <Save size={14} />
                      {isSaving ? "Salvando..." : "Salvar Ficha Técnica"}
                    </button>
                  </div>
                )}
              </form>

            </div>

          </div>
        </div>
      ) : (
        <div className="p-12 text-center bg-zinc-900 rounded-[2.5rem] border border-zinc-800 text-zinc-500">
          <p className="uppercase text-sm font-bold tracking-widest">Nenhum jogador selecionado para exibir a Ficha Técnica.</p>
        </div>
      )}
    </div>
  );
}
