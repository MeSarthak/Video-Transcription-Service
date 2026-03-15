import { Request, Response } from "express";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { ApiResponse } from "../../lib/ApiResponse.js";
import { ApiError } from "../../lib/ApiError.js";
import { sasTokenService } from "./sas-token.service.js";
import { Video } from "../video/video.model.js";
import { AuthenticatedRequest } from "../../lib/types.js";

const sanitizeBlobPath = (blobPath: any): string | null => {
  if (!blobPath || typeof blobPath !== "string") {
    return null;
  }
  try {
    let decoded = decodeURIComponent(blobPath);
    const normalized = decoded.split(/[\\/]+/).filter((p) => p && p !== "." && p !== "..");
    if (normalized.join("/") !== decoded.split(/[\\/]+/).filter((p) => p).join("/")) {
      return null;
    }
    return normalized.join("/");
  } catch (err) {
    return null;
  }
};

const validateBlobPathForVideo = (blobPath: string, videoId: string): boolean => {
  if (!blobPath || !blobPath.startsWith(videoId + "/")) {
    return false;
  }
  return true;
};

export const getSASTokenForDownload = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { expiresInSeconds } = req.query;

  const video = await Video.findById(videoId).select("status isPublished masterPlaylist");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.isPublished || video.status !== "published") {
    throw new ApiError(403, "Video is not available for download");
  }

  if (!video.masterPlaylist) {
    throw new ApiError(400, "Video processing is not complete. Master playlist not available.");
  }

  let expirySeconds = 60 * 60; // 1 hour default
  if (expiresInSeconds) {
    const parsed = parseInt(expiresInSeconds as string, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ApiError(400, "expiresInSeconds must be a positive integer");
    }
    expirySeconds = Math.min(parsed, 24 * 60 * 60);
  }

  const blobName = video.masterPlaylist;

  const result = sasTokenService.generateReadSASUrl(blobName, {
    expiresInSeconds: expirySeconds,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...result,
        videoId,
        blobName,
      },
      "Download SAS token generated successfully"
    )
  );
});

export const getSASTokenForUpload = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const { blobPath, expiresInSeconds } = req.query;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?._id;

  if (!userId) {
    throw new ApiError(401, "Authentication required to get upload SAS token");
  }

  const video = await Video.findById(videoId).select("owner");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (video.owner.toString() !== userId.toString()) {
    throw new ApiError(403, "Only video owner can get upload tokens");
  }

  if (!blobPath) {
    throw new ApiError(400, "blobPath is required for upload tokens");
  }

  const sanitized = sanitizeBlobPath(blobPath);
  if (!sanitized || !validateBlobPathForVideo(sanitized, videoId as string)) {
    throw new ApiError(400, "Invalid blob path: path traversal not allowed");
  }

  let expirySeconds = 15 * 60; // 15 minutes default
  if (expiresInSeconds) {
    const parsed = parseInt(expiresInSeconds as string, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ApiError(400, "expiresInSeconds must be a positive integer");
    }
    expirySeconds = Math.min(parsed, 60 * 60);
  }

  const result = sasTokenService.generateWriteSASUrl(sanitized, {
    expiresInSeconds: expirySeconds,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...result,
        videoId,
        blobPath: sanitized,
      },
      "Upload SAS token generated successfully"
    )
  );
});

export const getSASTokenForHLSPlaylist = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, playlistName } = req.params;
  const { expiresInSeconds } = req.query;

  const video = await Video.findById(videoId).select("status isPublished");

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  if (!video.isPublished || video.status !== "published") {
    throw new ApiError(403, "Video is not available");
  }

  if (!playlistName) {
    throw new ApiError(400, "Playlist name is required");
  }

  const allowedPlaylistRegex = /^[a-zA-Z0-9._-]+$/;
  if (!allowedPlaylistRegex.test(playlistName as string)) {
    throw new ApiError(400, "Invalid playlist name: only alphanumeric, dots, hyphens, and underscores allowed");
  }

  const blobName = `${videoId}/${playlistName}`;

  let expirySeconds = 24 * 60 * 60; // 24 hours default
  if (expiresInSeconds) {
    const parsed = parseInt(expiresInSeconds as string, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new ApiError(400, "expiresInSeconds must be a positive integer");
    }
    expirySeconds = Math.min(parsed, 7 * 24 * 60 * 60);
  }

  const result = sasTokenService.generateHLSPlaylistSASUrl(blobName, {
    expiresInSeconds: expirySeconds,
  });

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...result,
        videoId,
        playlistName,
      },
      "HLS playlist SAS token generated successfully"
    )
  );
});

export const validateSASTokenExpiry = asyncHandler(async (req: Request, res: Response) => {
  const { sasUrl } = req.body;

  if (!sasUrl) {
    throw new ApiError(400, "sasUrl is required in request body");
  }

  try {
    const validationResult = sasTokenService.validateSASTokenExpiry(sasUrl);

    return res.status(200).json(
      new ApiResponse(
        200,
        {
          ...validationResult,
          timestamp: new Date().toISOString(),
        },
        "SAS token validity checked successfully"
      )
    );
  } catch (error) {
    throw new ApiError(400, "Invalid SAS URL format or validation failed");
  }
});

export const refreshSASToken = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, type, blobPath } = req.body;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user?._id;

  if (!videoId) {
    throw new ApiError(400, "videoId is required");
  }

  if (!type || !["download", "upload", "hls"].includes(type)) {
    throw new ApiError(400, "type must be 'download', 'upload', or 'hls'");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found");
  }

  let sanitizedBlobPath: string | null = null;
  
  if (type === "upload") {
    if (!userId) {
      throw new ApiError(401, "Authentication required for upload token refresh");
    }
    if (video.owner.toString() !== userId.toString()) {
      throw new ApiError(403, "Only video owner can refresh upload tokens");
    }
    if (!blobPath) {
      throw new ApiError(400, "blobPath is required for upload token refresh");
    }
    sanitizedBlobPath = sanitizeBlobPath(blobPath);
    if (!sanitizedBlobPath || !validateBlobPathForVideo(sanitizedBlobPath, videoId as string)) {
      throw new ApiError(400, "Invalid blob path: path traversal not allowed");
    }
  } else if (type === "download") {
    if (!video.isPublished || video.status !== "published") {
      throw new ApiError(403, "Video is not available for download");
    }
    if (!video.masterPlaylist) {
      throw new ApiError(400, "Master playlist not available for this video");
    }
  } else if (type === "hls") {
    if (!video.isPublished || video.status !== "published") {
      throw new ApiError(403, "Video is not available for HLS streaming");
    }
    if (!blobPath) {
      throw new ApiError(400, "blobPath is required for HLS token refresh");
    }
    sanitizedBlobPath = sanitizeBlobPath(blobPath);
    if (!sanitizedBlobPath || !validateBlobPathForVideo(sanitizedBlobPath, videoId as string)) {
      throw new ApiError(400, "Invalid blob path: path traversal not allowed");
    }
  }

  let result;

  switch (type) {
    case "download":
      result = sasTokenService.generateReadSASUrl(video.masterPlaylist!, {
        expiresInSeconds: 60 * 60,
      });
      break;

    case "upload":
      result = sasTokenService.generateWriteSASUrl(sanitizedBlobPath!, {
        expiresInSeconds: 15 * 60,
      });
      break;

    case "hls":
      result = sasTokenService.generateHLSPlaylistSASUrl(sanitizedBlobPath!, {
        expiresInSeconds: 24 * 60 * 60,
      });
      break;
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        ...result,
        videoId,
        type,
      },
      `${type} SAS token refreshed successfully`
    )
  );
});
