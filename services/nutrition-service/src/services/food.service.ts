import axios from 'axios';
import { BarcodeCache } from '../models/BarcodeCache';
import { AppError } from '../utils/app.error';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://ai-service:3005';

// ── Barcode ────────────────────────────────────────────────

interface FoodProduct {
  name:        string;
  brand?:      string;
  calories:    number;
  protein:     number;
  carbs:       number;
  fat:         number;
  fiber:       number;
  servingSize: string;
}

/** Parse Open Food Facts API response into our shape */
function parseOpenFoodFacts(product: Record<string, unknown>): FoodProduct | null {
  const n = product.nutriments as Record<string, number> | undefined;
  if (!n) return null;

  const name = (product.product_name as string) || (product.generic_name as string);
  if (!name) return null;

  // OFF stores per 100g; servingSize may differ but we'll use the value as-is
  const servingSize =
    (product.serving_size as string) ||
    (product.serving_quantity ? `${product.serving_quantity}g` : '100g');

  return {
    name,
    brand:       (product.brands as string) || undefined,
    calories:    n['energy-kcal_100g'] ?? n['energy-kcal'] ?? 0,
    protein:     n['proteins_100g']    ?? n['proteins']    ?? 0,
    carbs:       n['carbohydrates_100g'] ?? n['carbohydrates'] ?? 0,
    fat:         n['fat_100g']         ?? n['fat']         ?? 0,
    fiber:       n['fiber_100g']       ?? n['fiber']       ?? 0,
    servingSize,
  };
}

export async function lookupBarcode(barcode: string): Promise<FoodProduct> {
  // 1. Check MongoDB cache
  const cached = await BarcodeCache.findOne({ barcode });
  if (cached) {
    return {
      name:        cached.name,
      brand:       cached.brand,
      calories:    cached.calories,
      protein:     cached.protein,
      carbs:       cached.carbs,
      fat:         cached.fat,
      fiber:       cached.fiber,
      servingSize: cached.servingSize,
    };
  }

  // 2. Fetch from Open Food Facts
  let product: FoodProduct | null = null;
  try {
    const { data } = await axios.get(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
      { timeout: 8000 },
    );

    if (data?.status === 1 && data?.product) {
      product = parseOpenFoodFacts(data.product as Record<string, unknown>);
    }
  } catch {
    // Network error — fall through to 404
  }

  if (!product) {
    throw new AppError('Product not found', 'NOT_FOUND', 404);
  }

  // 3. Save to MongoDB cache (fire-and-forget errors)
  BarcodeCache.create({ barcode, ...product }).catch(() => {/* ignore */});

  return product;
}

// ── Image analysis ─────────────────────────────────────────

export interface ImageAnalysisResult {
  foodName: string;
  calories: number;
  protein:  number;
  carbs:    number;
  fat:      number;
  fiber:    number;
}

export async function analyzeImage(imageBuffer: Buffer): Promise<ImageAnalysisResult> {
  const base64 = imageBuffer.toString('base64');

  try {
    const { data } = await axios.post<{ data: ImageAnalysisResult }>(
      `${AI_SERVICE_URL}/analyze-image`,
      { image: base64 },
      { timeout: 30000 },
    );

    return data.data;
  } catch (err: unknown) {
    const message =
      axios.isAxiosError(err) && err.response?.data?.message
        ? (err.response.data as { message: string }).message
        : 'Image analysis failed';
    throw new AppError(message, 'AI_SERVICE_ERROR', 502);
  }
}
