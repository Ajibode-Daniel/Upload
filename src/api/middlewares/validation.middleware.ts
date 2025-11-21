import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { ValidationError } from '../../utils/error';

export function validateRequest(schema: z.ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.errors.map((err) => `${err.path.join('.')}: ${err.message}`);
        next(new ValidationError(messages.join(', ')));
      } else {
        next(error);
      }
    }
  };
}

// Validation schemas
export const taskIdSchema = z.object({
  params: z.object({
    taskId: z.string().uuid('Invalid task ID format'),
  }),
});