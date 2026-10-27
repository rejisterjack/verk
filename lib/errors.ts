export class AuthError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(
    message: string,
    code = "FORBIDDEN",
    status = 403,
    details?: unknown,
  ) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export class ConflictError extends AuthError {
  constructor(message: string, issue: unknown) {
    super(message, "CONFLICT", 409, { issue });
  }
}
