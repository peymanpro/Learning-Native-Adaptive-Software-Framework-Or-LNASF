// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect } from 'react';
import { Theme, AvailableColor } from '@/types';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// رنگ‌های RGB برای هر پالت رنگی
const colorRgbValues: Record<AvailableColor, Record<number, string>> = {
  blue: {
    50: '239 246 255',
    100: '219 234 254',
    200: '191 219 254',
    300: '147 197 253',
    400: '96 165 250',
    500: '59 130 246',
    600: '37 99 235',
    700: '29 78 216',
    800: '30 64 175',
    900: '30 58 138',
    950: '23 37 84',
  },
  purple: {
    50: '250 245 255',
    100: '243 232 255',
    200: '233 213 255',
    300: '216 180 254',
    400: '192 132 252',
    500: '168 85 247',
    600: '147 51 234',
    700: '126 34 206',
    800: '107 33 168',
    900: '88 28 135',
    950: '59 7 100',
  },
  green: {
    50: '240 253 244',
    100: '220 252 231',
    200: '187 247 208',
    300: '134 239 172',
    400: '74 222 128',
    500: '34 197 94',
    600: '22 163 74',
    700: '21 128 61',
    800: '22 101 52',
    900: '20 83 45',
    950: '5 46 22',
  },
  red: {
    50: '254 242 242',
    100: '254 226 226',
    200: '254 202 202',
    300: '252 165 165',
    400: '248 113 113',
    500: '239 68 68',
    600: '220 38 38',
    700: '185 28 28',
    800: '153 27 27',
    900: '127 29 29',
    950: '69 10 10',
  },
  orange: {
    50: '255 247 237',
    100: '255 237 213',
    200: '254 215 170',
    300: '253 186 116',
    400: '251 146 60',
    500: '249 115 22',
    600: '234 88 12',
    700: '194 65 12',
    800: '154 52 18',
    900: '124 45 18',
    950: '67 20 7',
  },
  amber: {
    50: '255 251 235',
    100: '254 243 199',
    200: '253 230 138',
    300: '252 211 77',
    400: '251 191 36',
    500: '245 158 11',
    600: '217 119 6',
    700: '180 83 9',
    800: '146 64 14',
    900: '120 53 15',
    950: '69 26 3',
  },
};

const fonts = ['Inter', 'Roboto', 'Open Sans', 'Poppins', 'Montserrat'];

type ThemeContextType = {
  theme: Theme;
  setTheme: (newTheme: Partial<Theme>) => void;
  availableFonts: string[];
  availableColors: AvailableColor[];
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const defaultTheme: Theme = {
  primaryColor: 'blue',
  fontFamily: 'Inter',
  borderRadius: '0.5rem',
  mode: 'light',
};

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useLocalStorage<Theme>('theme', defaultTheme);

  // به‌روزرسانی متغیرهای CSS هنگام تغییر تم
  useEffect(() => {
    const root = document.documentElement;
    
    // اعمال رنگ‌های primary
    const colors = colorRgbValues[theme.primaryColor];
    Object.entries(colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-primary-${key}`, value);
    });

    // اعمال فونت
    root.style.setProperty('--font-sans', theme.fontFamily);

    // اعمال borderRadius
    root.style.setProperty('--border-radius-base', theme.borderRadius);

    // اعمال dark mode
    if (theme.mode === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const setTheme = (newTheme: Partial<Theme>) => {
    setThemeState((prev) => ({ ...prev, ...newTheme }));
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        setTheme,
        availableFonts: fonts,
        availableColors: Object.keys(colorRgbValues) as AvailableColor[],
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};