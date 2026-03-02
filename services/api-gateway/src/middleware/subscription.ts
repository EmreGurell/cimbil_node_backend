import { Request, Response, NextFunction } from 'express';
import axios from 'axios';

const SUBSCRIPTION_URL =
  process.env.SUBSCRIPTION_SERVICE_URL ?? 'http://localhost:3006';

interface CheckResult {
  allowed: boolean;
  role: string;
  used: number;
  limit: number;
  remaining: number;
}

async function checkFeatureLimit(
  userId: string,
  feature: string,
): Promise<CheckResult> {
  const { data } = await axios.get<{ data: CheckResult }>(
    `${SUBSCRIPTION_URL}/api/v1/subscriptions/check`,
    { params: { userId, feature } },
  );
  return data.data;
}

function incrementFeatureUsage(userId: string, feature: string): void {
  axios
    .post(`${SUBSCRIPTION_URL}/api/v1/subscriptions/increment`, {
      userId,
      feature,
    })
    .catch((err: Error) =>
      console.error('[Gateway] Increment failed:', err.message),
    );
}

export function subscriptionMiddleware(feature: string) {
  return async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
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
      const result = await checkFeatureLimit(userId, feature);

      if (!result.allowed) {
        res.status(403).json({
          success: false,
          code: 'LIMIT_REACHED',
          message: 'Daily limit reached',
          upgrade: true,
          used: result.used,
          limit: result.limit,
        });
        return;
      }

      // Proxy başarıyla tamamlandığında usage'ı artır
      res.on('finish', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          incrementFeatureUsage(userId, feature);
        }
      });

      next();
    } catch (err) {
      // Subscription service erişilemiyorsa isteği geçir (fail-open)
      console.error('[Gateway] Subscription check failed:', err);
      next();
    }
  };
}
