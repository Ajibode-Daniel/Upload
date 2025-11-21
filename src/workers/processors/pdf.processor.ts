import { Worker } from 'worker_threads';
import path from 'path';
import { Job } from 'bullmq';
import { JobData } from '../../types/queue.types';
import { PDFProcessingResult } from '../../types/file.types';
import { logger } from '../../utils/logger';
import { taskService } from '../../services/task.service';

export async function processPDFFile(job: Job<JobData>): Promise<PDFProcessingResult> {
  const { taskId, filePath, fileName } = job.data;

  logger.info('Starting PDF processing', { taskId, fileName });

  await taskService.markTaskAsProcessing(taskId);

  return new Promise((resolve, reject) => {
    const workerPath = path.join(__dirname, '../threads/pdf.worker.js');
    const worker = new Worker(workerPath, {
      workerData: { filePath }
    });

    let currentProgress = 0;

    worker.on('message', async (message) => {
      if (message.type === 'progress') {
        currentProgress += 25;
        const progress = Math.min(currentProgress, 90);
        await job.updateProgress(progress);
        await taskService.updateTaskProgress(taskId, progress);
        logger.debug('PDF processing progress', { taskId, progress, message: message.data.message });
      } else if (message.type === 'complete') {
        logger.info('PDF processing completed', { taskId });
        resolve(message.data);
      } else if (message.type === 'error') {
        logger.error('PDF processing error', { taskId, error: message.data });
        reject(new Error(message.data.message));
      }
    });

    worker.on('error', (error) => {
      logger.error('PDF worker error', { taskId, error: error.message });
      reject(error);
    });

    worker.on('exit', (code) => {
      if (code !== 0) {
        logger.error('PDF worker exited with error', { taskId, code });
        reject(new Error(`Worker stopped with exit code ${code}`));
      }
    });
  });
}