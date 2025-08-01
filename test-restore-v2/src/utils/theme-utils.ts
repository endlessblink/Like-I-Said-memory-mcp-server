/**
 * Theme Utility Functions
 * Helper functions for working with themes and design tokens
 */

import { Theme, ColorToken } from '@/config/design-tokens';

/**
 * Convert HSL color to hex
 */
export function hslToHex(hsl: string): string {
  // Extract HSL values from string like "hsl(222, 23%, 4%)"
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (!match) return hsl;
  
  const [, h, s, l] = match.map(Number);
  
  const sNorm = s / 100;
  const lNorm = l / 100;
  
  const c = (1 - Math.abs(2 * lNorm - 1)) * sNorm;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = lNorm - c / 2;
  
  let r = 0, g = 0, b = 0;
  
  if (0 <= h && h < 60) {
    r = c; g = x; b = 0;
  } else if (60 <= h && h < 120) {
    r = x; g = c; b = 0;
  } else if (120 <= h && h < 180) {
    r = 0; g = c; b = x;
  } else if (180 <= h && h < 240) {
    r = 0; g = x; b = c;
  } else if (240 <= h && h < 300) {
    r = x; g = 0; b = c;
  } else if (300 <= h && h < 360) {
    r = c; g = 0; b = x;
  }
  
  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Convert hex color to HSL
 */
export function hexToHsl(hex: string): string {
  // Remove # if present
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  
  let h = 0, s = 0, l = (max + min) / 2;
  
  if (max === min) {
    h = s = 0; // achromatic
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    
    h /= 6;
  }
  
  h = Math.round(h * 360);
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Generate a color palette from a base color
 */
export function generateColorPalette(baseColor: string): ColorToken {
  const baseHsl = baseColor.startsWith('#') ? hexToHsl(baseColor) : baseColor;
  const match = baseHsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  
  if (!match) {
    // Fallback to a default palette if parsing fails
    return {
      50: '#f8fafc',
      100: '#f1f5f9',
      200: '#e2e8f0',
      300: '#cbd5e1',
      400: '#94a3b8',
      500: baseColor,
      600: '#475569',
      700: '#334155',
      800: '#1e293b',
      900: '#0f172a',
      950: '#020617',
    };
  }
  
  const [, h, s, l] = match.map(Number);
  
  return {
    50: `hsl(${h}, ${Math.max(s - 10, 10)}%, ${Math.min(l + 45, 95)}%)`,
    100: `hsl(${h}, ${Math.max(s - 5, 15)}%, ${Math.min(l + 40, 90)}%)`,
    200: `hsl(${h}, ${s}%, ${Math.min(l + 30, 85)}%)`,
    300: `hsl(${h}, ${s}%, ${Math.min(l + 20, 75)}%)`,
    400: `hsl(${h}, ${s}%, ${Math.min(l + 10, 65)}%)`,
    500: baseHsl,
    600: `hsl(${h}, ${Math.min(s + 5, 100)}%, ${Math.max(l - 10, 15)}%)`,
    700: `hsl(${h}, ${Math.min(s + 10, 100)}%, ${Math.max(l - 20, 10)}%)`,
    800: `hsl(${h}, ${Math.min(s + 15, 100)}%, ${Math.max(l - 30, 8)}%)`,
    900: `hsl(${h}, ${Math.min(s + 20, 100)}%, ${Math.max(l - 40, 5)}%)`,
    950: `hsl(${h}, ${Math.min(s + 25, 100)}%, ${Math.max(l - 45, 3)}%)`,
  };
}

/**
 * Check if a color is light or dark
 */
export function isLightColor(color: string): boolean {
  let hex = color;
  
  // Convert HSL to hex if needed
  if (color.startsWith('hsl')) {
    hex = hslToHex(color);
  }
  
  // Remove # if present
  hex = hex.replace('#', '');
  
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5;
}

/**
 * Get contrasting text color (black or white) for a background
 */
export function getContrastColor(backgroundColor: string): string {
  return isLightColor(backgroundColor) ? '#000000' : '#ffffff';
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(color: string, percentage: number): string {
  const hsl = color.startsWith('#') ? hexToHsl(color) : color;
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  
  if (!match) return color;
  
  const [, h, s, l] = match.map(Number);
  const newL = Math.max(l - percentage, 0);
  
  return `hsl(${h}, ${s}%, ${newL}%)`;
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(color: string, percentage: number): string {
  const hsl = color.startsWith('#') ? hexToHsl(color) : color;
  const match = hsl.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  
  if (!match) return color;
  
  const [, h, s, l] = match.map(Number);
  const newL = Math.min(l + percentage, 100);
  
  return `hsl(${h}, ${s}%, ${newL}%)`;
}

/**
 * Add alpha (transparency) to a color
 */
export function addAlpha(color: string, alpha: number): string {
  if (color.startsWith('hsl')) {
    return color.replace('hsl', 'hsla').replace(')', `, ${alpha})`);
  } else if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  
  return color;
}

/**
 * Get a readable color name from a color value
 */
export function getColorName(color: string): string {
  const colorNames: Record<string, string> = {
    '#f8fafc': 'Light Gray',
    '#1e293b': 'Dark Slate',
    '#3b82f6': 'Blue',
    '#10b981': 'Emerald',
    '#f59e0b': 'Amber',
    '#ef4444': 'Red',
    '#8b5cf6': 'Violet',
    '#ec4899': 'Pink',
  };
  
  return colorNames[color] || 'Custom Color';
}

/**
 * Generate CSS custom properties from theme
 */
export function generateCSSProperties(theme: Theme): Record<string, string> {
  const properties: Record<string, string> = {};
  
  // Base colors
  properties['--background'] = theme.colors.background;
  properties['--foreground'] = theme.colors.foreground;
  properties['--card'] = theme.colors.card;
  properties['--card-foreground'] = theme.colors.cardForeground;
  
  // Primary colors
  Object.entries(theme.colors.primary).forEach(([shade, color]) => {
    properties[`--primary-${shade}`] = color;
  });
  
  // Category colors
  properties['--category-personal'] = theme.colors.personal[500];
  properties['--category-work'] = theme.colors.work[500];
  properties['--category-code'] = theme.colors.code[500];
  properties['--category-research'] = theme.colors.research[500];
  
  // Complexity colors
  properties['--complexity-l1'] = theme.colors.complexity.l1[500];
  properties['--complexity-l2'] = theme.colors.complexity.l2[500];
  properties['--complexity-l3'] = theme.colors.complexity.l3[500];
  properties['--complexity-l4'] = theme.colors.complexity.l4[500];
  
  // Effects
  properties['--glass-bg'] = theme.effects.glassmorphism.background;
  properties['--glass-border'] = theme.effects.glassmorphism.border;
  properties['--gradient-primary'] = theme.effects.gradients.primary;
  
  return properties;
}

/**
 * Export theme as CSS file content
 */
export function exportThemeAsCSS(theme: Theme): string {
  const properties = generateCSSProperties(theme);
  
  let css = `:root {\n`;
  Object.entries(properties).forEach(([property, value]) => {
    css += `  ${property}: ${value};\n`;
  });
  css += `}\n`;
  
  return css;
}

/**
 * Validate theme configuration
 */
export function validateTheme(theme: Partial<Theme>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!theme.id) {
    errors.push('Theme ID is required');
  }
  
  if (!theme.name) {
    errors.push('Theme name is required');
  }
  
  if (!theme.colors) {
    errors.push('Theme colors are required');
  } else {
    const requiredColors = ['background', 'foreground', 'primary', 'secondary'];
    requiredColors.forEach(color => {
      if (!theme.colors![color as keyof typeof theme.colors]) {
        errors.push(`Color '${color}' is required`);
      }
    });
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}