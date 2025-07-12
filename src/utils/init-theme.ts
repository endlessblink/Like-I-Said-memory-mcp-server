/**
 * Initialize theme before React renders
 * This ensures CSS variables are available immediately
 */

import { themes, type ThemeId } from '@/config/themes';
import type { Theme } from '@/config/design-tokens';

// Helper to extract HSL values
function extractHSLValues(hslString: string): string {
  if (!hslString.includes('hsl')) {
    return hslString;
  }
  const match = hslString.match(/hsl\(([^)]+)\)/);
  if (match) {
    return match[1].replace(/,/g, '');
  }
  return hslString;
}

export function initializeTheme() {
  console.log('Initializing theme system...');
  
  const root = document.documentElement;
  
  // Get stored theme or use default
  const storedThemeId = (localStorage.getItem('like-i-said-theme') || 'dark') as ThemeId;
  const theme = themes[storedThemeId] || themes.dark;
  
  // Inject core variables immediately
  root.style.setProperty('--background', extractHSLValues(theme.colors.background));
  root.style.setProperty('--foreground', extractHSLValues(theme.colors.foreground));
  root.style.setProperty('--card', extractHSLValues(theme.colors.card));
  root.style.setProperty('--card-foreground', extractHSLValues(theme.colors.cardForeground));
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
  Object.entries(theme.colors.primary).forEach(([shade, color]) => {
    root.style.setProperty(`--primary-${shade}`, color);
  });
  
  // Secondary colors
  Object.entries(theme.colors.secondary).forEach(([shade, color]) => {
    root.style.setProperty(`--secondary-${shade}`, color);
  });
  
  // Category colors
  root.style.setProperty('--category-personal', theme.colors.personal[500]);
  root.style.setProperty('--category-work', theme.colors.work[500]);
  root.style.setProperty('--category-code', theme.colors.code[500]);
  root.style.setProperty('--category-research', theme.colors.research[500]);
  
  // Complexity colors
  root.style.setProperty('--complexity-l1', theme.colors.complexity.l1[500]);
  root.style.setProperty('--complexity-l2', theme.colors.complexity.l2[500]);
  root.style.setProperty('--complexity-l3', theme.colors.complexity.l3[500]);
  root.style.setProperty('--complexity-l4', theme.colors.complexity.l4[500]);
  
  // Semantic colors
  root.style.setProperty('--success', theme.colors.success[500]);
  root.style.setProperty('--warning', theme.colors.warning[500]);
  root.style.setProperty('--error', theme.colors.error[500]);
  root.style.setProperty('--info', theme.colors.info[500]);
  
  // Effects
  root.style.setProperty('--glass-bg', theme.effects.glassmorphism.background);
  root.style.setProperty('--glass-border', theme.effects.glassmorphism.border);
  root.style.setProperty('--glass-backdrop', theme.effects.glassmorphism.backdrop);
  root.style.setProperty('--glass-shadow', theme.effects.glassmorphism.shadow);
  
  // Gradients
  root.style.setProperty('--gradient-primary', theme.effects.gradients.primary);
  root.style.setProperty('--gradient-secondary', theme.effects.gradients.secondary);
  root.style.setProperty('--gradient-accent', theme.effects.gradients.accent);
  root.style.setProperty('--gradient-card', theme.effects.gradients.card);
  
  // Spacing
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
  
  // Animation durations
  Object.entries(theme.animations.duration).forEach(([key, value]) => {
    root.style.setProperty(`--duration-${key}`, value);
  });
  
  // Animation timings
  Object.entries(theme.animations.timing).forEach(([key, value]) => {
    root.style.setProperty(`--timing-${key}`, value);
  });
  
  console.log('Theme initialized successfully');
}

// Initialize immediately
initializeTheme();