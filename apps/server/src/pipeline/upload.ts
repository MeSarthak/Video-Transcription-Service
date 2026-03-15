/**
 * Re-exports Azure upload helpers from the shared singleton in config/azure.ts.
 *
 * All upload logic lives in config/azure.ts. The container is created once
 * at application startup (ensureContainerExists in index.ts) rather than on
 * every upload call.
 */
export {
  uploadHLSFolder,
  uploadSubtitleFiles,
  uploadSingleFile,
  deleteBlobsByPrefix,
} from '../config/azure.js';
