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
exports.getMe = getMe;
exports.upsertProfile = upsertProfile;
exports.getProfile = getProfile;
const zod_1 = require("zod");
const ProfileService = __importStar(require("../services/profile.service"));
const response_helper_1 = require("../utils/response.helper");
const app_error_1 = require("../utils/app.error");
const profileSchema = zod_1.z.object({
    username: zod_1.z.string().min(3).max(30).optional(),
    age: zod_1.z.number().int().min(13).max(120).optional(),
    height: zod_1.z.number().min(50).max(300).optional(),
    weight: zod_1.z.number().min(20).max(500).optional(),
    targetWeight: zod_1.z.number().min(20).max(500).optional(),
    gender: zod_1.z.enum(['male', 'female', 'other']).optional(),
    goal: zod_1.z.enum(['lose_weight', 'gain_muscle', 'maintain', 'eat_healthy']).optional(),
    activityLevel: zod_1.z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).optional(),
    dietaryPreference: zod_1.z.enum(['omnivore', 'vegetarian', 'vegan', 'pescatarian']).optional(),
    allergies: zod_1.z.array(zod_1.z.string()).optional(),
    healthConditions: zod_1.z.array(zod_1.z.string()).optional(),
});
async function getMe(req, res) {
    try {
        const data = await ProfileService.getMe(req.userId);
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
async function upsertProfile(req, res) {
    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await ProfileService.upsertProfile(req.userId, parsed.data);
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
async function getProfile(req, res) {
    try {
        const data = await ProfileService.getProfile(req.userId);
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
//# sourceMappingURL=profile.controller.js.map