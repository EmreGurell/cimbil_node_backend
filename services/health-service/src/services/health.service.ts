import axios from 'axios';
import { prisma } from '../utils/db';
import { AppError } from '../utils/app.error';

const USER_SERVICE_URL = (process.env.USER_SERVICE_URL || 'http://user-service:3001').replace(/\/$/, '');

// ── Sync ────────────────────────────────────────────────────
export async function syncHealth(
  userId: string,
  source: string,
  data: {
    steps?: number;
    heartRate?: number;
    sleepHours?: number;
    caloriesBurned?: number;
    date: string;
  },
) {
  const date = new Date(data.date);
  if (isNaN(date.getTime())) {
    throw new AppError('Invalid date format', 'INVALID_DATE', 400);
  }

  const healthData = await prisma.healthData.upsert({
    where: { userId_date_source: { userId, date, source } },
    update: {
      steps:         data.steps,
      heartRate:     data.heartRate,
      sleepHours:    data.sleepHours,
      caloriesBurned: data.caloriesBurned,
      syncedAt:      new Date(),
    },
    create: {
      userId,
      date,
      source,
      steps:         data.steps,
      heartRate:     data.heartRate,
      sleepHours:    data.sleepHours,
      caloriesBurned: data.caloriesBurned,
    },
  });

  // steps → activityLevel güncelle
  if (data.steps !== undefined) {
    let activityLevel: string;
    if (data.steps > 10000)     activityLevel = 'active';
    else if (data.steps > 7500) activityLevel = 'moderate';
    else if (data.steps < 3000) activityLevel = 'sedentary';
    else                        activityLevel = 'light';

    axios
      .patch(`${USER_SERVICE_URL}/internal/profile/${userId}`, { activityLevel })
      .catch((err) => {
        console.error('[syncHealth] User Service update failed:', err.message);
      });
  }

  return healthData;
}

// ── Today ────────────────────────────────────────────────────
export async function getToday(userId: string) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const records = await prisma.healthData.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { syncedAt: 'desc' },
  });

  if (records.length === 0) return null;

  // Her kaynak için en son sync'i al; alanları birleştir
  const merged: Record<string, number | null> = {
    steps: null, heartRate: null, sleepHours: null, caloriesBurned: null,
  };

  for (const r of records) {
    if (merged.steps          === null && r.steps          !== null) merged.steps          = r.steps;
    if (merged.heartRate      === null && r.heartRate      !== null) merged.heartRate      = r.heartRate;
    if (merged.sleepHours     === null && r.sleepHours     !== null) merged.sleepHours     = r.sleepHours;
    if (merged.caloriesBurned === null && r.caloriesBurned !== null) merged.caloriesBurned = r.caloriesBurned;
  }

  return { date: start.toISOString().split('T')[0], ...merged, sources: records.map((r) => r.source) };
}

// ── History ──────────────────────────────────────────────────
export async function getHistory(userId: string, days: number) {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);

  const records = await prisma.healthData.findMany({
    where: { userId, date: { gte: start, lte: end } },
    orderBy: { date: 'asc' },
  });

  // Gün bazında grupla ve en yüksek değerleri al
  const dayMap = new Map<string, { steps: number; heartRate: number; sleepHours: number; caloriesBurned: number }>();

  for (const r of records) {
    const key = r.date.toISOString().split('T')[0];
    const existing = dayMap.get(key) ?? { steps: 0, heartRate: 0, sleepHours: 0, caloriesBurned: 0 };

    dayMap.set(key, {
      steps:         Math.max(existing.steps,         r.steps         ?? 0),
      heartRate:     Math.max(existing.heartRate,     r.heartRate     ?? 0),
      sleepHours:    Math.max(existing.sleepHours,    r.sleepHours    ?? 0),
      caloriesBurned: Math.max(existing.caloriesBurned, r.caloriesBurned ?? 0),
    });
  }

  return Array.from(dayMap.entries()).map(([date, data]) => ({ date, ...data }));
}

// ── Manual ───────────────────────────────────────────────────
export async function logManual(
  userId: string,
  data: {
    steps?: number;
    heartRate?: number;
    sleepHours?: number;
    caloriesBurned?: number;
    date: string;
  },
) {
  return syncHealth(userId, 'manual', data);
}
