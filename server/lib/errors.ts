export class UserError extends Error {
  statusCode: number;
  userMessage: string;

  constructor(statusCode: number, userMessage: string, detail: string) {
    super(detail);
    this.name = "UserError";
    this.statusCode = statusCode;
    this.userMessage = userMessage;
  }
}

export function createUserError(statusCode: number, userMessage: string, detail: string) {
  return new UserError(statusCode, userMessage, detail);
}

export function isUserError(error: unknown): error is UserError {
  return error instanceof UserError;
}
