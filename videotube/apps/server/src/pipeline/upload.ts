import * as fs from "node:fs";
import * as path from "node:path";
import { BlobServiceClient } from "@azure/storage-blob";

let blobServiceClient: any = null;

const getBlobServiceClient = () => {
  if (!blobServiceClient) {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!connectionString) {
      throw new Error(
        "AZURE_STORAGE_CONNECTION_STRING environment variable is not set"
      );
    }
    blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
  }
  return blobServiceClient;
};

const containerName = process.env.CONTAINER_NAME || "videos";

export const uploadHLSFolder = async (folderPath: any, videoId: any) => {
  try {
    // Validate inputs
    if (
      !folderPath ||
      typeof folderPath !== "string" ||
      folderPath.trim() === ""
    ) {
      throw new Error("Invalid folderPath: must be a non-empty string");
    }
    if (
      !videoId ||
      typeof videoId !== "string" ||
      !/^[a-zA-Z0-9_-]+$/.test(videoId)
    ) {
      throw new Error("Invalid videoId format");
    }

    const blobClient = getBlobServiceClient();
    const containerClient = blobClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const uploadedMap = {};

    const walk = async (dir: any, visitedInodes = new Set()) => {
      const entries = await fs.promises.readdir(dir);
      for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        // Use lstat to detect symlinks without following them
        const stat = await fs.promises.lstat(fullPath);

        if (stat.isSymbolicLink()) {
          // Skip symbolic links to prevent circular recursion
          continue;
        }

        if (stat.isDirectory()) {
          // Track inodes to detect circular symlinks (if we decide to follow them)
          const ino = stat.ino;
          if (visitedInodes.has(ino)) {
            continue; // Skip already visited inode
          }
          visitedInodes.add(ino);
          await walk(fullPath, visitedInodes);
        } else if (stat.isFile()) {
          const relativePath = path
            .relative(folderPath, fullPath)
            .replace(/\\/g, "/");
          const blobName = `${videoId}/${relativePath}`;

          // Upload to Azure Blob Storage using stream
          const blockBlobClient = containerClient.getBlockBlobClient(blobName);
          const readStream = fs.createReadStream(fullPath);
          await blockBlobClient.uploadStream(readStream, undefined, undefined, {
            blobHTTPHeaders: { blobContentType: getMimeType(relativePath) },
          });

          // Store blob path (no SAS)
          // @ts-ignore
          uploadedMap[blobName] = blobName;
        }
      }
    };

    await walk(folderPath);
    return uploadedMap;
  } catch (error) {
    throw error;
  }
};

const getMimeType = (file: any) => {
  if (file.endsWith(".ts")) return "video/MP2T";
  if (file.endsWith(".m3u8")) return "application/x-mpegURL";
  if (file.endsWith(".jpg")) return "image/jpeg";
  if (file.endsWith(".srt")) return "text/srt; charset=utf-8";
  if (file.endsWith(".vtt")) return "text/vtt; charset=utf-8";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  if (file.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
};

/**
 * Upload subtitle files to Azure Blob Storage
 *
 * @param {object} localFiles - Object with paths to local subtitle files { srt, vtt, json, txt }
 * @param {string} videoId - Video ID for blob path organization
 * @returns {Promise<{srt: string, vtt: string, json: string, txt: string}>} Blob paths for each format
 */
export const uploadSubtitleFiles = async (localFiles: any, videoId: any) => {
  try {
    if (!videoId || typeof videoId !== "string") {
      throw new Error("Invalid videoId for subtitle upload");
    }

    const blobClient = getBlobServiceClient();
    const containerClient = blobClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const uploadedFiles = {};

    const formats = ["srt", "vtt", "json", "txt"];

    for (const format of formats) {
      const localPath = localFiles[format];

      if (!localPath || !fs.existsSync(localPath)) {
        console.warn(`[Upload] Subtitle file not found for format: ${format}`);
        continue;
      }

      // Blob path: videoId/subtitles/subtitle.{format}
      const blobName = `${videoId}/subtitles/subtitle.${format}`;

      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const readStream = fs.createReadStream(localPath);

      await blockBlobClient.uploadStream(readStream, undefined, undefined, {
        blobHTTPHeaders: { blobContentType: getMimeType(`.${format}`) },
      });

      // @ts-ignore
      uploadedFiles[format] = blobName;
      console.log(`[Upload] Uploaded subtitle: ${blobName}`);
    }

    return uploadedFiles;
  } catch (error) {
    console.error("[Upload] Failed to upload subtitle files:", error);
    throw error;
  }
};

/**
 * Upload a single file to Azure Blob Storage
 *
 * @param {string} localPath - Path to local file
 * @param {string} blobName - Target blob name/path
 * @returns {Promise<string>} Blob path
 */
export const uploadSingleFile = async (localPath: any, blobName: any) => {
  try {
    if (!fs.existsSync(localPath)) {
      throw new Error(`File not found: ${localPath}`);
    }

    const blobClient = getBlobServiceClient();
    const containerClient = blobClient.getContainerClient(containerName);
    await containerClient.createIfNotExists();
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    const readStream = fs.createReadStream(localPath);
    await blockBlobClient.uploadStream(readStream, undefined, undefined, {
      blobHTTPHeaders: { blobContentType: getMimeType(localPath) },
    });

    return blobName;
  } catch (error) {
    console.error(`[Upload] Failed to upload file ${localPath}:`, error);
    throw error;
  }
};
