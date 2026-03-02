"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkStreak = checkStreak;
const db_1 = __importDefault(require("../utils/db"));
function toDateOnly(date) {
    return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}
function isToday(date) {
    return toDateOnly(date) === toDateOnly(new Date());
}
function isYesterday(date) {
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    return toDateOnly(date) === toDateOnly(yesterday);
}
async function checkStreak(userId) {
    const streak = await db_1.default.streakData.upsert({
        where: { userId },
        create: { userId },
        update: {},
    });
    const { lastActiveDate, currentStreak, longestStreak } = streak;
    // Bugün zaten check edilmişse dokunma
    if (lastActiveDate && isToday(lastActiveDate)) {
        return {
            currentStreak,
            longestStreak,
            lastActiveDate,
        };
    }
    // Dün aktifse streak devam eder, değilse sıfırla
    const newCurrent = lastActiveDate && isYesterday(lastActiveDate) ? currentStreak + 1 : 1;
    const newLongest = Math.max(newCurrent, longestStreak);
    const now = new Date();
    const updated = await db_1.default.streakData.update({
        where: { userId },
        data: {
            currentStreak: newCurrent,
            longestStreak: newLongest,
            lastActiveDate: now,
        },
    });
    return {
        currentStreak: updated.currentStreak,
        longestStreak: updated.longestStreak,
        lastActiveDate: updated.lastActiveDate,
    };
}
//# sourceMappingURL=streak.service.js.map