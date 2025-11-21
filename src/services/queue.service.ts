import { Queue, QueueEvents } from 'bullmq';
import Redis from 'ioredis';
import { redisConfig } from '../config/redis.config';
import { queueConfigs, defaultJobOptions } from '../config/queue.config';
import { QueueName, JobData } from '../types/queue.types';
import { FileType } from '../types/file.types';
import { logger } from '../utils/logger';

class QueueService {
  private queues: Map<QueueName, Queue> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private connection: Redis;

  constructor() {
    this.connection = new Redis(redisConfig);
    this.initializeQueues();
    this.setupEventListeners();
  }

  private initializeQueues(): void {
    Object.values(QueueName).forEach((queueName) => {
      const queue = new Queue(queueName, {
        connection: this.connection,
        defaultJobOptions,
      });

      const queueEvents = new QueueEvents(queueName, {
        connection: this.connection.duplicate(),
      });

      this.queues.set(queueName, queue);
      this.queueEvents.set(queueName, queueEvents);

      logger.info(`Queue initialized: ${queueName}`);
    });
  }

  private setupEventListeners(): void {
    this.queueEvents.forEach((events, queueName) => {
      events.on('completed', ({ jobId }) => {
        logger.info(`Job completed`, { queueName, jobId });
      });

      events.on('failed', ({ jobId, failedReason }) => {
        logger.error(`Job failed`, { queueName, jobId, failedReason });
      });

      events.on('progress', ({ jobId, data }) => {
        logger.debug(`Job progress`, { queueName, jobId, progress: data });
      });
    });
  }

  public async addJob(fileType: FileType, jobData: JobData): Promise<string> {
    const queueName = this.getQueueNameByFileType(fileType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found for file type: ${fileType}`);
    }

    try {
      const job = await queue.add(`process-${fileType}`, jobData, {
        jobId: jobData.taskId,
      });

      logger.info('Job added to queue', {
        queueName,
        jobId: job.id,
        taskId: jobData.taskId,
      });

      return job.id!;
    } catch (error) {
      logger.error('Error adding job to queue', { queueName, error });
      throw error;
    }
  }

  public async getJobStatus(fileType: FileType, jobId: string) {
    const queueName = this.getQueueNameByFileType(fileType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found for file type: ${fileType}`);
    }

    const job = await queue.getJob(jobId);
    if (!job) {
      return null;
    }

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      failedReason: job.failedReason,
    };
  }

  public async removeJob(fileType: FileType, jobId: string): Promise<void> {
    const queueName = this.getQueueNameByFileType(fileType);
    const queue = this.queues.get(queueName);

    if (!queue) {
      throw new Error(`Queue not found for file type: ${fileType}`);
    }

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
      logger.info('Job removed from queue', { queueName, jobId });
    }
  }

  public getQueue(queueName: QueueName): Queue | undefined {
    return this.queues.get(queueName);
  }

  public async getQueueMetrics(queueName: QueueName) {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  public async getAllQueueMetrics() {
    const metrics = await Promise.all(
      Array.from(this.queues.keys()).map((queueName) =>
        this.getQueueMetrics(queueName)
      )
    );
    return metrics.filter((m) => m !== null);
  }

  public async pauseQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.pause();
      logger.info(`Queue paused: ${queueName}`);
    }
  }

  public async resumeQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.resume();
      logger.info(`Queue resumed: ${queueName}`);
    }
  }

  public async clearQueue(queueName: QueueName): Promise<void> {
    const queue = this.queues.get(queueName);
    if (queue) {
      await queue.drain();
      logger.info(`Queue cleared: ${queueName}`);
    }
  }

  private getQueueNameByFileType(fileType: FileType): QueueName {
    switch (fileType) {
      case FileType.CSV:
        return QueueName.CSV_QUEUE;
      case FileType.PDF:
        return QueueName.PDF_QUEUE;
      case FileType.IMAGE:
        return QueueName.IMAGE_QUEUE;
      default:
        throw new Error(`Unknown file type: ${fileType}`);
    }
  }

  public async close(): Promise<void> {
    logger.info('Closing all queues...');

    await Promise.all([
      ...Array.from(this.queues.values()).map((queue) => queue.close()),
      ...Array.from(this.queueEvents.values()).map((events) => events.close()),
    ]);

    await this.connection.quit();
    logger.info('All queues closed');
  }

  public async waitUntilReady(): Promise<void> {
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.waitUntilReady())
    );
    logger.info('All queues are ready');
  }
}

export const queueService = new QueueService();