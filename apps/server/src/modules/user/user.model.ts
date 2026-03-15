import mongoose, { Schema, type Document, type Types } from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

// ── Watch-history sub-document ──────────────

const watchHistoryEntrySchema = new Schema(
  {
    video: { type: Schema.Types.ObjectId, ref: 'Video', required: true },
    watchedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ── User schema ─────────────────────────────

export interface IUser extends Document {
  _id: Types.ObjectId;
  username: string;
  fullname: string;
  email: string;
  password: string;
  avatar: string;
  coverImage?: string;
  watchHistory: { video: Types.ObjectId; watchedAt: Date }[];
  subscribersCount: number;
  subscribedToCount: number;
  createdAt: Date;
  updatedAt: Date;

  isPasswordCorrect(password: string): Promise<boolean>;
  generateAccessToken(): string;
  generateRefreshToken(): string;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullname: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    avatar: { type: String, required: true },
    coverImage: { type: String },

    // Capped at WATCH_HISTORY_CAP via $push + $slice in service layer
    watchHistory: {
      type: [watchHistoryEntrySchema],
      default: [],
    },

    // ── Denormalized counters ─────────────────
    subscribersCount: { type: Number, default: 0 },
    subscribedToCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ── Hooks ───────────────────────────────────

userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

// ── Methods ─────────────────────────────────

userSchema.methods.isPasswordCorrect = async function (
  password: string,
): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function (): string {
  return jwt.sign(
    {
      _id: this._id,
      username: this.username,
      email: this.email,
      fullname: this.fullname,
    },
    env.ACCESS_TOKEN_SECRET,
    { expiresIn: env.ACCESS_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] },
  );
};

userSchema.methods.generateRefreshToken = function (): string {
  return jwt.sign(
    { _id: this._id },
    env.REFRESH_TOKEN_SECRET,
    { expiresIn: env.REFRESH_TOKEN_EXPIRY as jwt.SignOptions['expiresIn'] },
  );
};

export const User = mongoose.model<IUser>('User', userSchema);
