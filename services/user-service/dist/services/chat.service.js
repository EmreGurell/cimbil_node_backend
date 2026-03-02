"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getChatHistory = getChatHistory;
exports.saveMessage = saveMessage;
exports.clearHistory = clearHistory;
const db_1 = __importDefault(require("../utils/db"));
const app_error_1 = require("../utils/app.error");
// ── GET chat-history (cursor-based pagination) ──────────────
async function getChatHistory(userId, limit, before) {
    // Cursor: before mesajından önceki (daha eski) mesajları getir
    let cursorDate;
    if (before) {
        const cursor = await db_1.default.chatMessage.findFirst({
            where: { id: before, userId },
            select: { createdAt: true },
        });
        if (!cursor) {
            throw new app_error_1.AppError('Message not found', 'MESSAGE_NOT_FOUND', 404);
        }
        cursorDate = cursor.createdAt;
    }
    const messages = await db_1.default.chatMessage.findMany({
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
async function saveMessage(userId, role, content) {
    return db_1.default.chatMessage.create({
        data: { userId, role, content },
        select: { id: true, role: true, content: true, createdAt: true },
    });
}
// ── DELETE chat-history ─────────────────────────────────────
async function clearHistory(userId) {
    const { count } = await db_1.default.chatMessage.deleteMany({ where: { userId } });
    return { deleted: count };
}
//# sourceMappingURL=chat.service.js.map