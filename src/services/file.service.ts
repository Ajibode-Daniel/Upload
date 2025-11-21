import { promises as fs } from 'fs';
import path from 'path';
import { config } from '../config';
import { FileUploadInfo } from '../types/file.types';
import {
  generateUniqueFileName,
  getFileType,
  ensureDirectoryExists,
  deleteFile,
} from '../utils/helpers';
import { ValidationError } from '../utils/error';
import { logger } from '../utils/logger';

class FileService {
  private uploadDir: string;

  constructor() {
    this.uploadDir = config.upload.uploadDir;
    this.initializeUploadDirectory();
  }

  private async initializeUploadDirectory(): Promise<void> {
    await ensureDirectoryExists(this.uploadDir);
    logger.info('Upload directory initialized', { path: this.uploadDir });
  }

  async saveUploadedFile(file: Express.Multer.File): Promise<FileUploadInfo> {
    const fileType = getFileType(file.mimetype);
    if (!fileType) {
      await this.deleteUploadedFile(file.path);
      throw new ValidationError(`Unsupported file type: ${file.mimetype}`);
    }

    const uniqueFileName = generateUniqueFileName(file.originalname);
    const finalPath = path.join(this.uploadDir, uniqueFileName);

    try {
      await fs.rename(file.path, finalPath);
      logger.info('File saved', { originalName: file.originalname, savedAs: uniqueFileName });

      return {
        originalName: file.originalname,
        fileName: uniqueFileName,
        filePath: finalPath,
        fileSize: file.size,
        mimeType: file.mimetype,
        fileType,
      };
    } catch (error) {
      await this.deleteUploadedFile(file.path);
      logger.error('Error saving file', { error });
      throw error;
    }
  }

  async deleteUploadedFile(filePath: string): Promise<void> {
    await deleteFile(filePath);
    logger.info('File deleted', { filePath });
  }

  async getFileStats(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        createdAt: stats.birthtime,
        modifiedAt: stats.mtime,
        isFile: stats.isFile(),
      };
    } catch (error) {
      logger.error('Error getting file stats', { filePath, error });
      throw error;
    }
  }

  async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  validateFileSize(fileSize: number): void {
    if (fileSize > config.upload.maxFileSize) {
      throw new ValidationError(
        `File size exceeds maximum allowed size of ${config.upload.maxFileSize} bytes`
      );
    }
  }

  validateFileType(fileExtension: string): void {
    if (!config.upload.allowedTypes.includes(fileExtension.toLowerCase())) {
      throw new ValidationError(
        `File type .${fileExtension} is not allowed. Allowed types: ${config.upload.allowedTypes.join(', ')}`
      );
    }
  }

  getUploadDirectory(): string {
    return this.uploadDir;
  }
}

export const fileService = new FileService();