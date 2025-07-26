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
  Filter,
  HelpCircle
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { FunctionDialog } from "@/components/FunctionDialog"
import { executeFunction } from "@/lib/functions"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import Papa from "papaparse"
import { io, Socket } from "socket.io-client"

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

interface Filter {
  column: string
  condition: 'contains' | 'does not contain' | 'starts with' | 'ends with' | 'is' | 'is not' | 'is empty' | 'is not empty'
  value: string
}

interface Message {
  id: string
  content: string
  sender: 'user' | 'assistant'
  timestamp: Date
}

const getColumnLabel = (index: number): string => {
  let label = ''
  while (index >= 0) {
    label = String.fromCharCode(65 + (index % 26)) + label
    index = Math.floor(index / 26) - 1
  }
  return label
}

const SpreadsheetUI = () => {
  const [gridState, setGridState] = useState({
    data: {} as SpreadsheetData,
    rows: 20,
    columns: 10,
    columnLabels: Array.from({ length: 10 }, (_, i) => getColumnLabel(i)),
  });
  const { data, rows, columns, columnLabels } = gridState;
  const [selectedCell, setSelectedCell] = useState<string | null>(null)
  const [editingColumn, setEditingColumn] = useState<number | null>(null)
  const [selectedColumn, setSelectedColumn] = useState<number | null>(null)
  const [filters, setFilters] = useState<Filter[]>([])
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
  const [apiKey, setApiKey] = useState('')
  const [isChatOpen, setIsChatOpen] = useState(true)
  const [functionResult, setFunctionResult] = useState<string | null>(null)
  const [functionError, setFunctionError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const socketRef = useRef<Socket | null>(null)

  const handleExecuteFunction = useCallback((command: string) => {
    console.log("Executing command:", command);
    try {
      setGridState(currentState => {
        console.log("Current state before execution:", currentState);
        const { newData, newRows, newColumns, newColumnLabels, result } = executeFunction(
          command,
          currentState.data,
          currentState.rows,
          currentState.columns,
          currentState.columnLabels
        );
        console.log("New state after execution:", { newData, newRows, newColumns, newColumnLabels });
        setFunctionResult(result);
        setFunctionError(null);

        if (socketRef.current && result) {
          socketRef.current.emit('function_result', { result });
          console.log("Sent result back to backend:", result);
        }

        return {
          data: newData,
          rows: newRows,
          columns: newColumns,
          columnLabels: newColumnLabels,
        };
      });
    } catch (error) {
      if (error instanceof Error) {
        setFunctionError(error.message);
      } else {
        setFunctionError("An unknown error occurred.");
      }
      setFunctionResult(null);
    }
  }, []);

  useEffect(() => {
    socketRef.current = io("http://localhost:8000", {
      path: '/socket.io/'
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socketRef.current.on('execute_command', (data) => {
      console.log('Command received from backend:', data.command);
      handleExecuteFunction(data.command);
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    const socket = socketRef.current;
    return () => {
      socket.disconnect();
    };
  }, [handleExecuteFunction]);

  useEffect(() => {
    if (selectedCell && inputRefs.current[selectedCell]) {
      inputRefs.current[selectedCell]?.focus()
    }
  }, [selectedCell])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const getCellKey = (row: number, col: number): string => {
    return `${columnLabels[col]}${row + 1}`
  }

  const handleCellKeyDown = (e: React.KeyboardEvent, cellKey: string) => {
    const match = cellKey.match(/^([a-zA-Z]+)(\d+)$/);
    if (!match) return;
    const [, colChar, rowStr] = match;

    const rowIndex = parseInt(rowStr) - 1
    const colIndex = columnLabels.indexOf(colChar)

    let nextRow = rowIndex
    let nextCol = colIndex
    
    if (e.key === "ArrowUp" || e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        if (e.key === "ArrowUp") nextRow = Math.max(0, rowIndex - 1);
        if (e.key === "ArrowDown" || e.key === "Enter") nextRow = Math.min(rows - 1, rowIndex + 1);
        setSelectedCell(getCellKey(nextRow, colIndex));
    } else if (e.key === "ArrowLeft") {
        if ((e.target as HTMLInputElement).selectionStart === 0) {
            e.preventDefault();
            nextCol = Math.max(0, colIndex - 1);
            setSelectedCell(getCellKey(rowIndex, nextCol));
        }
    } else if (e.key === "ArrowRight") {
        if ((e.target as HTMLInputElement).selectionStart === (e.target as HTMLInputElement).value.length) {
            e.preventDefault();
            nextCol = Math.min(columns - 1, colIndex + 1);
            setSelectedCell(getCellKey(rowIndex, nextCol));
        }
    }
  }

  const applyFilters = (data: SpreadsheetData, filters: Filter[]) => {
    if (filters.length === 0) return null

    const filteredRowIndexes = Array.from({ length: rows }, (_, i) => i).filter(rowIndex => {
      return filters.every(filter => {
        const colIndex = columnLabels.indexOf(filter.column)
        if (colIndex === -1) return true

        const cellKey = getCellKey(rowIndex, colIndex)
        const cellValue = data[cellKey]?.value?.toLowerCase() || ''

        switch (filter.condition) {
          case 'contains':
            return cellValue.includes(filter.value.toLowerCase())
          case 'does not contain':
            return !cellValue.includes(filter.value.toLowerCase())
          case 'starts with':
            return cellValue.startsWith(filter.value.toLowerCase())
          case 'ends with':
            return cellValue.endsWith(filter.value.toLowerCase())
          case 'is':
            return cellValue === filter.value.toLowerCase()
          case 'is not':
            return cellValue !== filter.value.toLowerCase()
          case 'is empty':
            return cellValue === ''
          case 'is not empty':
            return cellValue !== ''
          default:
            return true
        }
      })
    })

    return filteredRowIndexes
  }

  const handleColumnLabelChange = (colIndex: number, newLabel: string) => {
    setGridState(currentState => {
      const oldLabel = currentState.columnLabels[colIndex];
      const newColumnLabels = [...currentState.columnLabels];
      newColumnLabels[colIndex] = newLabel;

      const newData = { ...currentState.data };
      for (let i = 0; i < currentState.rows; i++) {
        const oldKey = `${oldLabel}${i + 1}`;
        const newKey = `${newLabel}${i + 1}`;
        if (newData[oldKey]) {
          newData[newKey] = newData[oldKey];
          delete newData[oldKey];
        }
      }
      return { ...currentState, data: newData, columnLabels: newColumnLabels };
    });
  }

  const handleExportCSV = () => {
    const csvData = [];
    const header = columnLabels.slice(0, columns);
    csvData.push(header);

    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < columns; j++) {
        const cellKey = getCellKey(i, j);
        row.push(data[cellKey]?.value || "");
      }
      csvData.push(row);
    }

    const csv = Papa.unparse(csvData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "spreadsheet.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        Papa.parse(file, {
          header: false,
          skipEmptyLines: true,
          complete: (result) => {
            const parsedData = result.data as string[][];
            if (parsedData.length === 0) {
              return;
            }

            const newColumnLabels = parsedData[0];
            const newData: SpreadsheetData = {};
            
            for (let i = 1; i < parsedData.length; i++) {
              for (let j = 0; j < newColumnLabels.length; j++) {
                const cellKey = `${newColumnLabels[j]}${i}`;
                newData[cellKey] = { value: parsedData[i][j] || "" };
              }
            }

            setGridState({
              columnLabels: newColumnLabels,
              columns: newColumnLabels.length,
              rows: parsedData.length - 1,
              data: newData,
            });
          },
          error: (error) => {
            console.error("Error parsing CSV:", error);
          },
        });
      } catch (error) {
        console.error("Error handling CSV import:", error);
      }
    }
  };

  const updateCell = (cellKey: string, value: string) => {
    setGridState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [cellKey]: {
          ...prev.data[cellKey],
          value
        }
      }
    }));
  }

  const updateCellStyle = (cellKey: string, style: Partial<CellData['style']>) => {
    setGridState(prev => ({
      ...prev,
      data: {
        ...prev.data,
        [cellKey]: {
          ...prev.data[cellKey],
          style: {
            ...prev.data[cellKey]?.style,
            ...style
          }
        }
      }
    }));
  }

  const addRow = () => {
    setGridState(prev => ({ ...prev, rows: prev.rows + 1 }));
  }

  const addColumn = () => {
    setGridState(prev => ({
      ...prev,
      columns: prev.columns + 1,
      columnLabels: [...prev.columnLabels, getColumnLabel(prev.columns)]
    }));
  }

  const insertColumn = (index: number) => {
    setGridState(prev => {
      const newColumnLabels = [...prev.columnLabels];
      newColumnLabels.splice(index, 0, getColumnLabel(prev.columns));
      return {
        ...prev,
        columns: prev.columns + 1,
        columnLabels: newColumnLabels,
      };
    });
  }

  const removeRow = () => {
    if (rows > 1) {
      setGridState(prev => ({ ...prev, rows: prev.rows - 1 }));
    }
  }

  const removeColumn = () => {
    if (columns > 1) {
      setGridState(prev => ({ ...prev, columns: prev.columns - 1 }));
    }
  }

  const moveColumn = (fromIndex: number, direction: 'left' | 'right') => {
    setGridState(prev => {
      const toIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;

      if (toIndex < 0 || toIndex >= prev.columns) {
          return prev;
      }

      const newColumnLabels = [...prev.columnLabels];
      const [movedItem] = newColumnLabels.splice(fromIndex, 1);
      newColumnLabels.splice(toIndex, 0, movedItem);

      const newData: SpreadsheetData = {};
      for (let i = 0; i < prev.rows; i++) {
          const rowData: (CellData | undefined)[] = [];
          for (let j = 0; j < prev.columns; j++) {
              const oldKey = `${prev.columnLabels[j]}${i + 1}`;
              rowData.push(prev.data[oldKey]);
          }

          const [movedData] = rowData.splice(fromIndex, 1);
          rowData.splice(toIndex, 0, movedData);

          for (let j = 0; j < newColumnLabels.length; j++) {
              const newKey = `${newColumnLabels[j]}${i + 1}`;
              if (rowData[j]) {
                  newData[newKey] = rowData[j] as CellData;
              }
          }
      }

      return {
          ...prev,
          columnLabels: newColumnLabels,
          data: newData,
      };
    });
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !apiKey.trim()) return

    const newMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, newMessage])
    setInputMessage('')

    try {
      const response = await fetch("http://localhost:8000/execute_llm_request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: data,
          message: inputMessage,
          apiKey: apiKey,
        }),
      });

      const result = await response.json();

      if (result.status === "success") {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: result.message,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, assistantMessage])
      } else {
        const errorMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: `Error: ${result.message}`,
          sender: 'assistant',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "An error occurred while communicating with the backend.",
        sender: 'assistant',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    }
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
            <FilterDialog
              columns={columnLabels}
              onApplyFilter={(filter) => setFilters(prev => [...prev, filter])}
              onClearFilters={() => setFilters([])}
            />
            <FunctionDialog
              onExecute={handleExecuteFunction}
              result={functionResult}
              error={functionError}
            />
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Import CSV
            </Button>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleImportCSV}
              accept=".csv"
            />
            <Button variant="outline" size="sm" onClick={handleExportCSV}>
              Export CSV
            </Button>
          </div>
          <div className="flex items-center gap-2">
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
                      onClick={() => setSelectedColumn(colIndex)}
                      onDoubleClick={() => setEditingColumn(colIndex)}
                    >
                      {editingColumn === colIndex ? (
                        <Input
                          value={columnLabels[colIndex]}
                          onChange={(e) => handleColumnLabelChange(colIndex, e.target.value)}
                          onBlur={() => setEditingColumn(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setEditingColumn(null)
                            }
                          }}
                          autoFocus
                          className="w-full h-full bg-transparent border-0 text-center"
                        />
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="w-full h-full">
                              {columnLabels[colIndex]}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => insertColumn(colIndex)}>
                              Insert Left
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => insertColumn(colIndex + 1)}>
                              Insert Right
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => moveColumn(colIndex, 'left')} disabled={colIndex === 0}>
                              Move Left
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => moveColumn(colIndex, 'right')} disabled={colIndex === columns - 1}>
                              Move Right
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditingColumn(colIndex)}>
                              Rename
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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

                  const filteredRows = applyFilters(data, filters)
                  if (filteredRows && !filteredRows.includes(rowIndex)) {
                    return null
                  }

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
                            ref={(el) => {inputRefs.current[cellKey] = el}}
                            value={cellData?.value || ''}
                            onChange={(e) => updateCell(cellKey, e.target.value)}
                            onKeyDown={(e) => handleCellKeyDown(e, cellKey)}
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
              <div className="flex flex-col gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API Key"
                  className="text-xs"
                />
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

const FilterDialog = ({
  columns,
  onApplyFilter,
  onClearFilters,
}: {
  columns: string[]
  onApplyFilter: (filter: Filter) => void
  onClearFilters: () => void
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedColumn, setSelectedColumn] = useState<string>('')
  const [selectedCondition, setSelectedCondition] = useState<Filter['condition']>('contains')
  const [filterValue, setFilterValue] = useState('')

  const handleApply = () => {
    if (selectedColumn) {
      onApplyFilter({
        column: selectedColumn,
        condition: selectedCondition,
        value: filterValue,
      })
      setIsOpen(false)
    }
  }

  const isValueDisabled = selectedCondition === 'is empty' || selectedCondition === 'is not empty'

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Filter className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Filter</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Select onValueChange={setSelectedColumn} value={selectedColumn}>
              <SelectTrigger className="col-span-4">
                <SelectValue placeholder="Select a column" />
              </SelectTrigger>
              <SelectContent>
                {columns.map(col => (
                  <SelectItem key={col} value={col}>{col}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Select onValueChange={(val) => setSelectedCondition(val as Filter['condition'])} value={selectedCondition}>
              <SelectTrigger className="col-span-4">
                <SelectValue placeholder="Select a condition" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="contains">contains</SelectItem>
                <SelectItem value="does not contain">does not contain</SelectItem>
                <SelectItem value="starts with">starts with</SelectItem>
                <SelectItem value="ends with">ends with</SelectItem>
                <SelectItem value="is">is</SelectItem>
                <SelectItem value="is not">is not</SelectItem>
                <SelectItem value="is empty">is empty</SelectItem>
                <SelectItem value="is not empty">is not empty</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Input
              className="col-span-4 text-black"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              disabled={isValueDisabled}
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => {
            onClearFilters()
            setIsOpen(false)
          }}>
            Clear Filters
          </Button>
          <Button onClick={handleApply}>Apply Filter</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default SpreadsheetUI
