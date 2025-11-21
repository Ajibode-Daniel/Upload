import { db } from '../client';
import {
  Task,
  CreateTaskDTO,
  UpdateTaskDTO,
  TaskStatus,
} from '../../types/task.types';
import { logger } from '../../utils/logger';
import { NotFoundError } from '../../utils/error';

export class TaskRepository {
  async create(data: CreateTaskDTO): Promise<Task> {
    const query = `
      INSERT INTO tasks (file_name, file_type, file_path, file_size, status)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const values = [
      data.fileName,
      data.fileType,
      data.filePath,
      data.fileSize,
      TaskStatus.QUEUED,
    ];

    try {
      const result = await db.query(query, values);
      logger.info('Task created', { taskId: result.rows[0].id });
      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      logger.error('Error creating task', { error });
      throw error;
    }
  }

  async findById(id: string): Promise<Task | null> {
    const query = 'SELECT * FROM tasks WHERE id = $1';
    try {
      const result = await db.query(query, [id]);
      if (result.rows.length === 0) {
        return null;
      }
      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      logger.error('Error finding task by ID', { taskId: id, error });
      throw error;
    }
  }

  async update(id: string, data: UpdateTaskDTO): Promise<Task> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (data.status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(data.status);
    }
    if (data.progress !== undefined) {
      updates.push(`progress = $${paramCount++}`);
      values.push(data.progress);
    }
    if (data.resultData !== undefined) {
      updates.push(`result_data = $${paramCount++}`);
      values.push(JSON.stringify(data.resultData));
    }
    if (data.errorMessage !== undefined) {
      updates.push(`error_message = $${paramCount++}`);
      values.push(data.errorMessage);
    }
    if (data.startedAt !== undefined) {
      updates.push(`started_at = $${paramCount++}`);
      values.push(data.startedAt);
    }
    if (data.completedAt !== undefined) {
      updates.push(`completed_at = $${paramCount++}`);
      values.push(data.completedAt);
    }

    if (updates.length === 0) {
      throw new Error('No updates provided');
    }

    values.push(id);
    const query = `
      UPDATE tasks
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    try {
      const result = await db.query(query, values);
      if (result.rows.length === 0) {
        throw new NotFoundError(`Task with id ${id} not found`);
      }
      logger.info('Task updated', { taskId: id, updates: Object.keys(data) });
      return this.mapRowToTask(result.rows[0]);
    } catch (error) {
      logger.error('Error updating task', { taskId: id, error });
      throw error;
    }
  }

  async incrementRetryCount(id: string): Promise<void> {
    const query = 'UPDATE tasks SET retry_count = retry_count + 1 WHERE id = $1';
    try {
      await db.query(query, [id]);
      logger.info('Task retry count incremented', { taskId: id });
    } catch (error) {
      logger.error('Error incrementing retry count', { taskId: id, error });
      throw error;
    }
  }

  async findByStatus(status: TaskStatus, limit: number = 100): Promise<Task[]> {
    const query = `
      SELECT * FROM tasks
      WHERE status = $1
      ORDER BY created_at DESC
      LIMIT $2
    `;
    try {
      const result = await db.query(query, [status, limit]);
      return result.rows.map(row => this.mapRowToTask(row));
    } catch (error) {
      logger.error('Error finding tasks by status', { status, error });
      throw error;
    }
  }

  async deleteOldCompleted(daysOld: number = 7): Promise<number> {
    const query = `
      DELETE FROM tasks
      WHERE status = $1
      AND completed_at < NOW() - INTERVAL '${daysOld} days'
    `;
    try {
      const result = await db.query(query, [TaskStatus.COMPLETED]);
      logger.info('Old completed tasks deleted', { count: result.rowCount });
      return result.rowCount || 0;
    } catch (error) {
      logger.error('Error deleting old completed tasks', { error });
      throw error;
    }
  }

  private mapRowToTask(row: any): Task {
    return {
      id: row.id,
      fileName: row.file_name,
      fileType: row.file_type,
      filePath: row.file_path,
      fileSize: row.file_size,
      status: row.status,
      progress: row.progress,
      resultData: row.result_data,
      errorMessage: row.error_message,
      retryCount: row.retry_count,
      createdAt: row.created_at,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    };
  }
}

export const taskRepository = new TaskRepository();