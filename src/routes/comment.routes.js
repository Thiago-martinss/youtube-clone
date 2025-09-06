const express = require('express');
const verifyJWT = require('../middlewares/auth.middleware');
const {
  getVideoComments,
  addComment,
} = require('../controllers/comment.controller');

const commentRouter = express.Router();

// Get comments for a video

commentRouter.get('/video/:videoId', getVideoComments);

// Add a comment to a video
commentRouter.post('/video/:videoId', verifyJWT, addComment);

module.exports = commentRouter;
