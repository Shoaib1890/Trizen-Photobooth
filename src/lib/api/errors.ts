export type ApiErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "VALIDATION_ERROR"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_ERROR";

export class AppError extends Error {
  constructor(
    public readonly code: ApiErrorCode,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const Errors = {
  badRequest: (message = "Invalid request.") =>
    new AppError("BAD_REQUEST", message, 400),
  unauthorized: (message = "Authentication required.") =>
    new AppError("UNAUTHORIZED", message, 401),
  forbidden: (message = "You do not have permission to perform this action.") =>
    new AppError("FORBIDDEN", message, 403),
  notFound: (message = "Resource not found.") =>
    new AppError("NOT_FOUND", message, 404),
  conflict: (message = "Resource conflict.") =>
    new AppError("CONFLICT", message, 409),
  payloadTooLarge: (message = "File too large.") =>
    new AppError("PAYLOAD_TOO_LARGE", message, 413),
  validation: (message = "Validation failed.") =>
    new AppError("VALIDATION_ERROR", message, 422),
  tooManyRequests: (message = "Too many requests. Please try again later.") =>
    new AppError("TOO_MANY_REQUESTS", message, 429),
  internal: (message = "An unexpected error occurred.") =>
    new AppError("INTERNAL_ERROR", message, 500),
};
