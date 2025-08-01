import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface Memory {
  value: string
  context: Record<string, any>
  timestamp: string
}

interface EditMemoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  memoryKey: string | null
  memory: Memory | null
  onUpdate: (key: string, value: string, context: Record<string, any>) => void
}

export function EditMemoryDialog({ open, onOpenChange, memoryKey, memory, onUpdate }: EditMemoryDialogProps) {
  const [value, setValue] = useState("")
  const [context, setContext] = useState("")

  useEffect(() => {
    if (memory) {
      setValue(memory.value)
      setContext(JSON.stringify(memory.context, null, 2))
    }
  }, [memory])

  const handleSubmit = () => {
    if (!memoryKey || !value) return

    let contextObj = {}
    if (context) {
      try {
        contextObj = JSON.parse(context)
      } catch {
        alert("Invalid JSON in context field")
        return
      }
    }

    onUpdate(memoryKey, value, contextObj)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#232329] border-[#35353b] text-white">
        <DialogHeader>
          <DialogTitle>Edit Memory</DialogTitle>
          <DialogDescription className="text-gray-400">
            Edit the memory: {memoryKey}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-value">Value</Label>
            <Textarea
              id="edit-value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="bg-[#2a2a30] border-[#35353b] text-white min-h-[150px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-context">Context (JSON)</Label>
            <Textarea
              id="edit-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="bg-[#2a2a30] border-[#35353b] text-white min-h-[100px]"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-blue-600 hover:bg-blue-700">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
