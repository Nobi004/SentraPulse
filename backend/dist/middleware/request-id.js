import { randomUUID } from "node:crypto";
export function requestId(req, res, next) {
    const id = `req_${randomUUID().slice(0, 8)}`;
    req.requestId = id;
    res.setHeader("x-request-id", id);
    next();
}
//# sourceMappingURL=request-id.js.map