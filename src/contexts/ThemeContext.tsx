import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
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
    // Initial fetch
    const fetchSettings = async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', SETTINGS_ID)
        .single();
      
      if (data) {
        setSettings(data as Settings);
      }
    };

    fetchSettings();

    // Real-time subscription
    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'settings',
          filter: `id=eq.${SETTINGS_ID}`
        },
        (payload) => {
          if (payload.new) {
            setSettings(payload.new as Settings);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
