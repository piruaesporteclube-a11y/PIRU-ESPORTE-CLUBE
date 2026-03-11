import React, { createContext, useContext, useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { Settings } from '../types';

interface ThemeContextType {
  settings: Settings;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const SETTINGS_ID = "global_settings";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    primaryColor: '#EAB308',
    secondaryColor: '#000000',
    instagram: '',
    whatsapp: '',
    schoolCrest: ''
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, "settings", SETTINGS_ID), (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as Settings);
      }
    }, (error) => {
      console.warn("Settings sync error (likely offline):", error.message);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Apply colors to CSS variables
    document.documentElement.style.setProperty('--primary-color', settings.primaryColor);
    document.documentElement.style.setProperty('--secondary-color', settings.secondaryColor);
  }, [settings]);

  return (
    <ThemeContext.Provider value={{ settings }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
