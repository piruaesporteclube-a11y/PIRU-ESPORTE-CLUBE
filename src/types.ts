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
  lineup_index: number;
  person_id: string;
  type: 'athlete' | 'staff';
  confirmation: "Pendente" | "Confirmado" | "Recusado";
  presence?: "Presente" | "Ausente"; // New field
  category?: string;
  lineup_name?: string;
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
  created_at?: any;
};

export interface Companion {
  id: string;
  event_id: string;
  name: string;
  doc: string;
  whatsapp?: string; // New field
  presence?: "Presente" | "Ausente"; // New field
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
  size: "PP" | "P" | "M" | "G" | "GG" | "XG";
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
  const birthYear = parseISO(birthDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  if (age <= 3) return "SUB 3";
  if (age === 4) return "SUB 4";
  if (age === 5) return "SUB 5";
  if (age === 6) return "SUB 6";
  if (age <= 7) return "SUB 7";
  if (age <= 8) return "SUB 8";
  if (age <= 9) return "SUB 9";
  if (age <= 10) return "SUB 10";
  if (age <= 11) return "SUB 11";
  if (age <= 12) return "SUB 12";
  if (age <= 13) return "SUB 13";
  if (age <= 14) return "SUB 14";
  if (age <= 15) return "SUB 15";
  if (age <= 16) return "SUB 16";
  if (age <= 17) return "SUB 17";
  if (age <= 18) return "SUB 18";
  if (age <= 19) return "SUB 19";
  if (age <= 20) return "SUB 20";
  return "ADULTO";
};

export const categories = [
  "SUB 3", "SUB 4", "SUB 5", "SUB 6", "SUB 7", "SUB 8", "SUB 9", "SUB 10", 
  "SUB 11", "SUB 12", "SUB 13", "SUB 14", "SUB 15", 
  "SUB 16", "SUB 17", "SUB 18", "SUB 19", "SUB 20", 
  "ADULTO"
];
