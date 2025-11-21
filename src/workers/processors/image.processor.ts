import { Worker } from 'worker_threads';
import path from 'path';
import { Job } from 'bullmq';
import { JobData } from '../../types/queue.types';
import { ImageProcessingResult } from '../../types/file.types';
import { logger } from '../../utils/logger';
import { taskService } from '../../services/task.service';

export async function processImageFile(job: Job<JobData>): Promise<ImageProcessingResult> {
  const { taskId, filePath, fileName } = job.data;

  logger.info('Starting image processing', { taskId, fileName });

  await taskService.markTaskAsProcessing(taskId);

  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, '../threads/image.worker.js');
    const worker = new Worker(workerPath, {
      workerData: { filePath }
    });

    let currentProgress = 0;

    worker.on('message', async (message) => {
      if (message.type === 'progress') {
        currentProgress += 30;
        const progress = Math.min(currentProgress, 90);
        await job.updateProgress(progress);
        await taskService.updateTaskProgress(taskId, progress);
        logger.debug('Image processing progress', { taskId, progress, message: message.data.message });
      } else if (message.type === 'complete') {
        logger.info('Image processing completed', { taskId });
        resolve(message.data);
      } else if (message.type === 'error') {
        logger.error('Image processing error', { taskId, error: message.data });
        reject(new Error(message.data.message));
      }
    });

    worker.on('error', (error) => {
      logger.error('Image worker error', { taskId, error: error.message });
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.error('Image worker exited with error', { taskId, code });
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}