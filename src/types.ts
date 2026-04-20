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
  guardian_name: string;
  guardian_doc: string;
  guardian_phone: string;
  school?: string;
  school_shift?: "Manhã" | "Tarde" | "Noite";
  status: "Ativo" | "Inativo";
  modality: string; // Comma separated or single
  confirmation?: "Pendente" | "Confirmado" | "Recusado";
  created_at?: any;
  updated_at?: any;
};

export type Professor = {
  id: string;
  name: string;
  birth_date: string;
  doc: string;
  phone: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  photo: string;
  confirmation?: "Pendente" | "Confirmado" | "Recusado";
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

export type TrainingSchedule = {
  categories: string[];
  start_time: string;
  end_time: string;
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
  primaryColor: string;
  secondaryColor: string;
  instagram: string;
  whatsapp: string;
  schoolCrest: string;
};

export type User = {
  id: string;
  name: string;
  doc: string;
  role: "admin" | "student";
  athlete_id?: string;
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
};

export type UniformModel = {
  id: string;
  name: string;
  image: string;
  description?: string;
};

export type EventLineup = {
  event_id: string;
  lineup_index: number;
  person_id: string;
  type: 'athlete' | 'staff';
  confirmation: "Pendente" | "Confirmado" | "Recusado";
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

export const getSubCategory = (birthDate: string) => {
  const birthYear = parseISO(birthDate).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;
  
  if (age <= 6) return "SUB 6";
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
  "SUB 6", "SUB 7", "SUB 8", "SUB 9", "SUB 10", 
  "SUB 11", "SUB 12", "SUB 13", "SUB 14", "SUB 15", 
  "SUB 16", "SUB 17", "SUB 18", "SUB 19", "SUB 20", 
  "ADULTO"
];
