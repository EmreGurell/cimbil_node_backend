import { Request, Response, NextFunction } from 'express';
import { AppError } from './app.error';

export function globalErrorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.status).json({ success: false, message: err.message, code: err.code });
    return;
  }

  console.error('[NutritionService] Unhandled error:', err);
  res.status(500).json({ success: false, message: 'Internal server error', code: 'INTERNAL_ERROR' });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ success: false, message: `Route not found: ${req.path}`, code: 'NOT_FOUND' });
}
