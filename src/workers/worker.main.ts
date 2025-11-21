import { WorkerManager } from './worker.manager';
import { logger } from '../utils/logger';
import { db } from '../db/client';

async function main() {
  try {
    logger.info('=== File Processor Worker Service ===');
    logger.info('Initializing worker service...');

    // Check database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    logger.info('Database connection established');

    // Start worker manager
    const workerManager = new WorkerManager();
    await workerManager.start();

    logger.info('Worker service is ready and listening for jobs');

    // Log worker metrics every 30 seconds
    setInterval(async () => {
      const metrics = await workerManager.getWorkerMetrics();
      logger.info('Worker metrics', { metrics });
    }, 30000);

  } catch (error) {
    logger.error('Failed to start worker service', { error });
    process.exit(1);
  }
}

// Start the worker service
main();