import { Request, Response } from 'express';

import * as StreakService from '../services/streak.service';
import { successResponse, errorResponse } from '../utils/response.helper';

export async function checkStreak(req: Request, res: Response): Promise<void> {
  try {
    const data = await StreakService.checkStreak(req.userId!);
    successResponse(res, data);
  } catch {
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}
