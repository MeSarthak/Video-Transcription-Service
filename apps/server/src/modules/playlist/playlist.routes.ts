import { Router } from 'express';
import { verifyJWT } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { createPlaylistSchema, updatePlaylistSchema } from '@videotube/shared';

import {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  updatePlaylist,
  deletePlaylist,
} from './playlist.controller.js';

const router = Router();

router.post('/', verifyJWT, validate({ body: createPlaylistSchema }), createPlaylist);
router.get('/user/:userId', getUserPlaylists);
router.get('/:playlistId', getPlaylistById);

router.patch(
  '/:playlistId',
  verifyJWT,
  validate({ body: updatePlaylistSchema }),
  updatePlaylist,
);
router.delete('/:playlistId', verifyJWT, deletePlaylist);

router.patch('/add/:videoId/:playlistId', verifyJWT, addVideoToPlaylist);
router.patch('/remove/:videoId/:playlistId', verifyJWT, removeVideoFromPlaylist);

export { router as playlistRouter };
