import { Request, Response } from "express";
import { ApiResponse } from "../../lib/ApiResponse.js";
import { asyncHandler } from "../../lib/asyncHandler.js";
import { subtitleService } from "./subtitle.service.js";
import { AuthenticatedRequest } from "../../lib/types.js";

export const getSupportedLanguages = asyncHandler(async (_req: Request, res: Response) => {
  const languages = subtitleService.getSupportedLanguages();

  return res.status(200).json(
    new ApiResponse(
      200,
      languages,
      "Supported languages fetched successfully"
    )
  );
});

export const getSubtitleInfo = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;

  const subtitleInfo = await subtitleService.getSubtitleInfo(videoId as string);

  return res.status(200).json(
    new ApiResponse(200, subtitleInfo, "Subtitle info fetched successfully")
  );
});

export const getSubtitleFile = asyncHandler(async (req: Request, res: Response) => {
  const { videoId, format } = req.params;

  const subtitleFile = await subtitleService.getSubtitleFile(videoId as string, format as string);

  return res.status(200).json(
    new ApiResponse(
      200,
      subtitleFile,
      "Subtitle file URL fetched successfully"
    )
  );
});

export const regenerateSubtitles = asyncHandler(async (req: Request, res: Response) => {
  const { videoId } = req.params;
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.user._id.toString();
  const { language, task } = req.body;

  const result = await subtitleService.regenerateSubtitles(videoId as string, userId, {
    language,
    task,
  });

  return res.status(202).json(
    new ApiResponse(202, result, "Subtitle regeneration queued successfully")
  );
});
