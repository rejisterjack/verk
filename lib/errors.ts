export class AuthError extends Error {
  code: string;
  status: number;

  constructor(message: string, code = "FORBIDDEN", status = 403) {
    super(message);
    this.code = code;
    this.status = status;
  }
}
