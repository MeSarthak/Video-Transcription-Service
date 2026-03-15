import { Router } from 'express';
import { verifyJWT, optionalVerifyJWT } from '../../middlewares/auth.middleware.js';
import { validate } from '../../middlewares/validate.middleware.js';
import { addCommentSchema, updateCommentSchema } from '@videotube/shared';

import {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment,
} from './comment.controller.js';

const router = Router();

router.get('/:videoId', optionalVerifyJWT, getVideoComments);

router.post(
  '/:videoId',
  verifyJWT,
  validate({ body: addCommentSchema }),
  addComment,
);

router.patch(
  '/c/:commentId',
  verifyJWT,
  validate({ body: updateCommentSchema }),
  updateComment,
);

router.delete('/c/:commentId', verifyJWT, deleteComment);

export { router as commentRouter };
