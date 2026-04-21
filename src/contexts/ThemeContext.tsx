import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api';
import { Settings } from '../types';

interface ThemeContextType {
  settings: Settings;
  refreshSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>({
    schoolName: 'Piruá Esporte Clube',
    primaryColor: '#EAB308',
    secondaryColor: '#000000',
    instagram: '',
    whatsapp: '',
    schoolCrest: ''
  });

  const loadSettings = async () => {
    try {
      const data = await api.getSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    // Apply colors to CSS variables
    document.documentElement.style.setProperty('--theme-primary', settings.primaryColor);
    document.documentElement.style.setProperty('--theme-secondary', settings.secondaryColor);
  }, [settings]);

  return (
    <ThemeContext.Provider value={{ settings, refreshSettings: loadSettings }}>
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
