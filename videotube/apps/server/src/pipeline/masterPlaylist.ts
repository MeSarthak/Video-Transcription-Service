import { mkdir, writeFile } from "node:fs/promises";
import * as path from "node:path";

export const generateMasterPlaylist = async (videoId: string, variants: string[]) => {
  // Validate videoId against whitelist (alphanumeric, underscore, hyphen only)
  if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
    throw new Error("Invalid videoId format");
  }

  // Validate variants is an array
  if (!Array.isArray(variants) || variants.length === 0) {
    throw new Error("Variants must be a non-empty array");
  }

  let master = "#EXTM3U\n";

  const bandwidth: Record<string, number> = {
    "360p": 800000,
    "480p": 1400000,
    "720p": 2800000,
    "1080p": 5000000,
  };

  const resolution: Record<string, string> = {
    "360p": "640x360",
    "480p": "854x480",
    "720p": "1280x720",
    "1080p": "1920x1080",
  };

  variants.forEach((v) => {
    // Validate variant exists in bandwidth and resolution maps before appending
    if (!bandwidth.hasOwnProperty(v) || !resolution.hasOwnProperty(v)) {
      throw new Error(`Invalid variant: ${v}. Must be one of: 360p, 480p, 720p, 1080p`);
    }
    master += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidth[v]},RESOLUTION=${resolution[v]}\n`;
    master += `${v}/index.m3u8\n`;
  });

  const masterPath = path.join("public", "temp", videoId, "master.m3u8");

  // Ensure containing directory exists before writing
  const masterDir = path.dirname(masterPath);
  await mkdir(masterDir, { recursive: true });

  await writeFile(masterPath, master);

  return masterPath;
};
