import React, { useState, useEffect } from 'react'
import { Switch } from './ui/switch'
import { Label } from './ui/label'
import { Button } from './ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Badge } from './ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface PerformanceSettingsProps {
  onSettingsChange: (settings: PerformanceSettings) => void
}

export interface PerformanceSettings {
  enableVirtualization: boolean
  pageSize: number
  enableServerFiltering: boolean
  enableAnimations: boolean
  prefetchPages: number
  cacheSize: number
}

const DEFAULT_SETTINGS: PerformanceSettings = {
  enableVirtualization: true,
  pageSize: 50,
  enableServerFiltering: true,
  enableAnimations: true,
  prefetchPages: 2,
  cacheSize: 50
}

export const PerformanceSettings: React.FC<PerformanceSettingsProps> = ({
  onSettingsChange
}) => {
  const [settings, setSettings] = useState<PerformanceSettings>(DEFAULT_SETTINGS)
  const [memoryUsage, setMemoryUsage] = useState<string>('Unknown')

  // Load settings from localStorage on component mount
  useEffect(() => {
    const saved = localStorage.getItem('performance-settings')
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      } catch (error) {
        console.warn('Failed to parse performance settings:', error)
      }
    }
  }, [])

  // Save settings to localStorage and notify parent
  useEffect(() => {
    localStorage.setItem('performance-settings', JSON.stringify(settings))
    onSettingsChange(settings)
  }, [settings, onSettingsChange])

  // Monitor memory usage if available
  useEffect(() => {
    const updateMemoryUsage = () => {
      if ('memory' in performance) {
        const memInfo = (performance as any).memory
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024)
        const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024)
        setMemoryUsage(`${usedMB}MB / ${totalMB}MB`)
      }
    }

    updateMemoryUsage()
    const interval = setInterval(updateMemoryUsage, 5000)
    return () => clearInterval(interval)
  }, [])

  const updateSetting = <K extends keyof PerformanceSettings>(
    key: K, 
    value: PerformanceSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }))
  }

  const resetToDefaults = () => {
    setSettings(DEFAULT_SETTINGS)
  }

  const getPerformanceLevel = (): 'High' | 'Balanced' | 'Basic' => {
    if (settings.enableVirtualization && settings.enableServerFiltering && settings.pageSize >= 50) {
      return 'High'
    }
    if (settings.enableVirtualization || settings.enableServerFiltering) {
      return 'Balanced'
    }
    return 'Basic'
  }

  const performanceLevel = getPerformanceLevel()
  const performanceColor = {
    'High': 'green',
    'Balanced': 'yellow', 
    'Basic': 'red'
  }[performanceLevel]

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              ⚡ Performance Settings
              <Badge 
                variant="outline" 
                className={`text-${performanceColor}-500 border-${performanceColor}-500`}
              >
                {performanceLevel} Performance
              </Badge>
            </div>
            <CardDescription>
              Configure dashboard performance optimizations for better experience with large datasets
            </CardDescription>
          </div>
          <Button onClick={resetToDefaults} variant="outline" size="sm">
            Reset Defaults
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Memory Usage Monitor */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <Label className="text-sm font-medium">Current Memory Usage</Label>
          <div className="text-sm text-muted-foreground">{memoryUsage}</div>
        </div>

        {/* Virtualization */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="virtualization"
              checked={settings.enableVirtualization}
              onCheckedChange={(checked) => updateSetting('enableVirtualization', checked)}
            />
            <Label htmlFor="virtualization" className="font-medium">
              Enable Virtualization
            </Label>
            <Badge variant="secondary" className="text-xs">
              Recommended
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Only render visible memory cards for better performance with 1000+ memories
          </p>
        </div>

        {/* Server-Side Filtering */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="server-filtering"
              checked={settings.enableServerFiltering}
              onCheckedChange={(checked) => updateSetting('enableServerFiltering', checked)}
            />
            <Label htmlFor="server-filtering" className="font-medium">
              Server-Side Filtering
            </Label>
            <Badge variant="secondary" className="text-xs">
              Recommended
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Filter memories on the server to reduce network traffic and improve search speed
          </p>
        </div>

        {/* Page Size */}
        <div className="space-y-2">
          <Label htmlFor="page-size" className="font-medium">
            Page Size
          </Label>
          <Select
            value={settings.pageSize.toString()}
            onValueChange={(value) => updateSetting('pageSize', parseInt(value))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="20">20 memories per page (Fastest)</SelectItem>
              <SelectItem value="50">50 memories per page (Balanced)</SelectItem>
              <SelectItem value="100">100 memories per page (More content)</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Smaller page sizes load faster but require more requests
          </p>
        </div>

        {/* Animations */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="animations"
              checked={settings.enableAnimations}
              onCheckedChange={(checked) => updateSetting('enableAnimations', checked)}
            />
            <Label htmlFor="animations" className="font-medium">
              Enable Animations
            </Label>
          </div>
          <p className="text-sm text-muted-foreground ml-6">
            Disable animations to improve performance on slower devices
          </p>
        </div>

        {/* Advanced Settings */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-3">Advanced Settings</h4>
          
          {/* Prefetch Pages */}
          <div className="space-y-2 mb-4">
            <Label htmlFor="prefetch-pages" className="font-medium">
              Prefetch Pages
            </Label>
            <Select
              value={settings.prefetchPages.toString()}
              onValueChange={(value) => updateSetting('prefetchPages', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No prefetching</SelectItem>
                <SelectItem value="1">1 page ahead</SelectItem>
                <SelectItem value="2">2 pages ahead (Recommended)</SelectItem>
                <SelectItem value="3">3 pages ahead</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Preload pages for smoother scrolling (uses more memory)
            </p>
          </div>

          {/* Cache Size */}
          <div className="space-y-2">
            <Label htmlFor="cache-size" className="font-medium">
              Cache Size
            </Label>
            <Select
              value={settings.cacheSize.toString()}
              onValueChange={(value) => updateSetting('cacheSize', parseInt(value))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="20">20 pages (Low memory)</SelectItem>
                <SelectItem value="50">50 pages (Balanced)</SelectItem>
                <SelectItem value="100">100 pages (High memory)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Number of pages to keep in memory for instant access
            </p>
          </div>
        </div>

        {/* Performance Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            💡 Performance Tips
          </h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Enable virtualization for collections with 500+ memories</li>
            <li>• Use server-side filtering for faster search results</li>
            <li>• Disable animations on slower devices or mobile</li>
            <li>• Smaller page sizes reduce initial load time</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

export default PerformanceSettings