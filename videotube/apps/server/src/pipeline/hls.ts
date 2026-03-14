import { spawn } from "node:child_process";
import * as fs from "node:fs";
import { stat } from "node:fs/promises";
import * as path from "node:path";
import { hasAudioTrack } from "./ffprobe.js";

// Validate videoId to prevent path traversal
const validateVideoId = (videoId: string) => {
  const allowedPattern = /^[a-zA-Z0-9_-]+$/;
  if (!allowedPattern.test(videoId)) {
    throw new Error("Invalid videoId: only alphanumeric, hyphen, and underscore allowed");
  }
};

export const generateHLS = async (inputPath: string, videoId: string): Promise<any> => {
  // Validate videoId and compute safe path
  validateVideoId(videoId);

  // Validate inputPath - ensure it's a non-empty string and a regular file
  if (!inputPath || typeof inputPath !== "string" || inputPath.trim() === "") {
    throw new Error("Invalid inputPath: must be a non-empty string");
  }

  // Check if file exists and is a regular file
  let fileStat;
  try {
    fileStat = await stat(inputPath);
    if (!fileStat.isFile()) {
      throw new Error("inputPath must be a regular file");
    }
  } catch (err: any) {
    throw new Error(`inputPath does not exist or is not accessible: ${err.message}`);
  }

  const intendedRoot = path.resolve("public", "temp");
  const resolved = path.resolve(intendedRoot, videoId);

  // Verify resolved path is inside intended root with separator-aware check
  if (resolved !== intendedRoot && !resolved.startsWith(intendedRoot + path.sep)) {
    throw new Error("Invalid path: path traversal detected");
  }

  const baseFolder = resolved;
  fs.mkdirSync(baseFolder, { recursive: true });

  const audioExists = await hasAudioTrack(inputPath);

  const variants = [
    {
      name: "360p",
      width: 640,
      height: 360,
      videoBitrate: "800k",
      audioBitrate: "64k",
    },
    {
      name: "480p",
      width: 854,
      height: 480,
      videoBitrate: "1400k",
      audioBitrate: "96k",
    },
    {
      name: "720p",
      width: 1280,
      height: 720,
      videoBitrate: "2800k",
      audioBitrate: "128k",
    },
    {
      name: "1080p",
      width: 1920,
      height: 1080,
      videoBitrate: "5000k",
      audioBitrate: "192k",
    },
  ];

  const ffArgs = [
    "-y", // Automatically overwrite output files
    "-i",
    inputPath,
    "-preset",
    "veryfast",
    "-g",
    "48",
    "-sc_threshold",
    "0",
  ];

  variants.forEach((v) => {
    const outDir = path.join(baseFolder, v.name);
    fs.mkdirSync(outDir, { recursive: true });

    ffArgs.push("-map", "0:v:0");
    if (audioExists) ffArgs.push("-map", "0:a:0?");

    ffArgs.push(
      "-vf",
      // Scale down to fit within target dimensions (preserving aspect ratio),
      // then pad to exact size, then ensure even dimensions for libx264.
      // This handles: odd-dimension sources, portrait videos, any aspect ratio.
      `scale=w=${v.width}:h=${v.height}:force_original_aspect_ratio=decrease,` +
      `pad=${v.width}:${v.height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
      `scale=trunc(iw/2)*2:trunc(ih/2)*2`,
      "-c:v",
      "libx264",
      "-b:v",
      v.videoBitrate,
      "-maxrate",
      v.videoBitrate,
      "-bufsize",
      "2M"
    );

    if (audioExists) {
      ffArgs.push("-c:a", "aac", "-b:a", v.audioBitrate);
    }

    ffArgs.push(
      "-f",
      "hls",
      "-hls_time",
      "4",
      "-hls_playlist_type",
      "vod",
      "-hls_segment_filename",
      `${outDir}/segment_%03d.ts`,
      `${outDir}/index.m3u8`
    );
  });

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ffArgs);
    let errorOutput = "";
    let timer;

    // Add watchdog timeout (e.g., 2 hours for very large videos)
    const timeoutMs = 2 * 60 * 60 * 1000;
    timer = setTimeout(() => {
      ff.kill("SIGKILL");
      reject(new Error("FFmpeg HLS processing timeout"));
    }, timeoutMs);

    ff.stderr.on("data", (d) => {
      // Append first, then enforce cap on buffer size
      const chunk = d.toString();
      errorOutput += chunk;
      // Prevent memory leaks by limiting error log size (keep last ~2KB)
      if (errorOutput.length > 2000) {
        errorOutput = errorOutput.slice(-2000);
      }
    });

    ff.on("close", (code) => {
      clearTimeout(timer); // Clear timeout on normal exit
      if (code === 0) {
        resolve({
          baseFolder,
          variants: variants.map((v) => v.name),
        });
      } else {
        reject(new Error(`FFmpeg HLS Failed [${code}]: ${errorOutput}`));
      }
    });

    ff.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
};
