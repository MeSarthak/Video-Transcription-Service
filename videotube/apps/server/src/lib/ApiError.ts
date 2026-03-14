/**
 * Custom operational error for API responses.
 * Extends native Error so it works with instanceof checks
 * and carries an HTTP status code.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly data: null;
  public readonly success: false;
  public readonly errors: unknown[];

  constructor(
    statusCode: number,
    message = 'Something went wrong',
    errors: unknown[] = [],
    stack?: string,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.data = null;
    this.success = false;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
