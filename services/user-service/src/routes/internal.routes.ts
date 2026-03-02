import { Router, Request, Response } from 'express';
import { z } from 'zod';

import * as InternalService from '../services/internal.service';
import { successResponse, errorResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

const router = Router();

const patchSchema = z.object({
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
});

// GET /internal/profile/:userId
router.get('/profile/:userId', async (req: Request, res: Response) => {
  try {
    const data = await InternalService.getInternalProfile(req.params.userId);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

// PATCH /internal/profile/:userId
router.patch('/profile/:userId', async (req: Request, res: Response) => {
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await InternalService.updateActivityLevel(
      req.params.userId,
      parsed.data.activityLevel,
    );
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
});

export default router;
