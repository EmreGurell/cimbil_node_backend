import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as recipeService from '../services/recipe.service';
import { successResponse, createdResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

const logRecipeSchema = z.object({
  mealType: z.enum(MEAL_TYPES),
  date:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'),
  servings: z.number().positive().default(1),
});

// ── Controllers ────────────────────────────────────────────

export async function listRecipes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await recipeService.listRecipes({
      page:        Number(req.query.page)        || 1,
      limit:       Number(req.query.limit)       || 20,
      search:      req.query.search as string    | undefined,
      tags:        req.query.tags   as string    | undefined,
      minCalories: req.query.minCalories ? Number(req.query.minCalories) : undefined,
      maxCalories: req.query.maxCalories ? Number(req.query.maxCalories) : undefined,
      maxPrepTime: req.query.maxPrepTime ? Number(req.query.maxPrepTime) : undefined,
    });
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getRecipe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const recipe = await recipeService.getRecipeById(req.params.id);
    successResponse(res, recipe);
  } catch (err) {
    next(err);
  }
}

export async function getRecommendations(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await recipeService.getRecommendations(req.userId!);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

export async function saveRecipe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await recipeService.saveRecipe(req.userId!, req.params.id);
    createdResponse(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getSavedRecipes(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await recipeService.getSavedRecipes(req.userId!);
    successResponse(res, result);
  } catch (err) {
    next(err);
  }
}

export async function unsaveRecipe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await recipeService.unsaveRecipe(req.userId!, req.params.id);
    successResponse(res, { message: 'Removed from saved recipes' });
  } catch (err) {
    next(err);
  }
}

export async function logRecipe(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parsed = logRecipeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(parsed.error.errors[0].message, 'VALIDATION_ERROR', 400);
    }

    const { mealType, date, servings } = parsed.data;
    const result = await recipeService.logRecipe(
      req.userId!,
      req.params.id,
      mealType,
      date,
      servings,
    );
    createdResponse(res, result);
  } catch (err) {
    next(err);
  }
}
