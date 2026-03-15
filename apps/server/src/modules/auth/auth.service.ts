import jwt from 'jsonwebtoken';
import ms from '../../lib/ms.js';
import { User, type IUser } from '../user/user.model.js';
import { RefreshToken } from './refreshToken.model.js';
import { uploadOnCloudinary } from '../../config/cloudinary.js';
import { ApiError } from '../../lib/ApiError.js';
import { env } from '../../config/env.js';
import type { Types } from 'mongoose';

// ── Token helpers ───────────────────────────

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

/**
 * Generate access + refresh tokens and persist refresh token
 * in the RefreshToken collection.
 */
async function generateTokens(user: IUser): Promise<TokenPair> {
  const accessToken = user.generateAccessToken();
  const refreshToken = user.generateRefreshToken();

  const expiresAt = new Date(Date.now() + ms(env.REFRESH_TOKEN_EXPIRY));

  await RefreshToken.create({
    user: user._id,
    token: refreshToken,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

// ── Service ─────────────────────────────────

interface RegisterParams {
  username: string;
  fullname: string;
  email: string;
  password: string;
  avatarLocalPath?: string;
  coverImageLocalPath?: string;
}

interface LoginParams {
  email?: string;
  username?: string;
  password: string;
}

class AuthService {
  async register({
    username,
    fullname,
    email,
    password,
    avatarLocalPath,
    coverImageLocalPath,
  }: RegisterParams) {
    const existing = await User.findOne({
      $or: [{ email }, { username }],
    });
    if (existing) {
      throw new ApiError(409, 'User already exists with this email or username');
    }

    if (!avatarLocalPath) {
      throw new ApiError(400, 'Avatar image is required');
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
      throw new ApiError(500, 'Avatar upload failed');
    }

    let coverImageUrl = '';
    if (coverImageLocalPath) {
      const coverImage = await uploadOnCloudinary(coverImageLocalPath);
      coverImageUrl = coverImage?.url ?? '';
    }

    const user = await User.create({
      fullname,
      avatar: avatar.url,
      coverImage: coverImageUrl,
      email,
      password,
      username,
    });

    const created = await User.findById(user._id).select('-password').lean();
    if (!created) {
      throw new ApiError(500, 'User creation failed');
    }

    return created;
  }

  async login({ email, username, password }: LoginParams) {
    // Build dynamic query
    const conditions: Record<string, string>[] = [];
    if (username) conditions.push({ username });
    if (email) conditions.push({ email });

    if (conditions.length === 0) {
      throw new ApiError(400, 'Email or username is required');
    }

    const query = conditions.length === 1 ? conditions[0] : { $or: conditions };
    const user = await User.findOne(query);

    // Generic message to prevent enumeration
    if (!user) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const valid = await user.isPasswordCorrect(password);
    if (!valid) {
      throw new ApiError(401, 'Invalid credentials');
    }

    const { accessToken, refreshToken } = await generateTokens(user);

    const loggedInUser = await User.findById(user._id).select('-password').lean();

    return { user: loggedInUser, accessToken, refreshToken };
  }

  async logout(userId: Types.ObjectId) {
    // Remove all refresh tokens for this user (all devices)
    await RefreshToken.deleteMany({ user: userId });
  }

  async refreshAccessToken(incomingToken: string | undefined) {
    if (!incomingToken) {
      throw new ApiError(401, 'Refresh token is missing');
    }

    // Verify signature
    let decoded: { _id: string };
    try {
      decoded = jwt.verify(incomingToken, env.REFRESH_TOKEN_SECRET) as { _id: string };
    } catch {
      throw new ApiError(401, 'Invalid refresh token');
    }

    // Check it exists in DB (prevents reuse of revoked tokens)
    const stored = await RefreshToken.findOne({ token: incomingToken });
    if (!stored) {
      throw new ApiError(401, 'Refresh token has been revoked');
    }

    const user = await User.findById(decoded._id);
    if (!user) {
      throw new ApiError(401, 'User not found');
    }

    // Rotate: delete old, issue new pair
    await RefreshToken.deleteOne({ _id: stored._id });
    return generateTokens(user);
  }

  async changePassword(
    userId: Types.ObjectId,
    oldPassword: string,
    newPassword: string,
  ) {
    const user = await User.findById(userId);
    if (!user) {
      throw new ApiError(404, 'User not found');
    }

    const correct = await user.isPasswordCorrect(oldPassword);
    if (!correct) {
      throw new ApiError(400, 'Old password is incorrect');
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: true });
  }
}

export const authService = new AuthService();
