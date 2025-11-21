import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { validateRequest, taskIdSchema } from '../middlewares/validation.middleware';

const router = Router();

router.get('/health', taskController.healthCheck);
router.get('/metrics', taskController.getQueueMetrics);
router.get('/', taskController.getAllTasks);
router.get('/:taskId/status', validateRequest(taskIdSchema), taskController.getTaskStatus);
router.get('/:taskId/result', validateRequest(taskIdSchema), taskController.getTaskResult);
router.post('/:taskId/retry', validateRequest(taskIdSchema), taskController.retryTask);

export default router;