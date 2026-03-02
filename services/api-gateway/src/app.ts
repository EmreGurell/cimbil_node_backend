import 'dotenv/config';

import express from 'express';
import morgan from 'morgan';
import { createProxyMiddleware } from 'http-proxy-middleware';

import { proxyErrorHandler, notFoundHandler } from './utils/error.handler';
import { authMiddleware } from './middleware/auth';
import { rateLimiter, authLimiter } from './middleware/rateLimit';
import { subscriptionMiddleware } from './middleware/subscription';
import { adminMiddleware } from './middleware/admin';

const app = express();

// ── Railway / reverse-proxy desteği ────────────────────────
app.set('trust proxy', true);

// ── Logging ────────────────────────────────────────────────
app.use(morgan('combined'));

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'api-gateway' });
});

// ── Servis URL'leri ────────────────────────────────────────
// http:// prefix yoksa otomatik ekle (Railway env var'larında unutulabilir)
function serviceUrl(envVar: string | undefined, fallback: string): string {
  const url = envVar ?? fallback;
  return url.startsWith('http') ? url : `http://${url}`;
}

const SERVICES = {
  user:         serviceUrl(process.env.USER_SERVICE_URL,         'http://localhost:3001'),
  nutrition:    serviceUrl(process.env.NUTRITION_SERVICE_URL,    'http://localhost:3002'),
  recipe:       serviceUrl(process.env.RECIPE_SERVICE_URL,       'http://localhost:3003'),
  health:       serviceUrl(process.env.HEALTH_SERVICE_URL,       'http://localhost:3004'),
  ai:           serviceUrl(process.env.AI_SERVICE_URL,           'http://localhost:3005'),
  subscription: serviceUrl(process.env.SUBSCRIPTION_SERVICE_URL, 'http://localhost:3006'),
} as const;

// ── Proxy factory ──────────────────────────────────────────
function proxy(target: string) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    onError: proxyErrorHandler,
  });
}

// ─────────────────────────────────────────────────────────────
// PUBLIC ROUTES  (JWT gerekmez)
// ─────────────────────────────────────────────────────────────

// Auth rate limiter: register, login, forgot-password
app.use(
  [
    '/api/v1/users/register',
    '/api/v1/users/login',
    '/api/v1/users/forgot-password',
    '/api/v1/auth/register',
    '/api/v1/auth/login',
    '/api/v1/auth/forgot-password',
  ],
  authLimiter,
);

// Public user / auth endpoint'leri — JWT YOK
app.use('/api/v1/users/register',        proxy(SERVICES.user));
app.use('/api/v1/users/verify-email',    proxy(SERVICES.user));
app.use('/api/v1/users/resend-code',     proxy(SERVICES.user));
app.use('/api/v1/users/login',           proxy(SERVICES.user));
app.use('/api/v1/users/forgot-password', proxy(SERVICES.user));
app.use('/api/v1/users/reset-password',  proxy(SERVICES.user));

app.use('/api/v1/auth/register',         proxy(SERVICES.user));
app.use('/api/v1/auth/verify-email',     proxy(SERVICES.user));
app.use('/api/v1/auth/resend-code',      proxy(SERVICES.user));
app.use('/api/v1/auth/login',            proxy(SERVICES.user));
app.use('/api/v1/auth/forgot-password',  proxy(SERVICES.user));
app.use('/api/v1/auth/reset-password',   proxy(SERVICES.user));

// Public: plan listesi & iyzico webhook
app.use('/api/v1/subscriptions/plans',   proxy(SERVICES.subscription));
app.use('/api/v1/subscriptions/webhook', proxy(SERVICES.subscription));

// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTES  (JWT zorunlu)
// ─────────────────────────────────────────────────────────────
app.use(rateLimiter);
app.use(authMiddleware);

// Admin routes
app.use('/api/v1/admin', adminMiddleware, proxy(SERVICES.subscription));

// Feature-gated routes (subscription limiti var)
app.use('/api/v1/food/analyze-image', subscriptionMiddleware('food_analysis'), proxy(SERVICES.nutrition));
app.use('/api/v1/food/barcode',       subscriptionMiddleware('barcode_scan'),  proxy(SERVICES.nutrition));
app.use('/api/v1/cimbil/chat',        subscriptionMiddleware('ai_chat'),       proxy(SERVICES.ai));
app.use('/api/v1/recipes',            subscriptionMiddleware('recipes'),       proxy(SERVICES.recipe));
app.use('/api/v1/health/sync',        subscriptionMiddleware('health_sync'),   proxy(SERVICES.health));

// Diğer korumalı route'lar
app.use('/api/v1/users',         proxy(SERVICES.user));
app.use('/api/v1/auth',          proxy(SERVICES.user));
app.use('/api/v1/nutrition',     proxy(SERVICES.nutrition));
app.use('/api/v1/food',          proxy(SERVICES.nutrition));
app.use('/api/v1/health',        proxy(SERVICES.health));
app.use('/api/v1/cimbil',        proxy(SERVICES.ai));
app.use('/api/v1/subscriptions', proxy(SERVICES.subscription));

// ── 404 ───────────────────────────────────────────────────
app.use(notFoundHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 8080;
app.listen(PORT, () => {
  console.log(`[Gateway] Running on port ${PORT}`);
  console.log('[Gateway] Services:', SERVICES);
});

export default app;
