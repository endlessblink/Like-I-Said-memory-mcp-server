import { useState, useEffect, useCallback } from 'react'

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

export const usePerformanceSettings = () => {
  const [settings, setSettings] = useState<PerformanceSettings>(DEFAULT_SETTINGS)

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('like-i-said-performance-settings')
    if (saved) {
      try {
        const parsedSettings = JSON.parse(saved)
        setSettings({ ...DEFAULT_SETTINGS, ...parsedSettings })
      } catch (error) {
        console.warn('Failed to parse performance settings:', error)
      }
    }
  }, [])

  // Save settings to localStorage when changed
  const updateSettings = useCallback((newSettings: Partial<PerformanceSettings>) => {
    setSettings(prevSettings => {
      const updatedSettings = { ...prevSettings, ...newSettings }
      localStorage.setItem('like-i-said-performance-settings', JSON.stringify(updatedSettings))
      return updatedSettings
    })
  }, [])

  // Reset to defaults
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    localStorage.removeItem('like-i-said-performance-settings')
  }, [])

  return {
    settings,
    updateSettings,
    resetSettings
  }
}

export default usePerformanceSettings