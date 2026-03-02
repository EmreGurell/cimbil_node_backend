import axios from 'axios';
import prisma from '../utils/db';
import { AppError } from '../utils/app.error';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://user-service:3001';
const AI_SERVICE_URL   = process.env.AI_SERVICE_URL   || 'http://ai-service:3005';

// ── Helpers ────────────────────────────────────────────────

/** Normalize a date to midnight UTC and return as Date */
function toUtcDay(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

/** Fetch the user's daily calorie goal from User Service */
async function fetchDailyCalorieGoal(userId: string): Promise<number | null> {
  try {
    const { data } = await axios.get(`${USER_SERVICE_URL}/internal/profile/${userId}`);
    return (data?.data?.dailyCalorieGoal as number) ?? null;
  } catch {
    return null;
  }
}

/** Fire-and-forget streak check */
function triggerStreakCheck(userId: string): void {
  axios
    .post(
      `${USER_SERVICE_URL}/api/v1/users/streak/check`,
      {},
      { headers: { 'x-user-id': userId } },
    )
    .catch(() => {/* ignore */});
}

// ── Service functions ──────────────────────────────────────

export async function getByDate(userId: string, dateStr: string) {
  const dayStart = toUtcDay(dateStr);
  const dayEnd   = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const entries = await prisma.nutritionLog.findMany({
    where: {
      userId,
      date: { gte: dayStart, lt: dayEnd },
    },
    orderBy: { loggedAt: 'asc' },
  });

  const dailyGoal = await fetchDailyCalorieGoal(userId);

  const totals = entries.reduce(
    (acc: { calories: number; protein: number; carbs: number; fat: number; fiber: number }, e) => ({
      calories: acc.calories + e.calories,
      protein:  acc.protein  + e.protein,
      carbs:    acc.carbs    + e.carbs,
      fat:      acc.fat      + e.fat,
      fiber:    acc.fiber    + e.fiber,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 },
  );

  // Round totals to 1 decimal
  for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
    totals[key] = Math.round(totals[key] * 10) / 10;
  }

  return { date: dateStr, dailyGoal, totals, entries };
}

export async function createLog(
  userId: string,
  body: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    mealType: string;
    date: string;
    source: string;
    details?: Record<string, unknown>[];
  },
) {
  const entry = await prisma.nutritionLog.create({
    data: {
      userId,
      foodName: body.foodName,
      calories: body.calories,
      protein:  body.protein,
      carbs:    body.carbs,
      fat:      body.fat,
      fiber:    body.fiber ?? 0,
      mealType: body.mealType,
      source:   body.source,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details:  body.details as any ?? undefined,
      date:     toUtcDay(body.date),
    },
  });

  triggerStreakCheck(userId);

  return entry;
}

export async function deleteLog(userId: string, id: string) {
  const log = await prisma.nutritionLog.findUnique({ where: { id } });

  if (!log) {
    throw new AppError('Log not found', 'NOT_FOUND', 404);
  }
  if (log.userId !== userId) {
    throw new AppError('Forbidden', 'FORBIDDEN', 403);
  }

  await prisma.nutritionLog.delete({ where: { id } });
}

export async function getHistory(
  userId: string,
  startDate: string,
  endDate: string,
) {
  const start = toUtcDay(startDate);
  const end   = new Date(toUtcDay(endDate).getTime() + 24 * 60 * 60 * 1000);

  const logs = await prisma.nutritionLog.findMany({
    where: {
      userId,
      date: { gte: start, lt: end },
    },
    orderBy: { date: 'asc' },
  });

  // Group by day
  const map = new Map<string, {
    date: string;
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
  }>();

  for (const log of logs) {
    const key = log.date.toISOString().slice(0, 10);
    if (!map.has(key)) {
      map.set(key, {
        date: key,
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
      });
    }
    const day = map.get(key)!;
    day.totalCalories += log.calories;
    day.totalProtein  += log.protein;
    day.totalCarbs    += log.carbs;
    day.totalFat      += log.fat;
    day.totalFiber    += log.fiber;
  }

  return Array.from(map.values()).map((d) => ({
    date:          d.date,
    totalCalories: Math.round(d.totalCalories * 10) / 10,
    totalProtein:  Math.round(d.totalProtein  * 10) / 10,
    totalCarbs:    Math.round(d.totalCarbs    * 10) / 10,
    totalFat:      Math.round(d.totalFat      * 10) / 10,
    totalFiber:    Math.round(d.totalFiber    * 10) / 10,
  }));
}

/** Internal: called by Recipe Service to add a log entry */
export async function createInternalLog(
  userId: string,
  body: {
    foodName: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    mealType: string;
    date: string;
    source: string;
    details?: Record<string, unknown>[];
  },
) {
  const entry = await prisma.nutritionLog.create({
    data: {
      userId,
      foodName: body.foodName,
      calories: body.calories,
      protein:  body.protein,
      carbs:    body.carbs,
      fat:      body.fat,
      fiber:    body.fiber ?? 0,
      mealType: body.mealType,
      source:   body.source,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      details:  body.details as any ?? undefined,
      date:     toUtcDay(body.date),
    },
  });

  triggerStreakCheck(userId);

  return entry;
}
