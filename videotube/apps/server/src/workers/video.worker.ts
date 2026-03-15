import { Worker } from 'bullmq';
import { redis } from '../config/redis.js';
import { processVideo } from '../pipeline/videoProcessor.js';
import { Video } from '../modules/video/video.model.js';
import { logger } from '../lib/logger.js';
import type { VideoProcessingJobData } from '../queues/video.queue.js';
import * as fs from 'node:fs';

const worker = new Worker<VideoProcessingJobData>(
  'video-processing',
  async (job) => {
    const {
      videoPath,
      videoId,
      subtitleLanguage = 'auto',
      subtitleTask = 'transcribe',
      thumbnailPath,
    } = job.data;

    logger.info({ jobId: job.id, videoId }, 'Worker: start processing job');
    logger.info({ videoPath }, 'Worker: video path');
    logger.info({ subtitleLanguage, subtitleTask }, 'Worker: subtitle options');

    try {
      // Update status to processing
      await Video.findByIdAndUpdate(videoId, {
        status: 'processing',
        uploadStatus: 'processing',
        'subtitles.status': 'processing',
        'subtitles.language': subtitleLanguage,
        'subtitles.task': subtitleTask,
      });
      logger.info({ videoId }, "Worker: updated status to 'processing'");

      // 1. Process Video (includes HLS, thumbnail, and transcription)
      const { masterUrl, variants, thumbnailUrl, duration, transcription } =
        await processVideo(videoPath, videoId, {
          language: subtitleLanguage,
          task: subtitleTask,
          thumbnailPath,
        });

      if (!masterUrl || !variants) {
        throw new Error('Video processing pipeline failed: Missing masterUrl or variants');
      }

      logger.info({ duration }, 'Worker: video processed successfully');

      // 2. Prepare subtitle update data
      let subtitleUpdate: Record<string, unknown> = {};

      if (transcription && !transcription.error) {
        subtitleUpdate = {
          'subtitles.status': 'completed',
          'subtitles.files': transcription.files,
          'subtitles.detectedLanguage': transcription.detectedLanguage,
          'subtitles.segmentCount': transcription.segmentCount,
          'subtitles.processedAt': new Date(),
        };
        logger.info(
          { language: transcription.detectedLanguage, segments: transcription.segmentCount },
          'Worker: transcription completed',
        );
      } else if (transcription && transcription.error) {
        subtitleUpdate = {
          'subtitles.status': 'failed',
          'subtitles.errorMessage': transcription.error,
          'subtitles.processedAt': new Date(),
        };
        logger.warn({ error: transcription.error }, 'Worker: transcription failed');
      }

      // 3. Update Video in MongoDB (including subtitle data)
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          masterPlaylist: masterUrl,
          variants,
          thumbnail: thumbnailUrl,
          duration,
          status: 'published',
          uploadStatus: 'completed',
          isPublished: true,
          ...subtitleUpdate,
        },
        { new: true },
      );

      if (!video) {
        logger.error({ videoId }, 'Worker: video document not found after update — may have been deleted');
        throw new Error('Video document was deleted during processing');
      }

      // 4. Cleanup local source file on success
      if (fs.existsSync(videoPath)) {
        try {
          await fs.promises.unlink(videoPath);
          logger.info({ videoPath }, 'Worker: cleaned up local source file');
        } catch (cleanupErr: unknown) {
          logger.warn(
            { videoPath, err: cleanupErr },
            'Worker: failed to cleanup video file',
          );
        }
      }

      logger.info({ jobId: job.id, videoId }, 'Worker: job finished successfully');
      return video;
    } catch (error: unknown) {
      logger.error({ jobId: job.id, videoId, err: error }, 'Worker: failed to process video');

      const errorMessage = error instanceof Error ? error.message : String(error);
      await Video.findByIdAndUpdate(videoId, {
        status: 'failed',
        uploadStatus: 'failed',
        errorMessage,
        'subtitles.status': 'failed',
        'subtitles.errorMessage': errorMessage,
      });
      logger.info({ videoId }, "Worker: updated status to 'failed'");

      // Only delete the source file on the final attempt — keep it alive for retries.
      const maxAttempts = job.opts?.attempts ?? 1;
      const attemptsMade = job.attemptsMade ?? 1;
      const isFinalAttempt = attemptsMade >= maxAttempts;
      if (isFinalAttempt && fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
          logger.info({ videoPath }, 'Worker: cleaned up local file after final failure');
        } catch (cleanupErr: unknown) {
          logger.error({ err: cleanupErr }, 'Worker: failed to cleanup video file');
        }
      }

      throw error;
    }
  },
  { connection: redis as Parameters<typeof Worker>[2]['connection'] },
);

worker.on('completed', (job) => {
  logger.info({ jobId: job.id }, 'Worker: job completed event received');
});

worker.on('failed', (job, err) => {
  if (job) {
    logger.error({ jobId: job.id, err: err.message }, 'Worker: job failed event received');
  } else {
    logger.error({ err: err?.message ?? 'Unknown error' }, 'Worker: job failed with error');
  }
});

export default worker;
