"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authMiddleware = authMiddleware;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            message: 'Authorization token required',
            code: 'UNAUTHORIZED',
        });
        return;
    }
    const token = authHeader.slice(7);
    try {
        const payload = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
        // Downstream servislere kullanıcı kimliğini ilet
        req.headers['x-user-id'] = payload.userId;
        req.headers['x-user-email'] = payload.email;
        next();
    }
    catch {
        res.status(401).json({
            success: false,
            message: 'Invalid or expired token',
            code: 'INVALID_TOKEN',
        });
    }
}
//# sourceMappingURL=auth.js.map