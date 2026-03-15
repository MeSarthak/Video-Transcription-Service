import type { Request, Response } from 'express';
import { asyncHandler } from '../../lib/asyncHandler.js';
import { ApiResponse } from '../../lib/ApiResponse.js';
import { authService } from './auth.service.js';
import { env } from '../../config/env.js';
import type { AuthenticatedRequest } from '../../lib/types.js';

/** Cookie options — secure in production, lax in dev */
function cookieOptions() {
  const isProd = env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: (isProd ? 'none' : 'lax') as 'none' | 'lax',
  };
}

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { username, fullname, email, password } = req.body;

  const files = req.files as Record<string, Express.Multer.File[]> | undefined;
  const avatarLocalPath = files?.avatar?.[0]?.path;
  const coverImageLocalPath = files?.coverImage?.[0]?.path;

  const user = await authService.register({
    username,
    fullname,
    email,
    password,
    avatarLocalPath,
    coverImageLocalPath,
  });

  ApiResponse.send(res, 201, user, 'User created successfully');
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password } = req.body;

  const { user, accessToken, refreshToken } = await authService.login({
    email,
    username,
    password,
  });

  const opts = cookieOptions();

  res
    .status(200)
    .cookie('refreshToken', refreshToken, opts)
    .cookie('accessToken', accessToken, opts)
    .json(
      new ApiResponse(200, { user, accessToken, refreshToken }, 'User logged in successfully'),
    );
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  await authService.logout(user._id);

  const opts = cookieOptions();

  res
    .status(200)
    .clearCookie('refreshToken', opts)
    .clearCookie('accessToken', opts)
    .json(new ApiResponse(200, null, 'User logged out successfully'));
});

export const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingToken = req.cookies?.refreshToken || req.body.refreshToken;

  const { accessToken, refreshToken } = await authService.refreshAccessToken(incomingToken);

  const opts = cookieOptions();

  res
    .status(200)
    .cookie('refreshToken', refreshToken, opts)
    .cookie('accessToken', accessToken, opts)
    .json(
      new ApiResponse(200, { accessToken, refreshToken }, 'Access token refreshed successfully'),
    );
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  const { oldPassword, newPassword } = req.body;

  await authService.changePassword(user._id, oldPassword, newPassword);

  ApiResponse.send(res, 200, null, 'Password changed successfully');
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  const { user } = req as AuthenticatedRequest;
  ApiResponse.send(res, 200, user, 'Current user fetched successfully');
});
