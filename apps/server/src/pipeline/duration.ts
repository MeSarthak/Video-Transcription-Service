import { spawn } from "node:child_process";

export const getVideoDuration = (inputPath: string) => {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffprobe", [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      inputPath,
    ]);

    let output = "";
    let errorOutput = "";

    ff.stdout.on("data", (d) => (output += d.toString()));
    ff.stderr.on("data", (d) => (errorOutput += d.toString()));

    ff.on("close", (code) => {
      if (code === 0) {
        const duration = parseFloat(output.trim());
        if (isNaN(duration)) {
          reject(new Error("Failed to parse video duration"));
        } else {
          resolve(duration);
        }
      } else {
        reject(new Error(`FFprobe failed: ${errorOutput}`));
      }
    });

    ff.on("error", (err) => {
      reject(new Error(`FFprobe process error: ${err.message}`));
    });
  });
};
