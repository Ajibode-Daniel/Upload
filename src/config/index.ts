import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  workerPort: parseInt(process.env.WORKER_PORT || '3001', 10),

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    name: process.env.DB_NAME || 'fileprocessor_db',
    user: process.env.DB_USER || 'fileprocessor',
    password: process.env.DB_PASSWORD || 'dev_password_123',
    poolMin: parseInt(process.env.DB_POOL_MIN || '2', 10),
    poolMax: parseInt(process.env.DB_POOL_MAX || '10', 10),
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  queue: {
    concurrency: parseInt(process.env.QUEUE_CONCURRENCY || '5', 10),
    maxJobs: parseInt(process.env.QUEUE_MAX_JOBS || '1000', 10),
    rateLimitMax: parseInt(process.env.QUEUE_RATE_LIMIT_MAX || '100', 10),
    rateLimitDuration: parseInt(process.env.QUEUE_RATE_LIMIT_DURATION || '60000', 10),
  },

  upload: {
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
    uploadDir: process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads'),
    allowedTypes: (process.env.ALLOWED_FILE_TYPES || 'csv,pdf,png,jpg,jpeg').split(','),
  },

  worker: {
    threads: parseInt(process.env.WORKER_THREADS || '4', 10),
    jobTimeout: parseInt(process.env.JOB_TIMEOUT || '300000', 10), // 5 minutes
    maxRetryAttempts: parseInt(process.env.MAX_RETRY_ATTEMPTS || '3', 10),
  },

  logging: {
    level: process.env.LOG_LEVEL || 'debug',
  },
};