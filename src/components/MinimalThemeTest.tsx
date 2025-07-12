import React, { useEffect, useState } from 'react';

export function MinimalThemeTest() {
  const [cssVars, setCssVars] = useState<Record<string, string>>({});
  
  useEffect(() => {
    const root = document.documentElement;
    const styles = getComputedStyle(root);
    
    setCssVars({
      background: styles.getPropertyValue('--background'),
      foreground: styles.getPropertyValue('--foreground'),
      primary: styles.getPropertyValue('--primary-500'),
      glassBg: styles.getPropertyValue('--glass-bg'),
    });
  }, []);
  
  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] p-4 bg-black text-white text-xs font-mono">
      <div className="max-w-4xl mx-auto">
        <h3 className="font-bold mb-2">Theme Debug Panel</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="font-bold">CSS Variables:</h4>
            <pre className="text-[10px]">{JSON.stringify(cssVars, null, 2)}</pre>
          </div>
          <div>
            <h4 className="font-bold">Test Elements:</h4>
            <div className="space-y-2 mt-2">
              <div 
                className="p-2 rounded" 
                style={{ 
                  backgroundColor: 'hsl(var(--background))',
                  color: 'hsl(var(--foreground))',
                  border: '1px solid hsl(var(--border))'
                }}
              >
                Direct CSS var test
              </div>
              <div className="p-2 rounded bg-background text-foreground border border-border">
                Tailwind class test
              </div>
              <div 
                className="p-2 rounded"
                style={{
                  background: 'var(--gradient-primary)',
                  color: 'white'
                }}
              >
                Gradient test
              </div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 px-3 py-1 bg-blue-500 text-white rounded"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}