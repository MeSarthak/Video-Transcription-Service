import type { Request } from 'express';
import type { Types } from 'mongoose';

/**
 * Extends Express Request with an authenticated user payload.
 * Populated by the auth middleware after JWT verification.
 */
export interface AuthenticatedRequest extends Request {
  user: {
    _id: Types.ObjectId;
    email: string;
    username: string;
    fullname: string;
  };
}

/**
 * Optional auth — user may or may not be present.
 */
export interface OptionalAuthRequest extends Request {
  user?: AuthenticatedRequest['user'];
}
