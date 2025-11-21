import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';
import { FileType } from '../types/task.types';

export function generateUniqueFileName(originalName: string): string {
  const ext = path.extname(originalName);
  const randomId = randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${randomId}${ext}`;
}

export function getFileType(mimeType: string): FileType | null {
  if (mimeType === 'text/csv' || mimeType === 'application/csv') {
    return FileType.CSV;
  }
  if (mimeType === 'application/pdf') {
    return FileType.PDF;
  }
  if (mimeType.startsWith('image/')) {
    return FileType.IMAGE;
  }
  return null;
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase().replace('.', '');
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function deleteFile(filePath: string): Promise<void> {
  try {
    await fs.unlink(filePath);
  } catch (error) {
    // File might not exist, ignore error
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function calculatePercentage(current: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(Math.round((current / total) * 100), 100);
}

export function sanitizeFileName(fileName: string): string {
  return fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
}

export function isValidFileType(fileType: string, allowedTypes: string[]): boolean {
  return allowedTypes.includes(fileType.toLowerCase());
}

export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

export function calculateMedian(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  const sorted = [...numbers].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

export function calculateStdDev(numbers: number[], mean: number): number {
  if (numbers.length === 0) return 0;
  const variance = numbers.reduce((sum, num) => sum + Math.pow(num - mean, 2), 0) / numbers.length;
  return Math.sqrt(variance);
}