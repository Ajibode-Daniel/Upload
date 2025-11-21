import express, { Application } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import uploadRoutes from './routes/upload.routes';
import taskRoutes from './routes/task.routes';

export function createServer(): Application {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req, res, next) => {
    logger.debug('Incoming request', {
      method: req.method,
      path: req.path,
      ip: req.ip,
    });
    next();
  });

  // Routes
  app.use('/api/upload', uploadRoutes);
  app.use('/api/tasks', taskRoutes);

  // Root route
  app.get('/', (req, res) => {
    res.json({
      success: true,
      message: 'File Processor API',
      version: '1.0.0',
      endpoints: {
        upload: '/api/upload',
        tasks: '/api/tasks',
        health: '/api/tasks/health',
        metrics: '/api/tasks/metrics',
      },
    });
  });

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}