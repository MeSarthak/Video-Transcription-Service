import { Router } from "express";
import {
  getSASTokenForDownload,
  getSASTokenForUpload,
  getSASTokenForHLSPlaylist,
  validateSASTokenExpiry,
  refreshSASToken,
} from "./sas-token.controller.js";
import { verifyJWT, optionalVerifyJWT } from "../../middlewares/auth.middleware.js";

const router = Router();

router.get("/download/:videoId", optionalVerifyJWT, getSASTokenForDownload);
router.get("/upload/:videoId", verifyJWT, getSASTokenForUpload);
router.get("/hls-playlist/:videoId/:playlistName", optionalVerifyJWT, getSASTokenForHLSPlaylist);
router.post("/validate", verifyJWT, validateSASTokenExpiry);
router.post("/refresh", optionalVerifyJWT, refreshSASToken);

export const sasTokenRoutes = router;
