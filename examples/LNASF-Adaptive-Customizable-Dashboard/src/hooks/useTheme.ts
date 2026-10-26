// src/hooks/useTheme.ts
import { useTheme as useThemeContext } from '@/context/ThemeContext';

export const useTheme = () => {
  const { theme, setTheme, availableFonts, availableColors } = useThemeContext();

  const toggleDarkMode = () => {
    setTheme({ mode: theme.mode === 'light' ? 'dark' : 'light' });
  };

  const setPrimaryColor = (color: typeof theme.primaryColor) => {
    setTheme({ primaryColor: color });
  };

  const setFont = (font: string) => {
    setTheme({ fontFamily: font });
  };

  const setBorderRadius = (radius: string) => {
    setTheme({ borderRadius: radius });
  };

  return {
    theme,
    setTheme,
    toggleDarkMode,
    setPrimaryColor,
    setFont,
    setBorderRadius,
    availableFonts,
    availableColors,
    isDarkMode: theme.mode === 'dark',
  };
};