import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { redisConfig } from '../config/redis.config';
import { queueConfigs } from '../config/queue.config';
import { QueueName, JobData } from '../types/queue.types';
import { FileType } from '../types/task.types';
import { logger } from '../utils/logger';
import { taskService } from '../services/task.service';
import { processCSVFile } from './processors/csv.processor';
import { processPDFFile } from './processors/pdf.processor';
import { processImageFile } from './processors/image.processor';

export class WorkerManager {
  private workers: Map<QueueName, Worker> = new Map();
  private connection: Redis;
  private isShuttingDown = false;

  constructor() {
    this.connection = new Redis(redisConfig);
  }

  public async start(): Promise<void> {
    logger.info('Starting worker manager...');

    // Initialize workers for each queue
    this.initializeWorker(QueueName.CSV_QUEUE, processCSVFile);
    this.initializeWorker(QueueName.PDF_QUEUE, processPDFFile);
    this.initializeWorker(QueueName.IMAGE_QUEUE, processImageFile);

    this.setupGracefulShutdown();

    logger.info('All workers started successfully');
  }

  private initializeWorker(
    queueName: QueueName,
    processor: (job: Job<JobData>) => Promise<any>
  ): void {
    const config = queueConfigs[queueName];

    const worker = new Worker(
      queueName,
      async (job: Job<JobData>) => {
        const startTime = Date.now();
        logger.info('Job picked by worker', {
          queueName,
          jobId: job.id,
          taskId: job.data.taskId,
        });

        try {
          const result = await processor(job);

          // Mark task as completed
          await taskService.markTaskAsCompleted(job.data.taskId, result);

          const duration = Date.now() - startTime;
          logger.info('Job completed successfully', {
            queueName,
            jobId: job.id,
            taskId: job.data.taskId,
            duration: `${duration}ms`,
          });

          return result;
        } catch (error: any) {
          const duration = Date.now() - startTime;
          logger.error('Job failed', {
            queueName,
            jobId: job.id,
            taskId: job.data.taskId,
            error: error.message,
            duration: `${duration}ms`,
          });

          // Mark task as failed
          await taskService.markTaskAsFailed(
            job.data.taskId,
            error.message || 'Unknown error occurred'
          );

          throw error;
        }
      },
      {
        connection: this.connection,
        concurrency: config.concurrency,
        limiter: {
          max: config.rateLimitMax,
          duration: config.rateLimitDuration,
        },
      }
    );

    // Setup event listeners
    worker.on('completed', (job) => {
      logger.debug('Worker completed job', { queueName, jobId: job.id });
    });

    worker.on('failed', (job, error) => {
      logger.error('Worker failed job', {
        queueName,
        jobId: job?.id,
        error: error.message,
      });
    });

    worker.on('error', (error) => {
      logger.error('Worker error', { queueName, error: error.message });
    });

    worker.on('stalled', (jobId) => {
      logger.warn('Job stalled', { queueName, jobId });
    });

    this.workers.set(queueName, worker);
    logger.info(`Worker initialized for ${queueName}`, { concurrency: config.concurrency });
  }

  private setupGracefulShutdown(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) {
        logger.warn('Shutdown already in progress...');
        return;
      }

      this.isShuttingDown = true;
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      try {
        // Stop accepting new jobs
        const closePromises = Array.from(this.workers.values()).map((worker) =>
          worker.close()
        );

        await Promise.all(closePromises);
        await this.connection.quit();

        logger.info('All workers shut down gracefully');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', { error });
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  public async stop(): Promise<void> {
    logger.info('Stopping all workers...');

    await Promise.all(
      Array.from(this.workers.values()).map((worker) => worker.close())
    );

    await this.connection.quit();
    logger.info('All workers stopped');
  }

  public getWorker(queueName: QueueName): Worker | undefined {
    return this.workers.get(queueName);
  }

  public async getWorkerMetrics() {
    const metrics = await Promise.all(
      Array.from(this.workers.entries()).map(async ([queueName, worker]) => {
        return {
          queueName,
          isRunning: await worker.isRunning(),
          isPaused: await worker.isPaused(),
        };
      })
    );

    return metrics;
  }
}