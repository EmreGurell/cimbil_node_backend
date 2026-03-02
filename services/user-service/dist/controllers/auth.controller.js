"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.register = register;
exports.verifyEmail = verifyEmail;
exports.resendCode = resendCode;
exports.login = login;
exports.forgotPassword = forgotPassword;
exports.resetPassword = resetPassword;
const zod_1 = require("zod");
const AuthService = __importStar(require("../services/auth.service"));
const response_helper_1 = require("../utils/response.helper");
const app_error_1 = require("../utils/app.error");
// ── Schemas ─────────────────────────────────────────────────
const registerSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1),
    lastName: zod_1.z.string().min(1),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(6),
});
const verifyEmailSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
    code: zod_1.z.string().length(6),
});
const resendCodeSchema = zod_1.z.object({
    userId: zod_1.z.string().uuid(),
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
const forgotPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
const resetPasswordSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    code: zod_1.z.string().length(6),
    newPassword: zod_1.z.string().min(6),
});
// ── Handlers ────────────────────────────────────────────────
async function register(req, res) {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await AuthService.register(parsed.data.firstName, parsed.data.lastName, parsed.data.email, parsed.data.password);
        (0, response_helper_1.createdResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
}
async function verifyEmail(req, res) {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await AuthService.verifyEmail(parsed.data.userId, parsed.data.code);
        (0, response_helper_1.successResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
}
async function resendCode(req, res) {
    const parsed = resendCodeSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await AuthService.resendCode(parsed.data.userId);
        (0, response_helper_1.successResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
}
async function login(req, res) {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await AuthService.login(parsed.data.email, parsed.data.password);
        (0, response_helper_1.successResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
}
async function forgotPassword(req, res) {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await AuthService.forgotPassword(parsed.data.email);
        (0, response_helper_1.successResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
}
async function resetPassword(req, res) {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await AuthService.resetPassword(parsed.data.email, parsed.data.code, parsed.data.newPassword);
        (0, response_helper_1.successResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
}
//# sourceMappingURL=auth.controller.js.map