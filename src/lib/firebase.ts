import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcLI0peh0uTTuf3tzUM__7HSYnXzjxrmE",
  authDomain: "pirua-esporte-clube-eb6f7.firebaseapp.com",
  projectId: "pirua-esporte-clube-eb6f7",
  storageBucket: "pirua-esporte-clube-eb6f7.firebasestorage.app",
  messagingSenderId: "229352682641",
  appId: "1:229352682641:web:403bcdc42d39f336237b30"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({})
});
