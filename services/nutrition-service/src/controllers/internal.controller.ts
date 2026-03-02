import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { createInternalLog } from '../services/nutrition.service';
import { createdResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;
const SOURCES    = ['manual', 'barcode', 'photo', 'recipe']  as const;

const internalLogSchema = z.object({
  userId:   z.string().uuid(),
  foodName: z.string().min(1),
  calories: z.number().nonnegative(),
  protein:  z.number().nonnegative(),
  carbs:    z.number().nonnegative(),
  fat:      z.number().nonnegative(),
  fiber:    z.number().nonnegative().optional(),
  mealType: z.enum(MEAL_TYPES),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  source:   z.enum(SOURCES).optional().default('recipe'),
});

export async function createLog(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = internalLogSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const { userId, ...rest } = parsed.data;
    const entry = await createInternalLog(userId, rest);
    createdResponse(res, entry);
  } catch (err) {
    next(err);
  }
}
