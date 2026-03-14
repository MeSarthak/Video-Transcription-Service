import mongoose, { Schema, type Document, type Types } from 'mongoose';

export interface IPlaylist extends Document {
  _id: Types.ObjectId;
  name: string;
  description: string;
  videos: Types.ObjectId[];
  owner: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const playlistSchema = new Schema<IPlaylist>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    // Kept embedded; paginate populate queries in service layer
    videos: [{ type: Schema.Types.ObjectId, ref: 'Video' }],
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

playlistSchema.index({ owner: 1, createdAt: -1 });

export const Playlist = mongoose.model<IPlaylist>('Playlist', playlistSchema);
