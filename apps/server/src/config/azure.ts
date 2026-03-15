import {
  BlobServiceClient,
  type ContainerClient,
  type BlockBlobClient,
} from '@azure/storage-blob';
import fs from 'node:fs';
import path from 'node:path';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

// ── Singleton blob client ──────────────────

let blobServiceClient: BlobServiceClient | null = null;

function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClient) {
    blobServiceClient = BlobServiceClient.fromConnectionString(
      env.AZURE_STORAGE_CONNECTION_STRING,
    );
  }
  return blobServiceClient;
}

function getContainerClient(): ContainerClient {
  return getBlobServiceClient().getContainerClient(env.CONTAINER_NAME);
}

// ── MIME helper ────────────────────────────

function getMimeType(file: string): string {
  if (file.endsWith('.ts')) return 'video/MP2T';
  if (file.endsWith('.m3u8')) return 'application/x-mpegURL';
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) return 'image/jpeg';
  if (file.endsWith('.png')) return 'image/png';
  if (file.endsWith('.srt')) return 'text/srt; charset=utf-8';
  if (file.endsWith('.vtt')) return 'text/vtt; charset=utf-8';
  if (file.endsWith('.json')) return 'application/json; charset=utf-8';
  if (file.endsWith('.txt')) return 'text/plain; charset=utf-8';
  return 'application/octet-stream';
}

// ── Public API ─────────────────────────────

/**
 * Recursively upload an HLS output folder to Azure Blob Storage.
 * Returns a map of blobName → blobName for all uploaded files.
 */
export async function uploadHLSFolder(
  folderPath: string,
  videoId: string,
): Promise<Record<string, string>> {
  if (!folderPath || typeof folderPath !== 'string' || folderPath.trim() === '') {
    throw new Error('Invalid folderPath: must be a non-empty string');
  }
  if (!videoId || !/^[a-zA-Z0-9_-]+$/.test(videoId)) {
    throw new Error('Invalid videoId format');
  }

  const container = getContainerClient();
  const uploadedMap: Record<string, string> = {};

  async function walk(dir: string, visitedInodes = new Set<number>()): Promise<void> {
    const entries = await fs.promises.readdir(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = await fs.promises.lstat(fullPath);

      if (stat.isSymbolicLink()) continue;

      if (stat.isDirectory()) {
        const ino = stat.ino;
        if (visitedInodes.has(ino)) continue;
        visitedInodes.add(ino);
        await walk(fullPath, visitedInodes);
      } else if (stat.isFile()) {
        const relativePath = path.relative(folderPath, fullPath).replace(/\\/g, '/');
        const blobName = `${videoId}/${relativePath}`;

        const blockBlob: BlockBlobClient = container.getBlockBlobClient(blobName);
        const readStream = fs.createReadStream(fullPath);
        await blockBlob.uploadStream(readStream, undefined, undefined, {
          blobHTTPHeaders: { blobContentType: getMimeType(relativePath) },
        });

        uploadedMap[blobName] = blobName;
      }
    }
  }

  await walk(folderPath);
  return uploadedMap;
}

/**
 * Upload subtitle files to Azure Blob Storage.
 */
export async function uploadSubtitleFiles(
  localFiles: Record<string, string>,
  videoId: string,
): Promise<Record<string, string>> {
  if (!videoId || typeof videoId !== 'string') {
    throw new Error('Invalid videoId for subtitle upload');
  }

  const container = getContainerClient();
  const uploadedFiles: Record<string, string> = {};
  const formats = ['srt', 'vtt', 'json', 'txt'] as const;

  for (const format of formats) {
    const localPath = localFiles[format];
    if (!localPath || !fs.existsSync(localPath)) {
      logger.warn({ format }, 'Subtitle file not found');
      continue;
    }

    const blobName = `${videoId}/subtitles/subtitle.${format}`;
    const blockBlob = container.getBlockBlobClient(blobName);
    const readStream = fs.createReadStream(localPath);

    await blockBlob.uploadStream(readStream, undefined, undefined, {
      blobHTTPHeaders: { blobContentType: getMimeType(`.${format}`) },
    });

    uploadedFiles[format] = blobName;
    logger.info({ blobName }, 'Subtitle uploaded');
  }

  return uploadedFiles;
}

/**
 * Upload a single file to Azure Blob Storage.
 */
export async function uploadSingleFile(
  localPath: string,
  blobName: string,
): Promise<string> {
  if (!fs.existsSync(localPath)) {
    throw new Error(`File not found: ${localPath}`);
  }

  const container = getContainerClient();
  const blockBlob = container.getBlockBlobClient(blobName);
  const readStream = fs.createReadStream(localPath);

  await blockBlob.uploadStream(readStream, undefined, undefined, {
    blobHTTPHeaders: { blobContentType: getMimeType(localPath) },
  });

  return blobName;
}

/**
 * Delete all blobs under a given prefix (e.g. all files for a videoId).
 * Returns the list of deleted blob names.
 */
export async function deleteBlobsByPrefix(prefix: string): Promise<string[]> {
  const container = getContainerClient();
  const deleted: string[] = [];
  for await (const blob of container.listBlobsFlat({ prefix })) {
    await container.deleteBlob(blob.name);
    deleted.push(blob.name);
  }
  return deleted;
}

/**
 * Ensure the container exists. Call once at application startup.
 */
export async function ensureContainerExists(): Promise<void> {
  const container = getContainerClient();
  await container.createIfNotExists();
  logger.info({ container: env.CONTAINER_NAME }, 'Azure container ready');
}

export { getBlobServiceClient, getContainerClient };
