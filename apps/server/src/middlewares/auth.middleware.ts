import jwt from 'jsonwebtoken';
import { asyncHandler } from '../lib/asyncHandler.js';
import { ApiError } from '../lib/ApiError.js';
import { env } from '../config/env.js';
import { User } from '../modules/user/user.model.js';
import type { Request, Response, NextFunction } from 'express';
import type { AuthenticatedRequest, OptionalAuthRequest } from '../lib/types.js';

interface JwtPayload {
  _id: string;
}

/**
 * Requires a valid access token.
 * Populates `req.user` with the authenticated user.
 */
export const verifyJWT = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      throw new ApiError(401, 'Access token is missing');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload;
    } catch (jwtError) {
      if (jwtError instanceof jwt.TokenExpiredError) {
        throw new ApiError(401, 'Access token has expired');
      }
      if (jwtError instanceof jwt.JsonWebTokenError) {
        throw new ApiError(401, 'Invalid access token');
      }
      throw new ApiError(401, 'Token verification failed');
    }

    // Note: No longer selecting -refreshToken since it's in a separate collection
    const user = await User.findById(decoded._id).select('-password').lean();
    if (!user) {
      throw new ApiError(401, 'User associated with token not found');
    }

    (req as AuthenticatedRequest).user = {
      _id: user._id,
      email: user.email,
      username: user.username,
      fullname: user.fullname,
    };

    next();
  },
);

/**
 * Optional auth — proceeds even without a token.
 * Sets `req.user` to undefined if no valid token is present.
 */
export const optionalVerifyJWT = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const token =
      req.cookies?.accessToken ||
      req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      (req as OptionalAuthRequest).user = undefined;
      return next();
    }

    try {
      const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as JwtPayload;
      const user = await User.findById(decoded._id).select('-password').lean();

      (req as OptionalAuthRequest).user = user
        ? {
            _id: user._id,
            email: user.email,
            username: user.username,
            fullname: user.fullname,
          }
        : undefined;
    } catch {
      (req as OptionalAuthRequest).user = undefined;
    }

    next();
  },
);
