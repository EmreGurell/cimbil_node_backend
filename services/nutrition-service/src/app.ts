import 'dotenv/config';

import express from 'express';
import morgan from 'morgan';

import { connectMongo } from './utils/mongo';
import { globalErrorHandler, notFoundHandler } from './utils/error.handler';

import nutritionRoutes from './routes/nutrition.routes';
import foodRoutes     from './routes/food.routes';
import internalRoutes from './routes/internal.routes';

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(morgan('combined'));

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'nutrition-service' });
});

// ── Routes ─────────────────────────────────────────────────
app.use('/api/v1/nutrition', nutritionRoutes);
app.use('/api/v1/food', foodRoutes);
app.use('/internal',   internalRoutes);

// ── 404 + Global error handler ─────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3002;

async function bootstrap() {
  await connectMongo();

  app.listen(PORT, () => {
    console.log(`[NutritionService] Running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[NutritionService] Startup error:', err);
  process.exit(1);
});

export default app;
