import { Request, Response, NextFunction } from 'express';

// Gateway JWT doğrulamasından geçen istekler x-user-id header'ı taşır.
// Bu servis gateway'e güvenir; header yoksa isteği reddeder.
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
