/**
 * Theme Provider Component
 * Provides theme context and functionality to the entire application
 */

import React from 'react';
import { ThemeContext, useThemeState } from '@/hooks/useTheme';
import { applyTheme } from '@/utils/theme-fix';
import { themes } from '@/config/themes';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const themeState = useThemeState();
  
  // Apply theme whenever it changes
  React.useEffect(() => {
    const theme = themes[themeState.themeId as keyof typeof themes];
    if (theme) {
      applyTheme(theme);
      console.log('Theme applied:', theme.name);
    }
  }, [themeState.themeId]);
  
  return (
    <ThemeContext.Provider value={themeState}>
      {children}
    </ThemeContext.Provider>
  );
}