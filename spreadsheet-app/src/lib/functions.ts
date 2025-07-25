interface CellData {
    value: string;
    style?: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      align?: 'left' | 'center' | 'right';
      backgroundColor?: string;
      textColor?: string;
    };
  }
  
  interface SpreadsheetData {
    [key: string]: CellData;
  }
  
  const getColumnIndex = (col: string): number => {
    return col.toUpperCase().charCodeAt(0) - 65;
  };
  
  const getColumnLabel = (index: number): string => {
    let label = '';
    while (index >= 0) {
      label = String.fromCharCode(65 + (index % 26)) + label;
      index = Math.floor(index / 26) - 1;
    }
    return label;
  };
  
  const parseArgs = (argsString: string): (string | number)[] => {
    if (argsString.trim() === '') return [];
    // This regex splits by comma, but respects commas inside quotes.
    const regex = /(".*?"|'.*?'|[^,]+)/g;
    const matches = argsString.match(regex);
    if (!matches) return [];
  
    return matches.map(arg => {
      const trimmed = arg.trim();
      if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
      }
      if (!isNaN(Number(trimmed)) && trimmed !== '') {
        return Number(trimmed);
      }
      return trimmed;
    });
  };
  
  export const executeFunction = (
    command: string,
    data: SpreadsheetData,
    rows: number,
    columns: number,
    columnLabels: string[]
  ): { newData: SpreadsheetData; newRows: number; newColumns: number; newColumnLabels:string[]; result: string | null } => {
    // This regex finds all function calls, which can be separated by commas.
    const commands = command.match(/\w+\([^)]*\)/g);
    if (!commands) {
      throw new Error("Invalid function syntax. No valid function calls found. Ensure functions are in the format function_name(arg1, arg2) and separated by commas.");
    }
  
    let currentData = { ...data };
    let currentRows = rows;
    let currentColumns = columns;
    let currentColumnLabels = [...columnLabels];
    let finalResult = '';
  
    for (const cmd of commands) {
      const match = cmd.match(/(\w+)\((.*)\)/);
      if (!match) {
        // This should not happen if the previous regex is correct
        throw new Error(`Invalid function syntax in "${cmd}".`);
      }
  
      const functionName = match[1];
      const argsString = match[2];
      const args = parseArgs(argsString);
  
      const result = executeSingleFunction(
        functionName,
        args,
        currentData,
        currentRows,
        currentColumns,
        currentColumnLabels
      );
  
      currentData = result.newData;
      currentRows = result.newRows;
      currentColumns = result.newColumns;
      currentColumnLabels = result.newColumnLabels;
      if (result.result) {
        finalResult += `${cmd}: ${result.result}\n`;
      }
    }
  
    return { newData: currentData, newRows: currentRows, newColumns: currentColumns, newColumnLabels: currentColumnLabels, result: finalResult };
  };
  
  const executeSingleFunction = (
    functionName: string,
    args: (string | number)[],
    data: SpreadsheetData,
    rows: number,
    columns: number,
    columnLabels: string[]
  ): { newData: SpreadsheetData; newRows: number; newColumns: number; newColumnLabels: string[]; result: string | null } => {
    let newData = { ...data };
    let newRows = rows;
    let newColumns = columns;
    let newColumnLabels = [...columnLabels];
    let result: string | null = null;
  
    const getCellKey = (row: number, col: number): string => {
      return `${columnLabels[col]}${row + 1}`;
    };
  
    switch (functionName) {
      case 'update_cell': {
        const [col, row, value] = args;
        if (typeof col !== 'string' || typeof row !== 'number' || typeof value === 'undefined') {
          throw new Error("Invalid arguments for update_cell. Expected: (column, row, value)");
        }
        const colIndex = getColumnIndex(col);
        const rowIndex = row - 1;
        if (colIndex >= newColumns || rowIndex >= newRows) {
          throw new Error("Cell is out of bounds.");
        }
        const cellKey = getCellKey(rowIndex, colIndex);
        newData[cellKey] = { ...newData[cellKey], value: String(value) };
        result = `Cell ${col}${row} updated.`;
        break;
      }
  
      case 'remove_cell': {
        const [col, row] = args;
        if (typeof col !== 'string' || typeof row !== 'number') {
          throw new Error("Invalid arguments for remove_cell. Expected: (column, row)");
        }
        const colIndex = getColumnIndex(col);
        const rowIndex = row - 1;
        if (colIndex >= newColumns || rowIndex >= newRows) {
          throw new Error("Cell is out of bounds.");
        }
        const cellKey = getCellKey(rowIndex, colIndex);
        if (newData[cellKey]) {
          newData[cellKey] = { ...newData[cellKey], value: '' };
        }
        result = `Cell ${col}${row} cleared.`;
        break;
      }
  
      case 'get_cell': {
        const [col, row] = args;
        if (typeof col !== 'string' || typeof row !== 'number') {
          throw new Error("Invalid arguments for get_cell. Expected: (column, row)");
        }
        const colIndex = getColumnIndex(col);
        const rowIndex = row - 1;
        if (colIndex >= newColumns || rowIndex >= newRows) {
          throw new Error("Cell is out of bounds.");
        }
        const cellKey = getCellKey(rowIndex, colIndex);
        result = newData[cellKey]?.value || '';
        break;
      }
  
      case 'sum_col':
      case 'avg_col':
      case 'count_col':
      case 'max_col':
      case 'min_col': {
        const [col] = args;
        if (typeof col !== 'string') {
          throw new Error(`Invalid arguments for ${functionName}. Expected: (column)`);
        }
        const colIndex = getColumnIndex(col);
        if (colIndex >= newColumns) {
          throw new Error("Column is out of bounds.");
        }
        const values = [];
        for (let i = 0; i < newRows; i++) {
          const cellKey = getCellKey(i, colIndex);
          const value = parseFloat(newData[cellKey]?.value);
          if (!isNaN(value)) {
            values.push(value);
          }
        }
  
        if (functionName === 'sum_col') {
          result = String(values.reduce((a, b) => a + b, 0));
        } else if (functionName === 'avg_col') {
          result = String(values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
        } else if (functionName === 'count_col') {
          result = String(values.length);
        } else if (functionName === 'max_col') {
          result = String(Math.max(...values));
        } else if (functionName === 'min_col') {
          result = String(Math.min(...values));
        }
        break;
      }
  
      case 'add_col': {
        newColumns += 1;
        newColumnLabels.push(getColumnLabel(newColumns - 1));
        result = `Column added.`;
        break;
      }
  
      case 'del_col': {
        const [col] = args;
        if (typeof col !== 'string') {
          throw new Error("Invalid arguments for del_col. Expected: (column)");
        }
        const colIndex = getColumnIndex(col);
        if (colIndex >= newColumns) {
          throw new Error("Column is out of bounds.");
        }
  
        const newColLabels = [...columnLabels];
        newColLabels.splice(colIndex, 1);
        
        const updatedData: SpreadsheetData = {};
        for (let r = 0; r < newRows; r++) {
            for (let c = 0; c < newColLabels.length; c++) {
                const oldC = c < colIndex ? c : c + 1;
                const oldKey = `${columnLabels[oldC]}${r + 1}`;
                const newKey = `${newColLabels[c]}${r + 1}`;
                if (data[oldKey]) {
                    updatedData[newKey] = data[oldKey];
                }
            }
        }
  
        newData = updatedData;
        newColumns -= 1;
        newColumnLabels = newColLabels;
        result = `Column ${col} deleted.`;
        break;
      }
  
      case 'sum_row':
      case 'avg_row':
      case 'count_row':
      case 'max_row':
      case 'min_row': {
        const [row] = args;
        if (typeof row !== 'number') {
          throw new Error(`Invalid arguments for ${functionName}. Expected: (row)`);
        }
        const rowIndex = row - 1;
        if (rowIndex >= newRows) {
          throw new Error("Row is out of bounds.");
        }
        const values = [];
        for (let i = 0; i < newColumns; i++) {
          const cellKey = getCellKey(rowIndex, i);
          const value = parseFloat(newData[cellKey]?.value);
          if (!isNaN(value)) {
            values.push(value);
          }
        }
  
        if (functionName === 'sum_row') {
          result = String(values.reduce((a, b) => a + b, 0));
        } else if (functionName === 'avg_row') {
          result = String(values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
        } else if (functionName === 'count_row') {
          result = String(values.length);
        } else if (functionName === 'max_row') {
          result = String(Math.max(...values));
        } else if (functionName === 'min_row') {
          result = String(Math.min(...values));
        }
        break;
      }
  
      case 'add_row': {
        newRows += 1;
        result = `Row added.`;
        break;
      }
  
      case 'del_row': {
        const [row] = args;
        if (typeof row !== 'number') {
          throw new Error("Invalid arguments for del_row. Expected: (row)");
        }
        const rowIndex = row - 1;
        if (rowIndex >= newRows) {
          throw new Error("Row is out of bounds.");
        }
  
        const updatedData: SpreadsheetData = {};
        for (let r = 0; r < newRows; r++) {
            if (r === rowIndex) continue;
            for (let c = 0; c < newColumns; c++) {
                const key = getCellKey(r, c);
                if (data[key]) {
                    const newR = r < rowIndex ? r : r - 1;
                    const newKey = `${columnLabels[c]}${newR + 1}`;
                    updatedData[newKey] = data[key];
                }
            }
        }
  
        newData = updatedData;
        newRows -= 1;
        result = `Row ${row} deleted.`;
        break;
      }
  
      case 'sum_range':
      case 'avg_range':
      case 'clear_range': {
        const [startCol, startRow, endCol, endRow] = args;
        if (typeof startCol !== 'string' || typeof startRow !== 'number' || typeof endCol !== 'string' || typeof endRow !== 'number') {
          throw new Error(`Invalid arguments for ${functionName}. Expected: (startCol, startRow, endCol, endRow)`);
        }
        const startColIndex = getColumnIndex(startCol);
        const startRowIndex = startRow - 1;
        const endColIndex = getColumnIndex(endCol);
        const endRowIndex = endRow - 1;
  
        if (startColIndex >= newColumns || startRowIndex >= newRows || endColIndex >= newColumns || endRowIndex >= newRows) {
          throw new Error("Range is out of bounds.");
        }
  
        const values = [];
        for (let r = startRowIndex; r <= endRowIndex; r++) {
          for (let c = startColIndex; c <= endColIndex; c++) {
            if (functionName === 'clear_range') {
              const cellKey = getCellKey(r, c);
              if (newData[cellKey]) {
                newData[cellKey] = { ...newData[cellKey], value: '' };
              }
            } else {
              const cellKey = getCellKey(r, c);
              const value = parseFloat(newData[cellKey]?.value);
              if (!isNaN(value)) {
                values.push(value);
              }
            }
          }
        }
  
        if (functionName === 'sum_range') {
          result = String(values.reduce((a, b) => a + b, 0));
        } else if (functionName === 'avg_range') {
          result = String(values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);
        } else if (functionName === 'clear_range') {
          result = 'Range cleared.';
        }
        break;
      }
  
      case 'clear_all': {
        newData = {};
        result = 'Spreadsheet cleared.';
        break;
      }
  
      case 'find_cell': {
        const [value] = args;
        if (typeof value === 'undefined') {
          throw new Error("Invalid arguments for find_cell. Expected: (value)");
        }
        const foundCells = [];
        for (let r = 0; r < newRows; r++) {
          for (let c = 0; c < newColumns; c++) {
            const cellKey = getCellKey(r, c);
            if (newData[cellKey]?.value === String(value)) {
              foundCells.push(`${columnLabels[c]}${r + 1}`);
            }
          }
        }
        result = foundCells.length > 0 ? foundCells.join(', ') : 'Value not found.';
        break;
      }
  
      case 'replace_all': {
        const [oldValue, newValue] = args;
        if (typeof oldValue === 'undefined' || typeof newValue === 'undefined') {
          throw new Error("Invalid arguments for replace_all. Expected: (oldValue, newValue)");
        }
        let count = 0;
        for (let r = 0; r < newRows; r++) {
          for (let c = 0; c < newColumns; c++) {
            const cellKey = getCellKey(r, c);
            if (newData[cellKey]?.value === String(oldValue)) {
              newData[cellKey] = { ...newData[cellKey], value: String(newValue) };
              count++;
            }
          }
        }
        result = `Replaced ${count} instances.`;
        break;
      }
  
      default:
        throw new Error(`Function "${functionName}" not found.`);
    }
  
    return { newData, newRows, newColumns, newColumnLabels, result };
  }
