import { Request, Response } from 'express';
import { z } from 'zod';

import * as ProfileService from '../services/profile.service';
import { successResponse, errorResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

const profileSchema = z.object({
  username:          z.string().min(3).max(30).optional(),
  age:               z.number().int().min(13).max(120).optional(),
  height:            z.number().min(50).max(300).optional(),
  weight:            z.number().min(20).max(500).optional(),
  targetWeight:      z.number().min(20).max(500).optional(),
  gender:            z.enum(['male', 'female', 'other']).optional(),
  goal:              z.enum(['lose_weight', 'gain_muscle', 'maintain', 'eat_healthy']).optional(),
  activityLevel:     z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
  dietaryPreference: z.enum(['omnivore', 'vegetarian', 'vegan', 'pescatarian']).optional(),
  allergies:         z.array(z.string()).optional(),
  healthConditions:  z.array(z.string()).optional(),
});

export async function getMe(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProfileService.getMe(req.userId!);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function upsertProfile(req: Request, res: Response): Promise<void> {
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await ProfileService.upsertProfile(req.userId!, parsed.data);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const data = await ProfileService.getProfile(req.userId!);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}
