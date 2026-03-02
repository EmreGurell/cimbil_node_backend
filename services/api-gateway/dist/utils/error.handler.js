"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxyErrorHandler = proxyErrorHandler;
exports.notFoundHandler = notFoundHandler;
function proxyErrorHandler(err, req, res) {
    console.error(`[Gateway] Proxy error → ${req.method} ${req.url}:`, err.message);
    if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: false,
            message: 'Service unavailable',
            code: 'SERVICE_UNAVAILABLE',
        }));
    }
}
function notFoundHandler(req, res) {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.path}`,
        code: 'NOT_FOUND',
    });
}
//# sourceMappingURL=error.handler.js.map