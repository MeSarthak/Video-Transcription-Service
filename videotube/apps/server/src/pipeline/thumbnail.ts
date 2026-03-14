import { spawn } from "node:child_process";
import * as path from "node:path";
import * as fs from "node:fs";

// Validate videoId to prevent path traversal
const validateVideoId = (videoId: any) => {
  const allowedPattern = /^[a-zA-Z0-9_-]+$/;
  if (!allowedPattern.test(videoId)) {
    throw new Error("Invalid videoId: only alphanumeric, hyphen, and underscore allowed");
  }
};

export const generateThumbnail = async (inputPath: string, videoId: string) => {
  // Validate videoId
  validateVideoId(videoId);

  // Validate inputPath - reject URLs and ensure it's a file path
  if (!inputPath || typeof inputPath !== "string") {
    throw new Error("Invalid inputPath: must be a non-empty string");
  }

  // Reject common protocols/schemes
  if (/^(http:\/\/|https:\/\/|ftp:\/\/|pipe:|fd:)/.test(inputPath.toLowerCase())) {
    throw new Error("Invalid inputPath: URLs and protocols not allowed");
  }

  // Resolve to absolute path and verify it's inside allowed directory
  const resolvedPath = path.resolve(inputPath);
  const allowedRoot = path.resolve("public/temp");

  // Check if resolved path is inside allowed directory
  if (
    !resolvedPath.startsWith(allowedRoot + path.sep) &&
    resolvedPath !== allowedRoot
  ) {
    throw new Error("Invalid inputPath: path outside allowed directory");
  }

  const outDir = path.join("public", "temp", videoId);
  fs.mkdirSync(outDir, { recursive: true });
  const thumbPath = path.join(outDir, "thumb.jpg");

  return new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", [
      "-i",
      inputPath,
      "-ss",
      "00:00:02",
      "-vframes",
      "1",
      "-q:v",
      "2",
      "-y", // Overwrite output file without prompting
      thumbPath,
    ]);

    let errStr = "";

    ff.stderr.on("data", (d) => (errStr += d.toString()));

    ff.on("close", (code) => {
      if (code === 0) resolve(thumbPath);
      else reject(new Error(`Thumbnail failed [${code}]: ${errStr}`));
    });

    ff.on("error", (err) => reject(err));
  });
};
