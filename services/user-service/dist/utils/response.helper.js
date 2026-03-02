"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.createdResponse = createdResponse;
exports.errorResponse = errorResponse;
function successResponse(res, data, status = 200) {
    res.status(status).json({ success: true, data });
}
function createdResponse(res, data) {
    res.status(201).json({ success: true, data });
}
function errorResponse(res, message, code, status = 400) {
    res.status(status).json({ success: false, message, code });
}
//# sourceMappingURL=response.helper.js.map