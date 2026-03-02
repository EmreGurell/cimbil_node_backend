import prisma from '../utils/db';
import { AppError } from '../utils/app.error';

// ── Mifflin-St Jeor ─────────────────────────────────────────
export const ACTIVITY_MULTIPLIERS: Record<string, number> = {
  sedentary:   1.2,
  light:       1.375,
  moderate:    1.55,
  active:      1.725,
  very_active: 1.9,
};

export function calcCalorieGoal(
  weight: number,
  height: number,
  age: number,
  gender: string,
  activityLevel: string,
): number {
  const bmr =
    gender === 'male'
      ? 10 * weight + 6.25 * height - 5 * age + 5
      : 10 * weight + 6.25 * height - 5 * age - 161;

  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
  return Math.round(bmr * multiplier);
}

// ── Profil alanları tipi ────────────────────────────────────
interface ProfileInput {
  username?:          string;
  age?:               number;
  height?:            number;
  weight?:            number;
  targetWeight?:      number;
  gender?:            string;
  goal?:              string;
  activityLevel?:     string;
  dietaryPreference?: string;
  allergies?:         string[];
  healthConditions?:  string[];
}

// ── GET /me ─────────────────────────────────────────────────
export async function getMe(userId: string) {
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    include: { profile: true, streakData: true },
  });

  if (!user) throw new AppError('User not found', 'USER_NOT_FOUND', 404);

  const { password: _, ...safeUser } = user;
  return safeUser;
}

// ── POST /profile  (upsert) ──────────────────────────────────
export async function upsertProfile(userId: string, input: ProfileInput) {
  // Username benzersizlik kontrolü
  if (input.username) {
    const taken = await prisma.user.findFirst({
      where: { username: input.username, NOT: { id: userId } },
    });
    if (taken) throw new AppError('Username already taken', 'USERNAME_EXISTS', 409);

    await prisma.user.update({
      where: { id: userId },
      data:  { username: input.username },
    });
  }

  // Mevcut profili çek (upsert için gereken değerleri birleştir)
  const existing = await prisma.profile.findUnique({ where: { userId } });

  const weight        = input.weight        ?? existing?.weight        ?? null;
  const height        = input.height        ?? existing?.height        ?? null;
  const age           = input.age           ?? existing?.age           ?? null;
  const gender        = input.gender        ?? existing?.gender        ?? null;
  const activityLevel = input.activityLevel ?? existing?.activityLevel ?? null;

  // Kalori & su hedefi hesapla (tüm değerler mevcutsa)
  let dailyCalorieGoal: number | undefined;
  let dailyWaterGoal:   number | undefined;

  if (weight && height && age && gender && activityLevel) {
    dailyCalorieGoal = calcCalorieGoal(weight, height, age, gender, activityLevel);
  }
  if (weight) {
    dailyWaterGoal = Math.round(weight * 35);
  }

  const profile = await prisma.profile.upsert({
    where:  { userId },
    create: {
      userId,
      age:               input.age,
      height:            input.height,
      weight:            input.weight,
      targetWeight:      input.targetWeight,
      gender:            input.gender,
      goal:              input.goal,
      activityLevel:     input.activityLevel,
      dietaryPreference: input.dietaryPreference,
      allergies:         input.allergies   ?? [],
      healthConditions:  input.healthConditions ?? [],
      dailyCalorieGoal,
      dailyWaterGoal,
    },
    update: {
      ...(input.age               !== undefined && { age:               input.age }),
      ...(input.height            !== undefined && { height:            input.height }),
      ...(input.weight            !== undefined && { weight:            input.weight }),
      ...(input.targetWeight      !== undefined && { targetWeight:      input.targetWeight }),
      ...(input.gender            !== undefined && { gender:            input.gender }),
      ...(input.goal              !== undefined && { goal:              input.goal }),
      ...(input.activityLevel     !== undefined && { activityLevel:     input.activityLevel }),
      ...(input.dietaryPreference !== undefined && { dietaryPreference: input.dietaryPreference }),
      ...(input.allergies         !== undefined && { allergies:         input.allergies }),
      ...(input.healthConditions  !== undefined && { healthConditions:  input.healthConditions }),
      ...(dailyCalorieGoal        !== undefined && { dailyCalorieGoal }),
      ...(dailyWaterGoal          !== undefined && { dailyWaterGoal }),
    },
  });

  // StreakData yoksa başlat
  await prisma.streakData.upsert({
    where:  { userId },
    create: { userId },
    update: {},
  });

  return profile;
}

// ── GET /profile ────────────────────────────────────────────
export async function getProfile(userId: string) {
  const profile = await prisma.profile.findUnique({ where: { userId } });
  if (!profile) throw new AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
  return profile;
}
