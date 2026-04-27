import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  onAuthStateChanged,
  signInAnonymously,
  GoogleAuthProvider,
  signInWithPopup
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
  writeBatch,
  orderBy,
  getDocsFromCache,
  getDocFromCache,
  serverTimestamp,
  terminate,
  clearIndexedDbPersistence
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { Athlete, Professor, Event, Attendance, Anamnesis, Settings, AuthResponse, User, Sponsor, UniformModel, Training, TrainingActivity, Championship, ChampionshipTeam, ChampionshipMatch, OfficialLetter, Companion, EventMatchScore, UniformRequest, getSubCategory, SponsorBlock } from "./types";

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

function sanitizeData(data: any): any {
  if (data === null || data === undefined) return null;
  if (typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(sanitizeData);
  
  // If it's a special Firestore FieldValue or similar, don't sanitize its internal keys
  if (data.constructor?.name === 'FieldValueImpl' || data._methodName === 'serverTimestamp') {
    return data;
  }
  
  const sanitized: any = {};
  for (const key in data) {
    if (Object.prototype.hasOwnProperty.call(data, key)) {
      const value = data[key];
      if (value !== undefined) {
        sanitized[key] = sanitizeData(value);
      }
    }
  }
  return sanitized;
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  console.error('Original Firestore Error Object:', error);
  const errorMessage = error instanceof Error ? error.message : String(error);
  
  const isQuotaError = errorMessage.toLowerCase().includes("quota");

  const errInfo: FirestoreErrorInfo = {
    error: isQuotaError 
      ? "Limite de uso diário do banco de dados atingido (Quota Exceeded). O sistema voltará ao normal em algumas horas ou no próximo dia. Por favor, tente novamente mais tarde."
      : errorMessage,
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error Info:', JSON.stringify(errInfo));
  
  // Only throw if it's NOT a quota error on a GET operation
  // This allows GET operations to fail silently and use cache fallbacks
  if (!isQuotaError || operationType !== OperationType.GET) {
    throw new Error(errInfo.error);
  }
}

// Simple cache to reduce read operations
const cache: Record<string, { data: any, timestamp: number }> = {};
const pendingRequests: { [key: string]: Promise<any> | null } = {};
const CACHE_TTL = 900000; // 15 minutes (increased from 5m to save quota)

const getCachedData = (key: string) => {
  const cached = cache[key];
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return cached.data;
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache[key] = { data, timestamp: Date.now() };
};

export const clearCache = () => {
  for (const key in cache) {
    delete cache[key];
  }
  for (const key in pendingRequests) {
    pendingRequests[key] = null;
  }
};

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

const isQuotaError = (error: any): boolean => {
  const message = String(error).toLowerCase();
  return message.includes('quota exceeded') || message.includes('quota limit exceeded') || message.includes('resource exhausted');
};

const getDocsWithCacheFallback = async (q: any) => {
  const key = `docs_${q.path || (q._query && q._query.path && q._query.path.canonicalString()) || JSON.stringify(q)}`;
  if (pendingRequests[key]) return pendingRequests[key];

  const promise = (async () => {
    try {
      const snapshot = await getDocs(q);
      pendingRequests[key] = null;
      return snapshot;
    } catch (error) {
      pendingRequests[key] = null;
      if (isQuotaError(error)) {
        console.warn("Quota exceeded, attempting to load from cache...");
        try {
          return await getDocsFromCache(q);
        } catch (cacheError) {
          console.error("Failed to load from cache:", cacheError);
          // If not in cache, return an empty snapshot instead of throwing to prevent app crash
          return { docs: [], empty: true, size: 0 } as any;
        }
      }
      throw error;
    }
  })();

  pendingRequests[key] = promise;
  return promise;
};

const getDocWithCacheFallback = async (docRef: any) => {
  const key = `doc_${docRef.path}`;
  if (pendingRequests[key]) return pendingRequests[key];

  const promise = (async () => {
    try {
      const snapshot = await getDoc(docRef);
      pendingRequests[key] = null;
      return snapshot;
    } catch (error) {
      pendingRequests[key] = null;
      if (isQuotaError(error)) {
        console.warn("Quota exceeded, attempting to load document from cache...");
        try {
          return await getDocFromCache(docRef);
        } catch (cacheError) {
          console.error("Failed to load document from cache:", cacheError);
          // If not in cache, return a non-existent snapshot
          return { exists: () => false, data: () => undefined } as any;
        }
      }
      throw error;
    }
  })();

  pendingRequests[key] = promise;
  return promise;
};

export const api = {
  // Auth
  onAuthChange: (callback: (user: any) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const normalizedUsername = username.replace(/\D/g, "");
    const normalizedPassword = password.replace(/\D/g, "");

    // Demo/Emergency access
    if (
      (username === "demo" && password === "demo") || 
      (normalizedUsername === "05504043689" && normalizedPassword === "05504043689") ||
      (username === "piruaesporteclube@gmail.com" && password === "admin123")
    ) {
      try {
        const userCredential = await signInAnonymously(auth);
        const firebaseUser = userCredential.user;
        const adminUser: User = { 
          id: firebaseUser.uid, 
          name: username === "demo" ? "Usuário Demo" : "Administrador Principal", 
          doc: username === "demo" ? "00000000000" : "05504043689", 
          role: "admin" 
        };
        // Save the admin user doc so rules can check it
        await setDoc(doc(db, "users", firebaseUser.uid), sanitizeData(adminUser), { merge: true });
        return { user: adminUser, token: await firebaseUser.getIdToken() };
      } catch (error: any) {
        console.error("Error during anonymous login:", error);
        
        // If anonymous login is disabled in Firebase Console, we provide a clear error
        if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
          throw new Error("O Login Anônimo está desativado no Console do Firebase. Por favor, habilite-o em Authentication > Sign-in method > Anonymous.");
        }

        // Fallback to static if anonymous fails
        const adminUser: User = { 
          id: username === "demo" ? "demo-id" : (username === "piruaesporteclube@gmail.com" ? "email-admin-id" : "admin-static-id"), 
          name: username === "demo" ? "Usuário Demo" : "Administrador Principal", 
          doc: username === "demo" ? "00000000000" : "05504043689", 
          role: "admin"
        };
        // We return a special token to indicate emergency mode
        return { user: adminUser, token: "emergency-token" };
      }
    }

    const email = username.includes("@") ? username : `${normalizedUsername}@pirua.com.br`;
    
    try {
      // First try with the raw password (most likely if it's an email/custom password)
      // Then fallback to normalized password (CPF only) if that fails
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authErr: any) {
        if (password !== normalizedPassword) {
          try {
            userCredential = await signInWithEmailAndPassword(auth, email, normalizedPassword);
          } catch (secondAuthErr: any) {
            // If both fail, and we have a user-not-found/invalid-credential, try auto-registration
            if (secondAuthErr.code === 'auth/user-not-found' || secondAuthErr.code === 'auth/invalid-credential') {
              throw secondAuthErr; // Re-throw to be caught by outer catch for lazy registration check
            }
            throw secondAuthErr;
          }
        } else {
          throw authErr;
        }
      }
      
      const firebaseUser = userCredential.user;

      const userDocRef = doc(db, "users", firebaseUser.uid);
      let userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        // Fallback for ADM (specific hardcoded UID/Doc)
        if (username === "05504043689" || (firebaseUser.email === "piruaesporteclube@gmail.com")) {
          const adminUser: User = { id: firebaseUser.uid, name: "Administrador", doc: "05504043689", role: "admin" };
          await setDoc(userDocRef, sanitizeData(adminUser));
          userDocSnap = await getDoc(userDocRef);
        } else {
            // Orphaned Auth user: Find the athlete or professor by CPF and link them
            const qAthlete = query(collection(db, "athletes"), where("doc", "==", normalizedUsername));
            const qProfessor = query(collection(db, "professors"), where("doc", "==", normalizedUsername));
            
            const [athleteSnapshot, professorSnapshot] = await Promise.all([
              getDocs(qAthlete),
              getDocs(qProfessor)
            ]);
            
            if (!athleteSnapshot.empty) {
              const athleteData = athleteSnapshot.docs[0].data() as Athlete;
              const athleteId = athleteSnapshot.docs[0].id;
              
              const newUser: User = {
                id: firebaseUser.uid,
                name: athleteData.name || "Novo Aluno",
                email: email,
                doc: normalizedUsername,
                role: "student",
                athlete_id: athleteId,
                updated_at: serverTimestamp() as any
              };
              
              await setDoc(userDocRef, sanitizeData(newUser));
              userDocSnap = await getDoc(userDocRef);
            } else if (!professorSnapshot.empty) {
              const professorData = professorSnapshot.docs[0].data() as Professor;
              const professorId = professorSnapshot.docs[0].id;
              
              const newUser: User = {
                id: firebaseUser.uid,
                name: professorData.name || "Professor",
                email: email,
                doc: normalizedUsername,
                role: "professor",
                professor_id: professorId,
                updated_at: serverTimestamp() as any
              };
              
              await setDoc(userDocRef, sanitizeData(newUser));
              userDocSnap = await getDoc(userDocRef);
            } else {
              throw new Error("Usuário não encontrado no banco de dados.");
            }
        }
      }

      return { 
        user: userDocSnap.data() as User, 
        token: await firebaseUser.getIdToken()
      };
    } catch (error: any) {
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        // Check if this is an athlete or professor that was added by admin but doesn't have an auth account yet
        // Only if the password used matches the CPF (default behavior)
        if (normalizedPassword === normalizedUsername && normalizedUsername.length >= 11) {
          try {
            const qAthlete = query(collection(db, "athletes"), where("doc", "==", normalizedUsername));
            const qProfessor = query(collection(db, "professors"), where("doc", "==", normalizedUsername));
            
            const [athleteSnapshot, professorSnapshot] = await Promise.all([
              getDocs(qAthlete),
              getDocs(qProfessor)
            ]);
            
            if (!athleteSnapshot.empty || !professorSnapshot.empty) {
              const isAthlete = !athleteSnapshot.empty;
              const personData = isAthlete ? athleteSnapshot.docs[0].data() : professorSnapshot.docs[0].data();
              const personId = isAthlete ? athleteSnapshot.docs[0].id : professorSnapshot.docs[0].id;
              
              // Lazy register: Create the Auth account now
              const userCredential = await createUserWithEmailAndPassword(auth, email, normalizedUsername);
              const firebaseUser = userCredential.user;
              
              const newUser: User = {
                id: firebaseUser.uid,
                name: (personData as any).name || (isAthlete ? "Novo Aluno" : "Professor"),
                email: email,
                doc: normalizedUsername,
                role: isAthlete ? "student" : "professor",
                athlete_id: isAthlete ? personId : undefined,
                professor_id: isAthlete ? undefined : personId,
                updated_at: serverTimestamp() as any
              };
              
              await setDoc(doc(db, "users", firebaseUser.uid), sanitizeData(newUser));
              return { user: newUser, token: await firebaseUser.getIdToken() };
            }
          } catch (regErr) {
            console.error("Lazy registration failed:", regErr);
          }
        }
        
        throw new Error("CPF ou senha incorretos.");
      }
      handleFirestoreError(error, OperationType.GET, "auth/login");
    }
  },

  loginWithGoogle: async (): Promise<AuthResponse> => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;
      
      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      let userData: User;
      if (userDocSnap.exists()) {
        userData = userDocSnap.data() as User;
      } else {
        // Create new user doc
        const isAdminEmail = firebaseUser.email === "piruaesporteclube@gmail.com";
        userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || (isAdminEmail ? "Administrador Principal" : "Usuário Google"),
          doc: isAdminEmail ? "05504043689" : "",
          role: isAdminEmail ? "admin" : "student"
        };
        await setDoc(userDocRef, sanitizeData(userData));
      }
      
      return { user: userData, token: await firebaseUser.getIdToken() };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "auth/google");
    }
  },

  register: async (athleteData: Partial<Athlete>, anamnesisData?: Partial<Anamnesis>): Promise<{ athlete: Athlete, user: User }> => {
    if (!athleteData.doc) throw new Error("CPF é obrigatório");
    
    const normalizedDoc = athleteData.doc.replace(/\D/g, "");
    if (normalizedDoc.length < 11) {
      throw new Error("CPF inválido. Deve conter pelo menos 11 dígitos.");
    }
    
    // Prefer real email if provided, otherwise fallback to generated one
    const email = athleteData.email || `${normalizedDoc}@pirua.com.br`;
    const password = normalizedDoc;
    
    try {
      console.log("Starting registration for:", email);
      
      // 1. Check if CPF already exists in athletes collection
      const q = query(collection(db, "athletes"), where("doc", "==", normalizedDoc));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        throw new Error("Este CPF já está cadastrado no sistema.");
      }

      // 2. Ensure we are signed out first to avoid conflicts
      await signOut(auth);

      // 2. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log("Auth user created:", firebaseUser.uid);

      // 3. Prepare Batch for atomic write
      const batch = writeBatch(db);
      
      const athleteId = doc(collection(db, "athletes")).id;
      console.log("Generated Athlete ID:", athleteId);
      const newAthlete = {
        ...athleteData,
        id: athleteId,
        doc: normalizedDoc,
        email: email,
        status: "Ativo",
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      } as any;
      
      const newUser: User = {
        id: firebaseUser.uid,
        name: athleteData.name || "Novo Aluno",
        email: email,
        doc: normalizedDoc,
        role: "student",
        athlete_id: athleteId,
        updated_at: serverTimestamp() as any
      };

      console.log("Setting batch docs...");
      console.log("New Athlete Keys:", Object.keys(newAthlete));
      if (newAthlete.photo) {
        console.log("Photo size (chars):", newAthlete.photo.length);
      } else {
        console.log("Photo is MISSING from newAthlete");
      }
      
      batch.set(doc(db, "athletes", athleteId), sanitizeData(newAthlete));
      batch.set(doc(db, "users", firebaseUser.uid), sanitizeData(newUser));
      
      // 4. Include Anamnesis in batch if provided
      if (anamnesisData) {
        const anamnesisDoc = {
          ...anamnesisData,
          athlete_id: athleteId,
          created_at: serverTimestamp(),
          updated_at: serverTimestamp()
        };
        batch.set(doc(db, "anamnesis", athleteId), sanitizeData(anamnesisDoc));
      }

      console.log("Committing batch...");
      await batch.commit();
      console.log("Batch committed successfully");
      
      // 5. Sign out the new user to ensure they have to log in properly
      await signOut(auth);
      
      return { athlete: newAthlete, user: newUser };
    } catch (error: any) {
      console.error("Detailed Registration Error:", error);
      
      if (error.code === 'auth/email-already-in-use') {
        throw new Error("Este CPF já está cadastrado no sistema.");
      }
      
      if (error.code === 'auth/weak-password') {
        throw new Error("A senha (CPF) é muito fraca. Por favor, use um CPF válido.");
      }

      if (error.code === 'auth/operation-not-allowed') {
        throw new Error("O login por E-mail/Senha não está ativado no Firebase Console.");
      }

      if (error.message && (error.message.includes("permission-denied") || error.message.includes("insufficient permissions"))) {
        throw new Error("Erro de permissão no banco de dados. Verifique se todos os campos obrigatórios foram preenchidos corretamente.");
      }

      handleFirestoreError(error, OperationType.WRITE, "registration/batch");
    }
  },

  loginGuest: async (): Promise<AuthResponse> => {
    try {
      const userCredential = await signInAnonymously(auth);
      const firebaseUser = userCredential.user;
      const guestUser: User = { id: firebaseUser.uid, name: "Visitante", doc: "", role: "student" };
      return { user: guestUser, token: await firebaseUser.getIdToken() };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "auth/guest");
    }
  },

  getUserDoc: async (uid: string): Promise<User | null> => {
    try {
      const docSnap = await getDoc(doc(db, "users", uid));
      if (docSnap.exists()) {
        return docSnap.data() as User;
      }
      return null;
    } catch (e) {
      console.error("Error fetching user data", e);
      return null;
    }
  },

  logout: () => signOut(auth),
  
  clearPersistence: async () => {
    try {
      await terminate(db);
      await clearIndexedDbPersistence(db);
      window.location.reload();
    } catch (error) {
      console.error("Error clearing persistence:", error);
    }
  },

  // Athletes
  subscribeToAthletes: (callback: (athletes: Athlete[]) => void) => {
    return onSnapshot(collection(db, "athletes"), (snapshot) => {
      const athletes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Athlete));
      callback(athletes);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "athletes/subscription");
    });
  },

  subscribeToAthlete: (id: string, callback: (athlete: Athlete | null) => void) => {
    return onSnapshot(doc(db, "athletes", id), (snapshot) => {
      if (snapshot.exists()) {
        callback({ ...snapshot.data(), id: snapshot.id } as Athlete);
      } else {
        callback(null);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `athletes/${id}/subscription`);
    });
  },

  getAthlete: async (id: string): Promise<Athlete | null> => {
    const cacheKey = `athlete_${id}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    try {
      const docSnap = await getDocWithCacheFallback(doc(db, "athletes", id));
      if (docSnap.exists()) {
        const data = { ...(docSnap.data() as any), id: docSnap.id } as Athlete;
        setCachedData(cacheKey, data);
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `athletes/${id}`);
      return null;
    }
  },

  getAthletes: async (): Promise<Athlete[]> => {
    const cached = getCachedData("athletes");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "athletes"));
      const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Athlete));
      setCachedData("athletes", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "athletes");
      return [];
    }
  },
  saveAthlete: async (athlete: Partial<Athlete>) => {
    // Normalize CPF if present
    const sanitizedAthlete = { ...athlete };
    if (sanitizedAthlete.doc) {
      sanitizedAthlete.doc = sanitizedAthlete.doc.replace(/\D/g, "");
    }
    if (sanitizedAthlete.guardian_doc) {
      sanitizedAthlete.guardian_doc = sanitizedAthlete.guardian_doc.replace(/\D/g, "");
    }

    if (!athlete.id) athlete.id = doc(collection(db, "athletes")).id;

    try {
      // Check for duplicate CPF
      if (sanitizedAthlete.doc) {
        const q = query(
          collection(db, "athletes"), 
          where("doc", "==", sanitizedAthlete.doc)
        );
        const querySnapshot = await getDocs(q);
        const duplicate = querySnapshot.docs.find(doc => doc.id !== athlete.id);
        if (duplicate) {
          throw new Error("Este CPF já está cadastrado para outro atleta.");
        }
      }

      const finalData = { 
        ...sanitizedAthlete,
        updated_at: serverTimestamp()
      };

      await setDoc(doc(db, "athletes", athlete.id), sanitizeData(finalData), { merge: true });
      delete cache["athletes"]; // Invalidate cache
    } catch (error) {
      if (error instanceof Error && error.message.includes("cadastrado")) {
        throw error;
      }
      handleFirestoreError(error, OperationType.WRITE, `athletes/${athlete.id}`);
    }
  },
  deleteAthlete: async (id: string) => {
    try {
      await deleteDoc(doc(db, "athletes", id));
      delete cache["athletes"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `athletes/${id}`);
    }
  },

  // Professors
  getProfessor: async (id: string): Promise<Professor | null> => {
    const cacheKey = `professor_${id}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    try {
      const docSnap = await getDocWithCacheFallback(doc(db, "professors", id));
      if (docSnap.exists()) {
        const data = { ...(docSnap.data() as any), id: docSnap.id } as Professor;
        setCachedData(cacheKey, data);
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `professors/${id}`);
      return null;
    }
  },

  getProfessors: async (): Promise<Professor[]> => {
    const cached = getCachedData("professors");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "professors"));
      const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Professor));
      setCachedData("professors", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "professors");
      return [];
    }
  },
  saveProfessor: async (professor: Partial<Professor>) => {
    const sanitizedProfessor = { ...professor };
    if (sanitizedProfessor.doc) {
      sanitizedProfessor.doc = sanitizedProfessor.doc.replace(/\D/g, "");
    }

    if (!sanitizedProfessor.id) sanitizedProfessor.id = doc(collection(db, "professors")).id;

    try {
      // Check for duplicate CPF
      if (sanitizedProfessor.doc) {
        const q = query(
          collection(db, "professors"), 
          where("doc", "==", sanitizedProfessor.doc)
        );
        const querySnapshot = await getDocs(q);
        const duplicate = querySnapshot.docs.find(doc => doc.id !== sanitizedProfessor.id);
        if (duplicate) {
          throw new Error("Este CPF já está cadastrado para outro professor.");
        }
      }

      const data = { ...sanitizedProfessor, updated_at: serverTimestamp() };
      await setDoc(doc(db, "professors", sanitizedProfessor.id!), sanitizeData(data), { merge: true });
      delete cache["professors"]; // Invalidate cache
    } catch (error) {
      if (error instanceof Error && error.message.includes("cadastrado")) {
        throw error;
      }
      handleFirestoreError(error, OperationType.WRITE, `professors/${professor.id}`);
    }
  },
  deleteProfessor: async (id: string) => {
    try {
      await deleteDoc(doc(db, "professors", id));
      delete cache["professors"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `professors/${id}`);
    }
  },

  // Events
  getEvent: async (id: string): Promise<Event | null> => {
    const cacheKey = `event_${id}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    try {
      const docSnap = await getDocWithCacheFallback(doc(db, "events", id));
      if (docSnap.exists()) {
        const data = { ...(docSnap.data() as any), id: docSnap.id } as Event;
        setCachedData(cacheKey, data);
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `events/${id}`);
      return null;
    }
  },

  getEvents: async (): Promise<Event[]> => {
    const cached = getCachedData("events");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "events"));
      const data = querySnapshot.docs
        .map(doc => ({ ...(doc.data() as any), id: doc.id } as Event))
        .sort((a, b) => b.start_date.localeCompare(a.start_date));
      setCachedData("events", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "events");
      return [];
    }
  },
  saveEvent: async (event: Partial<Event>) => {
    if (!event.id) event.id = doc(collection(db, "events")).id;
    try {
      const data = { ...event, updated_at: serverTimestamp() };
      await setDoc(doc(db, "events", event.id), sanitizeData(data), { merge: true });
      delete cache["events"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
    }
  },
  deleteEvent: async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
      delete cache["events"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
    }
  },

  // Attendance
  subscribeToAttendance: (callback: (attendance: Attendance[]) => void, date?: string, training_id?: string, event_id?: string) => {
    let q = query(collection(db, "attendance"));
    if (date) q = query(q, where("date", "==", date));
    if (training_id) q = query(q, where("training_id", "==", training_id));
    if (event_id) q = query(q, where("event_id", "==", event_id));
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Attendance);
      callback(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "attendance/subscription");
    });
  },

  getAttendance: async (date?: string, athlete_id?: string, training_id?: string, event_id?: string): Promise<Attendance[]> => {
    const cacheKey = `attendance_${date || 'all'}_${athlete_id || 'all'}_${training_id || 'all'}_${event_id || 'all'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      let q = query(collection(db, "attendance"));
      if (date) q = query(q, where("date", "==", date));
      if (athlete_id) q = query(q, where("athlete_id", "==", athlete_id));
      if (training_id) q = query(q, where("training_id", "==", training_id));
      if (event_id) q = query(q, where("event_id", "==", event_id));
      
      const querySnapshot = await getDocsWithCacheFallback(q);
      const data = querySnapshot.docs.map(doc => doc.data() as Attendance);
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "attendance");
      return [];
    }
  },
  saveAttendance: async (attendance: Partial<Attendance>) => {
    if (!attendance.id) attendance.id = doc(collection(db, "attendance")).id;
    try {
      const data = { ...attendance, updated_at: serverTimestamp() };
      await setDoc(doc(db, "attendance", attendance.id), sanitizeData(data), { merge: true });
      // Invalidate all attendance cache
      Object.keys(cache).forEach(key => {
        if (key.startsWith('attendance_')) delete cache[key];
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendance.id}`);
    }
  },

  // Anamnesis
  getAnamnesis: async (athlete_id: string): Promise<Anamnesis> => {
    const cacheKey = `anamnesis_${athlete_id}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const docSnap = await getDocWithCacheFallback(doc(db, "anamnesis", athlete_id));
      if (docSnap.exists()) {
        const data = docSnap.data() as Anamnesis;
        setCachedData(cacheKey, data);
        return data;
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `anamnesis/${athlete_id}`);
    }
    return { athlete_id } as Anamnesis;
  },
  saveAnamnesis: async (anamnesis: Partial<Anamnesis>) => {
    if (!anamnesis.athlete_id) throw new Error("ID do atleta é obrigatório");
    try {
      const data = { ...anamnesis, updated_at: serverTimestamp() };
      await setDoc(doc(db, "anamnesis", anamnesis.athlete_id), sanitizeData(data), { merge: true });
      delete cache[`anamnesis_${anamnesis.athlete_id}`]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `anamnesis/${anamnesis.athlete_id}`);
    }
  },

  // Lineups (using a subcollection or separate collection)
  getLineup: async (event_id: string, lineup_index: number = 0): Promise<{ athletes: Athlete[], staff: Professor[], category?: string }> => {
    const cacheKey = `lineup_${event_id}_${lineup_index}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const q = query(
        collection(db, "event_lineups"), 
        where("event_id", "==", event_id),
        where("lineup_index", "==", lineup_index)
      );
      const querySnapshot = await getDocsWithCacheFallback(q);
      const lineupData = querySnapshot.docs.map(doc => doc.data() as any);
      
      const category = lineupData.length > 0 ? lineupData[0].category : undefined;
      const athleteIds = lineupData.filter(d => d.type === 'athlete' || !d.type).map(d => d.person_id || d.athlete_id);
      const staffIds = lineupData.filter(d => d.type === 'staff').map(d => d.person_id);
      
      const allAthletes = await api.getAthletes();
      const allProfessors = await api.getProfessors();

      const athletes = allAthletes
        .filter(a => athleteIds.includes(a.id))
        .map(a => {
          const el = lineupData.find(d => (d.person_id === a.id || d.athlete_id === a.id) && (d.type === 'athlete' || !d.type));
          return { ...a, confirmation: el?.confirmation || "Pendente", presence: el?.presence };
        });

      const staff = allProfessors
        .filter(p => staffIds.includes(p.id))
        .map(p => {
          const el = lineupData.find(d => d.person_id === p.id && d.type === 'staff');
          return { ...p, confirmation: el?.confirmation || "Pendente", presence: el?.presence };
        });
      
      const result = { athletes, staff, category };
      setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "event_lineups");
      return { athletes: [], staff: [] };
    }
  },
  saveLineup: async (event_id: string, athlete_ids: string[], staff_ids: string[] = [], lineup_index: number = 0, category?: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete existing for this specific lineup
      const q = query(
        collection(db, "event_lineups"), 
        where("event_id", "==", event_id),
        where("lineup_index", "==", lineup_index)
      );
      const querySnapshot = await getDocs(q);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Add athletes
      athlete_ids.forEach(aid => {
        const id = `${event_id}_${lineup_index}_athlete_${aid}`;
        batch.set(doc(db, "event_lineups", id), {
          event_id,
          lineup_index,
          person_id: aid,
          type: 'athlete',
          category,
          confirmation: "Pendente",
          updated_at: serverTimestamp()
        });
      });

      // Add staff
      staff_ids.forEach(sid => {
        const id = `${event_id}_${lineup_index}_staff_${sid}`;
        batch.set(doc(db, "event_lineups", id), {
          event_id,
          lineup_index,
          person_id: sid,
          type: 'staff',
          category,
          confirmation: "Pendente",
          updated_at: serverTimestamp()
        });
      });
      
      await batch.commit();
      delete cache[`lineup_${event_id}_${lineup_index}`];
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "event_lineups");
    }
  },
  
  // Named Lineup Templates
  getNamedLineups: async (): Promise<{ id: string, name: string, athlete_ids: string[], staff_ids: string[], created_at: any }[]> => {
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "named_lineups"));
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as any));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "named_lineups");
      return [];
    }
  },
  saveNamedLineup: async (name: string, athlete_ids: string[], staff_ids: string[] = []) => {
    try {
      const id = doc(collection(db, "named_lineups")).id;
      await setDoc(doc(db, "named_lineups", id), {
        id,
        name,
        athlete_ids,
        staff_ids,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "named_lineups");
    }
  },
  deleteNamedLineup: async (id: string) => {
    try {
      await deleteDoc(doc(db, "named_lineups", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `named_lineups/${id}`);
    }
  },
  addPersonToLineup: async (event_id: string, person_id: string, type: 'athlete' | 'staff', lineup_index: number = 0) => {
    try {
      const id = `${event_id}_${lineup_index}_${type}_${person_id}`;
      await setDoc(doc(db, "event_lineups", id), {
        event_id,
        lineup_index,
        person_id,
        type,
        confirmation: "Pendente",
        updated_at: serverTimestamp()
      }, { merge: true });
      delete cache[`lineup_${event_id}_${lineup_index}`];
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `event_lineups/${event_id}_${lineup_index}_${type}_${person_id}`);
    }
  },
  removePersonFromLineup: async (event_id: string, person_id: string, type: 'athlete' | 'staff', lineup_index: number = 0) => {
    try {
      const id = `${event_id}_${lineup_index}_${type}_${person_id}`;
      await deleteDoc(doc(db, "event_lineups", id));
      
      // Also try to delete old format if it was index 0
      if (lineup_index === 0 && type === 'athlete') {
        const oldId = `${event_id}_${person_id}`;
        await deleteDoc(doc(db, "event_lineups", oldId));
      }
      
      delete cache[`lineup_${event_id}_${lineup_index}`];
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `event_lineups/${event_id}_${lineup_index}_${type}_${person_id}`);
    }
  },
  confirmLineup: async (event_id: string, person_id: string, type: 'athlete' | 'staff', confirmation: string, lineup_index: number = 0) => {
    try {
      const id = `${event_id}_${lineup_index}_${type}_${person_id}`;
      // Check if doc exists with new ID format, fallback to old if needed for athletes
      const docRef = doc(db, "event_lineups", id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, { 
          confirmation,
          updated_at: serverTimestamp()
        });
      } else if (type === 'athlete' && lineup_index === 0) {
        // Fallback for old athlete ID format (only for index 0)
        const oldId = `${event_id}_${person_id}`;
        const oldDocRef = doc(db, "event_lineups", oldId);
        const oldDocSnap = await getDoc(oldDocRef);
        if (oldDocSnap.exists()) {
          await updateDoc(oldDocRef, { 
            confirmation,
            updated_at: serverTimestamp()
          });
        }
      }
      delete cache[`lineup_${event_id}_${lineup_index}`];
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `event_lineups/${event_id}_${lineup_index}_${type}_${person_id}`);
    }
  },

  updateLineupPresence: async (event_id: string, person_id: string, type: 'athlete' | 'staff', presence: "Presente" | "Ausente", lineup_index: number = 0) => {
    try {
      const id = `${event_id}_${lineup_index}_${type}_${person_id}`;
      const docRef = doc(db, "event_lineups", id);
      await updateDoc(docRef, { presence, updated_at: serverTimestamp() });
      delete cache[`lineup_${event_id}_${lineup_index}`];
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `event_lineups/${event_id}_${lineup_index}_${type}_${person_id}`);
    }
  },

  getAllEventLineups: async (event_id: string): Promise<{ athletes: Athlete[], staff: Professor[], lineup_index: number, category?: string }[]> => {
    try {
      const q = query(
        collection(db, "event_lineups"), 
        where("event_id", "==", event_id)
      );
      const querySnapshot = await getDocsWithCacheFallback(q);
      const allLineupData = querySnapshot.docs.map(doc => doc.data() as any);
      
      const indexes = [...new Set(allLineupData.map(d => d.lineup_index))];
      const allAthletes = await api.getAthletes();
      const allProfessors = await api.getProfessors();

      return (indexes as number[]).map(idx => {
        const lineupData = allLineupData.filter(d => d.lineup_index === idx);
        const category = lineupData.length > 0 ? lineupData[0].category : undefined;
        const athleteIds = lineupData.filter(d => d.type === 'athlete' || !d.type).map(d => d.person_id || d.athlete_id);
        const staffIds = lineupData.filter(d => d.type === 'staff').map(d => d.person_id);

        const athletes = allAthletes
          .filter(a => athleteIds.includes(a.id))
          .map(a => {
            const el = lineupData.find(d => (d.person_id === a.id || d.athlete_id === a.id) && (d.type === 'athlete' || !d.type));
            return { ...a, confirmation: el?.confirmation || "Pendente", presence: el?.presence };
          });

        const staff = allProfessors
          .filter(p => staffIds.includes(p.id))
          .map(p => {
            const el = lineupData.find(d => d.person_id === p.id && d.type === 'staff');
            return { ...p, confirmation: el?.confirmation || "Pendente", presence: el?.presence };
          });

        return { athletes, staff, lineup_index: idx, category };
      });
    } catch (error) {
       console.error("Error fetching event lineups:", error);
       return [];
    }
  },

  subscribeToAthleteLineups: (athlete_id: string, callback: (events: Event[]) => void) => {
    const q = query(
      collection(db, "event_lineups"), 
      where("person_id", "==", athlete_id),
      where("type", "==", "athlete")
    );
    
    return onSnapshot(q, async (snapshot) => {
      const eventIds = [...new Set(snapshot.docs.map(doc => doc.data().event_id))];
      if (eventIds.length === 0) {
        callback([]);
        return;
      }
      const allEvents = await api.getEvents();
      const athleteEvents = allEvents.filter(e => eventIds.includes(e.id));
      callback(athleteEvents);
    });
  },

  checkAthleteLineups: async (athlete_id: string): Promise<Event[]> => {
    try {
      const q = query(
        collection(db, "event_lineups"), 
        where("person_id", "==", athlete_id),
        where("type", "==", "athlete")
      );
      const querySnapshot = await getDocs(q);
      const eventIds = [...new Set(querySnapshot.docs.map(doc => doc.data().event_id))];
      
      if (eventIds.length === 0) return [];
      
      const allEvents = await api.getEvents();
      
      return allEvents.filter(e => eventIds.includes(e.id));
    } catch (error) {
      console.error("Error checking athlete lineups:", error);
      return [];
    }
  },

  // Sponsors
  getSponsors: async (): Promise<Sponsor[]> => {
    const cached = getCachedData("sponsors");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "sponsors"));
      const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Sponsor));
      setCachedData("sponsors", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "sponsors");
      return [];
    }
  },
  saveSponsor: async (sponsor: Partial<Sponsor>) => {
    if (!sponsor.id) sponsor.id = doc(collection(db, "sponsors")).id;
    try {
      const data = { ...sponsor, updated_at: serverTimestamp() };
      await setDoc(doc(db, "sponsors", sponsor.id), sanitizeData(data), { merge: true });
      delete cache["sponsors"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sponsors/${sponsor.id}`);
    }
  },
  deleteSponsor: async (id: string) => {
    try {
      await deleteDoc(doc(db, "sponsors", id));
      delete cache["sponsors"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sponsors/${id}`);
    }
  },

  // Championships
  getChampionships: async (): Promise<Championship[]> => {
    const cached = getCachedData("championships");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "championships"));
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Championship));
      setCachedData("championships", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "championships");
      return [];
    }
  },
  saveChampionship: async (championship: Partial<Championship>) => {
    if (!championship.id) championship.id = doc(collection(db, "championships")).id;
    try {
      const data = { ...championship, updated_at: serverTimestamp() };
      await setDoc(doc(db, "championships", championship.id), sanitizeData(data), { merge: true });
      delete cache["championships"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `championships/${championship.id}`);
    }
  },
  deleteChampionship: async (id: string) => {
    try {
      await deleteDoc(doc(db, "championships", id));
      delete cache["championships"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `championships/${id}`);
    }
  },

  // Championship Teams
  getChampionshipTeams: async (championshipId?: string): Promise<ChampionshipTeam[]> => {
    const cacheKey = `championship_teams_${championshipId || 'all'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    try {
      let q = query(collection(db, "championship_teams"));
      if (championshipId) q = query(q, where("championship_id", "==", championshipId));
      const querySnapshot = await getDocsWithCacheFallback(q);
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChampionshipTeam));
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "championship_teams");
      return [];
    }
  },
  getChampionshipTeamsByResponsibleDoc: async (championshipId: string, docNum: string): Promise<ChampionshipTeam[]> => {
    try {
      const q = query(
        collection(db, "championship_teams"), 
        where("championship_id", "==", championshipId),
        where("responsible_doc", "==", docNum.replace(/\D/g, ""))
      );
      const querySnapshot = await getDocsWithCacheFallback(q);
      return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChampionshipTeam));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "championship_teams_by_doc");
      return [];
    }
  },
  saveChampionshipTeam: async (team: Partial<ChampionshipTeam>) => {
    if (!team.id) team.id = doc(collection(db, "championship_teams")).id;
    try {
      const data = { ...team, created_at: team.created_at || serverTimestamp() };
      await setDoc(doc(db, "championship_teams", team.id), sanitizeData(data), { merge: true });
      // Invalidate related caches
      Object.keys(cache).forEach(key => {
        if (key.startsWith('championship_teams_')) delete cache[key];
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `championship_teams/${team.id}`);
    }
  },

  // Championship Matches
  getChampionshipMatches: async (championshipId?: string): Promise<ChampionshipMatch[]> => {
    const cacheKey = `championship_matches_${championshipId || 'all'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    try {
      let q = query(collection(db, "championship_matches"));
      if (championshipId) q = query(q, where("championship_id", "==", championshipId));
      const querySnapshot = await getDocsWithCacheFallback(q);
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as ChampionshipMatch));
      setCachedData(cacheKey, data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "championship_matches");
      return [];
    }
  },
  saveChampionshipMatch: async (match: Partial<ChampionshipMatch>) => {
    if (!match.id) match.id = doc(collection(db, "championship_matches")).id;
    try {
      const data = { ...match, updated_at: serverTimestamp() };
      await setDoc(doc(db, "championship_matches", match.id), sanitizeData(data), { merge: true });
      // Invalidate related caches
      Object.keys(cache).forEach(key => {
        if (key.startsWith('championship_matches_')) delete cache[key];
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `championship_matches/${match.id}`);
    }
  },

  // Uniform Models
  getUniformModels: async (): Promise<UniformModel[]> => {
    const cached = getCachedData("uniform_models");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "uniform_models"));
      const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as UniformModel));
      setCachedData("uniform_models", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "uniform_models");
      return [];
    }
  },
  saveUniformModel: async (model: Partial<UniformModel>) => {
    if (!model.id) model.id = doc(collection(db, "uniform_models")).id;
    try {
      const data = { ...model, updated_at: serverTimestamp() };
      await setDoc(doc(db, "uniform_models", model.id), sanitizeData(data), { merge: true });
      delete cache["uniform_models"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `uniform_models/${model.id}`);
    }
  },
  deleteUniformModel: async (id: string) => {
    try {
      await deleteDoc(doc(db, "uniform_models", id));
      delete cache["uniform_models"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `uniform_models/${id}`);
    }
  },

  // Trainings
  getTrainings: async (): Promise<Training[]> => {
    const cached = getCachedData("trainings");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "trainings"));
      const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Training));
      setCachedData("trainings", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "trainings");
      return [];
    }
  },

  getTraining: async (id: string): Promise<Training | null> => {
    const cacheKey = `training_${id}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;
    try {
      const docSnap = await getDocWithCacheFallback(doc(db, "trainings", id));
      if (docSnap.exists()) {
        const data = { ...docSnap.data(), id: docSnap.id } as Training;
        setCachedData(cacheKey, data);
        return data;
      }
      return null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `trainings/${id}`);
      return null;
    }
  },
  saveTraining: async (training: Partial<Training>) => {
    if (!training.id) training.id = doc(collection(db, "trainings")).id;
    try {
      const data = { ...training, updated_at: serverTimestamp() };
      await setDoc(doc(db, "trainings", training.id), sanitizeData(data), { merge: true });
      delete cache["trainings"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trainings/${training.id}`);
    }
  },
  deleteTraining: async (id: string) => {
    try {
      await deleteDoc(doc(db, "trainings", id));
      delete cache["trainings"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `trainings/${id}`);
    }
  },
  updateTrainingsOrder: async (orderedTrainings: Training[]) => {
    try {
      const batch = writeBatch(db);
      orderedTrainings.forEach((training, index) => {
        batch.update(doc(db, "trainings", training.id), { 
          order: index,
          updated_at: serverTimestamp()
        });
      });
      await batch.commit();
      delete cache["trainings"];
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "trainings/reorder");
    }
  },

  // Training Activities
  getActivities: async (): Promise<TrainingActivity[]> => {
    const cached = getCachedData("training_activities");
    if (cached) return cached;
    try {
      const querySnapshot = await getDocsWithCacheFallback(collection(db, "training_activities"));
      const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as TrainingActivity));
      setCachedData("training_activities", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "training_activities");
      return [];
    }
  },
  saveActivity: async (activity: Partial<TrainingActivity>) => {
    if (!activity.id) activity.id = doc(collection(db, "training_activities")).id;
    try {
      const data = { ...activity, updated_at: serverTimestamp() };
      await setDoc(doc(db, "training_activities", activity.id), sanitizeData(data), { merge: true });
      delete cache["training_activities"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `training_activities/${activity.id}`);
    }
  },
  deleteActivity: async (id: string) => {
    try {
      await deleteDoc(doc(db, "training_activities", id));
      delete cache["training_activities"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `training_activities/${id}`);
    }
  },

  // Settings
  getSettings: async (): Promise<Settings | null> => {
    const cacheKey = "global_settings";
    
    // 1. Memory Cache
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    // 2. LocalStorage Cache (Secondary)
    const localSaved = localStorage.getItem('pirua_settings_cache');
    if (localSaved) {
      try {
        const parsed = JSON.parse(localSaved);
        // Use local data immediately but also try to refresh in background
        setCachedData(cacheKey, parsed);
      } catch (e) {
        console.warn("Failed to parse local settings cache");
      }
    }

    try {
      const docSnap = await getDocWithCacheFallback(doc(db, "settings", "global_settings"));
      if (docSnap.exists()) {
        const data = docSnap.data() as Settings;
        setCachedData(cacheKey, data);
        localStorage.setItem('pirua_settings_cache', JSON.stringify(data));
        return data;
      }
      
      // If doc doesn't exist but we have local cache, return it
      const currentCache = getCachedData(cacheKey);
      if (currentCache) return currentCache;
      
      return null;
    } catch (error) {
      // If error (like quota) but we have local cache, return it
      const currentCache = getCachedData(cacheKey);
      if (currentCache) return currentCache;
      
      handleFirestoreError(error, OperationType.GET, "settings/global_settings");
      return null;
    }
  },
  saveSettings: async (settings: Partial<Settings>) => {
    try {
      const data = { ...settings, updated_at: serverTimestamp() };
      await setDoc(doc(db, "settings", "global_settings"), sanitizeData(data), { merge: true });
      delete cache["global_settings"]; // Invalidate memory cache
      // Update local storage cache
      const current = await api.getSettings();
      if (current) {
        localStorage.setItem('pirua_settings_cache', JSON.stringify({ ...current, ...settings }));
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "settings/global_settings");
    }
  },

  // Official Letters
  getOfficialLetters: async (): Promise<OfficialLetter[]> => {
    const cached = getCachedData("official_letters");
    if (cached) return cached;
    try {
      const q = query(collection(db, "official_letters"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocsWithCacheFallback(q);
      const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as OfficialLetter));
      setCachedData("official_letters", data);
      return data;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "official_letters");
      return [];
    }
  },
  saveOfficialLetter: async (letter: Partial<OfficialLetter>) => {
    try {
      const id = letter.id || doc(collection(db, "official_letters")).id;
      const data = { 
        ...letter, 
        id,
        created_at: letter.created_at || serverTimestamp(),
        updated_at: serverTimestamp() 
      };
      await setDoc(doc(db, "official_letters", id), sanitizeData(data), { merge: true });
      delete cache["official_letters"]; // Invalidate cache
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "official_letters");
      throw error;
    }
  },
  deleteOfficialLetter: async (id: string) => {
    try {
      await deleteDoc(doc(db, "official_letters", id));
      delete cache["official_letters"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `official_letters/${id}`);
    }
  },

  // Event Companions
  getCompanions: async (eventId: string): Promise<Companion[]> => {
    try {
      const q = query(collection(db, "event_companions"), where("event_id", "==", eventId));
      const querySnapshot = await getDocsWithCacheFallback(q);
      return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Companion));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `event_companions?event_id=${eventId}`);
      return [];
    }
  },
  saveCompanion: async (companion: Partial<Companion>) => {
    try {
      const id = companion.id || doc(collection(db, "event_companions")).id;
      const data = { 
        ...companion, 
        id,
        created_at: serverTimestamp()
      };
      await setDoc(doc(db, "event_companions", id), sanitizeData(data), { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "event_companions");
      throw error;
    }
  },
  deleteCompanion: async (id: string) => {
    try {
      await deleteDoc(doc(db, "event_companions", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `event_companions/${id}`);
    }
  },
  updateCompanionPresence: async (id: string, presence: "Presente" | "Ausente") => {
    try {
      await updateDoc(doc(db, "event_companions", id), { presence, updated_at: serverTimestamp() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `event_companions/${id}`);
    }
  },

  // Event Match Scores
  getEventMatchScores: async (eventId: string): Promise<EventMatchScore[]> => {
    try {
      const q = query(collection(db, "event_matches"), where("event_id", "==", eventId), orderBy("created_at", "asc"));
      const querySnapshot = await getDocsWithCacheFallback(q);
      return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as EventMatchScore));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `event_matches?event_id=${eventId}`);
      return [];
    }
  },
  saveEventMatchScore: async (match: Partial<EventMatchScore>) => {
    try {
      const id = match.id || doc(collection(db, "event_matches")).id;
      const data = { 
        ...match, 
        id,
        updated_at: serverTimestamp(),
        created_at: match.created_at || serverTimestamp()
      };
      await setDoc(doc(db, "event_matches", id), sanitizeData(data), { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "event_matches");
      throw error;
    }
  },
  deleteEventMatchScore: async (id: string) => {
    try {
      await deleteDoc(doc(db, "event_matches", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `event_matches/${id}`);
    }
  },

  // Uniform Requests
  getUniformRequests: async (): Promise<UniformRequest[]> => {
    try {
      const q = query(collection(db, "uniform_requests"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocsWithCacheFallback(q);
      return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as UniformRequest));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "uniform_requests");
      return [];
    }
  },
  saveUniformRequest: async (request: Partial<UniformRequest>) => {
    try {
      const id = request.id || doc(collection(db, "uniform_requests")).id;
      const data = { 
        ...request, 
        id,
        created_at: request.created_at || serverTimestamp(),
        updated_at: serverTimestamp() 
      };
      await setDoc(doc(db, "uniform_requests", id), sanitizeData(data), { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "uniform_requests");
      throw error;
    }
  },
  deleteUniformRequest: async (id: string) => {
    try {
      await deleteDoc(doc(db, "uniform_requests", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `uniform_requests/${id}`);
    }
  },
  checkNumberAvailability: async (category: string, jerseyNumber: string, currentAthleteId?: string): Promise<boolean> => {
    try {
      // Check in athletes collection
      const athletes = await api.getAthletes();
      const isTakenByAthlete = athletes.some(a => {
        if (a.id === currentAthleteId) return false;
        const athleteCategory = getSubCategory(a.birth_date);
        return athleteCategory === category && a.jersey_number === jerseyNumber;
      });

      if (isTakenByAthlete) return false;

      // Check in pending/approved uniform requests to avoid double booking
      const requests = await api.getUniformRequests();
      const isTakenByRequest = requests.some(r => {
        if (r.athlete_id === currentAthleteId) return false;
        return r.category === category && 
               r.jersey_number === jerseyNumber && 
               (r.status === 'Pendente' || r.status === 'Aprovado' || r.status === 'Entregue');
      });

      return !isTakenByRequest;
    } catch (error) {
      console.error("Error checking number availability", error);
      return false;
    }
  },

  // Sponsor Blocks
  getSponsorBlocks: async (): Promise<SponsorBlock[]> => {
    try {
      const q = query(collection(db, "sponsor_blocks"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocsWithCacheFallback(q);
      return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as SponsorBlock));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "sponsor_blocks");
      return [];
    }
  },
  saveSponsorBlock: async (block: Partial<SponsorBlock>) => {
    try {
      const id = block.id || doc(collection(db, "sponsor_blocks")).id;
      const data = { 
        ...block, 
        id,
        updated_at: serverTimestamp(),
        created_at: block.created_at || serverTimestamp()
      };
      await setDoc(doc(db, "sponsor_blocks", id), sanitizeData(data), { merge: true });
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "sponsor_blocks");
      throw error;
    }
  },
  deleteSponsorBlock: async (id: string) => {
    try {
      await deleteDoc(doc(db, "sponsor_blocks", id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sponsor_blocks/${id}`);
    }
  },
};
