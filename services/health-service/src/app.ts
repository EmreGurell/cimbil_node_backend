import 'dotenv/config';

import express from 'express';
import morgan from 'morgan';

import { globalErrorHandler, notFoundHandler } from './utils/error.handler';
import healthRoutes from './routes/health.routes';

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(morgan('combined'));

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'health-service' });
});

// ── Routes ─────────────────────────────────────────────────
app.use('/api/v1/health', healthRoutes);

// ── 404 + Global error handler ─────────────────────────────
app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3004;

app.listen(PORT, () => {
  console.log(`[HealthService] Running on port ${PORT}`);
});

export default app;
