/**
 * Theme Hook
 * Provides theme management functionality
 */

import { createContext, useContext, useEffect, useState } from 'react';
import type { Theme } from '@/config/design-tokens';
import { themes, defaultTheme, type ThemeId } from '@/config/themes';

interface ThemeContextType {
  theme: Theme;
  themeId: ThemeId;
  setTheme: (themeId: ThemeId) => void;
  availableThemes: typeof themes;
  customizeTheme: (customizations: Partial<Theme>) => void;
  resetTheme: () => void;
}

export const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Theme storage key
const THEME_STORAGE_KEY = 'like-i-said-theme';
const THEME_CUSTOMIZATIONS_KEY = 'like-i-said-theme-customizations';

export function useThemeState() {
  const [themeId, setThemeId] = useState<ThemeId>(() => {
    // Get theme from localStorage or default
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored && stored in themes) ? stored as ThemeId : 'dark';
  });

  const [customizations, setCustomizations] = useState<Partial<Theme>>(() => {
    // Get customizations from localStorage
    const stored = localStorage.getItem(THEME_CUSTOMIZATIONS_KEY);
    try {
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Compute final theme
  const theme: Theme = {
    ...themes[themeId],
    ...customizations,
    colors: {
      ...themes[themeId].colors,
      ...(customizations.colors || {}),
    },
    spacing: {
      ...themes[themeId].spacing,
      ...(customizations.spacing || {}),
    },
    typography: {
      ...themes[themeId].typography,
      ...(customizations.typography || {}),
    },
    breakpoints: {
      ...themes[themeId].breakpoints,
      ...(customizations.breakpoints || {}),
    },
    effects: {
      ...themes[themeId].effects,
      ...(customizations.effects || {}),
    },
  };

  const setTheme = (newThemeId: ThemeId) => {
    setThemeId(newThemeId);
    localStorage.setItem(THEME_STORAGE_KEY, newThemeId);
  };

  const customizeTheme = (newCustomizations: Partial<Theme>) => {
    const mergedCustomizations = {
      ...customizations,
      ...newCustomizations,
      colors: {
        ...customizations.colors,
        ...newCustomizations.colors,
      },
    };
    setCustomizations(mergedCustomizations);
    localStorage.setItem(THEME_CUSTOMIZATIONS_KEY, JSON.stringify(mergedCustomizations));
  };

  const resetTheme = () => {
    setCustomizations({});
    localStorage.removeItem(THEME_CUSTOMIZATIONS_KEY);
  };

  return {
    theme,
    themeId,
    setTheme,
    availableThemes: themes,
    customizeTheme,
    resetTheme,
  };
}

// Helper to extract HSL values from HSL string
function extractHSLValues(hslString: string): string {
  // If it's already in the format we want (e.g., "222 23% 4%"), return as is
  if (!hslString.includes('hsl')) {
    return hslString;
  }
  // Extract values from "hsl(222, 23%, 4%)" format
  const match = hslString.match(/hsl\(([^)]+)\)/);
  if (match) {
    return match[1].replace(/,/g, '');
  }
  return hslString;
}

// CSS Variables injection
export function injectThemeVariables(theme: Theme) {
  const root = document.documentElement;
  
  // Base colors - Extract HSL values for Tailwind compatibility
  root.style.setProperty('--background', extractHSLValues(theme.colors.background));
  root.style.setProperty('--foreground', extractHSLValues(theme.colors.foreground));
  root.style.setProperty('--card', extractHSLValues(theme.colors.card));
  root.style.setProperty('--card-foreground', extractHSLValues(theme.colors.cardForeground));
  root.style.setProperty('--popover', extractHSLValues(theme.colors.popover));
  root.style.setProperty('--popover-foreground', extractHSLValues(theme.colors.popoverForeground));
  root.style.setProperty('--muted', extractHSLValues(theme.colors.muted));
  root.style.setProperty('--muted-foreground', extractHSLValues(theme.colors.mutedForeground));
  root.style.setProperty('--border', extractHSLValues(theme.colors.border));
  root.style.setProperty('--input', extractHSLValues(theme.colors.input));
  root.style.setProperty('--ring', extractHSLValues(theme.colors.ring));
  root.style.setProperty('--accent', extractHSLValues(theme.colors.accent[500]));
  root.style.setProperty('--accent-foreground', extractHSLValues(theme.colors.accent[50]));
  root.style.setProperty('--destructive', extractHSLValues(theme.colors.destructive));
  root.style.setProperty('--destructive-foreground', extractHSLValues(theme.colors.destructiveForeground));

  // Primary colors
  root.style.setProperty('--primary-50', theme.colors.primary[50]);
  root.style.setProperty('--primary-100', theme.colors.primary[100]);
  root.style.setProperty('--primary-200', theme.colors.primary[200]);
  root.style.setProperty('--primary-300', theme.colors.primary[300]);
  root.style.setProperty('--primary-400', theme.colors.primary[400]);
  root.style.setProperty('--primary-500', theme.colors.primary[500]);
  root.style.setProperty('--primary-600', theme.colors.primary[600]);
  root.style.setProperty('--primary-700', theme.colors.primary[700]);
  root.style.setProperty('--primary-800', theme.colors.primary[800]);
  root.style.setProperty('--primary-900', theme.colors.primary[900]);
  root.style.setProperty('--primary-950', theme.colors.primary[950]);

  // Secondary colors
  root.style.setProperty('--secondary-50', theme.colors.secondary[50]);
  root.style.setProperty('--secondary-100', theme.colors.secondary[100]);
  root.style.setProperty('--secondary-200', theme.colors.secondary[200]);
  root.style.setProperty('--secondary-300', theme.colors.secondary[300]);
  root.style.setProperty('--secondary-400', theme.colors.secondary[400]);
  root.style.setProperty('--secondary-500', theme.colors.secondary[500]);
  root.style.setProperty('--secondary-600', theme.colors.secondary[600]);
  root.style.setProperty('--secondary-700', theme.colors.secondary[700]);
  root.style.setProperty('--secondary-800', theme.colors.secondary[800]);
  root.style.setProperty('--secondary-900', theme.colors.secondary[900]);
  root.style.setProperty('--secondary-950', theme.colors.secondary[950]);

  // Category colors - These are hex colors, keep as is
  root.style.setProperty('--category-personal', theme.colors.personal[500]);
  root.style.setProperty('--category-work', theme.colors.work[500]);
  root.style.setProperty('--category-code', theme.colors.code[500]);
  root.style.setProperty('--category-research', theme.colors.research[500]);

  // Complexity colors - These are hex colors, keep as is
  root.style.setProperty('--complexity-l1', theme.colors.complexity.l1[500]);
  root.style.setProperty('--complexity-l2', theme.colors.complexity.l2[500]);
  root.style.setProperty('--complexity-l3', theme.colors.complexity.l3[500]);
  root.style.setProperty('--complexity-l4', theme.colors.complexity.l4[500]);

  // Semantic colors - These are hex colors, keep as is
  root.style.setProperty('--success', theme.colors.success[500]);
  root.style.setProperty('--warning', theme.colors.warning[500]);
  root.style.setProperty('--error', theme.colors.error[500]);
  root.style.setProperty('--info', theme.colors.info[500]);

  // Glassmorphism
  root.style.setProperty('--glass-bg', theme.effects.glassmorphism.background);
  root.style.setProperty('--glass-border', theme.effects.glassmorphism.border);
  root.style.setProperty('--glass-backdrop', theme.effects.glassmorphism.backdrop);
  root.style.setProperty('--glass-shadow', theme.effects.glassmorphism.shadow);

  // Gradients
  root.style.setProperty('--gradient-primary', theme.effects.gradients.primary);
  root.style.setProperty('--gradient-secondary', theme.effects.gradients.secondary);
  root.style.setProperty('--gradient-accent', theme.effects.gradients.accent);
  root.style.setProperty('--gradient-card', theme.effects.gradients.card);

  // Spacing (inject commonly used values)
  Object.entries(theme.spacing).forEach(([key, value]) => {
    root.style.setProperty(`--space-${key}`, value);
  });

  // Typography
  Object.entries(theme.typography).forEach(([key, value]) => {
    root.style.setProperty(`--text-${key}-size`, value.fontSize);
    root.style.setProperty(`--text-${key}-height`, value.lineHeight);
  });

  // Border radius
  Object.entries(theme.borderRadius).forEach(([key, value]) => {
    const cssKey = key === 'DEFAULT' ? 'radius' : `radius-${key}`;
    root.style.setProperty(`--${cssKey}`, value);
  });

  // Breakpoints (for use in CSS)
  Object.entries(theme.breakpoints).forEach(([key, value]) => {
    root.style.setProperty(`--breakpoint-${key}`, value);
  });

  // Animation durations
  Object.entries(theme.animations.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value);
  });

  // Animation timings
  Object.entries(theme.animations.timing).forEach(([key, value]) => {
    root.style.setProperty(`--timing-${key}`, value);
  });
}

// Hook to apply theme CSS variables
export function useThemeVariables() {
  const { theme } = useTheme();

  useEffect(() => {
    console.log('Injecting theme variables for:', theme.name);
    injectThemeVariables(theme);
    
    // Force immediate application
    document.documentElement.className = 'theme-applied';
  }, [theme]);
  
  // Also inject on mount immediately
  useEffect(() => {
    injectThemeVariables(theme);
  }, []);
}