import prisma from '../utils/db';

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function isToday(date: Date): boolean {
  return toDateOnly(date) === toDateOnly(new Date());
}

function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return toDateOnly(date) === toDateOnly(yesterday);
}

export async function checkStreak(userId: string) {
  const streak = await prisma.streakData.upsert({
    where:  { userId },
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
  const newCurrent =
    lastActiveDate && isYesterday(lastActiveDate) ? currentStreak + 1 : 1;

  const newLongest = Math.max(newCurrent, longestStreak);
  const now = new Date();

  const updated = await prisma.streakData.update({
    where: { userId },
    data: {
      currentStreak:  newCurrent,
      longestStreak:  newLongest,
      lastActiveDate: now,
    },
  });

  return {
    currentStreak:  updated.currentStreak,
    longestStreak:  updated.longestStreak,
    lastActiveDate: updated.lastActiveDate,
  };
}
