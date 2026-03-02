import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as nutritionService from '../services/nutrition.service';
import { successResponse, createdResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

// ── Zod schemas ────────────────────────────────────────────

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const SOURCES    = ['manual', 'barcode', 'photo', 'recipe']  as const;

const createLogSchema = z.object({
  foodName: z.string().min(1),
  calories: z.number().nonnegative(),
  protein:  z.number().nonnegative(),
  carbs:    z.number().nonnegative(),
  fat:      z.number().nonnegative(),
  fiber:    z.number().nonnegative().optional(),
  mealType: z.enum(MEAL_TYPES),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  source:   z.enum(SOURCES).optional().default('manual'),
  details:  z.array(z.record(z.unknown())).optional(),
});

// ── Controllers ────────────────────────────────────────────

export async function getByDate(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { date } = req.query;

    if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new AppError('date query param required (YYYY-MM-DD)', 'VALIDATION_ERROR', 400);
    }

    const result = await nutritionService.getByDate(req.userId!, date);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

export async function createLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = createLogSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const entry = await nutritionService.createLog(req.userId!, parsed.data);
    createdResponse(res, entry);
  } catch (err) {
    next(err);
  }
}

export async function deleteLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await nutritionService.deleteLog(req.userId!, req.params.id);
    successResponse(res, { message: 'Log deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getHistory(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { startDate, endDate } = req.query;

    if (
      !startDate || typeof startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
      !endDate   || typeof endDate   !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
    ) {
      throw new AppError(
        'startDate and endDate query params required (YYYY-MM-DD)',
        'VALIDATION_ERROR',
        400,
      );
    }

    const result = await nutritionService.getHistory(req.userId!, startDate, endDate);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}
