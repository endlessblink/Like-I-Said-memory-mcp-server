import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"

interface AddMemoryDialogProps {
  onAdd: (key: string, value: string, context: Record<string, any>) => void
  children: React.ReactNode
}

export function AddMemoryDialog({ onAdd, children }: AddMemoryDialogProps) {
  const [open, setOpen] = useState(false)
  const [key, setKey] = useState("")
  const [value, setValue] = useState("")
  const [context, setContext] = useState("")

  const handleSubmit = () => {
    if (!key || !value) return

    let contextObj = {}
    if (context) {
      try {
        contextObj = JSON.parse(context)
      } catch {
        alert("Invalid JSON in context field")
        return
      }
    }

    onAdd(key, value, contextObj)
    setKey("")
    setValue("")
    setContext("")
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="bg-[#232329] border-[#35353b] text-white">
        <DialogHeader>
          <DialogTitle>Create New Memory</DialogTitle>
          <DialogDescription className="text-gray-400">
            Add a new memory entry to your database
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="memory-key"
              className="bg-[#2a2a30] border-[#35353b] text-white"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="value">Value</Label>
            <Textarea
              id="value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Memory content..."
              className="bg-[#2a2a30] border-[#35353b] text-white min-h-[100px]"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="context">Context (JSON)</Label>
            <Textarea
              id="context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder='{"type": "note", "tags": ["important"]}'
              className="bg-[#2a2a30] border-[#35353b] text-white"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} className="bg-violet-600 hover:bg-violet-700">
            Create Memory
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
