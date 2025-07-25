"use client"

import React, { useState, useCallback, useRef, useEffect } from "react"
import { 
  Plus, 
  Minus, 
  Bold, 
  Italic, 
  Underline, 
  AlignLeft, 
  AlignCenter, 
  AlignRight,
  Send,
  MessageCircle,
  X,
  MoreHorizontal,
  Smile,
  Paperclip,
  Sun,
  Moon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { ModeToggle } from "./components/theme-toggle"

interface CellData {
  value: string
  style?: {
    bold?: boolean
    italic?: boolean
    underline?: boolean
    align?: 'left' | 'center' | 'right'
    backgroundColor?: string
    textColor?: string
  }
}

interface SpreadsheetData {
  [key: string]: CellData
}

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

const SpreadsheetUI = () => {
  const [data, setData] = useState<SpreadsheetData>({})
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [rows, setRows] = useState(20)
  const [columns, setColumns] = useState(10)
  const [searchQuery, setSearchQuery] = useState("")
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Hello! I can help you analyze your spreadsheet data, create formulas, or answer questions about your data.',
      sender: 'assistant',
      timestamp: new Date()
    }
  ])
  const [inputMessage, setInputMessage] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getColumnLabel = (index: number): string => {
    let label = ''
    while (index >= 0) {
      label = String.fromCharCode(65 + (index % 26)) + label
      index = Math.floor(index / 26) - 1
    }
    return label
  }

  const getCellKey = (row: number, col: number): string => {
    return `${getColumnLabel(col)}${row + 1}`
  }

  const updateCell = (cellKey: string, value: string) => {
    setData(prev => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        value
      }
    }))
  }

  const updateCellStyle = (cellKey: string, style: Partial<CellData['style']>) => {
    setData(prev => ({
      ...prev,
      [cellKey]: {
        ...prev[cellKey],
        style: {
          ...prev[cellKey]?.style,
          ...style
        }
      }
    }))
  }

  const addRow = () => {
    setRows(prev => prev + 1)
  }

  const addColumn = () => {
    setColumns(prev => prev + 1)
  }

  const removeRow = () => {
    if (rows > 1) {
      setRows(prev => prev - 1)
    }
  }

  const removeColumn = () => {
    if (columns > 1) {
      setColumns(prev => prev - 1)
    }
  }

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')

    // Simulate assistant response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you said: "${inputMessage}". I can help you with spreadsheet operations, data analysis, or formula creation. What would you like to do?`,
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, assistantMessage])
    }, 1000)
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Main Spreadsheet Area */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="border-b border-border p-2 flex items-center justify-between bg-background">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={addRow}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={removeRow}>
                <Minus className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={addColumn}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={removeColumn}>
                <Minus className="w-4 h-4" />
              </Button>
            </div>

            <div className="h-4 w-px bg-border mx-2" />

            {selectedCell && (
              <div className="flex items-center gap-1">
                <Button
                  variant={data[selectedCell]?.style?.bold ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateCellStyle(selectedCell, { bold: !data[selectedCell]?.style?.bold })}
                >
                  <Bold className="w-4 h-4" />
                </Button>
                <Button
                  variant={data[selectedCell]?.style?.italic ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateCellStyle(selectedCell, { italic: !data[selectedCell]?.style?.italic })}
                >
                  <Italic className="w-4 h-4" />
                </Button>
                <Button
                  variant={data[selectedCell]?.style?.underline ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateCellStyle(selectedCell, { underline: !data[selectedCell]?.style?.underline })}
                >
                  <Underline className="w-4 h-4" />
                </Button>
                
                <div className="h-4 w-px bg-border mx-2" />
                
                <Button
                  variant={data[selectedCell]?.style?.align === 'left' ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateCellStyle(selectedCell, { align: 'left' })}
                >
                  <AlignLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant={data[selectedCell]?.style?.align === 'center' ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateCellStyle(selectedCell, { align: 'center' })}
                >
                  <AlignCenter className="w-4 h-4" />
                </Button>
                <Button
                  variant={data[selectedCell]?.style?.align === 'right' ? "default" : "outline"}
                  size="sm"
                  onClick={() => updateCellStyle(selectedCell, { align: 'right' })}
                >
                  <AlignRight className="w-4 h-4" />
                </Button>
              </div>
            )}
            <div className="h-4 w-px bg-border mx-2" />
            <Input
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-48"
            />
          </div>
          <div className="flex items-center gap-2">
            <ModeToggle />
          </div>
        </div>

        {/* Spreadsheet Grid */}
        <div className="flex-1 overflow-auto">
          <div className="inline-block min-w-full">
            <table className="border-collapse">
              <thead>
                <tr>
                  <th className="w-12 h-8 border border-border bg-muted text-xs font-medium text-center sticky top-0 z-10">
                    
                  </th>
                  {Array.from({ length: columns }, (_, colIndex) => (
                    <th
                      key={colIndex}
                      className="min-w-24 h-8 border border-border bg-muted text-xs font-medium text-center sticky top-0 z-10"
                    >
                      {getColumnLabel(colIndex)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: rows }, (_, rowIndex) => {
                  const rowData = Array.from({ length: columns }, (_, colIndex) => {
                    const cellKey = getCellKey(rowIndex, colIndex)
                    return data[cellKey]?.value || ''
                  })

                  if (searchQuery && !rowData.some(cellValue => cellValue.toLowerCase().includes(searchQuery.toLowerCase()))) {
                    return null
                  }

                  return (
                  <tr key={rowIndex}>
                    <td className="w-12 h-8 border border-border bg-muted text-xs font-medium text-center sticky left-0 z-10">
                      {rowIndex + 1}
                    </td>
                    {Array.from({ length: columns }, (_, colIndex) => {
                      const cellKey = getCellKey(rowIndex, colIndex)
                      const cellData = data[cellKey]
                      const isSelected = selectedCell === cellKey
                      
                      return (
                        <td
                          key={colIndex}
                          className={cn(
                            "min-w-24 h-8 border border-border bg-background cursor-cell relative",
                            isSelected && "ring-2 ring-primary ring-inset"
                          )}
                          onClick={() => setSelectedCell(cellKey)}
                        >
                          <Input
                            value={cellData?.value || ''}
                            onChange={(e) => updateCell(cellKey, e.target.value)}
                            className={cn(
                              "border-0 h-full w-full rounded-none bg-transparent text-xs px-1 focus:ring-0 focus:outline-none",
                              cellData?.style?.bold && "font-bold",
                              cellData?.style?.italic && "italic",
                              cellData?.style?.underline && "underline",
                              cellData?.style?.align === 'center' && "text-center",
                              cellData?.style?.align === 'right' && "text-right"
                            )}
                            style={{
                              backgroundColor: cellData?.style?.backgroundColor,
                              color: cellData?.style?.textColor
                            }}
                          />
                        </td>
                      )
                    })}
                  </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className={cn(
        "border-l border-border bg-background transition-all duration-300",
        isChatOpen ? "w-80" : "w-0 overflow-hidden"
      )}>
        {isChatOpen && (
          <div className="flex flex-col h-full">
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-primary" />
                <h3 className="font-semibold text-foreground">Spreadsheet Assistant</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsChatOpen(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.sender === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      message.sender === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    )}
                  >
                    <p>{message.content}</p>
                    <p className={cn(
                      "text-xs mt-1 opacity-70",
                      message.sender === 'user' ? "text-primary-foreground" : "text-muted-foreground"
                    )}>
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about your spreadsheet..."
                    className="pr-20"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSendMessage()
                      }
                    }}
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Smile className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Paperclip className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <Button onClick={handleSendMessage} size="sm">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Toggle Button */}
      {!isChatOpen && (
        <Button
          onClick={() => setIsChatOpen(true)}
          className="fixed bottom-4 right-4 rounded-full w-12 h-12 shadow-lg"
          size="sm"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      )}
    </div>
  )
}

export default SpreadsheetUI
