import { Queue } from 'bullmq';
import { redis } from '../config/redis.js';

export const videoProcessingQueue = new Queue('video-processing', {
  connection: redis as any,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

export interface VideoProcessingJobData {
  videoPath: string;
  videoId: string;
  userId: string;
  title: string;
  description: string;
  subtitleLanguage: string;
  subtitleTask: 'transcribe' | 'translate';
}

export async function addVideoToQueue(data: VideoProcessingJobData) {
  return videoProcessingQueue.add('process-video', data);
}
