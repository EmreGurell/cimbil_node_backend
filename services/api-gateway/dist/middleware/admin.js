"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminMiddleware = adminMiddleware;
const axios_1 = __importDefault(require("axios"));
const SUBSCRIPTION_URL = process.env.SUBSCRIPTION_SERVICE_URL ?? 'http://localhost:3006';
async function getUserRole(userId) {
    const { data } = await axios_1.default.get(`${SUBSCRIPTION_URL}/api/v1/subscriptions/check`, { params: { userId, feature: 'ai_chat' } });
    return data.data.role;
}
async function adminMiddleware(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        res.status(401).json({
            success: false,
            message: 'User not authenticated',
            code: 'UNAUTHORIZED',
        });
        return;
    }
    try {
        const role = await getUserRole(userId);
        if (role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Admin access required',
                code: 'FORBIDDEN',
            });
            return;
        }
        next();
    }
    catch (err) {
        // Admin route'ları için fail-closed: servis erişilemezse geçirme
        console.error('[Gateway] Admin role check failed:', err);
        res.status(503).json({
            success: false,
            message: 'Service unavailable',
            code: 'SERVICE_UNAVAILABLE',
        });
    }
}
//# sourceMappingURL=admin.js.map