"use client"

import React, { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { HelpCircle } from "lucide-react"

interface FunctionDialogProps {
  onExecute: (command: string) => void
  result: string | null
  error: string | null
}

export const FunctionDialog: React.FC<FunctionDialogProps> = ({ onExecute, result, error }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [command, setCommand] = useState("")

  const handleExecute = () => {
    onExecute(command)
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <HelpCircle className="w-4 h-4 mr-2" />
          Functions
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Execute Function</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Input
            placeholder="e.g., update_cell(A, 1, 'Hello')"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleExecute()
              }
            }}
          />
          <Button onClick={handleExecute}>Execute</Button>
        </div>
        {(result || error) && (
          <div className="mt-4 p-4 bg-muted rounded-md">
            <h4 className="font-semibold">Result:</h4>
            {result && <pre className="text-sm text-green-600">{result}</pre>}
            {error && <pre className="text-sm text-red-600">{error}</pre>}
          </div>
        )}
        <div className="mt-4 p-4 bg-muted rounded-md">
            <h4 className="font-semibold">Available Functions:</h4>
            <ul className="text-sm list-disc list-inside">
                <li>update_cell(col, row, value)</li>
                <li>remove_cell(col, row)</li>
                <li>get_cell(col, row)</li>
                <li>sum_col(col)</li>
                <li>avg_col(col)</li>
                <li>count_col(col)</li>
                <li>max_col(col)</li>
                <li>min_col(col)</li>
                <li>add_col(col)</li>
                <li>del_col(col)</li>
                <li>sum_row(row)</li>
                <li>avg_row(row)</li>
                <li>count_row(row)</li>
                <li>max_row(row)</li>
                <li>min_row(row)</li>
                <li>add_row(row)</li>
                <li>del_row(row)</li>
                <li>sum_range(startCol, startRow, endCol, endRow)</li>
                <li>avg_range(startCol, startRow, endCol, endRow)</li>
                <li>clear_range(startCol, startRow, endCol, endRow)</li>
                <li>clear_all()</li>
                <li>find_cell(value)</li>
                <li>replace_all(oldValue, newValue)</li>
            </ul>
        </div>
      </DialogContent>
    </Dialog>
  )
}
