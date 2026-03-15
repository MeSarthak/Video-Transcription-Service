import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { processVideo } from "../pipeline/videoProcessor.js";
import { Video } from "../modules/video/video.model.js";
// import { ApiError } from "../lib/ApiError.js";
import * as fs from "node:fs";
import { env } from "../config/env.js";

const redisUrl = env.REDIS_URL;
const isSecure = redisUrl.startsWith("rediss://");

// Build TLS config for secure connections
let tlsConfig: Record<string, unknown> | undefined;
if (isSecure) {
  tlsConfig = {
    servername: new URL(redisUrl).hostname,
    rejectUnauthorized: env.NODE_ENV !== "development",
  };
  if (env.REDIS_CA) {
    try {
      tlsConfig.ca = [fs.readFileSync(env.REDIS_CA, "utf-8")];
    } catch (err: any) {
      console.warn(
        `[Worker] Failed to load REDIS_CA from ${env.REDIS_CA}:`,
        err.message
      );
    }
  }
}

const connection = new Redis(redisUrl, {
  maxRetriesPerRequest: null,
  connectTimeout: 20000,
  retryStrategy: function (times) {
    return Math.min(times * 100, 3000);
  },
  tls: tlsConfig,
});

connection.on("error", (err) => {
  console.error(`[Worker] Redis connection error: ${err.message}`);
});

const worker = new Worker(
  "video-processing",
  async (job) => {
    const {
      videoPath,
      videoId,
      // @ts-ignore
      userId,
      // @ts-ignore
      title,
      // @ts-ignore
      description,
      // Subtitle options (new)
      subtitleLanguage = "auto",
      subtitleTask = "transcribe",
      thumbnailPath,
    } = job.data;

    console.log(`[Worker] Start processing job ${job.id} for video ${videoId}`);
    console.log(`[Worker] Video path: ${videoPath}`);
    console.log(
      `[Worker] Subtitle options: language=${subtitleLanguage}, task=${subtitleTask}`
    );

    try {
      // Update status to processing
      await Video.findByIdAndUpdate(videoId, {
        status: "processing",
        uploadStatus: "processing",
        "subtitles.status": "processing",
        "subtitles.language": subtitleLanguage,
        "subtitles.task": subtitleTask,
      });
      console.log(
        `[Worker] Updated status to 'processing' for video ${videoId}`
      );

      // 1. Process Video (includes HLS, thumbnail, and transcription)
      // Pass videoId so the processor uses the same ID as the database record
      const { masterUrl, variants, thumbnailUrl, duration, transcription } =
        await processVideo(videoPath, videoId, {
          language: subtitleLanguage,
          task: subtitleTask,
          thumbnailPath,
        });

      if (!masterUrl || !variants) {
        throw new Error(
          "Video processing pipeline failed: Missing masterUrl or variants"
        );
      }

      console.log(
        `[Worker] Video processed successfully. Duration: ${duration}`
      );

      // 2. Prepare subtitle update data
      let subtitleUpdate = {};

      if (transcription && !transcription.error) {
        // Transcription succeeded
        subtitleUpdate = {
          "subtitles.status": "completed",
          "subtitles.files": transcription.files,
          "subtitles.detectedLanguage": transcription.detectedLanguage,
          "subtitles.segmentCount": transcription.segmentCount,
          "subtitles.processedAt": new Date(),
        };
        console.log(
          `[Worker] Transcription completed. Language: ${transcription.detectedLanguage}, Segments: ${transcription.segmentCount}`
        );
      } else if (transcription && transcription.error) {
        // Transcription failed (soft failure - video still publishes)
        subtitleUpdate = {
          "subtitles.status": "failed",
          "subtitles.errorMessage": transcription.error,
          "subtitles.processedAt": new Date(),
        };
        console.warn(`[Worker] Transcription failed: ${transcription.error}`);
      }

      // 3. Update Video in MongoDB (including subtitle data)
      const video = await Video.findByIdAndUpdate(
        videoId,
        {
          masterPlaylist: masterUrl,
          variants,
          thumbnail: thumbnailUrl,
          duration,
          status: "published",
          uploadStatus: "completed",
          isPublished: true,
          ...subtitleUpdate,
        },
        { new: true }
      );

      // Check if video document still exists after update
      if (!video) {
        console.error(
          `[Worker] Video document ${videoId} not found after update - may have been deleted`
        );
        throw new Error("Video document was deleted during processing");
      }

      // 4. Cleanup local source file on success
      if (fs.existsSync(videoPath)) {
        try {
          await fs.promises.unlink(videoPath);
          console.log(`[Worker] Cleaned up local file ${videoPath}`);
        } catch (cleanupErr: any) {
          // Log but don't throw - cleanup failure shouldn't fail the job
          console.warn(
            `[Worker] Failed to cleanup video file ${videoPath}:`,
            cleanupErr.message
          );
        }
      }

      console.log(
        `[Worker] Job ${job.id} finished successfully for video ${videoId}`
      );
      return video;
    } catch (error: any) {
      console.error(
        `[Worker] Failed to process video ${videoId} (Job ${job.id}):`,
        error
      );

      await Video.findByIdAndUpdate(videoId, {
        status: "failed",
        uploadStatus: "failed",
        errorMessage: error.message,
        "subtitles.status": "failed",
        "subtitles.errorMessage": error.message,
      });
      console.log(`[Worker] Updated status to 'failed' for video ${videoId}`);

      // Only delete the source file on the final attempt — keep it alive for retries.
      const maxAttempts = job.opts?.attempts ?? 1;
      const attemptsMade = job.attemptsMade ?? 1;
      const isFinalAttempt = attemptsMade >= maxAttempts;
      if (isFinalAttempt && fs.existsSync(videoPath)) {
        try {
          fs.unlinkSync(videoPath);
          console.log(
            `[Worker] Cleaned up local file ${videoPath} after final failure`
          );
        } catch (cleanupErr) {
          console.error("Failed to cleanup video file:", cleanupErr);
        }
      }

      throw error;
    }
  },
  { connection: connection as any }
);

worker.on("completed", (job) => {
  console.log(`[Worker] Job ${job.id} completed event received!`);
});

worker.on("failed", (job, err) => {
  if (job) {
    console.error(
      `[Worker] Job ${job.id} failed event received with ${err.message}`
    );
  } else {
    console.error(
      `[Worker] Job failed with error: ${err?.message || "Unknown error"}`
    );
  }
});

export default worker;
