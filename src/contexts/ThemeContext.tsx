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
    schoolCrest: '',
    layoutBgColor: '#000000',
    layoutCardColor: '#18181b',
    layoutBorderColor: '#27272a',
    layoutBorderRadius: '3xl',
    layoutBorderWidth: '1px',
    layoutShadow: 'xl',
    studentAccessPaused: false,
    studentAccessPauseMessage: ''
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

    // Apply layout custom colors
    const bgColor = settings.layoutBgColor || '#000000';
    const cardColor = settings.layoutCardColor || '#18181b';
    const borderColor = settings.layoutBorderColor || '#27272a';

    // Helper to adjust hex tint (lighten/darken color)
    const adjustHexColor = (color: string, percent: number) => {
      try {
        const num = parseInt(color.replace("#", ""), 16);
        const amt = Math.round(2.55 * percent);
        const R = (num >> 16) + amt;
        const G = ((num >> 8) & 0x00ff) + amt;
        const B = (num & 0x0000ff) + amt;
        return (
          "#" +
          (
            0x1000000 +
            (R < 255 ? (R < 0 ? 0 : R) : 255) * 0x10000 +
            (G < 255 ? (G < 0 ? 0 : G) : 255) * 0x100 +
            (B < 255 ? (B < 0 ? 0 : B) : 255)
          )
            .toString(16)
            .slice(1)
        );
      } catch (e) {
        return color;
      }
    };

    // Determine card hover & accent border shades
    const cardHoverStr = adjustHexColor(cardColor, 6);
    const borderAccentStr = adjustHexColor(borderColor, 12);

    document.documentElement.style.setProperty('--theme-bg', bgColor);
    document.documentElement.style.setProperty('--theme-card', cardColor);
    document.documentElement.style.setProperty('--theme-card-hover', cardHoverStr);
    document.documentElement.style.setProperty('--theme-border', borderColor);
    document.documentElement.style.setProperty('--theme-border-accent', borderAccentStr);

    // Apply Border Radius scaling
    const radiusMap = {
      none: { xl: '0px', '2xl': '0px', '3xl': '0px' },
      sm: { xl: '2px', '2xl': '4px', '3xl': '6px' },
      md: { xl: '4px', '2xl': '6px', '3xl': '8px' },
      lg: { xl: '6px', '2xl': '8px', '3xl': '12px' },
      xl: { xl: '12px', '2xl': '16px', '3xl': '20px' },
      '2xl': { xl: '16px', '2xl': '20px', '3xl': '24px' },
      '3xl': { xl: '20px', '2xl': '24px', '3xl': '32px' },
    };
    const rSelected = radiusMap[settings.layoutBorderRadius || '3xl'] || radiusMap['3xl'];
    document.documentElement.style.setProperty('--theme-radius-xl', rSelected.xl);
    document.documentElement.style.setProperty('--theme-radius-2xl', rSelected['2xl']);
    document.documentElement.style.setProperty('--theme-radius-3xl', rSelected['3xl']);

    // Apply Border Width
    const borderWidth = settings.layoutBorderWidth || '1px';
    document.documentElement.style.setProperty('--theme-border-width', borderWidth);

    // Dynamic Shadow Configs based on theme selection
    const shadowMap = {
      none: {
        sm: 'none', md: 'none', lg: 'none', xl: 'none', '2xl': 'none'
      },
      sm: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 2px 4px 0 rgba(0, 0, 0, 0.05)',
        lg: '0 3px 6px 0 rgba(0, 0, 0, 0.05)',
        xl: '0 4px 8px 0 rgba(0, 0, 0, 0.05)',
        '2xl': '0 5px 10px 0 rgba(0, 0, 0, 0.05)'
      },
      md: {
        sm: '0 1px 2px 0 rgba(0,0,0,0.1)',
        md: '0 4px 6px -1px rgba(0,0,0,0.1)',
        lg: '0 6px 10px -2px rgba(0,0,0,0.1)',
        xl: '0 10px 15px -3px rgba(0,0,0,0.1)',
        '2xl': '0 12px 20px -4px rgba(0,0,0,0.1)'
      },
      lg: {
        sm: '0 1px 3px rgba(0,0,0,0.12)',
        md: '0 4px 6px rgba(0,0,0,0.15)',
        lg: '0 10px 15px -3px rgba(0,0,0,0.2)',
        xl: '0 15px 25px -4px rgba(0,0,0,0.2)',
        '2xl': '0 20px 30px -5px rgba(0,0,0,0.25)'
      },
      xl: {
        sm: '0 1px 3px rgba(0,0,0,0.2)',
        md: '0 4px 8px rgba(0,0,0,0.22)',
        lg: '0 12px 20px -3px rgba(0,0,0,0.25)',
        xl: '0 20px 25px -5px rgba(0,0,0,0.30), 0 10px 10px -5px rgba(0,0,0,0.30)',
        '2xl': '0 25px 35px -5px rgba(0,0,0,0.35), 0 12px 15px -5px rgba(0,0,0,0.35)'
      },
      '2xl': {
        sm: '0 2px 5px rgba(0,0,0,0.3)',
        md: '0 6px 12px rgba(0,0,0,0.35)',
        lg: '0 15px 25px rgba(0,0,0,0.4)',
        xl: '0 25px 35px -5px rgba(0,0,0,0.45)',
        '2xl': '0 35px 50px -10px rgba(0,0,0,0.5)'
      },
      heavy: {
        sm: '0 2px 10px rgba(0,0,0,0.6)',
        md: '0 8px 24px rgba(0,0,0,0.7)',
        lg: '0 20px 40px rgba(0,0,0,0.8)',
        xl: '0 30px 60px rgba(0,0,0,0.9)',
        '2xl': '0 45px 80px rgba(0,0,0,0.95)'
      },
      neon: {
        sm: `0 0 4px ${settings.primaryColor}88`,
        md: `0 0 8px ${settings.primaryColor}aa`,
        lg: `0 0 12px ${settings.primaryColor}cc`,
        xl: `0 0 20px ${settings.primaryColor}, 0 0 5px rgba(255,255,255,0.2)`,
        '2xl': `0 0 30px ${settings.primaryColor}, 0 0 10px rgba(255,255,255,0.3)`
      }
    };

    const sSelected = shadowMap[settings.layoutShadow || 'xl'] || shadowMap['xl'];
    document.documentElement.style.setProperty('--theme-shadow-sm', sSelected.sm);
    document.documentElement.style.setProperty('--theme-shadow-md', sSelected.md);
    document.documentElement.style.setProperty('--theme-shadow-lg', sSelected.lg);
    document.documentElement.style.setProperty('--theme-shadow-xl', sSelected.xl);
    document.documentElement.style.setProperty('--theme-shadow-2xl', sSelected['2xl']);
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
