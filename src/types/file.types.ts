import { FileType } from "./task.types";

export interface FileUploadInfo {
  originalName: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  fileType: FileType;
}

export interface CSVProcessingResult {
  rowCount: number;
  columnCount: number;
  columns: string[];
  statistics: Record<string, ColumnStatistics>;
  duplicateCount: number;
  preview: any[];
}

export interface ColumnStatistics {
  type: 'numeric' | 'string' | 'date' | 'boolean';
  count: number;
  nullCount: number;
  uniqueCount: number;
  mean?: number;
  median?: number;
  min?: number | string;
  max?: number | string;
  stdDev?: number;
}

export interface PDFProcessingResult {
  pageCount: number;
  textContent: string;
  wordCount: number;
  metadata: {
    title?: string;
    author?: string;
    subject?: string;
    creator?: string;
    producer?: string;
    creationDate?: string;
  };
  chunks: string[];
}

export interface ImageProcessingResult {
  width: number;
  height: number;
  format: string;
  hasAlpha: boolean;
  ocrText: string;
  confidence: number;
  metadata: {
    colorSpace?: string;
    density?: number;
    orientation?: number;
  };
}