import rateLimit from 'express-rate-limit';

// Auth endpoint'leri: 10 istek / dakika
export const authLimiter = rateLimit({
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
export const rateLimiter = rateLimit({
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
