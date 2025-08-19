import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Memory } from "@/types"
import { exportMemories, parseImportData, downloadFile, ExportOptions } from "@/utils/export"
import { Download, Upload, FileText, FileSpreadsheet, File, AlertCircle, CheckCircle } from "lucide-react"

interface ExportImportDialogsProps {
  memories: Memory[]
  onImportMemories: (memories: Memory[]) => void
  selectedMemories?: Set<string>
  showExportDialog: boolean
  showImportDialog: boolean
  onExportDialogChange: (open: boolean) => void
  onImportDialogChange: (open: boolean) => void
}

export function ExportImportDialogs({ 
  memories, 
  onImportMemories, 
  selectedMemories,
  showExportDialog,
  showImportDialog,
  onExportDialogChange,
  onImportDialogChange
}: ExportImportDialogsProps) {
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
    const options: ExportOptions = {
      format: exportFormat,
      includeMetadata,
      filename: customFilename || undefined
    }

    const { data, filename } = exportMemories(memoriesToExport, options)
    downloadFile(data, filename, exportFormat === 'csv' ? 'text/csv' : exportFormat === 'markdown' ? 'text/markdown' : 'application/json')
    onExportDialogChange(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImportFile(file)
      
      const reader = new FileReader()
      reader.onload = (e) => {
        setImportData(e.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const handleImport = async () => {
    try {
      setImportStatus('idle')
      setImportError("")

      if (!importData.trim()) {
        throw new Error("Please provide data to import")
      }

      const parsedMemories = parseImportData(importData, importFormat)
      
      if (!Array.isArray(parsedMemories) || parsedMemories.length === 0) {
        throw new Error("No valid memories found in the import data")
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
        onImportDialogChange(false)
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
    <>
      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={onExportDialogChange}>
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
              <Button variant="outline" onClick={() => onExportDialogChange(false)}>
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
        onImportDialogChange(open)
        if (!open) resetImportDialog()
      }}>
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
                        <span>{format.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload File</Label>
              <Input
                id="file-upload"
                type="file"
                accept={importFormat === 'json' ? '.json' : '.csv'}
                onChange={handleFileSelect}
                className="cursor-pointer"
              />
              {importFile && (
                <p className="text-sm text-gray-600">
                  Selected: {importFile.name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-data">Or paste data directly</Label>
              <Textarea
                id="import-data"
                value={importData}
                onChange={(e) => setImportData(e.target.value)}
                placeholder={importFormat === 'json' 
                  ? 'Paste JSON data here...' 
                  : 'Paste CSV data here (must include headers: key,value,tags,complexity,metadata)'}
                className="h-48 font-mono text-sm"
              />
            </div>

            {importStatus === 'success' && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-2 rounded">
                <CheckCircle className="h-4 w-4" />
                <span className="text-sm">Import successful!</span>
              </div>
            )}

            {importStatus === 'error' && (
              <div className="flex items-center gap-2 text-red-600 bg-red-50 px-3 py-2 rounded">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">{importError}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  onImportDialogChange(false)
                  resetImportDialog()
                }}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleImport} 
                disabled={!importData.trim()}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                Import {importFormat.toUpperCase()}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}