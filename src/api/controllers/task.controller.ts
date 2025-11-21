import { Request, Response, NextFunction } from 'express';
import { taskService } from '../../services/task.service';
import { queueService } from '../../services/queue.service';
import { TaskStatus } from '../../types/task.types';
import { logger } from '../../utils/logger';

export class TaskController {
  async getTaskStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;

      logger.debug('Task status request', { taskId });

      const taskResult = await taskService.getTaskResult(taskId);

      res.json({
        success: true,
        data: taskResult,
      });
    } catch (error) {
      next(error);
    }
  }

  async getTaskResult(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;

      logger.debug('Task result request', { taskId });

      const task = await taskService.getTaskById(taskId);

      if (task.status !== TaskStatus.COMPLETED) {
        return res.status(400).json({
          success: false,
          message: `Task is not completed yet. Current status: ${task.status}`,
          data: {
            taskId: task.id,
            status: task.status,
            progress: task.progress,
          },
        });
      }

      res.json({
        success: true,
        data: {
          taskId: task.id,
          fileName: task.fileName,
          fileType: task.fileType,
          result: task.resultData,
          completedAt: task.completedAt,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getAllTasks(req: Request, res: Response, next: NextFunction) {
    try {
      const { status, limit } = req.query;

      let tasks;
      if (status) {
        tasks = await taskService.getTasksByStatus(
          status as TaskStatus,
          limit ? parseInt(limit as string) : undefined
        );
      } else {
        // Get all recent tasks (would need a new method in service)
        tasks = [];
      }

      res.json({
        success: true,
        data: tasks,
      });
    } catch (error) {
      next(error);
    }
  }

  async getQueueMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const metrics = await queueService.getAllQueueMetrics();

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      next(error);
    }
  }

  async retryTask(req: Request, res: Response, next: NextFunction) {
    try {
      const { taskId } = req.params;

      const task = await taskService.getTaskById(taskId);

      if (task.status !== TaskStatus.FAILED) {
        return res.status(400).json({
          success: false,
          message: 'Only failed tasks can be retried',
        });
      }

      // Re-queue the job
      await queueService.addJob(task.fileType, {
        taskId: task.id,
        filePath: task.filePath,
        fileType: task.fileType,
        fileName: task.fileName,
      });

      // Update task status to queued
      await taskService.updateTask(taskId, {
        status: TaskStatus.QUEUED,
        errorMessage: null,
        progress: 0,
      });

      logger.info('Task retry initiated', { taskId });

      res.json({
        success: true,
        message: 'Task has been re-queued for processing',
        data: {
          taskId,
          status: TaskStatus.QUEUED,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async healthCheck(req: Request, res: Response) {
    res.json({
      success: true,
      message: 'Service is healthy',
      timestamp: new Date().toISOString(),
    });
  }
}

export const taskController = new TaskController();