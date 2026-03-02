"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    constructor(message, code, status) {
        super(message);
        this.message = message;
        this.code = code;
        this.status = status;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
//# sourceMappingURL=app.error.js.map