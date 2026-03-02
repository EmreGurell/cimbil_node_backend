"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.subscriptionMiddleware = subscriptionMiddleware;
const axios_1 = __importDefault(require("axios"));
const SUBSCRIPTION_URL = process.env.SUBSCRIPTION_SERVICE_URL ?? 'http://localhost:3006';
async function checkFeatureLimit(userId, feature) {
    const { data } = await axios_1.default.get(`${SUBSCRIPTION_URL}/api/v1/subscriptions/check`, { params: { userId, feature } });
    return data.data;
}
function incrementFeatureUsage(userId, feature) {
    axios_1.default
        .post(`${SUBSCRIPTION_URL}/api/v1/subscriptions/increment`, {
        userId,
        feature,
    })
        .catch((err) => console.error('[Gateway] Increment failed:', err.message));
}
function subscriptionMiddleware(feature) {
    return async (req, res, next) => {
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
            const result = await checkFeatureLimit(userId, feature);
            if (!result.allowed) {
                res.status(403).json({
                    success: false,
                    code: 'LIMIT_REACHED',
                    message: 'Daily limit reached',
                    upgrade: true,
                    used: result.used,
                    limit: result.limit,
                });
                return;
            }
            // Proxy başarıyla tamamlandığında usage'ı artır
            res.on('finish', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    incrementFeatureUsage(userId, feature);
                }
            });
            next();
        }
        catch (err) {
            // Subscription service erişilemiyorsa isteği geçir (fail-open)
            console.error('[Gateway] Subscription check failed:', err);
            next();
        }
    };
}
//# sourceMappingURL=subscription.js.map