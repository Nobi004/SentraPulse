import { AppError } from "../errors/app-error.js";
import { logger } from "../config/logger.js";
export function errorHandler(err, req, res, _next) {
    const fallbackId = res.getHeader("x-request-id");
    const rid = req.requestId ??
        (typeof fallbackId === "string" ? fallbackId : "req_unknown");
    const status = err instanceof AppError ? err.statusCode : 500;
    const code = err instanceof AppError ? err.code : "INTERNAL_ERROR";
    const message = err instanceof Error ? err.message : "Unknown error";
    if (status === 500) {
        logger.error("INTERNAL_ERROR", { requestId: rid, message });
    }
    res.status(status).json({
        success: false,
        error: {
            code,
            message: status === 500 ? "Internal error" : message,
            requestId: rid,
        },
    });
}
//# sourceMappingURL=error-handler.js.map