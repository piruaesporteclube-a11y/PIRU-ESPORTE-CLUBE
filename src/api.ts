import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged
} from "firebase/auth";
import { 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where, 
  onSnapshot,
  getDocFromServer,
  writeBatch
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { Athlete, Professor, Event, Attendance, Anamnesis, Settings, AuthResponse, User } from "./types";

const SETTINGS_ID = "global_settings";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export const api = {
  // Auth
  login: async (username: string, password: string): Promise<AuthResponse> => {
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

    const email = username.includes("@") ? username : `${normalizedUsername}@pirua.com`;
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, normalizedPassword);
      const firebaseUser = userCredential.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Fallback for ADM
        if (username === "05504043689") {
          const adminUser: User = { id: firebaseUser.uid, name: "Administrador", doc: "05504043689", role: "admin" };
          await setDoc(userDocRef, adminUser);
          return { user: adminUser, token: await firebaseUser.getIdToken() };
        }
        throw new Error("Usuário não encontrado no banco de dados.");
      }

      return { 
        user: userDocSnap.data() as User, 
        token: await firebaseUser.getIdToken()
      };
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        throw new Error("CPF ou senha incorretos.");
      }
      throw error;
    }
  },

  register: async (athleteData: Partial<Athlete>): Promise<void> => {
    if (!athleteData.doc) throw new Error("CPF é obrigatório");
    const normalizedDoc = athleteData.doc.replace(/\D/g, "");
    const email = `${normalizedDoc}@pirua.com`;
    const password = normalizedDoc;
    
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // Create Athlete
      const athleteId = doc(collection(db, "athletes")).id;
      const newAthlete = {
        ...athleteData,
        id: athleteId,
        status: "Ativo",
      } as Athlete;
      
      await setDoc(doc(db, "athletes", athleteId), newAthlete);
      
      // Create User
      const newUser: User = {
        id: firebaseUser.uid,
        name: athleteData.name || "Novo Aluno",
        doc: athleteData.doc,
        role: "student",
        athlete_id: athleteId
      };
      
      await setDoc(doc(db, "users", firebaseUser.uid), newUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "athletes/users");
    }
  },

  logout: () => signOut(auth),

  // Settings
  getSettings: async (): Promise<Settings> => {
    try {
      const docSnap = await getDoc(doc(db, "settings", SETTINGS_ID));
      if (docSnap.exists()) return docSnap.data() as Settings;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `settings/${SETTINGS_ID}`);
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
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `settings/${SETTINGS_ID}`);
    }
  },

  // Athletes
  getAthletes: async (): Promise<Athlete[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, "athletes"));
      return querySnapshot.docs.map(doc => doc.data() as Athlete);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "athletes");
      return [];
    }
  },
  saveAthlete: async (athlete: Partial<Athlete>) => {
    if (!athlete.id) athlete.id = doc(collection(db, "athletes")).id;
    try {
      await setDoc(doc(db, "athletes", athlete.id), athlete, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `athletes/${athlete.id}`);
    }
  },
  deleteAthlete: async (id: string) => {
    try {
      await deleteDoc(doc(db, "athletes", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `athletes/${id}`);
    }
  },

  // Professors
  getProfessors: async (): Promise<Professor[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, "professors"));
      return querySnapshot.docs.map(doc => doc.data() as Professor);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "professors");
      return [];
    }
  },
  saveProfessor: async (professor: Partial<Professor>) => {
    if (!professor.id) professor.id = doc(collection(db, "professors")).id;
    try {
      await setDoc(doc(db, "professors", professor.id), professor, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `professors/${professor.id}`);
    }
  },

  // Events
  getEvents: async (): Promise<Event[]> => {
    try {
      const querySnapshot = await getDocs(collection(db, "events"));
      return querySnapshot.docs.map(doc => doc.data() as Event);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "events");
      return [];
    }
  },
  saveEvent: async (event: Partial<Event>) => {
    if (!event.id) event.id = doc(collection(db, "events")).id;
    try {
      await setDoc(doc(db, "events", event.id), event, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
    }
  },

  // Attendance
  getAttendance: async (date?: string, athlete_id?: string): Promise<Attendance[]> => {
    try {
      let q = query(collection(db, "attendance"));
      if (date) q = query(q, where("date", "==", date));
      if (athlete_id) q = query(q, where("athlete_id", "==", athlete_id));
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => doc.data() as Attendance);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "attendance");
      return [];
    }
  },
  saveAttendance: async (attendance: Partial<Attendance>) => {
    if (!attendance.id) attendance.id = doc(collection(db, "attendance")).id;
    try {
      await setDoc(doc(db, "attendance", attendance.id), attendance, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendance.id}`);
    }
  },

  // Anamnesis
  getAnamnesis: async (athlete_id: string): Promise<Anamnesis> => {
    try {
      const docSnap = await getDoc(doc(db, "anamnesis", athlete_id));
      if (docSnap.exists()) return docSnap.data() as Anamnesis;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `anamnesis/${athlete_id}`);
    }
    return { athlete_id } as Anamnesis;
  },
  saveAnamnesis: async (anamnesis: Partial<Anamnesis>) => {
    if (!anamnesis.athlete_id) throw new Error("ID do atleta é obrigatório");
    try {
      await setDoc(doc(db, "anamnesis", anamnesis.athlete_id), anamnesis, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `anamnesis/${anamnesis.athlete_id}`);
    }
  },

  // Lineups (using a subcollection or separate collection)
  // In the original code, event_lineups was a separate table.
  // I'll use a collection "event_lineups" where doc ID is event_id + "_" + athlete_id
  getLineup: async (event_id: string): Promise<Athlete[]> => {
    try {
      const q = query(collection(db, "event_lineups"), where("event_id", "==", event_id));
      const querySnapshot = await getDocs(q);
      const lineupData = querySnapshot.docs.map(doc => doc.data());
      
      const athleteIds = lineupData.map(d => d.athlete_id);
      if (athleteIds.length === 0) return [];
      
      const athletes = await api.getAthletes();
      const lineup = athletes.filter(a => athleteIds.includes(a.id));
      
      return lineup.map(a => {
        const el = lineupData.find(d => d.athlete_id === a.id);
        return { ...a, confirmation: el?.confirmation || "Pendente" };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "event_lineups");
      return [];
    }
  },
  saveLineup: async (event_id: string, athlete_ids: string[]) => {
    try {
      const batch = writeBatch(db);
      
      // Delete existing
      const q = query(collection(db, "event_lineups"), where("event_id", "==", event_id));
      const querySnapshot = await getDocs(q);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Add new
      athlete_ids.forEach(aid => {
        const id = `${event_id}_${aid}`;
        batch.set(doc(db, "event_lineups", id), {
          event_id,
          athlete_id: aid,
          confirmation: "Pendente"
        });
      });
      
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "event_lineups");
    }
  },
  confirmLineup: async (event_id: string, athlete_id: string, confirmation: string) => {
    try {
      const id = `${event_id}_${athlete_id}`;
      await updateDoc(doc(db, "event_lineups", id), { confirmation });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `event_lineups/${event_id}_${athlete_id}`);
    }
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
