import { createServer } from './api/server';
import { config } from './config';
import { logger } from './utils/logger';
import { db } from './db/client';
import { queueService } from './services/queue.service';
import { ensureDirectoryExists } from './utils/helpers';

async function bootstrap() {
  try {
    logger.info('=== File Processor API Service ===');
    logger.info('Starting application...');

    // Ensure upload directory exists
    await ensureDirectoryExists(config.upload.uploadDir);
    logger.info('Upload directory ready', { path: config.upload.uploadDir });

    // Check database connection
    const dbHealthy = await db.healthCheck();
    if (!dbHealthy) {
      throw new Error('Database connection failed');
    }
    logger.info('Database connection established');

    // Initialize queue service
    await queueService.waitUntilReady();
    logger.info('Queue service initialized');

    // Create and start server
    const app = createServer();
    const server = app.listen(config.port, () => {
      logger.info(`API server listening on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`API Base URL: http://localhost:${config.port}`);
      logger.info('=================================');
      logger.info('Available endpoints:');
      logger.info(`  POST   /api/upload          - Upload a file`);
      logger.info(`  GET    /api/upload/info     - Get upload info`);
      logger.info(`  GET    /api/tasks/:id/status - Get task status`);
      logger.info(`  GET    /api/tasks/:id/result - Get task result`);
      logger.info(`  POST   /api/tasks/:id/retry  - Retry failed task`);
      logger.info(`  GET    /api/tasks/health    - Health check`);
      logger.info(`  GET    /api/tasks/metrics   - Queue metrics`);
      logger.info('=================================');
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, starting graceful shutdown...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        try {
          await queueService.close();
          await db.close();
          logger.info('All connections closed gracefully');
          process.exit(0);
        } catch (error) {
          logger.error('Error during shutdown', { error });
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    logger.error('Failed to start application', { error });
    process.exit(1);
  }
}

// Start the application
bootstrap();