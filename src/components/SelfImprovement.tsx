import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog'
// AlertDialog components not yet implemented
// Will be added when needed
import { 
  Settings2, 
  RotateCcw, 
  Shield, 
  Zap, 
  Play, 
  Pause, 
  History, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Download,
  Upload,
  Save,
  Brain,
  Target,
  Activity
} from 'lucide-react'
import { ReflectionData } from '@/types'

interface SelfImprovementProps {
  className?: string
}

interface SystemSettings {
  reflectionEnabled: boolean
  autoThresholdAdjustment: boolean
  sandboxMode: boolean
  learningRate: number
  confidenceThreshold: number
  maxPatternsToTrack: number
  autoRollbackOnFailure: boolean
}

interface BackupData {
  timestamp: string
  version: string
  settings: SystemSettings
  patterns: any[]
  thresholds: any
}

export function SelfImprovement({ className }: SelfImprovementProps) {
  const [settings, setSettings] = useState<SystemSettings>({
    reflectionEnabled: true,
    autoThresholdAdjustment: true,
    sandboxMode: true,
    learningRate: 0.1,
    confidenceThreshold: 0.6,
    maxPatternsToTrack: 50,
    autoRollbackOnFailure: true
  })
  const [reflectionData, setReflectionData] = useState<ReflectionData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [backups, setBackups] = useState<BackupData[]>([])
  const [systemStatus, setSystemStatus] = useState<'healthy' | 'warning' | 'error'>('healthy')
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [showRollbackDialog, setShowRollbackDialog] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupData | null>(null)

  const fetchData = async () => {
    try {
      setIsLoading(true)
      
      // Fetch current settings
      const settingsResponse = await fetch('/api/reflection/settings')
      if (settingsResponse.ok) {
        const settingsData = await settingsResponse.json()
        setSettings(settingsData)
      }

      // Fetch reflection data
      const reflectionResponse = await fetch('/api/reflection/data')
      if (reflectionResponse.ok) {
        const reflectionData = await reflectionResponse.json()
        setReflectionData(reflectionData)
      }

      // Fetch backups
      const backupsResponse = await fetch('/api/reflection/backups')
      if (backupsResponse.ok) {
        const backupsData = await backupsResponse.json()
        setBackups(backupsData)
        if (backupsData.length > 0) {
          setLastBackup(backupsData[0].timestamp)
        }
      }

      // Fetch system status
      const statusResponse = await fetch('/api/reflection/status')
      if (statusResponse.ok) {
        const statusData = await statusResponse.json()
        setSystemStatus(statusData.status)
      }
    } catch (error) {
      console.error('Failed to fetch self-improvement data:', error)
      setSystemStatus('error')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleSaveSettings = async () => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/reflection/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      })
      
      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      const response = await fetch('/api/reflection/backups', {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to create backup:', error)
    }
  }

  const handleRollback = async (backup: BackupData) => {
    try {
      const response = await fetch('/api/reflection/rollback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupTimestamp: backup.timestamp })
      })
      
      if (response.ok) {
        await fetchData()
        setShowRollbackDialog(false)
        setSelectedBackup(null)
      }
    } catch (error) {
      console.error('Failed to rollback:', error)
    }
  }

  const handleResetToDefaults = async () => {
    try {
      const response = await fetch('/api/reflection/reset', {
        method: 'POST'
      })
      
      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Failed to reset to defaults:', error)
    }
  }

  const handleExportData = async () => {
    try {
      const response = await fetch('/api/reflection/export')
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.style.display = 'none'
        a.href = url
        a.download = `reflection-data-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  const getStatusIcon = () => {
    switch (systemStatus) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'error': return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = () => {
    switch (systemStatus) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
    }
  }

  if (isLoading) {
    return (
      <div className={`space-y-6 ${className}`}>
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading self-improvement controls...</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Settings2 className="h-6 w-6 text-blue-600" />
          <h2 className="text-2xl font-bold">Self-Improvement Control</h2>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <span className={`font-medium ${getStatusColor()}`}>
              {systemStatus.charAt(0).toUpperCase() + systemStatus.slice(1)}
            </span>
          </div>
          <Button variant="outline" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="settings" className="space-y-4">
        <TabsList>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="safety">Safety & Backups</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
        </TabsList>

        <TabsContent value="settings" className="space-y-4">
          {/* Core Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Brain className="h-5 w-5 mr-2" />
                Learning Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="reflection-enabled">Enable Reflection</Label>
                      <p className="text-sm text-muted-foreground">
                        Track and analyze system performance
                      </p>
                    </div>
                    <Switch
                      id="reflection-enabled"
                      checked={settings.reflectionEnabled}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, reflectionEnabled: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-threshold">Auto Threshold Adjustment</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically adjust detection thresholds
                      </p>
                    </div>
                    <Switch
                      id="auto-threshold"
                      checked={settings.autoThresholdAdjustment}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, autoThresholdAdjustment: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="sandbox-mode">Sandbox Mode</Label>
                      <p className="text-sm text-muted-foreground">
                        Test changes safely before applying
                      </p>
                    </div>
                    <Switch
                      id="sandbox-mode"
                      checked={settings.sandboxMode}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, sandboxMode: checked })
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="auto-rollback">Auto Rollback on Failure</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically revert failed changes
                      </p>
                    </div>
                    <Switch
                      id="auto-rollback"
                      checked={settings.autoRollbackOnFailure}
                      onCheckedChange={(checked) => 
                        setSettings({ ...settings, autoRollbackOnFailure: checked })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="learning-rate">
                      Learning Rate: {settings.learningRate.toFixed(2)}
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      How quickly the system adapts to changes
                    </p>
                    <input
                      id="learning-rate"
                      type="range"
                      min="0.01"
                      max="0.5"
                      step="0.01"
                      value={settings.learningRate}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        learningRate: parseFloat(e.target.value) 
                      })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="confidence-threshold">
                      Confidence Threshold: {settings.confidenceThreshold.toFixed(2)}
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Minimum confidence required for pattern application
                    </p>
                    <input
                      id="confidence-threshold"
                      type="range"
                      min="0.1"
                      max="0.9"
                      step="0.05"
                      value={settings.confidenceThreshold}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        confidenceThreshold: parseFloat(e.target.value) 
                      })}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="max-patterns">
                      Max Patterns: {settings.maxPatternsToTrack}
                    </Label>
                    <p className="text-sm text-muted-foreground mb-2">
                      Maximum number of patterns to track simultaneously
                    </p>
                    <input
                      id="max-patterns"
                      type="range"
                      min="10"
                      max="100"
                      step="5"
                      value={settings.maxPatternsToTrack}
                      onChange={(e) => setSettings({ 
                        ...settings, 
                        maxPatternsToTrack: parseInt(e.target.value) 
                      })}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Reset to Defaults
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Reset to Default Settings?</DialogTitle>
                      <DialogDescription>
                        This will reset all self-improvement settings to their default values.
                        This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => {}}>Cancel</Button>
                      <Button onClick={handleResetToDefaults}>
                        Reset Settings
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button onClick={handleSaveSettings} disabled={isSaving}>
                  {isSaving ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="safety" className="space-y-4">
          {/* Safety and Backup Controls */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Safety Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div>
                    <p className="font-medium">Sandbox Mode</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.sandboxMode ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Badge variant={settings.sandboxMode ? "default" : "destructive"}>
                    {settings.sandboxMode ? 'Safe' : 'Live'}
                  </Badge>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div>
                    <p className="font-medium">Auto Rollback</p>
                    <p className="text-sm text-muted-foreground">
                      {settings.autoRollbackOnFailure ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                  <Badge variant={settings.autoRollbackOnFailure ? "default" : "secondary"}>
                    {settings.autoRollbackOnFailure ? 'Protected' : 'Manual'}
                  </Badge>
                </div>

                <div className="pt-2">
                  <Button 
                    onClick={handleCreateBackup} 
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Create Backup Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <History className="h-5 w-5 mr-2" />
                  Backup History
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {backups.slice(0, 5).map((backup, index) => (
                    <div key={backup.timestamp} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(backup.timestamp).toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Version {backup.version}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedBackup(backup)
                          setShowRollbackDialog(true)
                        }}
                      >
                        Restore
                      </Button>
                    </div>
                  ))}
                  {backups.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No backups available
                    </p>
                  )}
                </div>

                <div className="pt-4 mt-4 border-t">
                  <Button 
                    onClick={handleExportData} 
                    variant="outline" 
                    className="w-full"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Export All Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Rollback Confirmation Dialog */}
          <Dialog open={showRollbackDialog} onOpenChange={setShowRollbackDialog}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Rollback</DialogTitle>
                <DialogDescription>
                  Are you sure you want to rollback to the backup from{' '}
                  {selectedBackup ? new Date(selectedBackup.timestamp).toLocaleString() : ''}?
                  This will restore all settings, patterns, and thresholds to their state at that time.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowRollbackDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => selectedBackup && handleRollback(selectedBackup)}
                  variant="destructive"
                >
                  Confirm Rollback
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="monitoring" className="space-y-4">
          {/* System Monitoring */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  System Health
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Overall Status</span>
                    <Badge variant={systemStatus === 'healthy' ? 'default' : 'destructive'}>
                      {systemStatus}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Pattern Accuracy</span>
                      <span>{reflectionData?.confidence.overall ? 
                        (reflectionData.confidence.overall * 100).toFixed(1) + '%' : 
                        'N/A'
                      }</span>
                    </div>
                    <Progress 
                      value={(reflectionData?.confidence.overall || 0) * 100} 
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Patterns</span>
                      <span>{reflectionData?.patterns.length || 0}</span>
                    </div>
                    <Progress 
                      value={((reflectionData?.patterns.length || 0) / settings.maxPatternsToTrack) * 100} 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Target className="h-5 w-5 mr-2" />
                  Learning Stats
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Learning Rate</p>
                    <p className="text-lg font-semibold">{settings.learningRate.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Confidence Threshold</p>
                    <p className="text-lg font-semibold">{settings.confidenceThreshold.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Learning Update</p>
                    <p className="text-sm">
                      {reflectionData?.lastLearning ? 
                        new Date(reflectionData.lastLearning).toLocaleString() : 
                        'No data'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="h-5 w-5 mr-2" />
                  Safety Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Sandbox Mode</span>
                    <Badge variant={settings.sandboxMode ? "default" : "destructive"}>
                      {settings.sandboxMode ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto Rollback</span>
                    <Badge variant={settings.autoRollbackOnFailure ? "default" : "secondary"}>
                      {settings.autoRollbackOnFailure ? 'On' : 'Off'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Backup</p>
                    <p className="text-sm">
                      {lastBackup ? 
                        new Date(lastBackup).toLocaleString() : 
                        'No backups'
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}