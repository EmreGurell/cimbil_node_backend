"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const morgan_1 = __importDefault(require("morgan"));
const error_handler_1 = require("./utils/error.handler");
const swagger_1 = require("./docs/swagger");
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const profile_routes_1 = __importDefault(require("./routes/profile.routes"));
const chat_routes_1 = __importDefault(require("./routes/chat.routes"));
const streak_routes_1 = __importDefault(require("./routes/streak.routes"));
const internal_routes_1 = __importDefault(require("./routes/internal.routes"));
const app = (0, express_1.default)();
// ── Middleware ─────────────────────────────────────────────
app.use(express_1.default.json());
app.use((0, morgan_1.default)('combined'));
// ── Swagger UI (/docs) ─────────────────────────────────────
(0, swagger_1.setupSwagger)(app);
// ── Health check ───────────────────────────────────────────
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'user-service' });
});
// ── Routes ─────────────────────────────────────────────────
app.use('/api/v1/users', auth_routes_1.default);
app.use('/api/v1/auth', auth_routes_1.default);
app.use('/api/v1/users', profile_routes_1.default);
app.use('/api/v1/users', chat_routes_1.default);
app.use('/api/v1/users', streak_routes_1.default);
app.use('/internal', internal_routes_1.default);
// ── Global error handler ───────────────────────────────────
app.use(error_handler_1.globalErrorHandler);
// ── Start ──────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3001;
app.listen(PORT, () => {
    console.log(`[UserService] Running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=app.js.map