import { QueueName, QueueConfig } from '../types/queue.types';
import { config } from './index';

export const queueConfigs: Record<QueueName, QueueConfig> = {
  [QueueName.CSV_QUEUE]: {
    name: QueueName.CSV_QUEUE,
    concurrency: config.queue.concurrency,
    rateLimitMax: config.queue.rateLimitMax,
    rateLimitDuration: config.queue.rateLimitDuration,
  },
  [QueueName.PDF_QUEUE]: {
    name: QueueName.PDF_QUEUE,
    concurrency: Math.max(config.queue.concurrency - 2, 2),
    rateLimitMax: config.queue.rateLimitMax,
    rateLimitDuration: config.queue.rateLimitDuration,
  },
  [QueueName.IMAGE_QUEUE]: {
    name: QueueName.IMAGE_QUEUE,
    concurrency: Math.max(config.queue.concurrency - 3, 2),
    rateLimitMax: config.queue.rateLimitMax,
    rateLimitDuration: config.queue.rateLimitDuration,
  },
};

export const defaultJobOptions = {
  attempts: config.worker.maxRetryAttempts,
  backoff: {
    type: 'exponential' as const,
    delay: 2000,
  },
  removeOnComplete: {
    age: 3600, // Keep completed jobs for 1 hour
    count: 1000, // Keep last 1000 jobs
  },
  removeOnFail: {
    age: 86400, // Keep failed jobs for 24 hours
  },
  timeout: config.worker.jobTimeout,
};