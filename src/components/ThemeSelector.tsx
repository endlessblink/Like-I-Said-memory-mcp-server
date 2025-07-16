/**
 * Theme Selector Component
 * Simplified theme selector for switching between themes
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Palette, Paintbrush, Settings, RefreshCw } from 'lucide-react';
import { themes, type ThemeId } from '@/config/themes';
import { updateTheme } from '@/utils/theme-fix';
import { useTheme } from '@/hooks/useTheme';

interface ThemeSelectorProps {
  className?: string;
}

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { theme, themeId, setTheme, availableThemes, customizeTheme, resetTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [customColors, setCustomColors] = useState({
    primary: theme.colors.primary[500],
    secondary: theme.colors.secondary[500],
    background: theme.colors.background,
    foreground: theme.colors.foreground,
  });

  const handleThemeChange = (newThemeId: string) => {
    setTheme(newThemeId as ThemeId);
  };

  const handleColorCustomization = () => {
    customizeTheme({
      colors: {
        ...theme.colors,
        primary: {
          ...theme.colors.primary,
          500: customColors.primary,
        },
        secondary: {
          ...theme.colors.secondary,
          500: customColors.secondary,
        },
        background: customColors.background,
        foreground: customColors.foreground,
      },
    });
  };

  const handleReset = () => {
    resetTheme();
    setCustomColors({
      primary: theme.colors.primary[500],
      secondary: theme.colors.secondary[500],
      background: theme.colors.background,
      foreground: theme.colors.foreground,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`flex items-center gap-2 ${className}`}
        >
          <Palette size={16} />
          <span className="hidden sm:inline">Theme</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Palette size={20} />
            Theme Customization
          </DialogTitle>
          <DialogDescription>
            Choose from pre-built themes or customize your own color scheme
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="presets" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="presets">Theme Presets</TabsTrigger>
            <TabsTrigger value="custom">Custom Colors</TabsTrigger>
          </TabsList>

          <TabsContent value="presets" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(availableThemes).map(([id, themeOption]) => (
                <Card
                  key={id}
                  className={`cursor-pointer transition-all hover:scale-105 ${
                    themeId === id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => handleThemeChange(id)}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between">
                      <span>{themeOption.name}</span>
                      {themeId === id && <Badge variant="default">Current</Badge>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {/* Color preview */}
                      <div className="flex gap-2">
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: themeOption.colors.primary[500] }}
                          title="Primary"
                        />
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: themeOption.colors.secondary[500] }}
                          title="Secondary"
                        />
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: themeOption.colors.success[500] }}
                          title="Success"
                        />
                        <div
                          className="w-8 h-8 rounded-full border-2 border-white/20"
                          style={{ backgroundColor: themeOption.colors.warning[500] }}
                          title="Warning"
                        />
                      </div>
                      
                      {/* Theme sample */}
                      <div
                        className="p-3 rounded-lg border"
                        style={{
                          backgroundColor: themeOption.colors.card,
                          borderColor: themeOption.colors.border,
                          color: themeOption.colors.cardForeground,
                        }}
                      >
                        <div className="text-sm font-medium mb-1">Sample Card</div>
                        <div className="text-xs opacity-70">
                          This is how your content will look
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="custom" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Paintbrush size={18} />
                  Color Customization
                </h3>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="primary-color"
                        type="color"
                        value={customColors.primary}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, primary: e.target.value }))
                        }
                        className="w-20 h-10 p-1 border-0"
                      />
                      <Input
                        value={customColors.primary}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, primary: e.target.value }))
                        }
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="secondary-color"
                        type="color"
                        value={customColors.secondary}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, secondary: e.target.value }))
                        }
                        className="w-20 h-10 p-1 border-0"
                      />
                      <Input
                        value={customColors.secondary}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, secondary: e.target.value }))
                        }
                        placeholder="#000000"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="background-color">Background Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="background-color"
                        type="color"
                        value={customColors.background.includes('hsl') ? '#1e293b' : customColors.background}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, background: e.target.value }))
                        }
                        className="w-20 h-10 p-1 border-0"
                      />
                      <Input
                        value={customColors.background}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, background: e.target.value }))
                        }
                        placeholder="hsl(222, 23%, 4%)"
                        className="flex-1"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="foreground-color">Text Color</Label>
                    <div className="flex gap-2">
                      <Input
                        id="foreground-color"
                        type="color"
                        value={customColors.foreground.includes('hsl') ? '#f8fafc' : customColors.foreground}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, foreground: e.target.value }))
                        }
                        className="w-20 h-10 p-1 border-0"
                      />
                      <Input
                        value={customColors.foreground}
                        onChange={(e) =>
                          setCustomColors(prev => ({ ...prev, foreground: e.target.value }))
                        }
                        placeholder="hsl(210, 40%, 98%)"
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleColorCustomization} className="flex-1">
                    <Settings size={16} className="mr-2" />
                    Apply Changes
                  </Button>
                  <Button onClick={handleReset} variant="outline">
                    <RefreshCw size={16} className="mr-2" />
                    Reset
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preview</h3>
                
                {/* Live preview */}
                <div className="space-y-3 p-4 rounded-lg border" style={{
                  backgroundColor: customColors.background,
                  borderColor: theme.colors.border,
                  color: customColors.foreground,
                }}>
                  <div className="font-semibold" style={{ color: customColors.primary }}>
                    Preview Title
                  </div>
                  <div className="text-sm">
                    This is how your customized theme will look with the new colors.
                  </div>
                  <div className="flex gap-2">
                    <div
                      className="px-3 py-1 rounded text-sm font-medium"
                      style={{
                        backgroundColor: customColors.primary,
                        color: theme.colors.background,
                      }}
                    >
                      Primary Button
                    </div>
                    <div
                      className="px-3 py-1 rounded text-sm border"
                      style={{
                        borderColor: customColors.secondary,
                        color: customColors.secondary,
                      }}
                    >
                      Secondary Button
                    </div>
                  </div>
                </div>

                <Card style={{
                  backgroundColor: theme.colors.card,
                  borderColor: theme.colors.border,
                }}>
                  <CardHeader className="pb-3">
                    <CardTitle style={{ color: customColors.primary }}>
                      Sample Memory Card
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm" style={{ color: customColors.foreground }}>
                      This shows how memory cards will appear with your custom colors.
                    </div>
                    <div className="mt-2 flex gap-1">
                      <Badge variant="secondary">personal</Badge>
                      <Badge variant="outline">L2</Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}