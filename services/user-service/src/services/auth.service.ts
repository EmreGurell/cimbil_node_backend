import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import prisma from '../utils/db';
import { AppError } from '../utils/app.error';
import { sendVerificationEmail, sendPasswordResetEmail } from './email.service';

function generateCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateToken(userId: string, email: string): string {
  // Süresiz token — mobil uygulama için
  return jwt.sign({ userId, email }, process.env.JWT_SECRET as string);
}

// ── Register ────────────────────────────────────────────────
export async function register(
  firstName: string,
  lastName: string,
  email: string,
  password: string,
) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new AppError('Email already registered', 'EMAIL_EXISTS', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: { firstName, lastName, email, password: hashedPassword },
  });

  const code = generateCode();
  await prisma.verificationCode.create({
    data: {
      userId: user.id,
      code,
      type: 'email_verify',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  // Fire-and-forget — response'u bloke etme, email arka planda gönderilir
  sendVerificationEmail(email, firstName, code).catch((err) => {
    console.error('[register] Email send failed:', err.message);
  });

  return { message: 'Verification email sent', userId: user.id };
}

// ── Verify Email ────────────────────────────────────────────
export async function verifyEmail(userId: string, code: string) {
  const verification = await prisma.verificationCode.findFirst({
    where: {
      userId,
      code,
      type: 'email_verify',
      used: false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    throw new AppError('Invalid or expired code', 'INVALID_CODE', 400);
  }

  await prisma.$transaction([
    prisma.verificationCode.update({
      where: { id: verification.id },
      data: { used: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { isVerified: true },
    }),
  ]);

  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const token = generateToken(user.id, user.email);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    },
  };
}

// ── Resend Code ─────────────────────────────────────────────
export async function resendCode(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 'USER_NOT_FOUND', 404);
  }
  if (user.isVerified) {
    throw new AppError('Email already verified', 'ALREADY_VERIFIED', 400);
  }

  await prisma.verificationCode.updateMany({
    where: { userId, type: 'email_verify', used: false },
    data: { used: true },
  });

  const code = generateCode();
  await prisma.verificationCode.create({
    data: {
      userId,
      code,
      type: 'email_verify',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  sendVerificationEmail(user.email, user.firstName, code).catch((err) => {
    console.error('[resendCode] Email send failed:', err.message);
  });

  return { message: 'Verification code resent' };
}

// ── Login ───────────────────────────────────────────────────
export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    throw new AppError('User not found', 'USER_NOT_FOUND', 404);
  }
  if (!user.isVerified) {
    throw new AppError('Email not verified', 'EMAIL_NOT_VERIFIED', 403);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
  }

  const token = generateToken(user.id, user.email);

  return {
    token,
    user: {
      id:        user.id,
      email:     user.email,
      firstName: user.firstName,
      lastName:  user.lastName,
      username:  user.username,
    },
  };
}

// ── Forgot Password ─────────────────────────────────────────
export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  // Güvenlik: kullanıcı bulunamasa da aynı mesajı döner (enumeration önleme)
  if (!user) {
    return { message: 'Reset code sent if email exists' };
  }

  // Mevcut reset kodlarını iptal et
  await prisma.verificationCode.updateMany({
    where: { userId: user.id, type: 'password_reset', used: false },
    data: { used: true },
  });

  const code = generateCode();
  await prisma.verificationCode.create({
    data: {
      userId:    user.id,
      code,
      type:      'password_reset',
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    },
  });

  sendPasswordResetEmail(email, user.firstName, code).catch((err) => {
    console.error('[forgotPassword] Email send failed:', err.message);
  });

  return { message: 'Reset code sent if email exists' };
}

// ── Reset Password ──────────────────────────────────────────
export async function resetPassword(
  email: string,
  code: string,
  newPassword: string,
) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new AppError('Invalid reset request', 'INVALID_RESET', 400);
  }

  const verification = await prisma.verificationCode.findFirst({
    where: {
      userId:    user.id,
      code,
      type:      'password_reset',
      used:      false,
      expiresAt: { gt: new Date() },
    },
  });

  if (!verification) {
    throw new AppError('Invalid or expired code', 'INVALID_CODE', 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data:  { password: hashedPassword },
    }),
    prisma.verificationCode.update({
      where: { id: verification.id },
      data:  { used: true },
    }),
  ]);

  return { message: 'Password updated' };
}
