export class AppError extends Error {
    statusCode;
    code;
    constructor(statusCode, code, message) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
    }
}
export class ValidationError extends AppError {
    constructor(message = "Invalid request") {
        super(400, "VALIDATION_ERROR", message);
    }
}
export class NotFoundError extends AppError {
    constructor(message = "Not found") {
        super(404, "NOT_FOUND", message);
    }
}
export class DatabaseError extends AppError {
    constructor(message = "Database error") {
        super(503, "DATABASE_ERROR", message);
    }
}
//# sourceMappingURL=app-error.js.map