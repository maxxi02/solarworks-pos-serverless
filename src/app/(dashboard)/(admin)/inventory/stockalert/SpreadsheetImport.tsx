'use client';

import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
import {
  X,
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Download,
  RefreshCw,
  ArrowLeft,
  ArrowRight,
  Save,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';
import { Unit, isValidUnit } from '@/lib/unit-conversion';

interface ImportedRow {
  rowNumber: number;
  name: string;
  category: string;
  currentStock: number;
  currentStockUnit: string;
  minStock: number;
  minStockUnit: string;
  maxStock?: number;
  maxStockUnit?: string;
  unit: string;
  pricePerUnit: number;
  supplier?: string;
  location?: string;
  reorderPoint?: number;
  reorderPointUnit?: string;
  density?: number;
  errors: string[];
  warnings: string[];
  isValid: boolean;
}

interface SpreadsheetImportProps {
  onImport: (items: any[]) => Promise<void>;
  onClose: () => void;
  isOpen: boolean;
}

const REQUIRED_COLUMNS = [
  'name',
  'category',
  'currentStock',
  'currentStockUnit',
  'minStock',
  'minStockUnit',
  'unit'
];

const OPTIONAL_COLUMNS = [
  'maxStock',
  'maxStockUnit',
  'pricePerUnit',
  'supplier',
  'location',
  'reorderPoint',
  'reorderPointUnit',
  'density'
];

const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

const COLUMN_LABELS: Record<string, string> = {
  name: 'Item Name',
  category: 'Category',
  currentStock: 'Current Stock',
  currentStockUnit: 'Current Stock Unit',
  minStock: 'Minimum Stock',
  minStockUnit: 'Minimum Stock Unit',
  maxStock: 'Maximum Stock',
  maxStockUnit: 'Maximum Stock Unit',
  unit: 'Display Unit',
  pricePerUnit: 'Price per Unit',
  supplier: 'Supplier',
  location: 'Location',
  reorderPoint: 'Reorder Point',
  reorderPointUnit: 'Reorder Point Unit',
  density: 'Density (g/mL)'
};

const UNIT_EXAMPLES: Record<string, string> = {
  'kg': 'Kilograms',
  'g': 'Grams',
  'L': 'Liters',
  'mL': 'Milliliters',
  'pieces': 'Pieces',
  'boxes': 'Boxes',
  'bottles': 'Bottles',
  'bags': 'Bags'
};

export function SpreadsheetImport({ onImport, onClose, isOpen }: SpreadsheetImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<ImportedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    failed: number;
    errors: Array<{ row: number; error: string }>;
  }>({ success: 0, failed: 0, errors: [] });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Check file type
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!['csv', 'xlsx', 'xls'].includes(extension || '')) {
      toast.error('Invalid file type', {
        description: 'Please upload a CSV or Excel file (.csv, .xlsx, .xls)'
      });
      return;
    }

    setFile(file);
    parseFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB
  });

  const parseFile = (file: File) => {
    setLoading(true);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

        if (jsonData.length < 2) {
          toast.error('File is empty', {
            description: 'The file contains no data rows'
          });
          setLoading(false);
          return;
        }

        // Extract headers (first row)
        const headers = (jsonData[0] as any[]).map(h => String(h).trim());
        setHeaders(headers);

        // Auto-map columns
        const mapping: Record<string, string> = {};
        headers.forEach(header => {
          const normalized = header.toLowerCase().replace(/[^a-z]/g, '');
          
          // Try to find matching column
          for (const col of ALL_COLUMNS) {
            if (normalized.includes(col.toLowerCase())) {
              mapping[header] = col;
              break;
            }
          }
        });
        setColumnMapping(mapping);

        // Parse rows
        const rows: ImportedRow[] = [];
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as any[];
          if (row.length === 0 || row.every(cell => !cell)) continue;

          const rowData: any = {};
          headers.forEach((header, index) => {
            rowData[header] = row[index];
          });

          const parsedRow = validateRow(rowData, i, mapping);
          rows.push(parsedRow);
        }

        setData(rows);
        setSelectedRows(new Set(rows.map(r => r.rowNumber)));
        setStep('preview');
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('Failed to parse file', {
          description: 'The file format is invalid or corrupted'
        });
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const validateRow = (row: any, rowNumber: number, mapping: Record<string, string>): ImportedRow => {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Helper to get mapped value
    const getValue = (column: string) => {
      const mappedHeader = Object.entries(mapping).find(([_, col]) => col === column)?.[0];
      return mappedHeader ? row[mappedHeader] : undefined;
    };

    // Required fields
    const name = getValue('name');
    if (!name) {
      errors.push('Item name is required');
    }

    const category = getValue('category');
    if (!category) {
      errors.push('Category is required');
    }

    const currentStock = parseFloat(getValue('currentStock'));
    if (isNaN(currentStock) || currentStock < 0) {
      errors.push('Current stock must be a valid positive number');
    }

    const currentStockUnit = getValue('currentStockUnit');
    if (!currentStockUnit || !isValidUnit(currentStockUnit)) {
      errors.push('Current stock unit is invalid');
    }

    const minStock = parseFloat(getValue('minStock'));
    if (isNaN(minStock) || minStock < 0) {
      errors.push('Minimum stock must be a valid positive number');
    }

    const minStockUnit = getValue('minStockUnit');
    if (!minStockUnit || !isValidUnit(minStockUnit)) {
      errors.push('Minimum stock unit is invalid');
    }

    const unit = getValue('unit');
    if (!unit || !isValidUnit(unit)) {
      errors.push('Display unit is invalid');
    }

    // Optional fields
    const maxStock = getValue('maxStock') ? parseFloat(getValue('maxStock')) : undefined;
    if (maxStock !== undefined && (isNaN(maxStock) || maxStock < 0)) {
      errors.push('Maximum stock must be a valid positive number');
    }

    const maxStockUnit = getValue('maxStockUnit');
    if (maxStockUnit && !isValidUnit(maxStockUnit)) {
      errors.push('Maximum stock unit is invalid');
    }

    const pricePerUnit = getValue('pricePerUnit') ? parseFloat(getValue('pricePerUnit')) : 0;
    if (isNaN(pricePerUnit) || pricePerUnit < 0) {
      errors.push('Price per unit must be a valid positive number');
    }

    const reorderPoint = getValue('reorderPoint') ? parseFloat(getValue('reorderPoint')) : undefined;
    if (reorderPoint !== undefined && (isNaN(reorderPoint) || reorderPoint < 0)) {
      errors.push('Reorder point must be a valid positive number');
    }

    const reorderPointUnit = getValue('reorderPointUnit');
    if (reorderPointUnit && !isValidUnit(reorderPointUnit)) {
      errors.push('Reorder point unit is invalid');
    }

    const density = getValue('density') ? parseFloat(getValue('density')) : undefined;
    if (density !== undefined && (isNaN(density) || density < 0)) {
      errors.push('Density must be a valid positive number');
    }

    // Check unit compatibility
    if (unit && currentStockUnit && unit !== currentStockUnit) {
      warnings.push(`Display unit (${unit}) differs from current stock unit (${currentStockUnit})`);
    }

    return {
      rowNumber: rowNumber + 1,
      name: name || '',
      category: category || '',
      currentStock: isNaN(currentStock) ? 0 : currentStock,
      currentStockUnit: currentStockUnit || '',
      minStock: isNaN(minStock) ? 0 : minStock,
      minStockUnit: minStockUnit || '',
      maxStock,
      maxStockUnit,
      unit: unit || '',
      pricePerUnit: isNaN(pricePerUnit) ? 0 : pricePerUnit,
      supplier: getValue('supplier'),
      location: getValue('location'),
      reorderPoint,
      reorderPointUnit,
      density,
      errors,
      warnings,
      isValid: errors.length === 0
    };
  };

  const handleImport = async () => {
    const rowsToImport = data.filter(row => selectedRows.has(row.rowNumber) && row.isValid);
    
    if (rowsToImport.length === 0) {
      toast.error('No valid rows selected', {
        description: 'Please select at least one valid row to import'
      });
      return;
    }

    setStep('importing');
    setProcessing(true);
    setImportProgress(0);
    setImportResults({ success: 0, failed: 0, errors: [] });

    const items = rowsToImport.map(row => ({
      name: row.name,
      category: row.category,
      currentStock: row.currentStock,
      currentStockUnit: row.currentStockUnit as Unit,
      minStock: row.minStock,
      minStockUnit: row.minStockUnit as Unit,
      maxStock: row.maxStock,
      maxStockUnit: row.maxStockUnit as Unit,
      unit: row.unit as Unit,
      pricePerUnit: row.pricePerUnit,
      supplier: row.supplier,
      location: row.location,
      reorderPoint: row.reorderPoint,
      reorderPointUnit: row.reorderPointUnit as Unit,
      density: row.density
    }));

    try {
      await onImport(items);
      setImportResults({
        success: items.length,
        failed: 0,
        errors: []
      });
      toast.success('Import completed', {
        description: `Successfully imported ${items.length} items`
      });
    } catch (error: any) {
      setImportResults({
        success: 0,
        failed: items.length,
        errors: [{ row: 0, error: error.message || 'Import failed' }]
      });
      toast.error('Import failed', {
        description: error.message || 'An error occurred during import'
      });
    } finally {
      setProcessing(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      REQUIRED_COLUMNS,
      ['Coffee Beans', 'Coffee', '5', 'kg', '2', 'kg', 'kg', '500', 'Local Supplier', 'Aisle 1', '3', 'kg', '0.43'],
      ['Sugar', 'Baking', '10', 'kg', '5', 'kg', 'kg', '50', 'Sweet Co.', 'Aisle 2', '7', 'kg', '0.85']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    
    // Add column descriptions
    const colDescriptions = ALL_COLUMNS.map(col => ({
      column: col,
      description: COLUMN_LABELS[col],
      required: REQUIRED_COLUMNS.includes(col) ? 'Yes' : 'No'
    }));

    const descWs = XLSX.utils.json_to_sheet(colDescriptions);
    XLSX.utils.book_append_sheet(wb, descWs, 'Instructions');

    XLSX.writeFile(wb, 'inventory-import-template.xlsx');
  };

  const toggleAllRows = () => {
    if (selectedRows.size === data.filter(r => r.isValid).length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(data.filter(r => r.isValid).map(r => r.rowNumber)));
    }
  };

  const toggleRow = (rowNumber: number) => {
    const newSelected = new Set(selectedRows);
    if (newSelected.has(rowNumber)) {
      newSelected.delete(rowNumber);
    } else {
      newSelected.add(rowNumber);
    }
    setSelectedRows(newSelected);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div className="w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Import Inventory Items
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Bulk import items from CSV or Excel spreadsheet
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="space-y-6">
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors ${
                  isDragActive
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                    : 'border-gray-300 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500'
                }`}
              >
                <input {...getInputProps()} />
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your spreadsheet'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  or click to browse (CSV, XLSX, XLS up to 10MB)
                </p>
                <button className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                  <FileSpreadsheet className="h-4 w-4" />
                  Select File
                </button>
              </div>

              {/* Template Download */}
              <div className="text-center">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-500 dark:hover:text-blue-400"
                >
                  <Download className="h-4 w-4" />
                  Download template spreadsheet
                </button>
              </div>

              {/* Column Guide */}
              <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-6">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">
                  Column Guide
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {ALL_COLUMNS.map(col => (
                    <div key={col} className="flex items-start gap-2">
                      <div className={`mt-0.5 h-2 w-2 rounded-full ${
                        REQUIRED_COLUMNS.includes(col)
                          ? 'bg-red-500'
                          : 'bg-gray-400'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {col}
                          {REQUIRED_COLUMNS.includes(col) && (
                            <span className="ml-1 text-xs text-red-500">*</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {COLUMN_LABELS[col]}
                        </p>
                        {col.includes('Unit') && (
                          <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">
                            Allowed: {Object.keys(UNIT_EXAMPLES).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              {/* File Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {file?.name}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {(file?.size || 0) / 1024 < 1024
                      ? `${((file?.size || 0) / 1024).toFixed(2)} KB`
                      : `${((file?.size || 0) / 1024 / 1024).toFixed(2)} MB`}
                  </span>
                </div>
                <button
                  onClick={() => setStep('upload')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <ArrowLeft className="h-4 w-4 inline mr-1" />
                  Choose different file
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Total Rows</p>
                  <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                    {data.length}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Valid Rows</p>
                  <p className="text-2xl font-semibold text-green-600 dark:text-green-500">
                    {data.filter(r => r.isValid).length}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Invalid Rows</p>
                  <p className="text-2xl font-semibold text-red-600 dark:text-red-500">
                    {data.filter(r => !r.isValid).length}
                  </p>
                </div>
                <div className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Selected</p>
                  <p className="text-2xl font-semibold text-blue-600 dark:text-blue-500">
                    {selectedRows.size}
                  </p>
                </div>
              </div>

              {/* Data Preview */}
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-800 rounded-lg">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
                  <thead className="bg-gray-50 dark:bg-gray-900">
                    <tr>
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedRows.size === data.filter(r => r.isValid).length}
                          onChange={toggleAllRows}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Row</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Category</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Stock</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Min</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Unit</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Price</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                    {data.slice(0, 10).map((row) => (
                      <tr key={row.rowNumber} className={!row.isValid ? 'bg-red-50 dark:bg-red-950/10' : ''}>
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedRows.has(row.rowNumber)}
                            onChange={() => toggleRow(row.rowNumber)}
                            disabled={!row.isValid}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.rowNumber}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.name}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.category}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.currentStock} {row.currentStockUnit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.minStock} {row.minStockUnit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          {row.unit}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                          ₱{row.pricePerUnit.toFixed(2)}
                        </td>
                        <td className="px-4 py-3">
                          {row.isValid ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="h-4 w-4 text-red-500" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {data.length > 10 && (
                  <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 border-t">
                    Showing 10 of {data.length} rows
                  </div>
                )}
              </div>

              {/* Validation Errors */}
              {data.some(r => !r.isValid) && (
                <div className="rounded-lg bg-red-50 dark:bg-red-950/10 border border-red-200 dark:border-red-900/30 p-4">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-400 mb-2 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Validation Errors
                  </h4>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.filter(r => !r.isValid).map(row => (
                      <div key={row.rowNumber} className="text-xs text-red-700 dark:text-red-400">
                        <span className="font-medium">Row {row.rowNumber}:</span> {row.errors.join(', ')}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="py-12 text-center">
              {processing ? (
                <div className="space-y-4">
                  <RefreshCw className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
                  <p className="text-lg font-medium text-gray-900 dark:text-white">
                    Importing inventory items...
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Please wait while we process your data
                  </p>
                  <div className="w-64 h-2 bg-gray-200 dark:bg-gray-800 rounded-full mx-auto overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {importResults.failed === 0 ? (
                    <>
                      <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Import Complete!
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Successfully imported {importResults.success} items
                      </p>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-12 w-12 text-red-600 mx-auto" />
                      <p className="text-lg font-medium text-gray-900 dark:text-white">
                        Import Failed
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-500">
                        {importResults.failed} items failed to import
                      </p>
                      <div className="mt-4 text-left max-w-md mx-auto">
                        {importResults.errors.map((err, idx) => (
                          <p key={idx} className="text-xs text-red-700 dark:text-red-400">
                            Row {err.row}: {err.error}
                          </p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
          >
            Cancel
          </button>
          
          {step === 'preview' && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900"
              >
                Back
              </button>
              <button
                onClick={handleImport}
                disabled={selectedRows.size === 0}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                Import {selectedRows.size} Items
              </button>
            </div>
          )}

          {step === 'importing' && !processing && (
            <button
              onClick={onClose}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}