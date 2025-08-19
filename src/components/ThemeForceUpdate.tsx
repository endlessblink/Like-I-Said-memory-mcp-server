/**
 * Theme Force Update Component
 * Forces theme updates by manipulating DOM classes and triggering repaints
 */

import { useEffect } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeForceUpdate() {
  const { theme, themeId } = useTheme();

  useEffect(() => {
    // Force theme class update
    const root = document.documentElement;
    
    // Remove all theme classes
    root.classList.remove('theme-dark', 'theme-light', 'theme-blue', 'theme-green');
    
    // Add current theme class
    root.classList.add(`theme-${themeId}`);
    
    // Force repaint by triggering multiple style recalculation methods
    const forceRepaint = () => {
      // Method 1: Toggle display
      root.style.display = 'none';
      void root.offsetHeight; // Trigger reflow
      root.style.display = '';
      
      // Method 2: Force style recalculation on body
      document.body.style.zoom = '1.0000001';
      setTimeout(() => {
        document.body.style.zoom = '1';
      }, 0);
      
      // Method 3: Trigger animation frame cascade
      requestAnimationFrame(() => {
        root.style.opacity = '0.9999';
        requestAnimationFrame(() => {
          root.style.opacity = '1';
        });
      });
      
      // Method 4: Force all elements to recalculate
      const allElements = document.querySelectorAll('*');
      allElements.forEach(el => {
        (el as HTMLElement).style.cssText += '; ';
      });
    };
    
    // Apply theme updates with a slight delay to ensure CSS variables are set
    setTimeout(forceRepaint, 10);
    
    // Log theme change
    console.log(`Theme force updated to: ${themeId}`, {
      background: getComputedStyle(root).getPropertyValue('--background'),
      foreground: getComputedStyle(root).getPropertyValue('--foreground'),
      primary: getComputedStyle(root).getPropertyValue('--primary-500'),
    });
  }, [themeId, theme]);

  return null;
}