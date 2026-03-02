"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalErrorHandler = globalErrorHandler;
function globalErrorHandler(err, _req, res, _next) {
    console.error('[NutritionService] Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error',
        code: 'INTERNAL_ERROR',
    });
}
//# sourceMappingURL=error.handler.js.map