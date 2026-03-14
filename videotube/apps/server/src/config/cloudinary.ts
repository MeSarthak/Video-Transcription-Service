import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import fs from 'node:fs';
import { env } from './env.js';
import { logger } from '../lib/logger.js';

/**
 * Configure the Cloudinary SDK.
 * Call once at startup.
 */
export function configureCloudinary(): void {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
  });
  logger.info('Cloudinary configured');
}

/**
 * Upload a local file to Cloudinary and clean up the temp file.
 * Returns the Cloudinary response, or null on failure.
 */
export async function uploadOnCloudinary(
  localFilePath: string,
): Promise<UploadApiResponse | null> {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: 'auto',
    });

    // Clean up temp file
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }

    return response;
  } catch (err) {
    logger.error({ err, localFilePath }, 'Cloudinary upload failed');
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return null;
  }
}

/**
 * Delete an asset from Cloudinary by public ID.
 */
export async function deleteFromCloudinary(
  publicId: string,
  resourceType: 'image' | 'video' | 'raw' = 'image',
): Promise<void> {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    logger.error({ err, publicId }, 'Cloudinary delete failed');
  }
}

export { cloudinary };
