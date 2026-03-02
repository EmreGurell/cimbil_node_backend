import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const SUBSCRIPTION_URL =
  process.env.SUBSCRIPTION_SERVICE_URL ?? 'http://localhost:3006';

async function getUserRole(userId: string): Promise<string> {
  const { data } = await axios.get<{ data: { role: string } }>(
    `${SUBSCRIPTION_URL}/api/v1/subscriptions/check`,
    { params: { userId, feature: 'ai_chat' } },
  );
  return data.data.role;
}

export async function adminMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const userId = req.headers['x-user-id'] as string | undefined;

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'User not authenticated',
      code: 'UNAUTHORIZED',
    });
    return;
  }

  try {
    const role = await getUserRole(userId);

    if (role !== 'admin') {
      res.status(403).json({
        success: false,
        message: 'Admin access required',
        code: 'FORBIDDEN',
      });
      return;
    }

    next();
  } catch (err) {
    // Admin route'ları için fail-closed: servis erişilemezse geçirme
    console.error('[Gateway] Admin role check failed:', err);
    res.status(503).json({
      success: false,
      message: 'Service unavailable',
      code: 'SERVICE_UNAVAILABLE',
    });
  }
}
