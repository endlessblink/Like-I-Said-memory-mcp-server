/**
 * Theme Configurations
 * Pre-defined themes and theme management
 */

import { 
  Theme, 
  colorPalettes, 
  defaultSpacing, 
  defaultTypography, 
  defaultBreakpoints, 
  defaultAnimations, 
  defaultElevation, 
  defaultBorderRadius 
} from './design-tokens';

// Dark Professional Theme (Current Design)
export const darkTheme: Theme = {
  id: 'dark',
  name: 'Dark Professional',
  colors: {
    // Base colors
    slate: colorPalettes.slate,
    gray: colorPalettes.slate,
    zinc: colorPalettes.slate,
    neutral: colorPalettes.slate,
    stone: colorPalettes.slate,
    
    // Brand colors
    primary: colorPalettes.violet,
    secondary: colorPalettes.slate,
    accent: colorPalettes.purple,
    
    // Semantic colors
    success: colorPalettes.emerald,
    warning: colorPalettes.amber,
    error: colorPalettes.red,
    info: colorPalettes.blue,
    
    // Category colors
    personal: colorPalettes.purple,
    work: colorPalettes.emerald,
    code: colorPalettes.red,
    research: colorPalettes.blue,
    
    // Complexity colors
    complexity: {
      l1: colorPalettes.emerald,
      l2: colorPalettes.blue,
      l3: colorPalettes.amber,
      l4: colorPalettes.red,
    },
    
    // UI colors
    background: 'hsl(222, 23%, 4%)',
    foreground: 'hsl(210, 40%, 98%)',
    card: 'hsl(222, 23%, 7%)',
    cardForeground: 'hsl(210, 40%, 98%)',
    popover: 'hsl(222, 23%, 7%)',
    popoverForeground: 'hsl(210, 40%, 98%)',
    muted: 'hsl(220, 20%, 12%)',
    mutedForeground: 'hsl(220, 15%, 75%)',
    border: 'hsl(220, 20%, 18%)',
    input: 'hsl(220, 20%, 14%)',
    ring: 'hsl(262, 73%, 60%)',
    destructive: 'hsl(0, 75%, 55%)',
    destructiveForeground: 'hsl(220, 15%, 98%)',
  },
  spacing: defaultSpacing,
  typography: defaultTypography,
  breakpoints: defaultBreakpoints,
  animations: defaultAnimations,
  elevation: defaultElevation,
  borderRadius: defaultBorderRadius,
  effects: {
    glassmorphism: {
      background: 'rgba(30, 41, 59, 0.7)',
      border: 'rgba(148, 163, 184, 0.15)',
      backdrop: 'blur(16px)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(262, 73%, 60%) 0%, hsl(280, 73%, 65%) 100%)',
      secondary: 'linear-gradient(145deg, hsl(225, 25%, 8%) 0%, hsl(220, 20%, 10%) 100%)',
      accent: 'linear-gradient(135deg, hsl(280, 73%, 60%) 0%, hsl(290, 73%, 65%) 100%)',
      card: 'linear-gradient(145deg, hsl(225, 25%, 8%) 0%, hsl(220, 20%, 10%) 100%)',
    },
  },
};

// Light Professional Theme (Improved)
export const lightTheme: Theme = {
  id: 'light',
  name: 'Light Professional',
  colors: {
    // Base colors
    slate: colorPalettes.slate,
    gray: colorPalettes.slate,
    zinc: colorPalettes.slate,
    neutral: colorPalettes.slate,
    stone: colorPalettes.slate,
    
    // Brand colors
    primary: colorPalettes.violet,
    secondary: colorPalettes.slate,
    accent: colorPalettes.purple,
    
    // Semantic colors
    success: colorPalettes.emerald,
    warning: colorPalettes.amber,
    error: colorPalettes.red,
    info: colorPalettes.blue,
    
    // Category colors
    personal: colorPalettes.purple,
    work: colorPalettes.emerald,
    code: colorPalettes.red,
    research: colorPalettes.blue,
    
    // Complexity colors
    complexity: {
      l1: colorPalettes.emerald,
      l2: colorPalettes.blue,
      l3: colorPalettes.amber,
      l4: colorPalettes.red,
    },
    
    // UI colors - Enhanced for better contrast and readability
    background: 'hsl(0, 0%, 100%)',
    foreground: 'hsl(222, 84%, 4.9%)',
    card: 'hsl(0, 0%, 98%)',
    cardForeground: 'hsl(222, 84%, 4.9%)',
    popover: 'hsl(0, 0%, 100%)',
    popoverForeground: 'hsl(222, 84%, 4.9%)',
    muted: 'hsl(210, 40%, 94%)',
    mutedForeground: 'hsl(215, 16%, 40%)',
    border: 'hsl(214, 32%, 88%)',
    input: 'hsl(214, 32%, 88%)',
    ring: 'hsl(262, 73%, 60%)',
    destructive: 'hsl(0, 84%, 50%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
  },
  spacing: defaultSpacing,
  typography: defaultTypography,
  breakpoints: defaultBreakpoints,
  animations: defaultAnimations,
  elevation: defaultElevation,
  borderRadius: defaultBorderRadius,
  effects: {
    glassmorphism: {
      background: 'rgba(255, 255, 255, 0.8)',
      border: 'rgba(0, 0, 0, 0.12)',
      backdrop: 'blur(16px)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(262, 73%, 60%) 0%, hsl(280, 73%, 65%) 100%)',
      secondary: 'linear-gradient(145deg, hsl(0, 0%, 100%) 0%, hsl(210, 40%, 96%) 100%)',
      accent: 'linear-gradient(135deg, hsl(280, 73%, 60%) 0%, hsl(290, 73%, 65%) 100%)',
      card: 'linear-gradient(145deg, hsl(0, 0%, 98%) 0%, hsl(210, 40%, 96%) 100%)',
    },
  },
};

// Neutral Bright Theme (New)
export const neutralBrightTheme: Theme = {
  id: 'neutral-bright',
  name: 'Neutral Bright',
  colors: {
    // Base colors - Using neutral gray palette
    slate: colorPalettes.slate,
    gray: colorPalettes.gray,
    zinc: colorPalettes.zinc,
    neutral: colorPalettes.gray,
    stone: colorPalettes.stone,
    
    // Brand colors - Softer, neutral-focused
    primary: colorPalettes.slate,
    secondary: colorPalettes.gray,
    accent: colorPalettes.blue,
    
    // Semantic colors
    success: colorPalettes.emerald,
    warning: colorPalettes.amber,
    error: colorPalettes.red,
    info: colorPalettes.blue,
    
    // Category colors
    personal: colorPalettes.purple,
    work: colorPalettes.emerald,
    code: colorPalettes.red,
    research: colorPalettes.blue,
    
    // Complexity colors
    complexity: {
      l1: colorPalettes.emerald,
      l2: colorPalettes.blue,
      l3: colorPalettes.amber,
      l4: colorPalettes.red,
    },
    
    // UI colors - Optimized for neutral brightness
    background: 'hsl(0, 0%, 97%)',
    foreground: 'hsl(0, 0%, 15%)',
    card: 'hsl(0, 0%, 100%)',
    cardForeground: 'hsl(0, 0%, 15%)',
    popover: 'hsl(0, 0%, 100%)',
    popoverForeground: 'hsl(0, 0%, 15%)',
    muted: 'hsl(0, 0%, 92%)',
    mutedForeground: 'hsl(0, 0%, 45%)',
    border: 'hsl(0, 0%, 85%)',
    input: 'hsl(0, 0%, 90%)',
    ring: 'hsl(215, 20%, 65%)',
    destructive: 'hsl(0, 84%, 50%)',
    destructiveForeground: 'hsl(0, 0%, 98%)',
  },
  spacing: defaultSpacing,
  typography: defaultTypography,
  breakpoints: defaultBreakpoints,
  animations: defaultAnimations,
  elevation: defaultElevation,
  borderRadius: defaultBorderRadius,
  effects: {
    glassmorphism: {
      background: 'rgba(255, 255, 255, 0.85)',
      border: 'rgba(0, 0, 0, 0.08)',
      backdrop: 'blur(20px)',
      shadow: '0 8px 32px rgba(0, 0, 0, 0.06)',
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(215, 20%, 65%) 0%, hsl(215, 25%, 70%) 100%)',
      secondary: 'linear-gradient(145deg, hsl(0, 0%, 100%) 0%, hsl(0, 0%, 95%) 100%)',
      accent: 'linear-gradient(135deg, hsl(215, 84%, 65%) 0%, hsl(220, 84%, 70%) 100%)',
      card: 'linear-gradient(145deg, hsl(0, 0%, 100%) 0%, hsl(0, 0%, 97%) 100%)',
    },
  },
};

// Blue Ocean Theme
export const blueTheme: Theme = {
  id: 'blue',
  name: 'Blue Ocean',
  colors: {
    // Base colors
    slate: colorPalettes.slate,
    gray: colorPalettes.slate,
    zinc: colorPalettes.slate,
    neutral: colorPalettes.slate,
    stone: colorPalettes.slate,
    
    // Brand colors
    primary: colorPalettes.blue,
    secondary: colorPalettes.slate,
    accent: colorPalettes.blue,
    
    // Semantic colors
    success: colorPalettes.emerald,
    warning: colorPalettes.amber,
    error: colorPalettes.red,
    info: colorPalettes.blue,
    
    // Category colors
    personal: colorPalettes.purple,
    work: colorPalettes.emerald,
    code: colorPalettes.red,
    research: colorPalettes.blue,
    
    // Complexity colors
    complexity: {
      l1: colorPalettes.emerald,
      l2: colorPalettes.blue,
      l3: colorPalettes.amber,
      l4: colorPalettes.red,
    },
    
    // UI colors
    background: 'hsl(222, 47%, 4%)',
    foreground: 'hsl(210, 40%, 98%)',
    card: 'hsl(221, 39%, 8%)',
    cardForeground: 'hsl(210, 40%, 98%)',
    popover: 'hsl(221, 39%, 8%)',
    popoverForeground: 'hsl(210, 40%, 98%)',
    muted: 'hsl(217, 33%, 12%)',
    mutedForeground: 'hsl(215, 20%, 75%)',
    border: 'hsl(217, 33%, 18%)',
    input: 'hsl(217, 33%, 14%)',
    ring: 'hsl(217, 91%, 60%)',
    destructive: 'hsl(0, 75%, 55%)',
    destructiveForeground: 'hsl(210, 40%, 98%)',
  },
  spacing: defaultSpacing,
  typography: defaultTypography,
  breakpoints: defaultBreakpoints,
  animations: defaultAnimations,
  elevation: defaultElevation,
  borderRadius: defaultBorderRadius,
  effects: {
    glassmorphism: {
      background: 'rgba(30, 58, 138, 0.3)',
      border: 'rgba(96, 165, 250, 0.2)',
      backdrop: 'blur(16px)',
      shadow: '0 8px 32px rgba(30, 58, 138, 0.2)',
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(217, 91%, 60%) 0%, hsl(224, 76%, 65%) 100%)',
      secondary: 'linear-gradient(145deg, hsl(221, 39%, 8%) 0%, hsl(217, 33%, 12%) 100%)',
      accent: 'linear-gradient(135deg, hsl(224, 76%, 60%) 0%, hsl(230, 81%, 65%) 100%)',
      card: 'linear-gradient(145deg, hsl(221, 39%, 8%) 0%, hsl(217, 33%, 12%) 100%)',
    },
  },
};

// Nature Green Theme
export const greenTheme: Theme = {
  id: 'green',
  name: 'Nature Green',
  colors: {
    // Base colors
    slate: colorPalettes.slate,
    gray: colorPalettes.slate,
    zinc: colorPalettes.slate,
    neutral: colorPalettes.slate,
    stone: colorPalettes.slate,
    
    // Brand colors
    primary: colorPalettes.emerald,
    secondary: colorPalettes.slate,
    accent: colorPalettes.emerald,
    
    // Semantic colors
    success: colorPalettes.emerald,
    warning: colorPalettes.amber,
    error: colorPalettes.red,
    info: colorPalettes.blue,
    
    // Category colors
    personal: colorPalettes.purple,
    work: colorPalettes.emerald,
    code: colorPalettes.red,
    research: colorPalettes.blue,
    
    // Complexity colors
    complexity: {
      l1: colorPalettes.emerald,
      l2: colorPalettes.blue,
      l3: colorPalettes.amber,
      l4: colorPalettes.red,
    },
    
    // UI colors
    background: 'hsl(151, 30%, 4%)',
    foreground: 'hsl(150, 30%, 98%)',
    card: 'hsl(151, 25%, 7%)',
    cardForeground: 'hsl(150, 30%, 98%)',
    popover: 'hsl(151, 25%, 7%)',
    popoverForeground: 'hsl(150, 30%, 98%)',
    muted: 'hsl(148, 25%, 12%)',
    mutedForeground: 'hsl(150, 20%, 75%)',
    border: 'hsl(148, 25%, 18%)',
    input: 'hsl(148, 25%, 14%)',
    ring: 'hsl(158, 64%, 52%)',
    destructive: 'hsl(0, 75%, 55%)',
    destructiveForeground: 'hsl(150, 30%, 98%)',
  },
  spacing: defaultSpacing,
  typography: defaultTypography,
  breakpoints: defaultBreakpoints,
  animations: defaultAnimations,
  elevation: defaultElevation,
  borderRadius: defaultBorderRadius,
  effects: {
    glassmorphism: {
      background: 'rgba(6, 78, 59, 0.3)',
      border: 'rgba(52, 211, 153, 0.2)',
      backdrop: 'blur(16px)',
      shadow: '0 8px 32px rgba(6, 78, 59, 0.2)',
    },
    gradients: {
      primary: 'linear-gradient(135deg, hsl(158, 64%, 52%) 0%, hsl(165, 71%, 55%) 100%)',
      secondary: 'linear-gradient(145deg, hsl(151, 25%, 7%) 0%, hsl(148, 25%, 12%) 100%)',
      accent: 'linear-gradient(135deg, hsl(165, 71%, 52%) 0%, hsl(172, 76%, 55%) 100%)',
      card: 'linear-gradient(145deg, hsl(151, 25%, 7%) 0%, hsl(148, 25%, 12%) 100%)',
    },
  },
};

// Available themes
export const themes = {
  dark: darkTheme,
  light: lightTheme,
  'neutral-bright': neutralBrightTheme,
  blue: blueTheme,
  green: greenTheme,
};

export type ThemeId = keyof typeof themes;

// Default theme
export const defaultTheme = darkTheme;