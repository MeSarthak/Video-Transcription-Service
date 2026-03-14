import { spawn } from "node:child_process";

export const hasAudioTrack = async (inputPath: string) => {
  return new Promise((resolve, reject) => {
    const ff = spawn("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "a",
      "-show_entries",
      "stream=index",
      "-of",
      "csv=p=0",
      inputPath,
    ]);

    let output = "";
    let stderr = "";
    ff.stdout.on("data", (d) => (output += d.toString()));
    ff.stderr.on("data", (d) => (stderr += d.toString()));

    ff.on("close", (code) => {
      // Check exit code
      if (code !== 0) {
        reject(new Error(`ffprobe failed with exit code ${code}: ${stderr}`));
      } else {
        // Audio stream found if output is not empty
        resolve(output.trim().length > 0);
      }
    });

    ff.on("error", reject);
  });
};
