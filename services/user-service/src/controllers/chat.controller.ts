import { Request, Response } from 'express';
import { z } from 'zod';

import * as ChatService from '../services/chat.service';
import { successResponse, createdResponse, errorResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

const saveMessageSchema = z.object({
  role:    z.enum(['user', 'assistant']),
  content: z.string().min(1),
});

const historyQuerySchema = z.object({
  limit:  z.coerce.number().int().min(1).max(100).default(50),
  before: z.string().uuid().optional(),
});

export async function getChatHistory(req: Request, res: Response): Promise<void> {
  const parsed = historyQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await ChatService.getChatHistory(
      req.userId!,
      parsed.data.limit,
      parsed.data.before,
    );
    successResponse(res, { messages: data, count: data.length });
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function saveMessage(req: Request, res: Response): Promise<void> {
  const parsed = saveMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await ChatService.saveMessage(
      req.userId!,
      parsed.data.role,
      parsed.data.content,
    );
    createdResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function clearHistory(req: Request, res: Response): Promise<void> {
  try {
    const data = await ChatService.clearHistory(req.userId!);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) { errorResponse(res, err.message, err.code, err.status); return; }
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}
