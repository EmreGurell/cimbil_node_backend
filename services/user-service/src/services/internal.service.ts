import prisma from '../utils/db';
import { AppError } from '../utils/app.error';
import { calcCalorieGoal } from './profile.service';

// ── GET /internal/profile/:userId ──────────────────────────
// Nutrition, Recipe, Health servisleri bu endpoint'i kullanır
export async function getInternalProfile(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    select: {
      dailyCalorieGoal:  true,
      dailyWaterGoal:    true,
      dietaryPreference: true,
      allergies:         true,
      healthConditions:  true,
      goal:              true,
      activityLevel:     true,
      weight:            true,
      height:            true,
      age:               true,
      gender:            true,
    },
  });

  if (!profile) throw new AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
  return profile;
}

// ── PATCH /internal/profile/:userId ────────────────────────
// Health Service adım verisine göre activityLevel güncellemesi yapar.
// Kalori hedefi otomatik yeniden hesaplanır.
export async function updateActivityLevel(userId: string, activityLevel: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });

  if (!profile) throw new AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);

  let dailyCalorieGoal: number | undefined;

  if (
    profile.weight &&
    profile.height &&
    profile.age &&
    profile.gender
  ) {
    dailyCalorieGoal = calcCalorieGoal(
      profile.weight,
      profile.height,
      profile.age,
      profile.gender,
      activityLevel,
    );
  }

  const updated = await prisma.profile.update({
    where: { userId },
    data: {
      activityLevel,
      ...(dailyCalorieGoal !== undefined && { dailyCalorieGoal }),
    },
    select: {
      activityLevel:   true,
      dailyCalorieGoal: true,
    },
  });

  return updated;
}
