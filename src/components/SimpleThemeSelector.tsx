/**
 * Simple Theme Selector Component
 * Basic dropdown for theme switching
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Palette } from 'lucide-react';
import { themes } from '@/config/themes';
import { updateTheme } from '@/utils/theme-fix';

export function SimpleThemeSelector() {
  const [currentTheme, setCurrentTheme] = React.useState(
    localStorage.getItem('like-i-said-theme') || 'dark'
  );

  const handleThemeChange = (themeId: string) => {
    setCurrentTheme(themeId);
    updateTheme(themeId);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-10 px-3">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Select theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Select Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {Object.entries(themes).map(([id, theme]) => (
          <DropdownMenuItem
            key={id}
            onClick={() => handleThemeChange(id)}
            className="cursor-pointer"
          >
            <div className="flex items-center justify-between w-full">
              <span>{theme.name}</span>
              {currentTheme === id && (
                <span className="text-primary">✓</span>
              )}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}