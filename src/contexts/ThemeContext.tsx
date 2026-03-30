import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
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
    // Real-time subscription
    const unsubscribe = onSnapshot(doc(db, 'settings', SETTINGS_ID), (snapshot) => {
      if (snapshot.exists()) {
        setSettings(snapshot.data() as Settings);
      }
    }, (error) => {
      console.error("Error listening to settings changes:", error);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Apply colors to CSS variables
    document.documentElement.style.setProperty('--theme-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--theme-secondary', settings.secondaryColor);
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
