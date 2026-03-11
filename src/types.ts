import { format, differenceInYears, parseISO, isSameDay, isSameMonth } from "date-fns";

export type Athlete = {
  id: string;
  name: string;
  birth_date: string;
  doc: string;
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
  status: "Ativo" | "Inativo";
  confirmation?: "Pendente" | "Confirmado" | "Recusado";
};

export type Professor = {
  id: string;
  name: string;
  birth_date: string;
  doc: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  uf: string;
  photo: string;
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
};

export type Attendance = {
  id: string;
  athlete_id: string;
  date: string;
  status: "Presente" | "Faltou";
  justification?: string;
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
};

export type AuthResponse = {
  user: User;
  token: string;
};

export const getSubCategory = (birthDate: string) => {
  const age = differenceInYears(new Date(), parseISO(birthDate));
  if (age <= 7) return "SUB 7";
  if (age <= 9) return "SUB 9";
  if (age <= 11) return "SUB 11";
  if (age <= 13) return "SUB 13";
  if (age <= 15) return "SUB 15";
  if (age <= 17) return "SUB 17";
  return "SUB ADULTO";
};

export const categories = ["SUB 7", "SUB 9", "SUB 11", "SUB 13", "SUB 15", "SUB 17", "SUB ADULTO"];
