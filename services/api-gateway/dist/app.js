"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const http_proxy_middleware_1 = require("http-proxy-middleware");
const error_handler_1 = require("./utils/error.handler");
const auth_1 = require("./middleware/auth");
const rateLimit_1 = require("./middleware/rateLimit");
const subscription_1 = require("./middleware/subscription");
const admin_1 = require("./middleware/admin");
const app = (0, express_1.default)();
// ── Logging ────────────────────────────────────────────────
app.use((0, morgan_1.default)('combined'));
// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'api-gateway' });
});
// ── Servis URL'leri ────────────────────────────────────────
const SERVICES = {
    user: process.env.USER_SERVICE_URL ?? 'http://localhost:3001',
    nutrition: process.env.NUTRITION_SERVICE_URL ?? 'http://localhost:3002',
    recipe: process.env.RECIPE_SERVICE_URL ?? 'http://localhost:3003',
    health: process.env.HEALTH_SERVICE_URL ?? 'http://localhost:3004',
    ai: process.env.AI_SERVICE_URL ?? 'http://localhost:3005',
    subscription: process.env.SUBSCRIPTION_SERVICE_URL ?? 'http://localhost:3006',
};
// ── Proxy factory ──────────────────────────────────────────
function proxy(target) {
    return (0, http_proxy_middleware_1.createProxyMiddleware)({
        target,
        changeOrigin: true,
        onError: error_handler_1.proxyErrorHandler,
    });
}
// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES  (JWT gerekmez)
// ─────────────────────────────────────────────────────────────
// Auth rate limiter: register, login, forgot-password
app.use([
    '/api/v1/users/register',
    '/api/v1/users/login',
    '/api/v1/users/forgot-password',
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/forgot-password',
], rateLimit_1.authLimiter);
// Public user / auth endpoint'leri — JWT YOK
app.use('/api/v1/users/register', proxy(SERVICES.user));
app.use('/api/v1/users/verify-email', proxy(SERVICES.user));
app.use('/api/v1/users/resend-code', proxy(SERVICES.user));
app.use('/api/v1/users/login', proxy(SERVICES.user));
app.use('/api/v1/users/forgot-password', proxy(SERVICES.user));
app.use('/api/v1/users/reset-password', proxy(SERVICES.user));
app.use('/api/v1/auth/register', proxy(SERVICES.user));
app.use('/api/v1/auth/verify-email', proxy(SERVICES.user));
app.use('/api/v1/auth/resend-code', proxy(SERVICES.user));
app.use('/api/v1/auth/login', proxy(SERVICES.user));
app.use('/api/v1/auth/forgot-password', proxy(SERVICES.user));
app.use('/api/v1/auth/reset-password', proxy(SERVICES.user));
// Public: plan listesi & iyzico webhook
app.use('/api/v1/subscriptions/plans', proxy(SERVICES.subscription));
app.use('/api/v1/subscriptions/webhook', proxy(SERVICES.subscription));
// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTES  (JWT zorunlu)
// ─────────────────────────────────────────────────────────────
app.use(rateLimit_1.rateLimiter);
app.use(auth_1.authMiddleware);
// Admin routes
app.use('/api/v1/admin', admin_1.adminMiddleware, proxy(SERVICES.subscription));
// Feature-gated routes (subscription limiti var)
app.use('/api/v1/food/analyze-image', (0, subscription_1.subscriptionMiddleware)('food_analysis'), proxy(SERVICES.nutrition));
app.use('/api/v1/food/barcode', (0, subscription_1.subscriptionMiddleware)('barcode_scan'), proxy(SERVICES.nutrition));
app.use('/api/v1/cimbil/chat', (0, subscription_1.subscriptionMiddleware)('ai_chat'), proxy(SERVICES.ai));
app.use('/api/v1/recipes', (0, subscription_1.subscriptionMiddleware)('recipes'), proxy(SERVICES.recipe));
app.use('/api/v1/health/sync', (0, subscription_1.subscriptionMiddleware)('health_sync'), proxy(SERVICES.health));
// Diğer korumalı route'lar
app.use('/api/v1/users', proxy(SERVICES.user));
app.use('/api/v1/auth', proxy(SERVICES.user));
app.use('/api/v1/nutrition', proxy(SERVICES.nutrition));
app.use('/api/v1/food', proxy(SERVICES.nutrition));
app.use('/api/v1/health', proxy(SERVICES.health));
app.use('/api/v1/cimbil', proxy(SERVICES.ai));
app.use('/api/v1/subscriptions', proxy(SERVICES.subscription));
// ── 404 ───────────────────────────────────────────────────
app.use(error_handler_1.notFoundHandler);
// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
    console.log(`[Gateway] Running on port ${PORT}`);
    console.log('[Gateway] Services:', SERVICES);
});
exports.default = app;
//# sourceMappingURL=app.js.map