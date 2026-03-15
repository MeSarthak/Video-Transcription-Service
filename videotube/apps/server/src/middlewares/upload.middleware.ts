import multer from 'multer';
import path from 'node:path';
import { unlink } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_MIMES, UPLOAD_LIMITS } from '@videotube/shared';
import type { Request, Response, NextFunction } from 'express';
import { TEMP_DIR } from '../pipeline/paths.js';

// ── Disk storage for video uploads (needs local path for FFmpeg) ──

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, TEMP_DIR);
  },
  filename(_req, file, cb) {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const fieldName = file.fieldname;
  const declaredMime = file.mimetype;

  let allowedList: readonly string[] = [];
  if (fieldName === 'video') {
    allowedList = ALLOWED_MIMES.VIDEO;
  } else if (fieldName === 'thumbnail' || fieldName === 'avatar' || fieldName === 'coverImage') {
    allowedList = ALLOWED_MIMES.IMAGE;
  } else {
    return cb(null, true);
  }

  if (!allowedList.includes(declaredMime)) {
    return cb(new Error(`Invalid ${fieldName} MIME type: ${declaredMime}`));
  }

  cb(null, true);
};

/** Disk-based multer for video/thumbnail uploads */
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_LIMITS.VIDEO_MAX_SIZE,
  },
});

/** Memory-based multer for image-only uploads (avatar, cover) */
export const memoryUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: UPLOAD_LIMITS.IMAGE_MAX_SIZE,
  },
});

/**
 * Post-upload middleware that validates actual file binary signatures.
 * Detects forged extensions / MIME types.
 */
export async function validateFileSignature(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const files: Express.Multer.File[] = [];

  if (req.file) files.push(req.file);
  if (req.files) {
    if (Array.isArray(req.files)) {
      files.push(...req.files);
    } else {
      for (const fileList of Object.values(req.files)) {
        files.push(...fileList);
      }
    }
  }

  if (files.length === 0) {
    next();
    return;
  }

  try {
    for (const file of files) {
      const fieldName = file.fieldname;
      console.log(`[validateFileSignature] field=${fieldName} path=${file.path} size=${file.size}`);

      let allowedList: readonly string[] = [];
      if (fieldName === 'video') {
        allowedList = ALLOWED_MIMES.VIDEO;
      } else if (fieldName === 'thumbnail' || fieldName === 'avatar' || fieldName === 'coverImage') {
        allowedList = ALLOWED_MIMES.IMAGE;
      } else {
        continue;
      }

      // Only read first 4100 bytes for magic-byte detection — no need to load entire file
      const { createReadStream } = await import('node:fs');
      const buffer = await new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];
        let total = 0;
        const stream = createReadStream(file.path, { start: 0, end: 4099 });
        stream.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
          total += chunk.length;
        });
        stream.on('end', () => resolve(Buffer.concat(chunks)));
        stream.on('error', reject);
      });

      const detected = await fileTypeFromBuffer(buffer);
      console.log(`[validateFileSignature] detected=${JSON.stringify(detected)} allowed=${allowedList.join(',')}`);

      if (!detected || !allowedList.includes(detected.mime)) {
        console.log(`[validateFileSignature] REJECTED field=${fieldName} detected=${detected?.mime}`);
        if (file.path) await unlink(file.path).catch(() => {});
        res.status(400).json({
          statusCode: 400,
          data: null,
          message: `Invalid ${fieldName} file. Signature does not match declared type.`,
          success: false,
          errors: [],
        });
        return;
      }

      file.mimetype = detected.mime;
    }

    next();
  } catch (err: unknown) {
    console.error('[validateFileSignature] ERROR:', err instanceof Error ? err.message : String(err));
    res.status(400).json({
      statusCode: 400,
      data: null,
      message: 'File validation failed',
      success: false,
      errors: [],
    });
  }
}
