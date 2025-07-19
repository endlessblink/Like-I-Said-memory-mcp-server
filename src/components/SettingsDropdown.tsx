/**
 * Settings Dropdown Component
 * Consolidates various settings and preferences into a single dropdown menu
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';
import { Settings, Palette, Keyboard, Info, HelpCircle, Download, Upload } from 'lucide-react';
import { themes } from '@/config/themes';
import { updateTheme } from '@/utils/theme-fix';

interface SettingsDropdownProps {
  onShowKeyboardShortcuts?: () => void;
  onShowTutorial?: () => void;
  onShowExportDialog?: () => void;
  onShowImportDialog?: () => void;
  hasSelectedMemories?: boolean;
  selectedCount?: number;
  className?: string;
}

export function SettingsDropdown({
  onShowKeyboardShortcuts,
  onShowTutorial,
  onShowExportDialog,
  onShowImportDialog,
  hasSelectedMemories = false,
  selectedCount = 0,
  className = ''
}: SettingsDropdownProps) {
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
        <Button 
          variant="ghost" 
          size="sm" 
          className={`h-10 px-3 transition-all duration-200 group ${className}`}
        >
          <Settings className="h-4 w-4 transition-transform duration-200 group-hover:rotate-45" />
          <span className="sr-only">Settings</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Settings</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {/* Theme Selector Submenu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            <Palette className="mr-2 h-4 w-4" />
            <span>Theme</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {Object.entries(themes).map(([id, theme]) => (
              <DropdownMenuItem
                key={id}
                onClick={() => handleThemeChange(id)}
                className="cursor-pointer"
              >
                <div className="flex items-center justify-between w-full">
                  <span>{theme.name}</span>
                  {currentTheme === id && (
                    <span className="text-primary ml-2">✓</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        {/* Keyboard Shortcuts */}
        {onShowKeyboardShortcuts && (
          <DropdownMenuItem onClick={onShowKeyboardShortcuts} className="cursor-pointer">
            <Keyboard className="mr-2 h-4 w-4" />
            <span>Keyboard Shortcuts</span>
            <span className="ml-auto text-xs text-muted-foreground">?</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Data Management */}
        {onShowExportDialog && (
          <DropdownMenuItem onClick={onShowExportDialog} className="cursor-pointer">
            <Download className="mr-2 h-4 w-4" />
            <span>Export Memories</span>
            {hasSelectedMemories && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                {selectedCount}
              </span>
            )}
          </DropdownMenuItem>
        )}
        
        {onShowImportDialog && (
          <DropdownMenuItem onClick={onShowImportDialog} className="cursor-pointer">
            <Upload className="mr-2 h-4 w-4" />
            <span>Import Memories</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Help & Info */}
        {onShowTutorial && (
          <DropdownMenuItem onClick={onShowTutorial} className="cursor-pointer">
            <HelpCircle className="mr-2 h-4 w-4" />
            <span>Tutorial</span>
          </DropdownMenuItem>
        )}
        
        <DropdownMenuItem className="cursor-pointer" onClick={() => window.open('https://github.com/endlessblink/Like-I-Said-memory-mcp-server', '_blank')}>
          <Info className="mr-2 h-4 w-4" />
          <span>About</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}