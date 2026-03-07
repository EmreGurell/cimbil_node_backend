import { Request, Response } from 'express';
import { z } from 'zod';

import * as AuthService from '../services/auth.service';
import { successResponse, createdResponse, errorResponse } from '../utils/response.helper';
import { AppError } from '../utils/app.error';

// ── Schemas ─────────────────────────────────────────────────
const registerSchema = z.object({
  firstName: z.string().min(1),
  lastName:  z.string().min(1),
  email:     z.string().email(),
  password:  z.string().min(6),
});

const verifyEmailSchema = z.object({
  userId: z.string().uuid(),
  code:   z.string().length(6),
});

const resendCodeSchema = z.object({
  userId: z.string().uuid(),
});

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  email:       z.string().email(),
  code:        z.string().length(6),
  newPassword: z.string().min(6),
});

// ── Handlers ────────────────────────────────────────────────
export async function register(req: Request, res: Response): Promise<void> {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await AuthService.register(
      parsed.data.firstName,
      parsed.data.lastName,
      parsed.data.email,
      parsed.data.password,
    );
    createdResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) {
      errorResponse(res, err.message, err.code, err.status);
      return;
    }
    console.error('[register] Unexpected error:', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function verifyEmail(req: Request, res: Response): Promise<void> {
  const parsed = verifyEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await AuthService.verifyEmail(
      parsed.data.userId,
      parsed.data.code,
    );
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) {
      errorResponse(res, err.message, err.code, err.status);
      return;
    }
    console.error('[verifyEmail] Unexpected error:', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function resendCode(req: Request, res: Response): Promise<void> {
  const parsed = resendCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await AuthService.resendCode(parsed.data.userId);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) {
      errorResponse(res, err.message, err.code, err.status);
      return;
    }
    console.error('[resendCode] Unexpected error:', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function login(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await AuthService.login(parsed.data.email, parsed.data.password);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) {
      errorResponse(res, err.message, err.code, err.status, err.data);
      return;
    }
    console.error('[login] Unexpected error:', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function forgotPassword(req: Request, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await AuthService.forgotPassword(parsed.data.email);
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) {
      errorResponse(res, err.message, err.code, err.status);
      return;
    }
    console.error('[forgotPassword] Unexpected error:', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}

export async function resetPassword(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', 400);
    return;
  }

  try {
    const data = await AuthService.resetPassword(
      parsed.data.email,
      parsed.data.code,
      parsed.data.newPassword,
    );
    successResponse(res, data);
  } catch (err) {
    if (err instanceof AppError) {
      errorResponse(res, err.message, err.code, err.status);
      return;
    }
    console.error('[resetPassword] Unexpected error:', err);
    errorResponse(res, 'Internal server error', 'INTERNAL_ERROR', 500);
  }
}
