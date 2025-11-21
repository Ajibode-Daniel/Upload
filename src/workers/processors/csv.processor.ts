import { Worker } from 'worker_threads';
import path from 'path';
import { Job } from 'bullmq';
import { JobData } from '../../types/queue.types';
import { CSVProcessingResult } from '../../types/file.types';
import { logger } from '../../utils/logger';
import { taskService } from '../../services/task.service';

export async function processCSVFile(job: Job<JobData>): Promise<CSVProcessingResult> {
  const { taskId, filePath, fileName } = job.data;

  logger.info('Starting CSV processing', { taskId, fileName });

  await taskService.markTaskAsProcessing(taskId);

  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, '../threads/csv.worker.js');
    const worker = new Worker(workerPath, {
      workerData: { filePath }
    });

    worker.on('message', async (message) => {
      if (message.type === 'progress') {
        const progress = 50; // Simplified progress
        await job.updateProgress(progress);
        await taskService.updateTaskProgress(taskId, progress);
        logger.debug('CSV processing progress', { taskId, progress });
      } else if (message.type === 'complete') {
        logger.info('CSV processing completed', { taskId });
        resolve(message.data);
      } else if (message.type === 'error') {
        logger.error('CSV processing error', { taskId, error: message.data });
        reject(new Error(message.data.message));
      }
    });

    worker.on('error', (error) => {
      logger.error('CSV worker error', { taskId, error: error.message });
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.error('CSV worker exited with error', { taskId, code });
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}
