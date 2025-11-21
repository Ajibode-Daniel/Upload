import { FileType } from "./task.types"
export interface JobData {
  taskId: string;
  filePath: string;
  fileType: FileType;
  fileName: string;
}

export interface JobProgress {
  percentage: number;
  message: string;
}

export enum QueueName {
  CSV_QUEUE = 'csv-processing',
  PDF_QUEUE = 'pdf-processing',
  IMAGE_QUEUE = 'image-processing'
}

export interface QueueConfig {
  name: QueueName;
  concurrency: number;
  rateLimitMax: number;
  rateLimitDuration: number;
}

export interface JobOptions {
  attempts: number;
  backoff: {
    type: 'exponential';
    delay: number;
  };
  removeOnComplete: boolean;
  removeOnFail: boolean;
  timeout: number;
}