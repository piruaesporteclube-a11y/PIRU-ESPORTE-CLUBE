import { format, differenceInYears, parseISO, isSameDay, isSameMonth } from "date-fns";

export type Athlete = {
  id: string;
  name: string;
  nickname?: string;
  birth_date: string;
  doc: string;
  gender: "Masculino" | "Feminino";
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  jersey_number: string;
  photo: string;
  contact: string;
  email: string;
  guardian_name: string;
  guardian_doc: string;
  guardian_phone: string;
  school?: string;
  school_shift?: "Manhã" | "Tarde" | "Noite";
  status: "Ativo" | "Inativo" | "Suspenso";
  suspension_reason?: string;
  position?: string; // Can be comma-separated for multi-role
  modality: string; // Comma separated or single
  confirmation?: "Pendente" | "Confirmado" | "Recusado";
  presence?: "Presente" | "Ausente"; // New field
  biometrics_face_registered?: boolean;
  biometrics_face_date?: string;
  biometrics_fingerprint_registered?: boolean;
  biometrics_fingerprint_date?: string;
  fingerprint_hash?: string;
  fingerprint_hand?: "Direito" | "Esquerdo";
  created_at?: any;
  updated_at?: any;
};

export type Professor = {
  id: string;
  name: string;
  birth_date: string;
  doc: string;
  phone: string;
  email?: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  photo: string;
  role?: string; // Can be comma-separated for multi-role
  systemRole?: "admin" | "professor";
  modality?: string;
  confirmation?: "Pendente" | "Confirmado" | "Recusado";
  presence?: "Presente" | "Ausente"; // New field
  created_at?: any;
  updated_at?: any;
};

export type Event = {
  id: string;
  name: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  start_date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  responsible_phone?: string; 
  whatsapp_group_id?: string;
  departure_time?: string;
  departure_location?: string;
  arrival_location?: string;
  modality?: string;
  created_at?: any;
  updated_at?: any;
};

export type Attendance = {
  id: string;
  athlete_id: string;
  training_id?: string;
  event_id?: string;
  date: string;
  status: "Presente" | "Faltou";
  justification?: string;
  arrival_time?: string;
  parent_notified?: boolean;
  athlete_notified?: boolean;
  created_at?: any;
  updated_at?: any;
};

export type TrainingActivity = {
  id: string;
  name: string;
  description: string;
  modality: "Futebol" | "Futsal" | "Vôlei" | "Basquete" | "Futebol de Areia" | "Outros";
  category: "Fundamento" | "Ataque" | "Defesa" | "Agilidade" | "Físico" | "Tático" | "Goleiro" | "Conscientização" | "Coordenação Motora" | "Aquecimento" | "Alongamento" | "Outro";
  intensity: "Baixa" | "Média" | "Alta";
  difficulty: "Iniciante" | "Intermediário" | "Avançado";
  duration?: number; // in minutes
  equipment?: string;
  youtubeUrl?: string;
  visualData?: string; // JSON string for canvas objects
  created_at?: any;
};

export type TrainingSchedule = {
  categories: string[];
  start_time: string;
  end_time: string;
  notes?: string;
};

export type Training = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  modality: string;
  category: string;
  schedules?: TrainingSchedule[];
  notes?: string;
  order?: number;
};

export type Anamnesis = {
  athlete_id: string;
  sleep_time: string;
  wake_up_difficulty: string;
  fractures: string;
  medical_treatment: string;
  controlled_medication: string;
  other_exercises: string;
  respiratory_problems: string;
  cardiac_problems: string;
  allergies: string;
  hypertension: string;
  hypotension: string;
  epilepsy: string;
  diabetes: string;
  food_restriction: string;
  medication_restriction: string;
  pathologies: string; // JSON string
  pathologies_description?: string;
  created_at?: any;
  updated_at?: any;
};

export type Settings = {
  schoolName: string;
  primaryColor: string;
  secondaryColor: string;
  instagram: string;
  whatsapp: string;
  schoolCrest: string;
  themeColor?: string;
  // Custom design and layout settings
  systemLayoutMode?: 'gold_classic' | 'tactical_cyan' | 'cyber_neon' | 'crimson_fire' | 'royal_purple';
  layoutBgColor?: string;
  layoutCardColor?: string;
  layoutBorderColor?: string;
  layoutBorderRadius?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  layoutBorderWidth?: '0px' | '1px' | '2px' | '3px';
  layoutShadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'neon' | 'heavy';
  // Institutional/Registration Base
  president?: string;
  technicalDirector?: string;
  auxiliaryDirector?: string;
  medicalOfficial?: string;
  boardMembers?: string;
  councilors?: string;
  address?: string;
  neighborhood?: string;
  city?: string;
  uf?: string;
  phone?: string;
  email?: string;
  facebook?: string;
  youtube?: string;
  tiktok?: string;
  coaches?: string;
  assistants?: string;
  studentAccessPaused?: boolean;
  studentAccessPauseMessage?: string;
  studentReadsLimit?: number;
  adminReadsLimit?: number;
};

export type User = {
  id: string;
  name: string;
  email?: string;
  doc: string;
  role: "admin" | "student" | "professor";
  athlete_id?: string;
  professor_id?: string;
  created_at?: any;
  updated_at?: any;
};

export type AuthResponse = {
  user: User;
  token: string;
};

export type Sponsor = {
  id: string;
  name: string;
  logo: string;
  link?: string;
  responsible_name?: string;
  segment?: string;
  phone?: string;
  logo_scale?: number;
};

export type UniformGroup = "Viagem" | "Jogo" | "Torcedor" | "Comissão Técnica";

export type SponsorSlot = {
  id: string;
  name: string;
  x: number; // Percentage
  y: number; // Percentage
  width: number;
  height: number;
};

export type UniformModel = {
  id: string;
  name: string;
  image: string;
  group: UniformGroup;
  description?: string;
  slots?: SponsorSlot[];
};

export type EventLineup = {
  event_id: string;
  lineup_index?: number;
  match_id?: string;
  person_id: string;
  type: 'athlete' | 'staff';
  lineup_status?: "Titular" | "Reserva";
  confirmation: "Pendente" | "Confirmado" | "Recusado";
  presence?: "Presente" | "Ausente"; // New field
  category?: string;
  lineup_name?: string;
};

export type EventMatch = {
  id: string;
  event_id: string;
  team_a_name: string;
  team_b_name: string;
  score_a: number;
  score_b: number;
  scorers_a?: string;
  scorers_b?: string;
  category?: string;
  date: string;
  time: string;
  location?: string;
  observations?: string;
  created_at?: any;
  updated_at?: any;
};

export type Championship = {
  id: string;
  name: string;
  description: string;
  categories: string[];
  dispute_format: "Eliminatória" | "Pontos Corridos" | "Grupos + Mata-mata";
  category_formats?: Record<string, "Eliminatória" | "Pontos Corridos" | "Grupos + Mata-mata">;
  regulation_url?: string;
  status: "Inscrições Abertas" | "Em Andamento" | "Finalizado";
  registration_start?: string;
  registration_end?: string;
  created_at?: any;
  updated_at?: any;
};

export type ChampionshipTeam = {
  id: string;
  championship_id: string;
  name: string;
  logo: string;
  category: string;
  responsible_name: string;
  responsible_doc: string;
  responsible_phone: string;
  players: {
    name: string;
    doc: string;
    birth_date: string;
    photo?: string;
    jersey_number?: string;
  }[];
  staff: {
    name: string;
    role: "Técnico" | "Auxiliar" | "Massagista";
    doc: string;
    phone?: string;
  }[];
  status: "Pendente" | "Aprovado" | "Recusado";
  created_at?: any;
};

export type ChampionshipMatch = {
  id: string;
  championship_id: string;
  category: string;
  team_a_id: string;
  team_b_id: string;
  score_a: number;
  score_b: number;
  date: string;
  time: string;
  location: string;
  status: "Agendado" | "Em Andamento" | "Finalizado";
  match_report?: MatchReport;
  created_at?: any;
};

export type MatchReport = {
  goals: { team_id: string; player_name: string; minute: number }[];
  cards: { team_id: string; player_name: string; type: "Amarelo" | "Vermelho"; minute: number }[];
  observations?: string;
};

export type OfficialLetter = {
  id: string;
  number: string;
  year: number;
  date: string;
  recipient_name: string;
  recipient_role: string;
  recipient_address: string;
  subject: string;
  body: string;
  closing: string;
  sender_name: string;
  sender_role: string;
  school_info?: string;
  school_cnpj?: string;
  school_cpf?: string;
  departure_location?: string;
  arrival_location?: string;
  departure_time?: string;
  arrival_time?: string;
  return_departure_location?: string;
  return_arrival_location?: string;
  return_time?: string;
  created_at?: any;
};

export interface Companion {
  id: string;
  event_id: string;
  name: string;
  doc: string;
  whatsapp?: string; // New field
  presence?: "Presente" | "Ausente"; // New field
  role?: string;
  created_at?: any;
}

export type EventMatchScore = {
  id: string;
  event_id: string;
  team_a_name: string;
  team_b_name: string;
  score_a: number;
  score_b: number;
  scorers_a?: string;
  scorers_b?: string;
  category?: string;
  date?: string;
  time?: string;
  observations?: string;
  created_at?: any;
  updated_at?: any;
};

export type UniformRequest = {
  id: string;
  athlete_id: string;
  athlete_name: string;
  category: string;
  type: "Conjunto Completo" | "Camisa Avulsa";
  uniform_group: UniformGroup;
  size: "1 ANO" | "2 ANOS" | "4 ANOS" | "6 ANOS" | "8 ANOS" | "10 ANOS" | "12 ANOS" | "14 ANOS" | "16 ANOS" | "PP" | "P" | "M" | "G" | "GG" | "EGG" | "XGG" | "BLPP" | "BLP" | "BLM" | "BLG" | "BLGG" | "BLG1" | "BLG2" | "BLG3" | "BLG4";
  jersey_number: string;
  status: "Pendente" | "Aprovado" | "Entregue" | "Recusado";
  sponsor_block_id?: string;
  observations?: string;
  created_at?: any;
  updated_at?: any;
};

export type SchoolReport = {
  id: string;
  athlete_id: string;
  athlete_name: string;
  category: string;
  period: string; // e.g., "1º Bimestre", "2º Bimestre", etc.
  year: number;
  report_card_image: string;
  status: "Pendente" | "Visto" | "Recusado";
  observations?: string;
  created_at?: any;
  updated_at?: any;
};

export type SponsorBlock = {
  id: string;
  name: string;
  sponsors: Sponsor[]; 
  min_sets: number;
  model_id?: string;
  slot_mapping?: Record<string, string>; // slotId -> sponsorId
  created_at?: any;
  updated_at?: any;
};

export const getSubCategory = (birthDate: string) => {
  if (!birthDate) return "ADULTO";
  let birthYear: number;
  try {
    if (birthDate.includes('/')) {
      const parts = birthDate.split('/');
      const y = parts[parts.length - 1];
      birthYear = parseInt(y, 10);
    } else {
      birthYear = parseISO(birthDate).getFullYear();
    }
    if (isNaN(birthYear)) birthYear = new Date(birthDate).getFullYear();
  } catch (_) {
    return "ADULTO";
  }
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  if (age <= 3) return "SUB 3";
  if (age === 4) return "SUB 4";
  if (age === 5) return "SUB 5";
  if (age === 6) return "SUB 6";
  if (age === 7) return "SUB 7";
  if (age === 8) return "SUB 8";
  if (age === 9) return "SUB 9";
  if (age === 10) return "SUB 10";
  if (age === 11) return "SUB 11";
  if (age === 12) return "SUB 12";
  if (age === 13) return "SUB 13";
  if (age === 14) return "SUB 14";
  if (age === 15) return "SUB 15";
  if (age === 16) return "SUB 16";
  if (age === 17) return "SUB 17";
  if (age === 18) return "SUB 18";
  if (age === 19) return "SUB 19";
  if (age === 20) return "SUB 20";
  return "ADULTO";
};

export const categories = [
  "SUB 3", "SUB 4", "SUB 5", "SUB 6", "SUB 7", "SUB 8", "SUB 9", "SUB 10", 
  "SUB 11", "SUB 12", "SUB 13", "SUB 14", "SUB 15", 
  "SUB 16", "SUB 17", "SUB 18", "SUB 19", "SUB 20", 
  "ADULTO"
];

export const categoryAgeRanges = [
  { label: "SUB 3 ao SUB 6 (Iniciação / Baby)", value: "SUB 3 ao SUB 6", min: 3, max: 6, categories: ["SUB 3", "SUB 4", "SUB 5", "SUB 6"] },
  { label: "SUB 7 ao SUB 9 (Pré-Mirim / Fraldinha)", value: "SUB 7 ao SUB 9", min: 7, max: 9, categories: ["SUB 7", "SUB 8", "SUB 9"] },
  { label: "SUB 10 ao SUB 12 (Mirim)", value: "SUB 10 ao SUB 12", min: 10, max: 12, categories: ["SUB 10", "SUB 11", "SUB 12"] },
  { label: "SUB 13 ao SUB 15 (Infantil)", value: "SUB 13 ao SUB 15", min: 13, max: 15, categories: ["SUB 13", "SUB 14", "SUB 15"] },
  { label: "SUB 16 ao SUB 17 (Juvenil)", value: "SUB 16 ao SUB 17", min: 16, max: 17, categories: ["SUB 16", "SUB 17"] },
  { label: "SUB 18 ao SUB 20 (Juniores)", value: "SUB 18 ao SUB 20", min: 18, max: 20, categories: ["SUB 18", "SUB 19", "SUB 20"] },
  { label: "SUB 3 ao SUB 8", value: "SUB 3 ao SUB 8", min: 3, max: 8, categories: ["SUB 3", "SUB 4", "SUB 5", "SUB 6", "SUB 7", "SUB 8"] },
  { label: "SUB 9 ao SUB 14", value: "SUB 9 ao SUB 14", min: 9, max: 14, categories: ["SUB 9", "SUB 10", "SUB 11", "SUB 12", "SUB 13", "SUB 14"] },
  { label: "SUB 15 ao SUB 20", value: "SUB 15 ao SUB 20", min: 15, max: 20, categories: ["SUB 15", "SUB 16", "SUB 17", "SUB 18", "SUB 19", "SUB 20"] },
];

export const getSubNumber = (categoryStrOrBirthDate: string): number | null => {
  if (!categoryStrOrBirthDate) return null;
  const str = categoryStrOrBirthDate.trim().toUpperCase();
  if (str === 'ADULTO') return 21;
  
  if ((str.includes('-') && str.length >= 8) || (str.includes('/') && str.length >= 8)) {
    const sub = getSubCategory(str);
    if (sub === 'ADULTO') return 21;
    const match = sub.match(/\d+/);
    return match ? parseInt(match[0], 10) : null;
  }
  
  const match = str.match(/\d+/);
  return match ? parseInt(match[0], 10) : null;
};

export const matchesCategoryCriteria = (
  athleteOrSubOrBirthDate: Athlete | string | null | undefined,
  categoryFilter: string | string[] | undefined | null
): boolean => {
  if (!categoryFilter) return true;
  if (!athleteOrSubOrBirthDate) return false;

  // Handle array of criteria (e.g. training schedule categories: ['SUB 3', 'SUB 4', 'SUB 5', 'SUB 6'])
  if (Array.isArray(categoryFilter)) {
    if (categoryFilter.length === 0 || categoryFilter.includes('Todos') || categoryFilter.includes('Todas')) {
      return true;
    }
    return categoryFilter.some(cat => matchesCategoryCriteria(athleteOrSubOrBirthDate, cat));
  }

  const trimmedFilter = categoryFilter.trim();
  if (!trimmedFilter || trimmedFilter.toUpperCase() === 'TODOS' || trimmedFilter.toUpperCase() === 'TODAS') {
    return true;
  }

  const athleteSub = typeof athleteOrSubOrBirthDate === 'string'
    ? ((athleteOrSubOrBirthDate.includes('-') && athleteOrSubOrBirthDate.length >= 8) || (athleteOrSubOrBirthDate.includes('/') && athleteOrSubOrBirthDate.length >= 8)
        ? getSubCategory(athleteOrSubOrBirthDate)
        : athleteOrSubOrBirthDate.trim().toUpperCase())
    : getSubCategory(athleteOrSubOrBirthDate.birth_date);

  const athleteSubNum = getSubNumber(athleteSub);

  const cleanFilter = trimmedFilter.toUpperCase();
  const cleanAthleteSub = athleteSub.toUpperCase();

  // Exact match (ignoring spaces, hyphens, and leading zeros like SUB-03 vs SUB 3)
  const normAthlete = cleanAthleteSub.replace(/[\s\-_]/g, '').replace(/SUB0(\d)/, 'SUB$1');
  const normFilter = cleanFilter.replace(/[\s\-_]/g, '').replace(/SUB0(\d)/, 'SUB$1');
  if (normAthlete === normFilter) return true;

  // Comma, semicolon or slash separated list of categories (e.g. "SUB 3, SUB 4, SUB 5, SUB 6" or "SUB 3 / SUB 4")
  if (cleanFilter.includes(',') || cleanFilter.includes(';') || (cleanFilter.includes('/') && !cleanFilter.match(/\d+\/\d+\/\d+/))) {
    const parts = cleanFilter.split(/[,;\/]+/).map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.some(part => matchesCategoryCriteria(athleteOrSubOrBirthDate, part));
    }
  }

  // "SUB 3 E SUB 4"
  if (cleanFilter.includes(' E ')) {
    const parts = cleanFilter.split(' E ').map(p => p.trim()).filter(Boolean);
    if (parts.length > 1) {
      return parts.some(part => matchesCategoryCriteria(athleteOrSubOrBirthDate, part));
    }
  }

  // Range detection: "SUB 3 AO SUB 6", "SUB 3 A SUB 6", "SUB 3 - SUB 6", "SUB 3 ATÉ SUB 6", "SUB 3 AO 6", "SUB 3 A 6", "SUB-03 AO SUB-06", etc.
  const rangeMatch = cleanFilter.match(/(?:SUB\s*[-_]?\s*)?(\d+)\s*(?:AO|A|ATÉ|ATE|-|TO|\.\.)\s*(?:SUB\s*[-_]?\s*)?(\d+)/i);
  if (rangeMatch && athleteSubNum !== null) {
    const min = parseInt(rangeMatch[1], 10);
    const max = parseInt(rangeMatch[2], 10);
    const lower = Math.min(min, max);
    const upper = Math.max(min, max);

    if (athleteSubNum >= lower && athleteSubNum <= upper) {
      return true;
    }
  }

  return false;
};

export type PlayerProfile = {
  athlete_id: string;
  nationality?: string;
  birth_place?: string;
  primary_position?: string;
  secondary_position?: string;
  current_club?: string;
  contract_duration?: string;
  category?: string;
  // Características Físicas
  height?: string;
  weight?: string;
  wingspan?: string;
  imc?: string;
  dominant_foot?: "Destro" | "Canhoto" | "Ambidestro" | "Direito" | "Esquerdo" | "";
  jersey_number?: string;
  // Habilidades Específicas / Observações Gerais
  skills_passing?: string;
  skills_heading?: string;
  skills_dribbling?: string;
  skills_speed?: string;
  skills_tactical?: string;
  decision_making?: string;
  
  // 5. Informações Técnicas (Ratings 0 to 10)
  rating_passing?: number;
  rating_finishing?: number;
  rating_trapping?: number;
  rating_dribbling?: number;
  rating_crossing?: number;
  rating_heading?: number;
  rating_marking?: number;
  rating_tackling?: number;
  rating_vision?: number;
  rating_positioning?: number;
  rating_ball_control?: number;

  // 6. Capacidades Físicas (Ratings 0 to 10)
  rating_speed?: number;
  rating_acceleration?: number;
  rating_stamina?: number;
  rating_strength?: number;
  rating_agility?: number;
  rating_jumping?: number;
  rating_coordination?: number;

  // 7. Aspectos Táticos (Ratings 0 to 10)
  rating_tactical_intelligence?: number;
  rating_game_reading?: number;
  rating_space_occupation?: number;
  rating_decision_making?: number;
  rating_offensive_participation?: number;
  rating_defensive_participation?: number;

  // 8. Aspectos Comportamentais (Ratings 0 to 10)
  rating_discipline?: number;
  rating_leadership?: number;
  rating_teamwork?: number;
  rating_commitment?: number;
  rating_communication?: number;
  rating_sportsmanship?: number;

  // Histórico Médico e Físico
  routine_exams?: string;
  injury_history?: string;
  performance_tests?: string;
  updated_at?: any;
};
