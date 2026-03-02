"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTIVITY_MULTIPLIERS = void 0;
exports.calcCalorieGoal = calcCalorieGoal;
exports.getMe = getMe;
exports.upsertProfile = upsertProfile;
exports.getProfile = getProfile;
const db_1 = __importDefault(require("../utils/db"));
const app_error_1 = require("../utils/app.error");
// ── Mifflin-St Jeor ─────────────────────────────────────────
exports.ACTIVITY_MULTIPLIERS = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
};
function calcCalorieGoal(weight, height, age, gender, activityLevel) {
    const bmr = gender === 'male'
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
    const multiplier = exports.ACTIVITY_MULTIPLIERS[activityLevel] ?? 1.2;
    return Math.round(bmr * multiplier);
}
// ── GET /me ─────────────────────────────────────────────────
async function getMe(userId) {
    const user = await db_1.default.user.findUnique({
        where: { id: userId },
        include: { profile: true, streakData: true },
    });
    if (!user)
        throw new app_error_1.AppError('User not found', 'USER_NOT_FOUND', 404);
    const { password: _, ...safeUser } = user;
    return safeUser;
}
// ── POST /profile  (upsert) ──────────────────────────────────
async function upsertProfile(userId, input) {
    // Username benzersizlik kontrolü
    if (input.username) {
        const taken = await db_1.default.user.findFirst({
            where: { username: input.username, NOT: { id: userId } },
        });
        if (taken)
            throw new app_error_1.AppError('Username already taken', 'USERNAME_EXISTS', 409);
        await db_1.default.user.update({
            where: { id: userId },
            data: { username: input.username },
        });
    }
    // Mevcut profili çek (upsert için gereken değerleri birleştir)
    const existing = await db_1.default.profile.findUnique({ where: { userId } });
    const weight = input.weight ?? existing?.weight ?? null;
    const height = input.height ?? existing?.height ?? null;
    const age = input.age ?? existing?.age ?? null;
    const gender = input.gender ?? existing?.gender ?? null;
    const activityLevel = input.activityLevel ?? existing?.activityLevel ?? null;
    // Kalori & su hedefi hesapla (tüm değerler mevcutsa)
    let dailyCalorieGoal;
    let dailyWaterGoal;
    if (weight && height && age && gender && activityLevel) {
        dailyCalorieGoal = calcCalorieGoal(weight, height, age, gender, activityLevel);
    }
    if (weight) {
        dailyWaterGoal = Math.round(weight * 35);
    }
    const profile = await db_1.default.profile.upsert({
        where: { userId },
        create: {
            userId,
            age: input.age,
            height: input.height,
            weight: input.weight,
            targetWeight: input.targetWeight,
            gender: input.gender,
            goal: input.goal,
            activityLevel: input.activityLevel,
            dietaryPreference: input.dietaryPreference,
            allergies: input.allergies ?? [],
            healthConditions: input.healthConditions ?? [],
            dailyCalorieGoal,
            dailyWaterGoal,
        },
        update: {
            ...(input.age !== undefined && { age: input.age }),
            ...(input.height !== undefined && { height: input.height }),
            ...(input.weight !== undefined && { weight: input.weight }),
            ...(input.targetWeight !== undefined && { targetWeight: input.targetWeight }),
            ...(input.gender !== undefined && { gender: input.gender }),
            ...(input.goal !== undefined && { goal: input.goal }),
            ...(input.activityLevel !== undefined && { activityLevel: input.activityLevel }),
            ...(input.dietaryPreference !== undefined && { dietaryPreference: input.dietaryPreference }),
            ...(input.allergies !== undefined && { allergies: input.allergies }),
            ...(input.healthConditions !== undefined && { healthConditions: input.healthConditions }),
            ...(dailyCalorieGoal !== undefined && { dailyCalorieGoal }),
            ...(dailyWaterGoal !== undefined && { dailyWaterGoal }),
        },
    });
    // StreakData yoksa başlat
    await db_1.default.streakData.upsert({
        where: { userId },
        create: { userId },
        update: {},
    });
    return profile;
}
// ── GET /profile ────────────────────────────────────────────
async function getProfile(userId) {
    const profile = await db_1.default.profile.findUnique({ where: { userId } });
    if (!profile)
        throw new app_error_1.AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
    return profile;
}
//# sourceMappingURL=profile.service.js.map