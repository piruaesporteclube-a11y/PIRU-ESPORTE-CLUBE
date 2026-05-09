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
  limit,
  getDocsFromCache,
  getDocFromCache,
  serverTimestamp,
  terminate,
  clearIndexedDbPersistence
} from "firebase/firestore";
import { auth, db } from "./firebase";
import { Athlete, Professor, Event, Attendance, Anamnesis, Settings, AuthResponse, User, Sponsor, UniformModel, Training, TrainingActivity, Championship, ChampionshipTeam, ChampionshipMatch, OfficialLetter, Companion, EventMatch, UniformRequest, getSubCategory, SponsorBlock, SchoolReport } from "./types";

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
  
  const quotaDetected = errorMessage.toLowerCase().includes("quota");

  const errInfo: FirestoreErrorInfo = {
    error: quotaDetected 
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
  if (!isQuotaError(error) || operationType !== OperationType.GET) {
    throw new Error(errInfo.error);
  }
}

// Simple cache to reduce read operations
const cache: Record<string, { data: any, timestamp: number }> = {};
const pendingRequests: { [key: string]: Promise<any> | null } = {};
const CACHE_TTL = 300000; // 5 minutes for "fresh" data
const PERSISTENT_CACHE_PREFIX = "pirua_cache_";
const STALE_TTL = 86400000; // 24 hours (can use very stale data if quota is out)

let quotaExceededToday = false;

const getCachedData = (key: string) => {
  // Check memory cache first
  const memoryCached = cache[key];
  if (memoryCached && (Date.now() - memoryCached.timestamp) < CACHE_TTL) {
    return memoryCached.data;
  }

  // Check localStorage
  try {
    const localCached = localStorage.getItem(PERSISTENT_CACHE_PREFIX + key);
    if (localCached) {
      const { data, timestamp } = JSON.parse(localCached);
      // Even if stale (up to 24h), we might want to return it if we are in quota-saving mode
      if ((Date.now() - timestamp) < STALE_TTL) {
        // Update memory cache
        cache[key] = { data, timestamp };
        return data;
      }
    }
  } catch (e) {
    console.warn("Storage cache error:", e);
  }
  return null;
};

const setCachedData = (key: string, data: any) => {
  const timestamp = Date.now();
  cache[key] = { data, timestamp };
  
  // Try to persist to localStorage if it's serializable
  try {
    // Only persist arrays or plain objects, not Firestore Snapshots directly
    if (data && typeof data === 'object' && !(data.docs || data.exists)) {
      localStorage.setItem(PERSISTENT_CACHE_PREFIX + key, JSON.stringify({ data, timestamp }));
    }
  } catch (e) {
    // Storage might be full or data too large
  }
};

export const clearCache = () => {
  for (const key in cache) {
    delete cache[key];
  }
  for (const key in pendingRequests) {
    pendingRequests[key] = null;
  }
  // Clear persistent cache
  try {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(PERSISTENT_CACHE_PREFIX)) {
        localStorage.removeItem(key);
      }
    });
  } catch (e) {}
};

const invalidateCache = (key: string) => {
  delete cache[key];
  try {
    localStorage.removeItem(PERSISTENT_CACHE_PREFIX + key);
    
    // Also invalidate any query cache that might contain this data
    // For simplicity, if we invalidate "trainings", we should clear any query containing "trainings"
    Object.keys(cache).forEach(k => {
      if (k.includes(key) || k.includes(`docs_`) && k.toLowerCase().includes(key.toLowerCase())) {
        delete cache[k];
      }
    });
    
    // Clear localStorage query caches too
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith(PERSISTENT_CACHE_PREFIX) && (k.includes(key) || k.toLowerCase().includes(key.toLowerCase()))) {
        localStorage.removeItem(k);
      }
    });
  } catch (e) {}
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
// testConnection(); // Remove unnecessary read on load

const isQuotaError = (error: any): boolean => {
  const message = String(error).toLowerCase();
  return message.includes('quota exceeded') || message.includes('quota limit exceeded') || message.includes('resource exhausted');
};

const getDocsWithCacheFallback = async (q: any) => {
  const key = `docs_${getCacheKey(q)}`;
  const cached = getCachedData(key);
  
  // If quota was already exceeded today, or we have very fresh data, return cached
  if (cached && (quotaExceededToday || (Date.now() - (cache[key]?.timestamp || 0) < CACHE_TTL))) {
    return cached;
  }
  
  if (pendingRequests[key]) return pendingRequests[key];

  const promise = (async () => {
    try {
      // Try server first if not already known to be over quota
      const snapshot = await getDocs(q);
      setCachedData(key, snapshot);
      pendingRequests[key] = null;
      return snapshot;
    } catch (error) {
      pendingRequests[key] = null;
      if (isQuotaError(error)) {
        quotaExceededToday = true;
        console.warn("Quota exceeded, attempting to load from cache...");
        
        // Return stale cache if available
        if (cached) return cached;

        try {
          const snapshot = await getDocsFromCache(q);
          if (snapshot) {
            setCachedData(key, snapshot);
            return snapshot;
          }
        } catch (cacheError) {
          console.error("Failed to load from cache:", cacheError);
        }
        
        return { docs: [], empty: true, size: 0, forEach: () => {} } as any;
      }
      throw error;
    }
  })();

  pendingRequests[key] = promise;
  return promise;
};

const getDocWithCacheFallback = async (docRef: any) => {
  const key = `doc_${docRef.path}`;
  const cached = getCachedData(key);
  if (cached) return cached;
  
  if (pendingRequests[key]) return pendingRequests[key];

  const promise = (async () => {
    try {
      const snapshot = await getDoc(docRef);
      setCachedData(key, snapshot);
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
          return { exists: () => false, data: () => undefined } as any;
        }
      }
      throw error;
    }
  })();

  pendingRequests[key] = promise;
  return promise;
};

const getCacheKey = (q: any) => {
  try {
    return q.path || (q._query && q._query.path && q._query.path.canonicalString()) || JSON.stringify(q);
  } catch (e) {
    return Math.random().toString();
  }
};

export const api = {
  // Auth
  onAuthChange: (callback: (user: any) => void) => {
    return onAuthStateChanged(auth, callback);
  },

  login: async (username: string, password: string): Promise<AuthResponse> => {
    const normalizedUsername = username.replace(/\D/g, "");
    const normalizedPassword = password.replace(/\D/g, "");
    const SUPPORT_CONTACT = "(37) 99124-3101";

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
        api.logAccess(adminUser);
        return { user: adminUser, token: await firebaseUser.getIdToken() };
      } catch (error: any) {
        console.error("Error during anonymous login:", error);
        
        // If anonymous login is disabled in Firebase Console, we provide a clear error
        if (error.code === 'auth/admin-restricted-operation' || error.code === 'auth/operation-not-allowed') {
          throw new Error(`O Login Anônimo está desativado no Console do Firebase. Por favor, habilite-o ou entre em contato com ${SUPPORT_CONTACT}.`);
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

    let email = username.includes("@") ? username : `${normalizedUsername}@pirua.com.br`;
    
    // Try to find the real email if login is by CPF
    if (!username.includes("@") && normalizedUsername.length >= 11) {
      try {
        const qUser = query(collection(db, "users"), where("doc", "==", normalizedUsername));
        const userSnapshot = await getDocsWithCacheFallback(qUser);
        if (!userSnapshot.empty) {
          const userData = userSnapshot.docs[0].data();
          if (userData.email) {
            email = userData.email;
          }
        }
      } catch (e) {
        console.warn("Could not fetch user email by CPF, using default domain fallback", e);
      }
    }
    
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

      const userData = userDocSnap.data() as User;

      // Check if athlete is pending before allowing login
      if (userData.role === 'student' && userData.athlete_id) {
        const athleteSnap = await getDoc(doc(db, "athletes", userData.athlete_id));
        if (athleteSnap.exists()) {
          const athleteData = athleteSnap.data() as Athlete;
          if (athleteData.confirmation === 'Pendente') {
            await signOut(auth);
            throw new Error(`Seu cadastro está em análise. Aguarde a aprovação ou contate ${SUPPORT_CONTACT}.`);
          }
          if (athleteData.confirmation === 'Recusado') {
            await signOut(auth);
            throw new Error(`Seu cadastro foi recusado. Entre em contato com ${SUPPORT_CONTACT}.`);
          }
        }
      }

      api.logAccess(userData);
      return { 
        user: userData, 
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
              api.logAccess(newUser);
              return { user: newUser, token: await firebaseUser.getIdToken() };
            }
          } catch (regErr) {
            console.error("Lazy registration failed:", regErr);
          }
        }
        
        api.logLoginError(normalizedUsername, "CPF ou senha incorretos.");
        throw new Error(`CPF ou senha incorretos. Suporte: ${SUPPORT_CONTACT}`);
      }
      api.logLoginError(normalizedUsername, error.message || "Erro desconhecido.");
      handleFirestoreError(error, OperationType.GET, "auth/login");
      throw error;
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
        // Find existing athlete or professor by email
        const qAthlete = query(collection(db, "athletes"), where("email", "==", firebaseUser.email));
        const qProfessor = query(collection(db, "professors"), where("email", "==", firebaseUser.email));
        
        const [athleteSnapshot, professorSnapshot] = await Promise.all([
          getDocsWithCacheFallback(qAthlete),
          getDocsWithCacheFallback(qProfessor)
        ]);

        const isAdminEmail = firebaseUser.email === "piruaesporteclube@gmail.com";
        const isAthlete = !athleteSnapshot.empty;
        const isProfessor = !professorSnapshot.empty;

        userData = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || (isAdminEmail ? "Administrador Principal" : "Usuário Google"),
          doc: isAdminEmail ? "05504043689" : (isAthlete ? (athleteSnapshot.docs[0].data() as Athlete).doc : (isProfessor ? (professorSnapshot.docs[0].data() as Professor).doc : "")),
          email: firebaseUser.email || "",
          role: isAdminEmail ? "admin" : (isProfessor ? "professor" : "student"),
          athlete_id: isAthlete ? athleteSnapshot.docs[0].id : undefined,
          professor_id: isProfessor ? professorSnapshot.docs[0].id : undefined,
          updated_at: serverTimestamp() as any
        };
        await setDoc(userDocRef, sanitizeData(userData));
      }

      // Check if athlete is pending before allowing login
      if (userData.role === 'student' && userData.athlete_id) {
        const athleteSnap = await getDoc(doc(db, "athletes", userData.athlete_id));
        if (athleteSnap.exists()) {
          const athleteData = athleteSnap.data() as Athlete;
          if (athleteData.confirmation === 'Pendente') {
            await signOut(auth);
            throw new Error("Seu cadastro está em análise. Por favor, aguarde a aprovação do administrador para acessar o sistema.");
          }
          if (athleteData.confirmation === 'Recusado') {
            await signOut(auth);
            throw new Error("Seu cadastro foi recusado. Por favor, entre em contato com a administração.");
          }
        }
      }
      
      api.logAccess(userData);
      return { user: userData, token: await firebaseUser.getIdToken() };
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, "auth/google");
      throw error;
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
      const querySnapshot = await getDocsWithCacheFallback(q);
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
        status: "Inativo",
        confirmation: "Pendente",
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
      throw error;
    }
  },

  getUserDoc: async (uid: string): Promise<User | null> => {
    try {
      const docSnap = await getDocWithCacheFallback(doc(db, "users", uid));
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
    // Initial fetch from cache or server
    api.getAthletes().then(callback);
    
    // Use a very limited snapshot or just don't use it if quota is low
    // For now, we'll keep it but we'll monitor if this continues to be an issue
    return onSnapshot(collection(db, "athletes"), (snapshot) => {
      const athletes = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Athlete));
      // Update cache manually when snapshot triggers
      setCachedData("athletes", athletes);
      callback(athletes);
    }, (error) => {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.GET, "athletes/subscription");
      } else {
        console.warn("Quota exceeded for athletes subscription, falling back to one-time fetch");
      }
    });
  },

  subscribeToAthlete: (id: string, callback: (athlete: Athlete | null) => void) => {
    // Initial fetch
    api.getAthlete(id).then(callback);

    return onSnapshot(doc(db, "athletes", id), (snapshot) => {
      if (snapshot.exists()) {
        const data = { ...snapshot.data(), id: snapshot.id } as Athlete;
        setCachedData(`athlete_${id}`, data);
        callback(data);
      } else {
        callback(null);
      }
    }, (error) => {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.GET, `athletes/${id}/subscription`);
      }
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
    const cacheKey = "athletes";
    const cached = getCachedData(cacheKey);
    
    // Background refresh
    const backgroundFetch = async () => {
      try {
        const querySnapshot = await getDocsWithCacheFallback(collection(db, "athletes"));
        const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Athlete))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCachedData(cacheKey, data);
        return data;
      } catch (e) {
        return cached || [];
      }
    };

    if (cached) {
      // Return cached immediately, refresh in background
      backgroundFetch().catch(() => {});
      return cached;
    }
    
    return backgroundFetch();
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
        // Enforce Inativo if Pending or Rejected
        ...(sanitizedAthlete.confirmation === 'Pendente' || sanitizedAthlete.confirmation === 'Recusado' ? { status: 'Inativo' as any } : {}),
        updated_at: serverTimestamp(),
        ...(!athlete.id || (athlete.id && !athlete.created_at) ? { created_at: serverTimestamp() } : {})
      };

      await setDoc(doc(db, "athletes", athlete.id), sanitizeData(finalData), { merge: true });
      invalidateCache("athletes"); // Invalidate cache
    } catch (error) {
      if (error instanceof Error && error.message.includes("cadastrado")) {
        throw error;
      }
      handleFirestoreError(error, OperationType.WRITE, `athletes/${athlete.id}`);
    }
  },
  approveAthlete: async (id: string) => {
    try {
      await updateDoc(doc(db, "athletes", id), {
        status: "Ativo",
        confirmation: "Confirmado",
        updated_at: serverTimestamp()
      });
      invalidateCache("athletes");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `athletes/${id}`);
    }
  },
  rejectAthlete: async (id: string) => {
    try {
      await updateDoc(doc(db, "athletes", id), {
        status: "Inativo",
        confirmation: "Recusado",
        updated_at: serverTimestamp()
      });
      invalidateCache("athletes");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `athletes/${id}`);
    }
  },
  updateAthleteStatus: async (id: string, status: 'Ativo' | 'Inativo', confirmation?: 'Confirmado' | 'Recusado' | 'Pendente') => {
    try {
      await updateDoc(doc(db, "athletes", id), {
        status,
        ...(confirmation ? { confirmation } : {}),
        updated_at: serverTimestamp()
      });
      invalidateCache("athletes");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `athletes/${id}`);
    }
  },
  deleteAthlete: async (id: string) => {
    try {
      await deleteDoc(doc(db, "athletes", id));
      invalidateCache("athletes"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `athletes/${id}`);
    }
  },

  whatsapp: {
    getStatus: async () => {
      try {
        const response = await fetch("/api/whatsapp/status");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (err: any) {
        console.error("WhatsApp status error:", err);
        return { 
          status: "disconnected", 
          error: true, 
          message: err.message || "Failed to fetch status"
        };
      }
    },
    connect: async () => {
      try {
        const response = await fetch("/api/whatsapp/connect", { method: "POST" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (err: any) {
        console.error("WhatsApp connect error:", err);
        return { success: false, error: err.message || "Failed to connect" };
      }
    },
    reset: async () => {
      try {
        const response = await fetch("/api/whatsapp/reset", { method: "POST" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (err: any) {
        console.error("WhatsApp reset error:", err);
        return { success: false, error: err.message || "Failed to reset" };
      }
    },
    logout: async () => {
      try {
        const response = await fetch("/api/whatsapp/logout", { method: "POST" });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (err: any) {
        console.error("WhatsApp logout error:", err);
        return { success: false, error: err.message || "Falha ao desconectar" };
      }
    },
    addToGroup: async (groupName: "Piruá Esporte Clube Responsáveis" | "Piruá Esporte Clube Atletas", phoneNumber: string) => {
      try {
        const response = await fetch("/api/whatsapp/add", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupName, phoneNumber }),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (err: any) {
        console.error("WhatsApp add error:", err);
        return { success: false, error: err.message || "Conexão falhou" };
      }
    },
    syncAthlete: async (athlete: { contact?: string, guardian_phone?: string }) => {
      const results: { 
        athlete: { success: boolean, message?: string, error?: string } | null, 
        guardian: { success: boolean, message?: string, error?: string } | null 
      } = { athlete: null, guardian: null };

      if (athlete.contact) {
        results.athlete = await api.whatsapp.addToGroup("Piruá Esporte Clube Atletas", athlete.contact);
        // Small delay between calls to avoid WhatsApp rate limiting or Baileys conflicts
        if (athlete.guardian_phone) await new Promise(r => setTimeout(r, 3000));
      }

      if (athlete.guardian_phone) {
        results.guardian = await api.whatsapp.addToGroup("Piruá Esporte Clube Responsáveis", athlete.guardian_phone);
      }

      return results;
    },
    createGroup: async (name: string) => {
      try {
        const response = await fetch("/api/whatsapp/groups/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        });
        return await response.json();
      } catch (err) {
        console.error("WhatsApp group create error:", err);
        return { success: false, error: "Falha ao criar grupo" };
      }
    },
    addParticipant: async (groupId: string, phoneNumber: string, welcomeMessage?: string) => {
      try {
        const response = await fetch("/api/whatsapp/groups/add-participant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId, phoneNumber, welcomeMessage }),
        });
        return await response.json();
      } catch (err) {
        console.error("WhatsApp participant add error:", err);
        return { success: false, error: "Falha ao adicionar participante" };
      }
    },
    removeParticipant: async (groupId: string, phoneNumber: string) => {
      try {
        const response = await fetch("/api/whatsapp/groups/remove-participant", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ groupId, phoneNumber }),
        });
        return await response.json();
      } catch (err) {
        console.error("WhatsApp participant remove error:", err);
        return { success: false, error: "Falha ao remover participante" };
      }
    },
    syncGroups: async () => {
      try {
        const response = await fetch("/api/whatsapp/groups/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        return await response.json();
      } catch (err) {
        console.error("WhatsApp group sync error:", err);
        return { success: false, error: "Falha ao sincronizar grupos" };
      }
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
    const cacheKey = "professors";
    const cached = getCachedData(cacheKey);
    
    const backgroundFetch = async () => {
      try {
        const querySnapshot = await getDocsWithCacheFallback(collection(db, "professors"));
        const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Professor))
          .sort((a, b) => a.name.localeCompare(b.name));
        setCachedData(cacheKey, data);
        return data;
      } catch (e) {
        return cached || [];
      }
    };

    if (cached) {
      backgroundFetch().catch(() => {});
      return cached;
    }
    
    return backgroundFetch();
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
        const querySnapshot = await getDocsWithCacheFallback(q);
        const duplicate = querySnapshot.docs.find(doc => doc.id !== sanitizedProfessor.id);
        if (duplicate) {
          throw new Error("Este CPF já está cadastrado para outro professor.");
        }
      }

      const data = { ...sanitizedProfessor, updated_at: serverTimestamp() };
      await setDoc(doc(db, "professors", sanitizedProfessor.id!), sanitizeData(data), { merge: true });
      invalidateCache("professors"); // Invalidate cache
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
      invalidateCache("professors"); // Invalidate cache
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
    const cacheKey = "events";
    const cached = getCachedData(cacheKey);
    
    const backgroundFetch = async () => {
      try {
        const querySnapshot = await getDocsWithCacheFallback(collection(db, "events"));
        const data = querySnapshot.docs
          .map(doc => ({ ...(doc.data() as any), id: doc.id } as Event))
          .sort((a, b) => b.start_date.localeCompare(a.start_date));
        setCachedData(cacheKey, data);
        return data;
      } catch (e) {
        return cached || [];
      }
    };

    if (cached) {
      backgroundFetch().catch(() => {});
      return cached;
    }
    
    return backgroundFetch();
  },
  saveEvent: async (event: Partial<Event>) => {
    if (!event.id) event.id = doc(collection(db, "events")).id;
    try {
      const data = { ...event, updated_at: serverTimestamp() };
      await setDoc(doc(db, "events", event.id), sanitizeData(data), { merge: true });
      invalidateCache("events"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `events/${event.id}`);
    }
  },
  deleteEvent: async (id: string) => {
    try {
      await deleteDoc(doc(db, "events", id));
      invalidateCache("events"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `events/${id}`);
    }
  },

  // Attendance
  subscribeToAttendance: (callback: (attendance: Attendance[]) => void, date?: string, training_id?: string, event_id?: string) => {
    // Initial fetch
    api.getAttendance(date, undefined, training_id, event_id).then(callback);

    let q = query(collection(db, "attendance"));
    if (date) q = query(q, where("date", "==", date));
    if (training_id) q = query(q, where("training_id", "==", training_id));
    if (event_id) q = query(q, where("event_id", "==", event_id));
    
    // Limit to 200 items to avoid quota exhaustion for very large groups
    q = query(q, limit(200));
    
    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => doc.data() as Attendance);
      callback(data);
    }, (error) => {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.GET, "attendance/subscription");
      }
    });
  },

  getAttendance: async (date?: string, athlete_id?: string, training_id?: string, event_id?: string, startDate?: string, endDate?: string): Promise<Attendance[]> => {
    const cacheKey = `attendance_${date || 'all'}_${athlete_id || 'all'}_${training_id || 'all'}_${event_id || 'all'}_${startDate || 'none'}_${endDate || 'none'}`;
    const cached = getCachedData(cacheKey);
    if (cached) return cached;

    try {
      let q = query(collection(db, "attendance"));
      if (date) q = query(q, where("date", "==", date));
      if (startDate) q = query(q, where("date", ">=", startDate));
      if (endDate) q = query(q, where("date", "<=", endDate));
      if (athlete_id) q = query(q, where("athlete_id", "==", athlete_id));
      if (training_id) q = query(q, where("training_id", "==", training_id));
      if (event_id) q = query(q, where("event_id", "==", event_id));
      
      const querySnapshot = await getDocsWithCacheFallback(q);
      const data = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Attendance));
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
      
      // Invalidate attendance related cache
      Object.keys(cache).forEach(key => {
        if (key.startsWith('attendance_')) invalidateCache(key);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `attendance/${attendance.id}`);
    }
  },
  deleteAttendance: async (id: string) => {
    try {
      await deleteDoc(doc(db, "attendance", id));
      // Invalidate all attendance cache
      Object.keys(cache).forEach(key => {
        if (key.startsWith('attendance_')) delete cache[key];
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `attendance/${id}`);
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
      invalidateCache(`anamnesis_${anamnesis.athlete_id}`); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `anamnesis/${anamnesis.athlete_id}`);
    }
  },

  // Lineups (using a subcollection or separate collection)
  getLineup: async (event_id: string, lineup_index: number = 0, match_id?: string, allAthletes?: Athlete[], allProfessors?: Professor[]): Promise<{ athletes: Athlete[], staff: Professor[], category?: string, lineup_name?: string }> => {
    const cacheKey = match_id ? `lineup_match_${match_id}` : `lineup_${event_id}_${lineup_index}`;
    const cached = getCachedData(cacheKey);
    if (cached && !allAthletes && !allProfessors) return cached;

    try {
      let q;
      if (match_id) {
        q = query(
          collection(db, "event_lineups"), 
          where("match_id", "==", match_id)
        );
      } else {
        q = query(
          collection(db, "event_lineups"), 
          where("event_id", "==", event_id),
          where("lineup_index", "==", lineup_index)
        );
      }
      const querySnapshot = await getDocsWithCacheFallback(q);
      const lineupData = querySnapshot.docs.map(doc => doc.data() as any);
      
      const category = lineupData.find(d => d.category)?.category;
      const lineup_name = lineupData.find(d => d.lineup_name)?.lineup_name;
      const athleteIds = lineupData.filter(d => (d.type === 'athlete' || !d.type) && d.person_id !== 'metadata').map(d => d.person_id || d.athlete_id);
      const staffIds = lineupData.filter(d => d.type === 'staff' && d.person_id !== 'metadata').map(d => d.person_id);
      
      const athletesList = allAthletes || await api.getAthletes();
      const professorsList = allProfessors || await api.getProfessors();

      const athletes = athletesList
        .filter(a => athleteIds.includes(a.id))
        .map(a => {
          const el = lineupData.find(d => (d.person_id === a.id || d.athlete_id === a.id) && (d.type === 'athlete' || !d.type));
          return { ...a, confirmation: el?.confirmation || "Pendente", presence: el?.presence, lineup_status: el?.lineup_status };
        });

      const staff = professorsList
        .filter(p => staffIds.includes(p.id))
        .map(p => {
          const el = lineupData.find(d => d.person_id === p.id && d.type === 'staff');
          return { ...p, confirmation: el?.confirmation || "Pendente", presence: el?.presence };
        });
      
      const result = { athletes, staff, category, lineup_name };
      if (!allAthletes && !allProfessors) setCachedData(cacheKey, result);
      return result;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "event_lineups");
      return { athletes: [], staff: [] };
    }
  },
  saveLineup: async (event_id: string, athlete_ids: string[], staff_ids: string[] = [], lineup_index: number = 0, category?: string, lineup_name?: string, match_id?: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete existing for this specific lineup
      let q;
      if (match_id) {
        q = query(
          collection(db, "event_lineups"), 
          where("match_id", "==", match_id)
        );
      } else {
        q = query(
          collection(db, "event_lineups"), 
          where("event_id", "==", event_id),
          where("lineup_index", "==", lineup_index)
        );
      }
      const querySnapshot = await getDocs(q);
      
      // Store existing statuses to preserve them
      const existingData: Record<string, any> = {};
      querySnapshot.docs.forEach(doc => {
        const data = doc.data() as any;
        if (data.person_id && data.person_id !== 'metadata') {
          existingData[data.person_id] = {
            confirmation: data.confirmation,
            presence: data.presence,
            lineup_status: data.lineup_status
          };
        }
        batch.delete(doc.ref);
      });
      
      // Add metadata document to preserve lineup name and category even if empty
      const metadataId = match_id ? `${match_id}_metadata` : `${event_id}_${lineup_index}_metadata`;
      const metadataDoc: any = {
        event_id,
        person_id: 'metadata',
        type: 'metadata',
        updated_at: serverTimestamp()
      };
      if (match_id) metadataDoc.match_id = match_id;
      else metadataDoc.lineup_index = lineup_index;
      metadataDoc.category = category || '';
      metadataDoc.lineup_name = lineup_name || '';
      batch.set(doc(db, "event_lineups", metadataId), metadataDoc);
      
      // Add athletes
      athlete_ids.forEach(aid => {
        const id = match_id ? `${match_id}_athlete_${aid}` : `${event_id}_${lineup_index}_athlete_${aid}`;
        const existing = existingData[aid] || {};
        
        const docData: any = {
          event_id,
          person_id: aid,
          type: 'athlete',
          confirmation: existing.confirmation || "Pendente",
          category: category || '',
          lineup_name: lineup_name || '',
          updated_at: serverTimestamp()
        };
        
        if (match_id) docData.match_id = match_id;
        else docData.lineup_index = lineup_index;
        
        if (existing.presence) docData.presence = existing.presence;
        if (existing.lineup_status) docData.lineup_status = existing.lineup_status;
        
        batch.set(doc(db, "event_lineups", id), docData);
      });

      // Add staff
      staff_ids.forEach(sid => {
        const id = match_id ? `${match_id}_staff_${sid}` : `${event_id}_${lineup_index}_staff_${sid}`;
        const existing = existingData[sid] || {};
        
        const docData: any = {
          event_id,
          person_id: sid,
          type: 'staff',
          confirmation: existing.confirmation || "Pendente",
          category: category || '',
          lineup_name: lineup_name || '',
          updated_at: serverTimestamp()
        };
        
        if (match_id) docData.match_id = match_id;
        else docData.lineup_index = lineup_index;
        
        if (existing.presence) docData.presence = existing.presence;
        
        batch.set(doc(db, "event_lineups", id), docData);
      });
      
      await batch.commit();
      if (match_id) invalidateCache(`lineup_match_${match_id}`);
      else invalidateCache(`lineup_${event_id}_${lineup_index}`);
      invalidateCache(event_id); // Invalidate general summaries and queries for this event
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
      const docSnap = await getDocWithCacheFallback(docRef);
      
      if (docSnap.exists()) {
        await updateDoc(docRef, { 
          confirmation,
          updated_at: serverTimestamp()
        });
      } else if (type === 'athlete' && lineup_index === 0) {
        // Fallback for old athlete ID format (only for index 0)
        const oldId = `${event_id}_${person_id}`;
        const oldDocRef = doc(db, "event_lineups", oldId);
        const oldDocSnap = await getDocWithCacheFallback(oldDocRef);
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

  updateAthleteStatusInLineup: async (event_id: string, person_id: string, status: "Titular" | "Reserva", lineup_index: number = 0, match_id?: string) => {
    try {
      const id = match_id ? `${match_id}_athlete_${person_id}` : `${event_id}_${lineup_index}_athlete_${person_id}`;
      const docRef = doc(db, "event_lineups", id);
      await updateDoc(docRef, { lineup_status: status, updated_at: serverTimestamp() });
      if (match_id) delete cache[`lineup_match_${match_id}`];
      else delete cache[`lineup_${event_id}_${lineup_index}`];
    } catch (error) {
       handleFirestoreError(error, OperationType.UPDATE, `event_lineups/${match_id || event_id}_status_${person_id}`);
    }
  },

  getAllEventLineups: async (event_id: string, allAthletes?: Athlete[], allProfessors?: Professor[]): Promise<{ athletes: Athlete[], staff: Professor[], lineup_index: number, category?: string, lineup_name?: string }[]> => {
    try {
      const q = query(
        collection(db, "event_lineups"), 
        where("event_id", "==", event_id)
      );
      const querySnapshot = await getDocsWithCacheFallback(q);
      const allLineupData = querySnapshot.docs.map(doc => doc.data() as any);
      
      const indexes = [...new Set(allLineupData.map(d => d.lineup_index))];
      const athletesList = allAthletes || await api.getAthletes();
      const professorsList = allProfessors || await api.getProfessors();

      return (indexes as number[]).map(idx => {
        const lineupData = allLineupData.filter(d => d.lineup_index === idx);
        const category = lineupData.find(d => d.category)?.category;
        const lineup_name = lineupData.find(d => d.lineup_name)?.lineup_name;
        const athleteIds = lineupData
          .filter(d => (d.type === 'athlete' || !d.type) && d.person_id !== 'metadata')
          .map(d => d.person_id || d.athlete_id);
        const staffIds = lineupData
          .filter(d => d.type === 'staff' && d.person_id !== 'metadata')
          .map(d => d.person_id);

        const athletes = athletesList
          .filter(a => athleteIds.includes(a.id))
          .map(a => {
            const el = lineupData.find(d => (d.person_id === a.id || d.athlete_id === a.id) && (d.type === 'athlete' || !d.type));
            return { ...a, confirmation: el?.confirmation || "Pendente", presence: el?.presence };
          });

        const staff = professorsList
          .filter(p => staffIds.includes(p.id))
          .map(p => {
            const el = lineupData.find(d => d.person_id === p.id && d.type === 'staff');
            return { ...p, confirmation: el?.confirmation || "Pendente", presence: el?.presence };
          });

        return { athletes, staff, lineup_index: idx, category, lineup_name: lineupData[0]?.lineup_name };
      });
    } catch (error) {
       console.error("Error fetching event lineups:", error);
       return [];
    }
  },

  subscribeToAthleteLineups: (athlete_id: string, callback: (events: Event[]) => void) => {
    // Initial fetch
    api.checkAthleteLineups(athlete_id).then(callback);

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
    }, (error) => {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.GET, "athlete_lineups/subscription");
      }
    });
  },

  checkAthleteLineups: async (athlete_id: string): Promise<Event[]> => {
    try {
      const q = query(
        collection(db, "event_lineups"), 
        where("person_id", "==", athlete_id),
        where("type", "==", "athlete")
      );
      const querySnapshot = await getDocsWithCacheFallback(q);
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
    const cacheKey = "sponsors";
    const cached = getCachedData(cacheKey);
    
    const backgroundFetch = async () => {
      try {
        const querySnapshot = await getDocsWithCacheFallback(collection(db, "sponsors"));
        const data = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as Sponsor));
        setCachedData(cacheKey, data);
        return data;
      } catch (e) {
        return cached || [];
      }
    };

    if (cached) {
      backgroundFetch().catch(() => {});
      return cached;
    }
    
    return backgroundFetch();
  },
  saveSponsor: async (sponsor: Partial<Sponsor>) => {
    if (!sponsor.id) sponsor.id = doc(collection(db, "sponsors")).id;
    try {
      const data = { ...sponsor, updated_at: serverTimestamp() };
      await setDoc(doc(db, "sponsors", sponsor.id), sanitizeData(data), { merge: true });
      invalidateCache("sponsors"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `sponsors/${sponsor.id}`);
    }
  },
  deleteSponsor: async (id: string) => {
    try {
      await deleteDoc(doc(db, "sponsors", id));
      invalidateCache("sponsors"); // Invalidate cache
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
      invalidateCache("championships"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `championships/${championship.id}`);
    }
  },
  deleteChampionship: async (id: string) => {
    try {
      await deleteDoc(doc(db, "championships", id));
      invalidateCache("championships"); // Invalidate cache
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
      invalidateCache("uniform_models"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `uniform_models/${model.id}`);
    }
  },
  deleteUniformModel: async (id: string) => {
    try {
      await deleteDoc(doc(db, "uniform_models", id));
      invalidateCache("uniform_models"); // Invalidate cache
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
      invalidateCache("trainings"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `trainings/${training.id}`);
    }
  },
  deleteTraining: async (id: string) => {
    try {
      await deleteDoc(doc(db, "trainings", id));
      invalidateCache("trainings"); // Invalidate cache
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
      invalidateCache("trainings");
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
      invalidateCache("training_activities"); // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `training_activities/${activity.id}`);
    }
  },
  deleteActivity: async (id: string) => {
    try {
      await deleteDoc(doc(db, "training_activities", id));
      invalidateCache("training_activities"); // Invalidate cache
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

  // Event Matches
  getEventMatches: async (eventId: string): Promise<EventMatch[]> => {
    try {
      const q = query(collection(db, "event_matches"), where("event_id", "==", eventId), orderBy("created_at", "asc"));
      const querySnapshot = await getDocsWithCacheFallback(q);
      return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as EventMatch));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, `event_matches?event_id=${eventId}`);
      return [];
    }
  },
  saveEventMatch: async (match: Partial<EventMatch>) => {
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
  deleteEventMatch: async (id: string) => {
    try {
      const batch = writeBatch(db);
      
      // Delete the match
      batch.delete(doc(db, "event_matches", id));
      
      // Delete the associated lineup
      const q = query(collection(db, "event_lineups"), where("match_id", "==", id));
      const querySnapshot = await getDocsWithCacheFallback(q);
      querySnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      await batch.commit();
      delete cache[`lineup_match_${id}`];
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `event_matches/${id}`);
    }
  },

  // Uniform Requests
  getUniformRequests: async (athleteId?: string): Promise<UniformRequest[]> => {
    try {
      let q = query(collection(db, "uniform_requests"), orderBy("created_at", "desc"));
      
      if (athleteId) {
        // Use a simpler query that doesn't require a composite index
        q = query(collection(db, "uniform_requests"), where("athlete_id", "==", athleteId));
      }
      
      const querySnapshot = await getDocsWithCacheFallback(q);
      const results = querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as UniformRequest));
      
      // If we filtered by athleteId, we need to sort client-side because 
      // we removed the orderBy from the query to avoid composite index requirement
      if (athleteId) {
        return results.sort((a, b) => {
          const dateA = a.created_at?.seconds || 0;
          const dateB = b.created_at?.seconds || 0;
          return dateB - dateA;
        });
      }
      
      return results;
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
      delete cache["uniform_requests"]; // Invalidate cache
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "uniform_requests");
      throw error;
    }
  },
  deleteUniformRequest: async (id: string) => {
    try {
      await deleteDoc(doc(db, "uniform_requests", id));
      delete cache["uniform_requests"]; // Invalidate cache
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
      delete cache["sponsor_blocks"]; // Invalidate cache
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "sponsor_blocks");
      throw error;
    }
  },
  deleteSponsorBlock: async (id: string) => {
    try {
      await deleteDoc(doc(db, "sponsor_blocks", id));
      delete cache["sponsor_blocks"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `sponsor_blocks/${id}`);
    }
  },

  // School Reports
  getSchoolReports: async (): Promise<SchoolReport[]> => {
    try {
      const q = query(collection(db, "school_reports"), orderBy("created_at", "desc"));
      const querySnapshot = await getDocsWithCacheFallback(q);
      return querySnapshot.docs.map(doc => ({ ...(doc.data() as any), id: doc.id } as SchoolReport));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, "school_reports");
      return [];
    }
  },
  saveSchoolReport: async (report: Partial<SchoolReport>) => {
    try {
      const id = report.id || doc(collection(db, "school_reports")).id;
      const data = { 
        ...report, 
        id,
        created_at: report.created_at || serverTimestamp(),
        updated_at: serverTimestamp() 
      };
      await setDoc(doc(db, "school_reports", id), sanitizeData(data), { merge: true });
      delete cache["school_reports"]; // Invalidate cache
      return id;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "school_reports");
      throw error;
    }
  },
  deleteSchoolReport: async (id: string) => {
    try {
      await deleteDoc(doc(db, "school_reports", id));
      delete cache["school_reports"]; // Invalidate cache
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `school_reports/${id}`);
    }
  },

  // Access Logging
  logAccess: async (user: User) => {
    try {
      const logId = doc(collection(db, "access_logs")).id;
      const logData = {
        id: logId,
        user_id: user.id,
        user_name: user.name,
        role: user.role,
        created_at: serverTimestamp()
      };
      await setDoc(doc(db, "access_logs", logId), sanitizeData(logData));
    } catch (e) {
      console.error("Failed to log access", e);
    }
  },

  logLoginError: async (docAttempted: string, errorMessage: string) => {
    try {
      const errorId = doc(collection(db, "login_errors")).id;
      const errorData = {
        id: errorId,
        doc_attempted: docAttempted,
        error_message: errorMessage,
        created_at: serverTimestamp()
      };
      await setDoc(doc(db, "login_errors", errorId), sanitizeData(errorData));
    } catch (e) {
      console.error("Failed to log login error", e);
    }
  },

  subscribeToAccessLogs: (callback: (logs: any[]) => void) => {
    const q = query(collection(db, "access_logs"), orderBy("created_at", "desc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      callback(logs);
    }, (error) => {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.GET, "access_logs/subscription");
      }
    });
  },

  subscribeToLoginErrors: (callback: (errors: any[]) => void) => {
    const q = query(collection(db, "login_errors"), orderBy("created_at", "desc"), limit(50));
    return onSnapshot(q, (snapshot) => {
      const errors = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      callback(errors);
    }, (error) => {
      if (!isQuotaError(error)) {
        handleFirestoreError(error, OperationType.GET, "login_errors/subscription");
      }
    });
  },
};
