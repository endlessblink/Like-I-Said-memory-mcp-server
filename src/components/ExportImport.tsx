import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Memory } from "@/types"
import { exportMemories, parseImportData, downloadFile, ExportOptions } from "@/utils/export"
import { Download, Upload, FileText, FileSpreadsheet, File, AlertCircle, CheckCircle } from "lucide-react"

interface ExportImportProps {
  memories: Memory[]
  onImportMemories: (memories: Memory[]) => void
  selectedMemories?: Set<string>
  className?: string
}

export function ExportImport({ 
  memories, 
  onImportMemories, 
  selectedMemories,
  className = "" 
}: ExportImportProps) {
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'markdown'>('json')
  const [includeMetadata, setIncludeMetadata] = useState(true)
  const [customFilename, setCustomFilename] = useState("")
  const [importFormat, setImportFormat] = useState<'json' | 'csv'>('json')
  const [importData, setImportData] = useState("")
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [importError, setImportError] = useState("")

  const exportFormats = [
    { value: 'json', label: 'JSON', icon: File, description: 'Structured data format' },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet, description: 'Spreadsheet format' },
    { value: 'markdown', label: 'Markdown', icon: FileText, description: 'Readable text format' }
  ]

  const importFormats = [
    { value: 'json', label: 'JSON', icon: File },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet }
  ]

  const memoriesToExport = selectedMemories && selectedMemories.size > 0
    ? memories.filter(memory => selectedMemories.has(memory.id))
    : memories

  const handleExport = () => {
    try {
      const options: ExportOptions = {
        format: exportFormat,
        includeMetadata,
        filename: customFilename || undefined
      }

      const result = exportMemories(memoriesToExport, options)
      downloadFile(result.data, result.filename, result.mimeType)
      setShowExportDialog(false)
    } catch (error) {
      console.error('Export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setImportFile(file)
    const reader = new FileReader()
    
    reader.onload = (e) => {
      const content = e.target?.result as string
      setImportData(content)
    }
    
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importData.trim()) {
      setImportError("Please provide import data")
      setImportStatus('error')
      return
    }

    try {
      setImportStatus('idle')
      setImportError("")

      const parsedMemories = parseImportData(importData, importFormat)
      
      if (parsedMemories.length === 0) {
        throw new Error("No valid memories found in import data")
      }

      // Assign new IDs to avoid conflicts
      const newMemories = parsedMemories.map(memory => ({
        ...memory,
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        timestamp: memory.timestamp || new Date().toISOString()
      }))

      await onImportMemories(newMemories)
      setImportStatus('success')
      
      setTimeout(() => {
        setShowImportDialog(false)
        setImportData("")
        setImportFile(null)
        setImportStatus('idle')
      }, 2000)

    } catch (error) {
      console.error('Import failed:', error)
      setImportError(error instanceof Error ? error.message : 'Import failed')
      setImportStatus('error')
    }
  }

  const resetImportDialog = () => {
    setImportData("")
    setImportFile(null)
    setImportStatus('idle')
    setImportError("")
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
            {selectedMemories && selectedMemories.size > 0 && (
              <span className="ml-1 bg-blue-100 text-blue-800 text-xs px-1.5 py-0.5 rounded">
                {selectedMemories.size}
              </span>
            )}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Export Memories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="text-sm text-gray-600">
              {selectedMemories && selectedMemories.size > 0 
                ? `Exporting ${selectedMemories.size} selected memories`
                : `Exporting all ${memories.length} memories`
              }
            </div>

            <div className="space-y-2">
              <Label htmlFor="export-format">Format</Label>
              <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {exportFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      <div className="flex items-center gap-2">
                        <format.icon className="h-4 w-4" />
                        <div>
                          <div className="font-medium">{format.label}</div>
                          <div className="text-xs text-gray-500">{format.description}</div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="include-metadata"
                checked={includeMetadata}
                onChange={(e) => setIncludeMetadata(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="include-metadata" className="text-sm">
                Include metadata (access counts, client info, etc.)
              </Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-filename">Custom filename (optional)</Label>
              <Input
                id="custom-filename"
                value={customFilename}
                onChange={(e) => setCustomFilename(e.target.value)}
                placeholder={`memories-${new Date().toISOString().split('T')[0]}.${exportFormat}`}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export {exportFormat.toUpperCase()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={(open) => {
        setShowImportDialog(open)
        if (!open) resetImportDialog()
      }}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Memories</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="import-format">Format</Label>
              <Select value={importFormat} onValueChange={(value: any) => setImportFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {importFormats.map((format) => (
                    <SelectItem key={format.value} value={format.value}>
                      <div className="flex items-center gap-2">
                        <format.icon className="h-4 w-4" />
                        {format.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-file">Upload File</Label>
              <Input
                id="import-file"
                type="file"
                accept={importFormat === 'json' ? '.json' : '.csv'}
                onChange={handleFileUpload}
                className="cursor-pointer"
              />
              {importFile && (
                <div className="text-sm text-gray-600">
                  Selected: {importFile.name} ({(importFile.size / 1024).toFixed(1)} KB)
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-data">Or Paste Data</Label>
              <Textarea
                id="import-data"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder={`Paste your ${importFormat.toUpperCase()} data here...`}
                className="min-h-[200px] font-mono text-sm"
              />
            </div>

            {importStatus === 'error' && importError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-red-700">{importError}</span>
              </div>
            )}

            {importStatus === 'success' && (
              <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-green-700">Import successful!</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!importData.trim() || importStatus === 'success'}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import {importFormat.toUpperCase()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}