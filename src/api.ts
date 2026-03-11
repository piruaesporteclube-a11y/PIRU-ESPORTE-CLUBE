import { supabase } from "./lib/supabase";
import { Athlete, Professor, Event, Attendance, Anamnesis, Settings, AuthResponse, User } from "./types";

const SETTINGS_ID = "global_settings";

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<AuthResponse> => {
    // Normalize username (remove dots and dashes if it's a CPF)
    const normalizedUsername = username.replace(/\D/g, "");
    const normalizedPassword = password.replace(/\D/g, "");

    // Demo/Emergency access
    if (
      (username === "demo" && password === "demo") || 
      (normalizedUsername === "05504043689" && normalizedPassword === "05504043689") ||
      (username === "piruaesporteclube@gmail.com" && password === "admin123")
    ) {
      const adminUser: User = { 
        id: username === "demo" ? "demo-id" : (username === "piruaesporteclube@gmail.com" ? "email-admin-id" : "admin-static-id"), 
        name: username === "demo" ? "Usuário Demo" : "Administrador Principal", 
        doc: username === "demo" ? "00000000000" : "05504043689", 
        role: "admin" 
      };
      return { user: adminUser, token: "emergency-token" };
    }

    // If username is CPF, we map it to an email for Supabase Auth
    const email = username.includes("@") ? username : `${normalizedUsername}@pirua.com`;
    
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password: normalizedPassword,
    });

    if (authError) {
      if (authError.message.includes("Invalid login credentials")) {
        throw new Error("CPF ou senha incorretos.");
      }
      throw authError;
    }

    const { data: userDoc, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (userError || !userDoc) {
      // Fallback for ADM if not in database yet
      if (username === "05504043689") {
        const adminUser: User = { id: authData.user.id, name: "Administrador", doc: "05504043689", role: "admin" };
        await supabase.from("users").upsert(adminUser);
        return { user: adminUser, token: authData.session?.access_token || "" };
      }
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    return { 
      user: userDoc as User, 
      token: authData.session?.access_token || ""
    };
  },

  register: async (athleteData: Partial<Athlete>): Promise<void> => {
    if (!athleteData.doc) throw new Error("CPF é obrigatório");
    const normalizedDoc = athleteData.doc.replace(/\D/g, "");
    const email = `${normalizedDoc}@pirua.com`;
    const password = normalizedDoc; // Default password is CPF as requested
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error("Erro ao criar usuário.");

    // Create Athlete in Supabase
    const { data: athleteRef, error: athleteError } = await supabase
      .from("athletes")
      .insert({
        ...athleteData,
        status: "Ativo",
      })
      .select()
      .single();

    if (athleteError) throw athleteError;
    
    // Create User in Supabase
    const newUser: User = {
      id: authData.user.id,
      name: athleteData.name || "Novo Aluno",
      doc: athleteData.doc,
      role: "student",
      athlete_id: athleteRef.id
    };
    
    const { error: userError } = await supabase.from("users").insert(newUser);
    if (userError) throw userError;
  },

  logout: () => supabase.auth.signOut(),

  // Settings
  getSettings: async (): Promise<Settings> => {
    try {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("id", SETTINGS_ID)
        .single();
      
      if (data) return data as Settings;
    } catch (error: any) {
      console.error("Error fetching settings:", error);
    }
    return {
      primaryColor: "#EAB308",
      secondaryColor: "#000000",
      instagram: "",
      whatsapp: "",
      schoolCrest: ""
    };
  },
  saveSettings: async (settings: Partial<Settings>) => {
    const { error } = await supabase
      .from("settings")
      .upsert({ id: SETTINGS_ID, ...settings });
    if (error) throw error;
  },

  // Athletes
  getAthletes: async (): Promise<Athlete[]> => {
    const { data, error } = await supabase.from("athletes").select("*");
    if (error) {
      console.error("Error fetching athletes:", error);
      return [];
    }
    return data as Athlete[];
  },
  saveAthlete: async (athlete: Partial<Athlete>) => {
    const { error } = await supabase.from("athletes").upsert(athlete);
    if (error) throw error;
  },
  deleteAthlete: async (id: string) => {
    const { error } = await supabase.from("athletes").delete().eq("id", id);
    if (error) throw error;
  },

  // Professors
  getProfessors: async (): Promise<Professor[]> => {
    const { data, error } = await supabase.from("professors").select("*");
    if (error) {
      console.error("Error fetching professors:", error);
      return [];
    }
    return data as Professor[];
  },
  saveProfessor: async (professor: Partial<Professor>) => {
    const { error } = await supabase.from("professors").upsert(professor);
    if (error) throw error;
  },

  // Events
  getEvents: async (): Promise<Event[]> => {
    const { data, error } = await supabase.from("events").select("*");
    if (error) {
      console.error("Error fetching events:", error);
      return [];
    }
    return data as Event[];
  },
  saveEvent: async (event: Partial<Event>) => {
    const { error } = await supabase.from("events").upsert(event);
    if (error) throw error;
  },

  // Attendance
  getAttendance: async (date?: string, athlete_id?: string): Promise<Attendance[]> => {
    let query = supabase.from("attendance").select("*");
    if (date) query = query.eq("date", date);
    if (athlete_id) query = query.eq("athlete_id", athlete_id);
    
    const { data, error } = await query;
    if (error) {
      console.error("Error fetching attendance:", error);
      return [];
    }
    return data as Attendance[];
  },
  saveAttendance: async (attendance: Partial<Attendance>) => {
    const { error } = await supabase.from("attendance").upsert(attendance);
    if (error) throw error;
  },

  // Anamnesis
  getAnamnesis: async (athlete_id: string): Promise<Anamnesis> => {
    const { data, error } = await supabase
      .from("anamnesis")
      .select("*")
      .eq("athlete_id", athlete_id)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error("Error fetching anamnesis:", error);
    }
    return (data as Anamnesis) || { athlete_id } as Anamnesis;
  },
  saveAnamnesis: async (anamnesis: Partial<Anamnesis>) => {
    if (!anamnesis.athlete_id) throw new Error("ID do atleta é obrigatório");
    const { error } = await supabase.from("anamnesis").upsert(anamnesis);
    if (error) throw error;
  },

  // Lineups
  getLineup: async (event_id: string): Promise<Athlete[]> => {
    const { data: lineupData, error: lineupError } = await supabase
      .from("event_lineups")
      .select("*")
      .eq("event_id", event_id);
    
    if (lineupError) {
      console.error("Error fetching lineup:", lineupError);
      return [];
    }

    const athleteIds = lineupData.map(d => d.athlete_id);
    if (athleteIds.length === 0) return [];
    
    const athletes = await api.getAthletes();
    const lineup = athletes.filter(a => athleteIds.includes(a.id));
    
    return lineup.map(a => {
      const el = lineupData.find(d => d.athlete_id === a.id);
      return { ...a, confirmation: el?.confirmation || "Pendente" };
    });
  },
  saveLineup: async (event_id: string, athlete_ids: string[]) => {
    // Delete existing
    await supabase.from("event_lineups").delete().eq("event_id", event_id);
    
    // Add new
    const newRows = athlete_ids.map(aid => ({
      event_id,
      athlete_id: aid,
      confirmation: "Pendente"
    }));
    
    const { error } = await supabase.from("event_lineups").insert(newRows);
    if (error) throw error;
  },
  confirmLineup: async (event_id: string, athlete_id: string, confirmation: string) => {
    const { error } = await supabase
      .from("event_lineups")
      .update({ confirmation })
      .eq("event_id", event_id)
      .eq("athlete_id", athlete_id);
    if (error) throw error;
  },

  loginGuest: async (): Promise<AuthResponse> => {
    const guestUser: User = { 
      id: "guest-" + Math.random().toString(36).substr(2, 9), 
      name: "Visitante (Offline)", 
      doc: "00000000000", 
      role: "admin" 
    };
    return { user: guestUser, token: "guest-token" };
  },
};
