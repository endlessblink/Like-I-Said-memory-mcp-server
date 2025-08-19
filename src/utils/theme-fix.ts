/**
 * Theme Fix Utility
 * Ensures theme variables are properly applied
 */

import { themes } from '@/config/themes';
import type { Theme } from '@/config/design-tokens';

// Extract HSL values without the hsl() wrapper
function extractHSLValues(hslString: string): string {
  if (!hslString) return '0 0% 0%';
  
  // If already in the correct format (no hsl wrapper)
  if (!hslString.includes('hsl')) {
    return hslString.trim();
  }
  
  // Extract values from hsl() format
  const match = hslString.match(/hsl\(([^)]+)\)/);
  if (match) {
    // Remove commas and normalize spacing
    return match[1].replace(/,/g, '').trim();
  }
  
  return hslString;
}

// Convert hex to HSL
function hexToHSL(hex: string): string {
  // Remove the hash if present
  hex = hex.replace(/^#/, '');
  
  // Parse the hex values
  const r = parseInt(hex.substr(0, 2), 16) / 255;
  const g = parseInt(hex.substr(2, 2), 16) / 255;
  const b = parseInt(hex.substr(4, 2), 16) / 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Apply theme to document
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  
  // Apply base UI colors first - these are simple strings
  const baseColors = [
    'background', 'foreground', 'card', 'cardForeground', 
    'popover', 'popoverForeground', 'muted', 'mutedForeground',
    'border', 'input', 'ring', 'destructive', 'destructiveForeground'
  ];
  
  baseColors.forEach(colorKey => {
    const value = theme.colors[colorKey as keyof typeof theme.colors];
    if (typeof value === 'string') {
      const cssKey = colorKey.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(`--${cssKey}`, extractHSLValues(value));
    }
  });
  
  // Apply color palettes (objects with numeric keys)
  const paletteColors = ['primary', 'secondary', 'accent', 'success', 'warning', 'error', 'info',
                         'personal', 'work', 'code', 'research'];
  
  paletteColors.forEach(paletteKey => {
    const palette = theme.colors[paletteKey as keyof typeof theme.colors];
    if (typeof palette === 'object' && palette !== null) {
      Object.entries(palette).forEach(([shade, color]) => {
        if (typeof color === 'string') {
          const hslValue = color.startsWith('#') ? hexToHSL(color) : extractHSLValues(color);
          root.style.setProperty(`--${paletteKey}-${shade}`, color.startsWith('#') ? color : `hsl(${hslValue})`);
        }
      });
    }
  });
  
  // Apply complexity colors specially
  if (theme.colors.complexity) {
    Object.entries(theme.colors.complexity).forEach(([level, colorPalette]) => {
      if (typeof colorPalette === 'object' && colorPalette !== null && '500' in colorPalette) {
        const color = colorPalette['500'];
        root.style.setProperty(`--complexity-${level}`, color);
      }
    });
  }
  
  // Apply category colors (use the 500 shade)
  ['personal', 'work', 'code', 'research'].forEach(cat => {
    const palette = theme.colors[cat as keyof typeof theme.colors];
    if (typeof palette === 'object' && palette !== null && '500' in palette) {
      root.style.setProperty(`--category-${cat}`, palette['500']);
    }
  });
  
  // Apply semantic colors (use the 500 shade)
  ['success', 'warning', 'error', 'info'].forEach(semantic => {
    const palette = theme.colors[semantic as keyof typeof theme.colors];
    if (typeof palette === 'object' && palette !== null && '500' in palette) {
      root.style.setProperty(`--${semantic}`, palette['500']);
    }
  });
  
  // Apply spacing variables
  if (theme.spacing) {
    Object.entries(theme.spacing).forEach(([key, value]) => {
      root.style.setProperty(`--space-${key}`, value);
    });
  }
  
  // Apply typography variables
  if (theme.typography) {
    Object.entries(theme.typography).forEach(([key, value]) => {
      root.style.setProperty(`--text-${key}-size`, value.fontSize);
      root.style.setProperty(`--text-${key}-height`, value.lineHeight);
    });
  }
  
  // Apply animation variables
  if (theme.animations) {
    if (theme.animations.duration) {
      Object.entries(theme.animations.duration).forEach(([key, value]) => {
        root.style.setProperty(`--duration-${key}`, value);
      });
    }
    if (theme.animations.timing) {
      Object.entries(theme.animations.timing).forEach(([key, value]) => {
        root.style.setProperty(`--timing-${key}`, value);
      });
    }
  }
  
  // Apply border radius
  if (theme.borderRadius) {
    Object.entries(theme.borderRadius).forEach(([key, value]) => {
      const cssKey = key === 'DEFAULT' ? 'radius' : `radius-${key}`;
      root.style.setProperty(`--${cssKey}`, value);
    });
  }
  
  // Apply effects
  if (theme.effects) {
    // Glassmorphism
    if (theme.effects.glassmorphism) {
      root.style.setProperty('--glass-bg', theme.effects.glassmorphism.background);
      root.style.setProperty('--glass-border', theme.effects.glassmorphism.border);
      root.style.setProperty('--glass-backdrop', theme.effects.glassmorphism.backdrop);
      root.style.setProperty('--glass-shadow', theme.effects.glassmorphism.shadow);
    }
    
    // Gradients
    if (theme.effects.gradients) {
      Object.entries(theme.effects.gradients).forEach(([key, value]) => {
        root.style.setProperty(`--gradient-${key}`, value);
      });
    }
  }
  
  // Force a reflow to ensure styles are applied
  void root.offsetHeight;
  
  // Add theme class to body
  document.body.className = document.body.className
    .replace(/theme-\w+/g, '')
    .trim() + ` theme-${theme.id}`;
}

// Initialize theme on page load
export function initializeThemeSystem() {
  // Get stored theme or default
  const storedThemeId = localStorage.getItem('like-i-said-theme') || 'dark';
  const theme = themes[storedThemeId as keyof typeof themes] || themes.dark;
  
  // Apply theme immediately
  applyTheme(theme);
  
  // Also ensure CSS is properly loaded
  const root = document.documentElement;
  root.classList.add('theme-initialized');
  
  console.log('Theme system initialized with:', theme.name);
}

// Export for use in components
export function updateTheme(themeId: string) {
  const theme = themes[themeId as keyof typeof themes];
  if (theme) {
    applyTheme(theme);
    localStorage.setItem('like-i-said-theme', themeId);
  }
}