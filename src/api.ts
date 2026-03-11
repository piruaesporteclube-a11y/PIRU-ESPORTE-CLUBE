import { 
  collection, 
  getDocs, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  getDoc, 
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { auth, db } from "./lib/firebase";
import { Athlete, Professor, Event, Attendance, Anamnesis, Settings, AuthResponse, User } from "./types";

const SETTINGS_ID = "global_settings";

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<AuthResponse> => {
    // If username is CPF, we map it to an email for Firebase Auth
    const email = username.includes("@") ? username : `${username}@pirua.com`;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      // Get user role from Firestore
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      } catch (docError: any) {
        if (docError.message?.includes('offline') || docError.code === 'unavailable') {
          // If offline, we might not have the user doc in cache. 
          // For admin, we can try to guess based on the username if we are desperate,
          // but it's better to just let it fail with a friendly message.
          throw new Error("Você está offline e seus dados de acesso não estão salvos localmente. Conecte-se à internet para entrar.");
        }
        throw docError;
      }

      if (!userDoc.exists()) {
        // Fallback for ADM if not in Firestore yet
        if (username === "05504043689") {
          const adminUser: User = { id: firebaseUser.uid, name: "Administrador", doc: "05504043689", role: "admin" };
          try {
            await setDoc(doc(db, "users", firebaseUser.uid), adminUser);
          } catch (e) {
            console.warn("Could not save admin doc (offline?)", e);
          }
          return { user: adminUser, token: await firebaseUser.getIdToken() };
        }
        throw new Error("Usuário não encontrado no banco de dados.");
      }
      
      return { 
        user: userDoc.data() as User, 
        token: await firebaseUser.getIdToken() 
      };
    } catch (error: any) {
      // Handle offline error from signInWithEmailAndPassword
      if (error.code === 'auth/network-request-failed' || error.message?.includes('offline')) {
        throw new Error("Sem conexão com a internet. Verifique sua rede.");
      }

      // Special case: If admin doesn't exist in Auth yet, try to create it
      if (username === "05504043689" && password === "05504043689" && 
          (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential')) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const firebaseUser = userCredential.user;
          const adminUser: User = { id: firebaseUser.uid, name: "Administrador", doc: "05504043689", role: "admin" };
          await setDoc(doc(db, "users", firebaseUser.uid), adminUser);
          return { user: adminUser, token: await firebaseUser.getIdToken() };
        } catch (createError: any) {
          console.error("Error creating admin:", createError);
          throw new Error("Erro ao configurar acesso administrativo. Verifique se o login por E-mail/Senha está ativo no Firebase.");
        }
      }

      // Map Firebase errors to user-friendly messages
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        throw new Error("CPF ou senha incorretos.");
      } else if (error.code === 'auth/wrong-password') {
        throw new Error("Senha incorreta.");
      } else if (error.code === 'auth/operation-not-allowed') {
        throw new Error("O login por e-mail/senha não está ativado no Firebase.");
      } else if (error.code === 'auth/too-many-requests') {
        throw new Error("Muitas tentativas falhas. Tente novamente mais tarde.");
      }
      
      throw error;
    }
  },

  register: async (athleteData: Partial<Athlete>): Promise<void> => {
    if (!athleteData.doc) throw new Error("CPF é obrigatório");
    const email = `${athleteData.doc}@pirua.com`;
    const password = athleteData.doc; // Default password is CPF as requested
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;
    
    // Create Athlete in Firestore
    const athleteRef = await addDoc(collection(db, "athletes"), {
      ...athleteData,
      status: "Ativo",
      createdAt: serverTimestamp()
    });
    
    // Create User in Firestore
    const newUser: User = {
      id: firebaseUser.uid,
      name: athleteData.name || "Novo Aluno",
      doc: athleteData.doc,
      role: "student",
      athlete_id: athleteRef.id
    };
    
    await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    
    // Also update athlete with its own ID (optional but helpful)
    await updateDoc(athleteRef, { id: athleteRef.id });
  },

  logout: () => signOut(auth),

  // Settings
  getSettings: async (): Promise<Settings> => {
    try {
      const docSnap = await getDoc(doc(db, "settings", SETTINGS_ID));
      if (docSnap.exists()) return docSnap.data() as Settings;
    } catch (error: any) {
      // Only log if it's not an offline error
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        console.error("Error fetching settings:", error);
      }
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
    try {
      await setDoc(doc(db, "settings", SETTINGS_ID), settings, { merge: true });
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Save settings queued (offline)");
      } else {
        throw error;
      }
    }
  },

  // Athletes
  getAthletes: async (): Promise<Athlete[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, "athletes"));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Athlete));
    } catch (error: any) {
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        console.error("Error fetching athletes:", error);
      }
      return [];
    }
  },
  saveAthlete: async (athlete: Partial<Athlete>) => {
    try {
      if (athlete.id) {
        const { id, ...data } = athlete;
        await updateDoc(doc(db, "athletes", id), data);
      } else {
        const docRef = await addDoc(collection(db, "athletes"), { ...athlete, status: "Ativo" });
        await updateDoc(docRef, { id: docRef.id });
      }
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Save athlete queued (offline)");
      } else {
        throw error;
      }
    }
  },
  deleteAthlete: async (id: string) => {
    try {
      await deleteDoc(doc(db, "athletes", id));
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Delete athlete queued (offline)");
      } else {
        throw error;
      }
    }
  },

  // Professors
  getProfessors: async (): Promise<Professor[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, "professors"));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Professor));
    } catch (error: any) {
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        console.error("Error fetching professors:", error);
      }
      return [];
    }
  },
  saveProfessor: async (professor: Partial<Professor>) => {
    try {
      if (professor.id) {
        const { id, ...data } = professor;
        await updateDoc(doc(db, "professors", id), data);
      } else {
        const docRef = await addDoc(collection(db, "professors"), professor);
        await updateDoc(docRef, { id: docRef.id });
      }
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Save professor queued (offline)");
      } else {
        throw error;
      }
    }
  },

  // Events
  getEvents: async (): Promise<Event[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Event));
    } catch (error: any) {
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        console.error("Error fetching events:", error);
      }
      return [];
    }
  },
  saveEvent: async (event: Partial<Event>) => {
    try {
      if (event.id) {
        const { id, ...data } = event;
        await updateDoc(doc(db, "events", id), data);
      } else {
        const docRef = await addDoc(collection(db, "events"), event);
        await updateDoc(docRef, { id: docRef.id });
      }
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Save event queued (offline)");
      } else {
        throw error;
      }
    }
  },

  // Attendance
  getAttendance: async (date?: string, athlete_id?: string): Promise<Attendance[]> => {
    try {
      let q = query(collection(db, "attendance"));
      if (date) q = query(q, where("date", "==", date));
      if (athlete_id) q = query(q, where("athlete_id", "==", athlete_id));
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Attendance));
    } catch (error: any) {
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        console.error("Error fetching attendance:", error);
      }
      return [];
    }
  },
  saveAttendance: async (attendance: Partial<Attendance>) => {
    try {
      if (attendance.id) {
        const { id, ...data } = attendance;
        await updateDoc(doc(db, "attendance", id), data);
      } else {
        const docRef = await addDoc(collection(db, "attendance"), attendance);
        await updateDoc(docRef, { id: docRef.id });
      }
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Save attendance queued (offline)");
      } else {
        throw error;
      }
    }
  },

  // Anamnesis
  getAnamnesis: async (athlete_id: string): Promise<Anamnesis> => {
    try {
      const docSnap = await getDoc(doc(db, "anamnesis", athlete_id));
      if (docSnap.exists()) return docSnap.data() as Anamnesis;
    } catch (error: any) {
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        console.error("Error fetching anamnesis:", error);
      }
    }
    return { athlete_id } as Anamnesis;
  },
  saveAnamnesis: async (anamnesis: Partial<Anamnesis>) => {
    if (!anamnesis.athlete_id) throw new Error("ID do atleta é obrigatório");
    try {
      await setDoc(doc(db, "anamnesis", anamnesis.athlete_id), anamnesis, { merge: true });
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Save anamnesis queued (offline)");
      } else {
        throw error;
      }
    }
  },

  // Lineups
  getLineup: async (event_id: string): Promise<Athlete[]> => {
    try {
      const q = query(collection(db, "event_lineups"), where("event_id", "==", event_id));
      const querySnapshot = await getDocs(q);
      const athleteIds = querySnapshot.docs.map(d => d.data().athlete_id);
      if (athleteIds.length === 0) return [];
      
      // Fetch athletes
      const athletes = await api.getAthletes();
      const lineup = athletes.filter(a => athleteIds.includes(a.id));
      
      // Add confirmation from event_lineups
      return lineup.map(a => {
        const el = querySnapshot.docs.find(d => d.data().athlete_id === a.id);
        return { ...a, confirmation: el?.data().confirmation || "Pendente" };
      });
    } catch (error: any) {
      if (!error.message?.includes('offline') && error.code !== 'unavailable') {
        console.error("Error fetching lineup:", error);
      }
      return [];
    }
  },
  saveLineup: async (event_id: string, athlete_ids: string[]) => {
    try {
      // Delete existing
      const q = query(collection(db, "event_lineups"), where("event_id", "==", event_id));
      const querySnapshot = await getDocs(q);
      for (const d of querySnapshot.docs) {
        await deleteDoc(doc(db, "event_lineups", d.id));
      }
      
      // Add new
      for (const aid of athlete_ids) {
        await addDoc(collection(db, "event_lineups"), {
          event_id,
          athlete_id: aid,
          confirmation: "Pendente"
        });
      }
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Save lineup queued (offline)");
      } else {
        throw error;
      }
    }
  },
  confirmLineup: async (event_id: string, athlete_id: string, confirmation: string) => {
    try {
      const q = query(collection(db, "event_lineups"), 
        where("event_id", "==", event_id), 
        where("athlete_id", "==", athlete_id)
      );
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        await updateDoc(doc(db, "event_lineups", querySnapshot.docs[0].id), { confirmation });
      }
    } catch (error: any) {
      if (error.message?.includes('offline') || error.code === 'unavailable') {
        console.warn("Confirm lineup queued (offline)");
      } else {
        throw error;
      }
    }
  },
};
