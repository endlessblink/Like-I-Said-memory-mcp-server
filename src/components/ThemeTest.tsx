import React, { useEffect } from 'react';

export function ThemeTest() {
  useEffect(() => {
    // Manually inject theme variables to test
    const root = document.documentElement;
    
    // Set test variables
    root.style.setProperty('--background', '222 23% 4%');
    root.style.setProperty('--foreground', '210 40% 98%');
    root.style.setProperty('--primary-500', '#a855f7');
    root.style.setProperty('--muted', '220 20% 12%');
    root.style.setProperty('--muted-foreground', '220 15% 75%');
    root.style.setProperty('--glass-bg', 'rgba(30, 41, 59, 0.7)');
    root.style.setProperty('--glass-border', 'rgba(148, 163, 184, 0.15)');
    root.style.setProperty('--glass-backdrop', 'blur(16px)');
    root.style.setProperty('--gradient-primary', 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)');
    
    console.log('Theme test variables injected');
    
    // Log computed styles
    const bodyStyles = getComputedStyle(document.body);
    console.log('Body background-color:', bodyStyles.backgroundColor);
    console.log('Body color:', bodyStyles.color);
    
    // Test if CSS variables are working
    const testDiv = document.createElement('div');
    testDiv.style.cssText = 'background: hsl(var(--background)); color: hsl(var(--foreground));';
    document.body.appendChild(testDiv);
    const testStyles = getComputedStyle(testDiv);
    console.log('Test div background:', testStyles.backgroundColor);
    console.log('Test div color:', testStyles.color);
    document.body.removeChild(testDiv);
  }, []);
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      padding: '10px',
      background: 'hsl(var(--background))',
      color: 'hsl(var(--foreground))',
      borderBottom: '2px solid var(--primary-500)',
      zIndex: 9999
    }}>
      <div>Theme Test Component</div>
      <div style={{ fontSize: '12px', marginTop: '5px' }}>
        Background: hsl(var(--background)) | 
        Foreground: hsl(var(--foreground)) | 
        Primary: var(--primary-500)
      </div>
    </div>
  );
}