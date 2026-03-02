"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getInternalProfile = getInternalProfile;
exports.updateActivityLevel = updateActivityLevel;
const db_1 = __importDefault(require("../utils/db"));
const app_error_1 = require("../utils/app.error");
const profile_service_1 = require("./profile.service");
// ── GET /internal/profile/:userId ──────────────────────────
// Nutrition, Recipe, Health servisleri bu endpoint'i kullanır
async function getInternalProfile(userId) {
    const profile = await db_1.default.profile.findUnique({
        where: { userId },
        select: {
            dailyCalorieGoal: true,
            dailyWaterGoal: true,
            dietaryPreference: true,
            allergies: true,
            healthConditions: true,
            goal: true,
            activityLevel: true,
            weight: true,
            height: true,
            age: true,
            gender: true,
        },
    });
    if (!profile)
        throw new app_error_1.AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
    return profile;
}
// ── PATCH /internal/profile/:userId ────────────────────────
// Health Service adım verisine göre activityLevel güncellemesi yapar.
// Kalori hedefi otomatik yeniden hesaplanır.
async function updateActivityLevel(userId, activityLevel) {
    const profile = await db_1.default.profile.findUnique({ where: { userId } });
    if (!profile)
        throw new app_error_1.AppError('Profile not found', 'PROFILE_NOT_FOUND', 404);
    let dailyCalorieGoal;
    if (profile.weight &&
        profile.height &&
        profile.age &&
        profile.gender) {
        dailyCalorieGoal = (0, profile_service_1.calcCalorieGoal)(profile.weight, profile.height, profile.age, profile.gender, activityLevel);
    }
    const updated = await db_1.default.profile.update({
        where: { userId },
        data: {
            activityLevel,
            ...(dailyCalorieGoal !== undefined && { dailyCalorieGoal }),
        },
        select: {
            activityLevel: true,
            dailyCalorieGoal: true,
        },
    });
    return updated;
}
//# sourceMappingURL=internal.service.js.map