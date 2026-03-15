import mongoose, { Schema, type Document, type Types, type AggregatePaginateModel } from 'mongoose';
import aggregatePaginate from 'mongoose-aggregate-paginate-v2';

// ── Subtitle sub-document ───────────────────

const subtitleSchema = new Schema(
  {
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed', 'disabled'],
      default: 'pending',
    },
    language: { type: String, default: 'auto' },
    detectedLanguage: { type: String },
    task: {
      type: String,
      enum: ['transcribe', 'translate'],
      default: 'transcribe',
    },
    files: {
      srt: { type: String },
      vtt: { type: String },
      json: { type: String },
      txt: { type: String },
    },
    segmentCount: { type: Number },
    errorMessage: { type: String },
    processedAt: { type: Date },
  },
  { _id: false },
);

// ── Video schema ────────────────────────────

export interface IVideo extends Document {
  _id: Types.ObjectId;
  title: string;
  description: string;
  tags: string[];
  duration?: number;
  segmentsBasePath?: string;
  masterPlaylist?: string;
  variants: string[];
  thumbnail?: string;
  views: number;
  isPublished: boolean;
  status: 'pending' | 'processing' | 'published' | 'failed';
  uploadStatus: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
  subtitles: {
    status: string;
    language: string;
    detectedLanguage?: string;
    task: string;
    files?: { srt?: string; vtt?: string; json?: string; txt?: string };
    segmentCount?: number;
    errorMessage?: string;
    processedAt?: Date;
  };
  owner: Types.ObjectId;

  // Denormalized counters
  likesCount: number;
  commentsCount: number;

  createdAt: Date;
  updatedAt: Date;
}

const videoSchema = new Schema<IVideo>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    tags: [{ type: String }],
    duration: { type: Number },
    segmentsBasePath: { type: String },
    masterPlaylist: { type: String },
    variants: [{ type: String }],
    thumbnail: { type: String },

    views: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['pending', 'processing', 'published', 'failed'],
      default: 'pending',
    },
    uploadStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    errorMessage: { type: String },

    subtitles: {
      type: subtitleSchema,
      default: () => ({ status: 'pending', language: 'auto', task: 'transcribe' }),
    },

    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    // ── Denormalized counters ─────────────────
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
  },
  { timestamps: true },
);

// ── Text index for search ───────────────────
videoSchema.index(
  { title: 'text', tags: 'text', description: 'text' },
  { weights: { title: 10, tags: 5, description: 1 }, name: 'video_text_search' },
);

// ── Compound indexes ────────────────────────
videoSchema.index({ owner: 1, status: 1, createdAt: -1 });
videoSchema.index({ isPublished: 1, status: 1, createdAt: -1 });

videoSchema.plugin(aggregatePaginate);

export const Video = mongoose.model<IVideo, AggregatePaginateModel<IVideo>>(
  'Video',
  videoSchema,
);
