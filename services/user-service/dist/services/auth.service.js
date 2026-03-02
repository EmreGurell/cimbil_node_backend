"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateToken = generateToken;
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.resendCode = resendCode;
exports.login = login;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = __importDefault(require("../utils/db"));
const app_error_1 = require("../utils/app.error");
const email_service_1 = require("./email.service");
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
function generateToken(userId, email) {
    // Süresiz token — mobil uygulama için
    return jsonwebtoken_1.default.sign({ userId, email }, process.env.JWT_SECRET);
}
// ── Register ────────────────────────────────────────────────
async function register(firstName, lastName, email, password) {
    const existing = await db_1.default.user.findUnique({ where: { email } });
    if (existing) {
        throw new app_error_1.AppError('Email already registered', 'EMAIL_EXISTS', 409);
    }
    const hashedPassword = await bcryptjs_1.default.hash(password, 12);
    const user = await db_1.default.user.create({
        data: { firstName, lastName, email, password: hashedPassword },
    });
    const code = generateCode();
    await db_1.default.verificationCode.create({
        data: {
            userId: user.id,
            code,
            type: 'email_verify',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
    });
    await (0, email_service_1.sendVerificationEmail)(email, firstName, code);
    return { message: 'Verification email sent', userId: user.id };
}
// ── Verify Email ────────────────────────────────────────────
async function verifyEmail(userId, code) {
    const verification = await db_1.default.verificationCode.findFirst({
        where: {
            userId,
            code,
            type: 'email_verify',
            used: false,
            expiresAt: { gt: new Date() },
        },
    });
    if (!verification) {
        throw new app_error_1.AppError('Invalid or expired code', 'INVALID_CODE', 400);
    }
    await db_1.default.$transaction([
        db_1.default.verificationCode.update({
            where: { id: verification.id },
            data: { used: true },
        }),
        db_1.default.user.update({
            where: { id: userId },
            data: { isVerified: true },
        }),
    ]);
    const user = await db_1.default.user.findUniqueOrThrow({ where: { id: userId } });
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
async function resendCode(userId) {
    const user = await db_1.default.user.findUnique({ where: { id: userId } });
    if (!user) {
        throw new app_error_1.AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    if (user.isVerified) {
        throw new app_error_1.AppError('Email already verified', 'ALREADY_VERIFIED', 400);
    }
    await db_1.default.verificationCode.updateMany({
        where: { userId, type: 'email_verify', used: false },
        data: { used: true },
    });
    const code = generateCode();
    await db_1.default.verificationCode.create({
        data: {
            userId,
            code,
            type: 'email_verify',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
    });
    await (0, email_service_1.sendVerificationEmail)(user.email, user.firstName, code);
    return { message: 'Verification code resent' };
}
// ── Login ───────────────────────────────────────────────────
async function login(email, password) {
    const user = await db_1.default.user.findUnique({ where: { email } });
    if (!user) {
        throw new app_error_1.AppError('User not found', 'USER_NOT_FOUND', 404);
    }
    if (!user.isVerified) {
        throw new app_error_1.AppError('Email not verified', 'EMAIL_NOT_VERIFIED', 403);
    }
    const isMatch = await bcryptjs_1.default.compare(password, user.password);
    if (!isMatch) {
        throw new app_error_1.AppError('Invalid credentials', 'INVALID_CREDENTIALS', 401);
    }
    const token = generateToken(user.id, user.email);
    return {
        token,
        user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            username: user.username,
        },
    };
}
// ── Forgot Password ─────────────────────────────────────────
async function forgotPassword(email) {
    const user = await db_1.default.user.findUnique({ where: { email } });
    // Güvenlik: kullanıcı bulunamasa da aynı mesajı döner (enumeration önleme)
    if (!user) {
        return { message: 'Reset code sent if email exists' };
    }
    // Mevcut reset kodlarını iptal et
    await db_1.default.verificationCode.updateMany({
        where: { userId: user.id, type: 'password_reset', used: false },
        data: { used: true },
    });
    const code = generateCode();
    await db_1.default.verificationCode.create({
        data: {
            userId: user.id,
            code,
            type: 'password_reset',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000),
        },
    });
    await (0, email_service_1.sendPasswordResetEmail)(email, user.firstName, code);
    return { message: 'Reset code sent if email exists' };
}
// ── Reset Password ──────────────────────────────────────────
async function resetPassword(email, code, newPassword) {
    const user = await db_1.default.user.findUnique({ where: { email } });
    if (!user) {
        throw new app_error_1.AppError('Invalid reset request', 'INVALID_RESET', 400);
    }
    const verification = await db_1.default.verificationCode.findFirst({
        where: {
            userId: user.id,
            code,
            type: 'password_reset',
            used: false,
            expiresAt: { gt: new Date() },
        },
    });
    if (!verification) {
        throw new app_error_1.AppError('Invalid or expired code', 'INVALID_CODE', 400);
    }
    const hashedPassword = await bcryptjs_1.default.hash(newPassword, 12);
    await db_1.default.$transaction([
        db_1.default.user.update({
            where: { id: user.id },
            data: { password: hashedPassword },
        }),
        db_1.default.verificationCode.update({
            where: { id: verification.id },
            data: { used: true },
        }),
    ]);
    return { message: 'Password updated' };
}
//# sourceMappingURL=auth.service.js.map