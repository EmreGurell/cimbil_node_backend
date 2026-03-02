"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const mongo_1 = require("./utils/mongo");
const error_handler_1 = require("./utils/error.handler");
// import nutritionRoutes from './routes/nutrition.routes'; // Task #16
// import foodRoutes      from './routes/food.routes';      // Task #17
// import internalRoutes  from './routes/internal.routes';  // Task #17
const app = (0, express_1.default)();
// ── Middleware ─────────────────────────────────────────────
app.use(express_1.default.json());
app.use((0, morgan_1.default)('combined'));
// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'nutrition-service' });
});
// ── Routes ─────────────────────────────────────────────────
// app.use('/api/v1/nutrition', nutritionRoutes); // Task #16
// app.use('/api/v1/food',      foodRoutes);      // Task #17
// app.use('/internal',         internalRoutes);  // Task #17
// ── Global error handler ───────────────────────────────────
app.use(error_handler_1.globalErrorHandler);
// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3002;
async function bootstrap() {
    await (0, mongo_1.connectMongo)();
    app.listen(PORT, () => {
        console.log(`[NutritionService] Running on port ${PORT}`);
    });
}
bootstrap().catch((err) => {
    console.error('[NutritionService] Startup error:', err);
    process.exit(1);
});
exports.default = app;
//# sourceMappingURL=app.js.map