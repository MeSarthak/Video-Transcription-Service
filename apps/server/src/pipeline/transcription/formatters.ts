/**
 * Utility functions for time formatting and conversions
 * Used for generating subtitle timestamps
 */

/**
 * Convert seconds to SRT timestamp format (HH:MM:SS,mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} SRT formatted timestamp
 */
export function secondsToSrtTime(seconds: any) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds % 1) * 1000);

  return `${padZero(hours, 2)}:${padZero(minutes, 2)}:${padZero(secs, 2)},${padZero(milliseconds, 3)}`;
}

/**
 * Convert seconds to VTT timestamp format (HH:MM:SS.mmm)
 * @param {number} seconds - Time in seconds
 * @returns {string} VTT formatted timestamp
 */
export function secondsToVttTime(seconds: any) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const milliseconds = Math.round((seconds % 1) * 1000);

  return `${padZero(hours, 2)}:${padZero(minutes, 2)}:${padZero(secs, 2)}.${padZero(milliseconds, 3)}`;
}

/**
 * Pad a number with leading zeros
 * @param {number} num - Number to pad
 * @param {number} length - Desired length
 * @returns {string} Padded number string
 */
export function padZero(num: any, length: any) {
  return num.toString().padStart(length, "0");
}

/**
 * Format file size to human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Human readable size
 */
export function formatFileSize(bytes: any) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Format duration in seconds to human readable format
 * @param {number} seconds - Duration in seconds
 * @returns {string} Human readable duration
 */
export function formatDuration(seconds: any) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

/**
 * Sanitize filename for safe file system usage
 * @param {string} filename - Original filename
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename: any) {
  return filename
    .replace(/[^a-z0-9_\-\.]/gi, "_")
    .replace(/_+/g, "_")
    .substring(0, 200);
}
