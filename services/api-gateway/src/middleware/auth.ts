import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

import { JwtPayload } from '../types/jwt';

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      message: 'Authorization token required',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET as string,
    ) as JwtPayload;

    // Downstream servislere kullanıcı kimliğini ilet
    req.headers['x-user-id'] = payload.userId;
    req.headers['x-user-email'] = payload.email;

    next();
  } catch {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      code: 'INVALID_TOKEN',
    });
  }
}
