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
const express_1 = require("express");
const zod_1 = require("zod");
const InternalService = __importStar(require("../services/internal.service"));
const response_helper_1 = require("../utils/response.helper");
const app_error_1 = require("../utils/app.error");
const router = (0, express_1.Router)();
const patchSchema = zod_1.z.object({
    activityLevel: zod_1.z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']),
});
// GET /internal/profile/:userId
router.get('/profile/:userId', async (req, res) => {
    try {
        const data = await InternalService.getInternalProfile(req.params.userId);
        (0, response_helper_1.successResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
});
// PATCH /internal/profile/:userId
router.patch('/profile/:userId', async (req, res) => {
    const parsed = patchSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await InternalService.updateActivityLevel(req.params.userId, parsed.data.activityLevel);
        (0, response_helper_1.successResponse)(res, data);
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
});
exports.default = router;
//# sourceMappingURL=internal.routes.js.map