import { Router } from "express";
import { verifyJWT } from "../../middlewares/auth.middleware.js";
import {
  getSupportedLanguages,
  getSubtitleInfo,
  getSubtitleFile,
  regenerateSubtitles,
} from "./subtitle.controller.js";

const router = Router();

// Public routes
router.get("/languages", getSupportedLanguages);

// Standalone subtitle routes
export const subtitleRouter = router;

// Video subtitle sub-router (to be mounted under video routes)
const videoSubtitleRouter = Router({ mergeParams: true });

// GET /api/v1/videos/:videoId/subtitles - Get subtitle info
videoSubtitleRouter.get("/", getSubtitleInfo);

// GET /api/v1/videos/:videoId/subtitles/:format - Get subtitle file URL
videoSubtitleRouter.get("/:format", getSubtitleFile);

// POST /api/v1/videos/:videoId/subtitles/regenerate - Regenerate subtitles (auth required)
videoSubtitleRouter.post("/regenerate", verifyJWT, regenerateSubtitles);

export { videoSubtitleRouter };
