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
exports.getChatHistory = getChatHistory;
exports.saveMessage = saveMessage;
exports.clearHistory = clearHistory;
const zod_1 = require("zod");
const ChatService = __importStar(require("../services/chat.service"));
const response_helper_1 = require("../utils/response.helper");
const app_error_1 = require("../utils/app.error");
const saveMessageSchema = zod_1.z.object({
    role: zod_1.z.enum(['user', 'assistant']),
    content: zod_1.z.string().min(1),
});
const historyQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    before: zod_1.z.string().uuid().optional(),
});
async function getChatHistory(req, res) {
    const parsed = historyQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await ChatService.getChatHistory(req.userId, parsed.data.limit, parsed.data.before);
        (0, response_helper_1.successResponse)(res, { messages: data, count: data.length });
    }
    catch (err) {
        if (err instanceof app_error_1.AppError) {
            (0, response_helper_1.errorResponse)(res, err.message, err.code, err.status);
            return;
        }
        (0, response_helper_1.errorResponse)(res, 'Internal server error', 'INTERNAL_ERROR', 500);
    }
}
async function saveMessage(req, res) {
    const parsed = saveMessageSchema.safeParse(req.body);
    if (!parsed.success) {
        (0, response_helper_1.errorResponse)(res, 'Validation failed', 'VALIDATION_ERROR', 400);
        return;
    }
    try {
        const data = await ChatService.saveMessage(req.userId, parsed.data.role, parsed.data.content);
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
async function clearHistory(req, res) {
    try {
        const data = await ChatService.clearHistory(req.userId);
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
//# sourceMappingURL=chat.controller.js.map