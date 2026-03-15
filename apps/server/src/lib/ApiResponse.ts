import type { Response } from 'express';

/**
 * Standard success-response helper.
 * Sends a JSON envelope and returns void so controllers can just
 * `return ApiResponse.send(res, 200, data, "Done")`.
 */
export class ApiResponse {
  public readonly statusCode: number;
  public readonly data: unknown;
  public readonly message: string;
  public readonly success: boolean;

  constructor(statusCode: number, data: unknown, message = 'Success') {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }

  /**
   * Convenience static to build + send in one call.
   */
  static send(
    res: Response,
    statusCode: number,
    data: unknown,
    message = 'Success',
  ): void {
    res.status(statusCode).json(new ApiResponse(statusCode, data, message));
  }
}
