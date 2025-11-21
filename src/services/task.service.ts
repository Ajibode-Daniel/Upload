import { taskRepository } from '../db/repositories/task.repository';
import { queueService } from './queue.service';
import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskStatus,
  TaskResult,
} from '../types/task.types';
import { FileType } from '../types/file.types';
import { NotFoundError } from '../utils/error';
import { logger } from '../utils/logger';

class TaskService {
  async createTask(data: CreateTaskDTO): Promise<Task> {
    const task = await taskRepository.create(data);

    // Add job to queue
    await queueService.addJob(data.fileType, {
      taskId: task.id,
      filePath: data.filePath,
      fileType: data.fileType,
      fileName: data.fileName,
    });

    logger.info('Task created and queued', { taskId: task.id });
    return task;
  }

  async getTaskById(id: string): Promise<Task> {
    const task = await taskRepository.findById(id);
    if (!task) {
      throw new NotFoundError(`Task with id ${id} not found`);
    }
    return task;
  }

  async getTaskResult(id: string): Promise<TaskResult> {
    const task = await this.getTaskById(id);

    return {
      taskId: task.id,
      status: task.status,
      progress: task.progress,
      result: task.resultData,
      error: task.errorMessage,
      createdAt: task.createdAt,
      completedAt: task.completedAt,
    };
  }

  async updateTask(id: string, data: UpdateTaskDTO): Promise<Task> {
    return taskRepository.update(id, data);
  }

  async markTaskAsProcessing(id: string): Promise<Task> {
    return this.updateTask(id, {
      status: TaskStatus.PROCESSING,
      startedAt: new Date(),
      progress: 0,
    });
  }

  async markTaskAsCompleted(id: string, resultData: any): Promise<Task> {
    return this.updateTask(id, {
      status: TaskStatus.COMPLETED,
      completedAt: new Date(),
      progress: 100,
      resultData,
    });
  }

  async markTaskAsFailed(id: string, errorMessage: string): Promise<Task> {
    await taskRepository.incrementRetryCount(id);
    return this.updateTask(id, {
      status: TaskStatus.FAILED,
      completedAt: new Date(),
      errorMessage,
    });
  }

  async updateTaskProgress(id: string, progress: number): Promise<void> {
    await this.updateTask(id, { progress });
  }

  async getTasksByStatus(status: TaskStatus, limit?: number): Promise<Task[]> {
    return taskRepository.findByStatus(status, limit);
  }

  async cleanupOldTasks(daysOld: number = 7): Promise<number> {
    return taskRepository.deleteOldCompleted(daysOld);
  }
}

export const taskService = new TaskService();