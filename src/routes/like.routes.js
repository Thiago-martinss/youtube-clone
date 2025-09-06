const express = require('express');
const verifyJWT = require('../middlewares/auth.middleware');
const {
  toggleCommentLike,
  toggleLikeVideo,
  getLikedVideos,
  getVideoLikes,
  getCommentLikes,
} = require('../controllers/like.controller');

const likesRouter = express.Router();

//Toggle likes
likesRouter.post('/toggle/video/:videoId', verifyJWT, toggleLikeVideo);

module.exports = likesRouter;
