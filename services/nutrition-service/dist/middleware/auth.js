"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
function requireAuth(req, res, next) {
    const userId = req.headers['x-user-id'];
    if (!userId) {
        res.status(401).json({
            success: false,
            message: 'Unauthorized',
            code: 'UNAUTHORIZED',
        });
        return;
    }
    req.userId = userId;
    next();
}
//# sourceMappingURL=auth.js.map