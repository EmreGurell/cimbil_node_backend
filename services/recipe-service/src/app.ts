import 'dotenv/config';

import express from 'express';
import morgan from 'morgan';

import { connectMongo } from './utils/mongo';
import { globalErrorHandler, notFoundHandler } from './utils/error.handler';

import recipeRoutes from './routes/recipe.routes';

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json({ limit: '2mb' }));
app.use(morgan('combined'));

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'recipe-service' });
});

// ── Routes ─────────────────────────────────────────────────
app.use('/api/v1/recipes', recipeRoutes);

// ── 404 + Global error handler ─────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3003;

async function bootstrap() {
  await connectMongo();

  app.listen(PORT, () => {
    console.log(`[RecipeService] Running on port ${PORT}`);
  });
}

bootstrap().catch((err) => {
  console.error('[RecipeService] Startup error:', err);
  process.exit(1);
});

export default app;
