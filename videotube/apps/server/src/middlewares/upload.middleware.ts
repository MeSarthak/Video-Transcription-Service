import multer from 'multer';
import path from 'node:path';
import { readFile, unlink } from 'node:fs/promises';
import { fileTypeFromBuffer } from 'file-type';
import { ALLOWED_MIMES, UPLOAD_LIMITS } from '@videotube/shared';
import type { Request, Response, NextFunction } from 'express';

// ── Disk storage for video uploads (needs local path for FFmpeg) ──

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    cb(null, './public/temp/');
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

      let allowedList: readonly string[] = [];
      if (fieldName === 'video') {
        allowedList = ALLOWED_MIMES.VIDEO;
      } else if (fieldName === 'thumbnail' || fieldName === 'avatar' || fieldName === 'coverImage') {
        allowedList = ALLOWED_MIMES.IMAGE;
      } else {
        continue;
      }

      // Read from path (disk) or buffer (memory)
      const buffer = file.path
        ? await readFile(file.path)
        : file.buffer;

      const detected = await fileTypeFromBuffer(buffer);

      if (!detected || !allowedList.includes(detected.mime)) {
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
  } catch {
    res.status(400).json({
      statusCode: 400,
      data: null,
      message: 'File validation failed',
      success: false,
      errors: [],
    });
  }
}
