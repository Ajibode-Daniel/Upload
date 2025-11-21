import { Request, Response, NextFunction } from 'express';
import { taskService } from '../../services/task.service';
import { fileService } from '../../services/file.service';
import { logger } from '../../utils/logger';
import { ValidationError } from '../../utils/error';

export class UploadController {
  async uploadFile(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        throw new ValidationError('No file uploaded');
      }

      logger.info('File upload request received', {
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
      });

      // Validate and save file
      fileService.validateFileSize(req.file.size);
      const fileInfo = await fileService.saveUploadedFile(req.file);

      // Create task and queue job
      const task = await taskService.createTask({
        fileName: fileInfo.originalName,
        fileType: fileInfo.fileType,
        filePath: fileInfo.filePath,
        fileSize: fileInfo.fileSize,
      });

      logger.info('File uploaded and task created', {
        taskId: task.id,
        fileName: fileInfo.originalName,
      });

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully and processing started',
        data: {
          taskId: task.id,
          fileName: fileInfo.originalName,
          fileType: fileInfo.fileType,
          fileSize: fileInfo.fileSize,
          status: task.status,
          createdAt: task.createdAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getUploadInfo(req: Request, res: Response) {
    res.json({
      success: true,
      data: {
        maxFileSize: fileService.getUploadDirectory(),
        allowedTypes: ['csv', 'pdf', 'png', 'jpg', 'jpeg'],
      },
    });
  }
}

export const uploadController = new UploadController();