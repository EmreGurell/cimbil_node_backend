import { Request, Response } from 'express';
import { z } from 'zod';
import * as HealthService from '../services/health.service';
import { successResponse, createdResponse, errorResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

// ── Schemas ──────────────────────────────────────────────────
const sourceEnum = z.enum(['google_fit', 'apple_health', 'samsung_health']);

const syncSchema = z.object({
  source: sourceEnum,
  data: z.object({
    steps:          z.number().int().min(0).optional(),
    heartRate:      z.number().int().min(0).optional(),
    sleepHours:     z.number().min(0).optional(),
    caloriesBurned: z.number().int().min(0).optional(),
    date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
});

const manualSchema = z.object({
  steps:          z.number().int().min(0).optional(),
  heartRate:      z.number().int().min(0).optional(),
  sleepHours:     z.number().min(0).optional(),
  caloriesBurned: z.number().int().min(0).optional(),
  date:           z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

// ── Handlers ─────────────────────────────────────────────────
export async function syncHealth(req: Request, res: Response): Promise<void> {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const result = await HealthService.syncHealth(
      req.userId!,
      parsed.data.source,
      parsed.data.data,
    );
    createdResponse(res, result);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    console.error('[syncHealth]', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function getToday(req: Request, res: Response): Promise<void> {
  try {
    const result = await HealthService.getToday(req.userId!);
    successResponse(res, result);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    console.error('[getToday]', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const days = Math.min(Number(req.query.days) || 7, 90);

  try {
    const result = await HealthService.getHistory(req.userId!, days);
    successResponse(res, result);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    console.error('[getHistory]', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function logManual(req: Request, res: Response): Promise<void> {
  const parsed = manualSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const result = await HealthService.logManual(req.userId!, parsed.data);
    createdResponse(res, result);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    console.error('[logManual]', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}
