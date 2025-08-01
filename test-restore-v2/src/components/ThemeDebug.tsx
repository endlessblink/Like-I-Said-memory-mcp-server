/**
 * Theme Debug Component
 * Shows current theme values for debugging
 */

import React, { useEffect, useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

export function ThemeDebug() {
  const { theme, themeId } = useTheme();
  const [cssVars, setCssVars] = useState<Record<string, string>>({});
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const root = document.documentElement;
    const computedStyle = getComputedStyle(root);
    
    const vars: Record<string, string> = {
      '--background': computedStyle.getPropertyValue('--background'),
      '--foreground': computedStyle.getPropertyValue('--foreground'),
      '--card': computedStyle.getPropertyValue('--card'),
      '--primary-500': computedStyle.getPropertyValue('--primary-500'),
      '--secondary-500': computedStyle.getPropertyValue('--secondary-500'),
    };
    
    setCssVars(vars);
  }, [theme, themeId]);

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-safe right-4 z-50 p-2 bg-card rounded-lg shadow-lg mb-4"
      >
        🎨
      </button>
    );
  }

  return (
    <div className="fixed bottom-safe right-4 z-50 p-4 bg-card border border-border rounded-lg shadow-lg max-w-sm mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-bold">Theme Debug</h3>
        <button onClick={() => setIsVisible(false)} className="text-sm">✕</button>
      </div>
      <div className="text-sm space-y-1">
        <div>Current Theme: <span className="font-mono">{themeId}</span></div>
        <div>Theme Name: <span className="font-mono">{theme.name}</span></div>
        <hr className="my-2 border-border" />
        <div className="space-y-1">
          {Object.entries(cssVars).map(([key, value]) => (
            <div key={key} className="flex justify-between gap-2">
              <span className="font-mono text-xs">{key}:</span>
              <span className="font-mono text-xs truncate">{value || 'not set'}</span>
            </div>
          ))}
        </div>
        <hr className="my-2 border-border" />
        <div className="grid grid-cols-4 gap-2">
          <div 
            className="w-8 h-8 rounded border border-border"
            style={{ backgroundColor: cssVars['--background'] ? `hsl(${cssVars['--background']})` : 'transparent' }}
            title="Background"
          />
          <div 
            className="w-8 h-8 rounded border border-border"
            style={{ backgroundColor: cssVars['--card'] ? `hsl(${cssVars['--card']})` : 'transparent' }}
            title="Card"
          />
          <div 
            className="w-8 h-8 rounded border border-border"
            style={{ backgroundColor: cssVars['--primary-500'] || 'transparent' }}
            title="Primary"
          />
          <div 
            className="w-8 h-8 rounded border border-border"
            style={{ backgroundColor: cssVars['--secondary-500'] || 'transparent' }}
            title="Secondary"
          />
        </div>
      </div>
    </div>
  );
}