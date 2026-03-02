import axios from 'axios';
import mongoose from 'mongoose';
import { Recipe, IRecipe } from '../models/Recipe';
import { SavedRecipe } from '../models/SavedRecipe';
import { AppError } from '../utils/app.error';

const USER_SERVICE_URL      = process.env.USER_SERVICE_URL      || 'http://user-service:3001';
const NUTRITION_SERVICE_URL = process.env.NUTRITION_SERVICE_URL || 'http://nutrition-service:3002';

// ── List / Search ──────────────────────────────────────────

export interface ListQuery {
  page?:        number;
  limit?:       number;
  search?:      string;
  tags?:        string;
  minCalories?: number;
  maxCalories?: number;
  maxPrepTime?: number;
}

export async function listRecipes(query: ListQuery) {
  const page  = query.page  ?? 1;
  const limit = query.limit ?? 20;
  const skip  = (page - 1) * limit;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  if (query.search) {
    filter.$text = { $search: query.search };
  }

  if (query.tags) {
    const tagList = query.tags.split(',').map((t) => t.trim()).filter(Boolean);
    if (tagList.length > 0) {
      filter.dietaryTags = { $all: tagList };
    }
  }

  if (query.minCalories !== undefined || query.maxCalories !== undefined) {
    filter.calories = {};
    if (query.minCalories !== undefined) filter.calories.$gte = query.minCalories;
    if (query.maxCalories !== undefined) filter.calories.$lte = query.maxCalories;
  }

  if (query.maxPrepTime !== undefined) {
    filter.prepTime = { $lte: query.maxPrepTime };
  }

  const [recipes, total] = await Promise.all([
    Recipe.find(filter).skip(skip).limit(limit).lean(),
    Recipe.countDocuments(filter),
  ]);

  return {
    recipes,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  };
}

// ── Single recipe ──────────────────────────────────────────

export async function getRecipeById(id: string): Promise<IRecipe> {
  if (!mongoose.isValidObjectId(id)) {
    throw new AppError('Invalid recipe ID', 'VALIDATION_ERROR', 400);
  }

  const recipe = await Recipe.findById(id).lean();
  if (!recipe) throw new AppError('Recipe not found', 'NOT_FOUND', 404);

  return recipe as unknown as IRecipe;
}

// ── Recommendations ────────────────────────────────────────

export async function getRecommendations(userId: string) {
  let profile: {
    dietaryPreference?: string;
    allergies?: string[];
    goal?: string;
  } | null = null;

  try {
    const { data } = await axios.get(`${USER_SERVICE_URL}/internal/profile/${userId}`);
    profile = data?.data ?? null;
  } catch {
    // fail open — return random recipes
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {};

  if (profile?.dietaryPreference && profile.dietaryPreference !== 'omnivore') {
    filter.dietaryTags = profile.dietaryPreference;
  }

  if (profile?.goal === 'gain_muscle') {
    // prefer high-protein recipes (>20g protein)
    filter.protein = { $gte: 20 };
  }

  const count = await Recipe.countDocuments(filter);
  const skip  = count > 10 ? Math.floor(Math.random() * (count - 10)) : 0;

  const recipes = await Recipe.find(filter).skip(skip).limit(10).lean();

  return { recipes };
}

// ── Save / Saved / Unsave ──────────────────────────────────

export async function saveRecipe(userId: string, recipeId: string) {
  if (!mongoose.isValidObjectId(recipeId)) {
    throw new AppError('Invalid recipe ID', 'VALIDATION_ERROR', 400);
  }

  const recipe = await Recipe.findById(recipeId);
  if (!recipe) throw new AppError('Recipe not found', 'NOT_FOUND', 404);

  try {
    await SavedRecipe.create({ userId, recipeId: new mongoose.Types.ObjectId(recipeId) });
  } catch (err: unknown) {
    // Duplicate key → already saved
    if ((err as { code?: number }).code === 11000) {
      throw new AppError('Recipe already saved', 'CONFLICT', 409);
    }
    throw err;
  }

  return { message: 'Recipe saved' };
}

export async function getSavedRecipes(userId: string) {
  const saved = await SavedRecipe.find({ userId })
    .populate('recipeId')
    .sort({ savedAt: -1 })
    .lean();

  return saved.map((s) => ({
    savedId: s._id,
    savedAt: s.savedAt,
    recipe:  s.recipeId,
  }));
}

export async function unsaveRecipe(userId: string, savedId: string) {
  if (!mongoose.isValidObjectId(savedId)) {
    throw new AppError('Invalid saved ID', 'VALIDATION_ERROR', 400);
  }

  const doc = await SavedRecipe.findById(savedId);
  if (!doc) throw new AppError('Saved recipe not found', 'NOT_FOUND', 404);
  if (doc.userId !== userId) throw new AppError('Forbidden', 'FORBIDDEN', 403);

  await SavedRecipe.findByIdAndDelete(savedId);
}

// ── Log recipe → Nutrition Service ─────────────────────────

export async function logRecipe(
  userId: string,
  recipeId: string,
  mealType: string,
  date: string,
  servings: number,
) {
  const recipe = await getRecipeById(recipeId);

  const ratio = servings / (recipe.servings || 1);

  const payload = {
    userId,
    foodName: recipe.title,
    calories: Math.round((recipe.calories ?? 0) * ratio * 10) / 10,
    protein:  Math.round((recipe.protein  ?? 0) * ratio * 10) / 10,
    carbs:    Math.round((recipe.carbs    ?? 0) * ratio * 10) / 10,
    fat:      Math.round((recipe.fat      ?? 0) * ratio * 10) / 10,
    fiber:    Math.round((recipe.fiber    ?? 0) * ratio * 10) / 10,
    mealType,
    date,
    source: 'recipe',
  };

  try {
    await axios.post(`${NUTRITION_SERVICE_URL}/internal/log`, payload);
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err) && err.response?.data?.message
        ? (err.response.data as { message: string }).message
        : 'Failed to add to nutrition log';
    throw new AppError(message, 'NUTRITION_SERVICE_ERROR', 502);
  }

  return { message: 'Added to nutrition log' };
}
