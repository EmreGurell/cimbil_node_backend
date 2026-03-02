import 'dotenv/config';

import express from 'express';
import morgan from 'morgan';

import { globalErrorHandler } from './utils/error.handler';
import { setupSwagger } from './docs/swagger';

import authRoutes    from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import chatRoutes   from './routes/chat.routes';
import streakRoutes   from './routes/streak.routes';
import internalRoutes from './routes/internal.routes';

const app = express();

// ── Middleware ─────────────────────────────────────────────
app.use(express.json());
app.use(morgan('combined'));

// ── Swagger UI (/docs) ─────────────────────────────────────
setupSwagger(app);

// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service' });
});

// ── Routes ─────────────────────────────────────────────────
app.use('/api/v1/users', authRoutes);
app.use('/api/v1/auth',  authRoutes);

app.use('/api/v1/users', profileRoutes);
app.use('/api/v1/users', chatRoutes);
app.use('/api/v1/users', streakRoutes);
app.use('/internal',     internalRoutes);

// ── Global error handler ───────────────────────────────────
app.use(globalErrorHandler);

// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;

app.listen(PORT, () => {
  console.log(`[UserService] Running on port ${PORT}`);
});

export default app;
