import { Request, Response, NextFunction } from 'express';

export function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Unauthorized',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  req.userId = userId;
  next();
}
