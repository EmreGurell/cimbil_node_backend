"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = exports.authLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
// Auth endpoint'leri: 10 istek / dakika
exports.authLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests have been sent, please wait a minute.',
        code: 'TOO_MANY_REQUESTS',
    },
});
// Genel korumalı route'lar: 100 istek / dakika
exports.rateLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests have been sent, please wait a minute.',
        code: 'TOO_MANY_REQUESTS',
    },
});
//# sourceMappingURL=rateLimit.js.map