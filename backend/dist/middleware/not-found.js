import { NotFoundError } from "../errors/app-error.js";
export function notFound(_req, _res, next) {
    next(new NotFoundError());
}
//# sourceMappingURL=not-found.js.map