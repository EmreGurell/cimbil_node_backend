import prisma from '../utils/db';
import { AppError } from '../utils/app.error';

// ── GET chat-history (cursor-based pagination) ──────────────
export async function getChatHistory(
  userId: string,
  limit: number,
  before?: string,
) {
  // Cursor: before mesajından önceki (daha eski) mesajları getir
  let cursorDate: Date | undefined;

  if (before) {
    const cursor = await prisma.chatMessage.findFirst({
      where: { id: before, userId },
      select: { createdAt: true },
    });
    if (!cursor) {
      throw new AppError('Message not found', 'MESSAGE_NOT_FOUND', 404);
    }
    cursorDate = cursor.createdAt;
  }

  const messages = await prisma.chatMessage.findMany({
    where: {
      userId,
      ...(cursorDate && { createdAt: { lt: cursorDate } }),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    select: { id: true, role: true, content: true, createdAt: true },
  });

  // Kronolojik sıra (en eski başta) — AI context için doğal sıra
  return messages.reverse();
}

// ── POST chat-history ───────────────────────────────────────
export async function saveMessage(
  userId: string,
  role: string,
  content: string,
) {
  return prisma.chatMessage.create({
    data: { userId, role, content },
    select: { id: true, role: true, content: true, createdAt: true },
  });
}

// ── DELETE chat-history ─────────────────────────────────────
export async function clearHistory(userId: string) {
  const { count } = await prisma.chatMessage.deleteMany({ where: { userId } });
  return { deleted: count };
}
