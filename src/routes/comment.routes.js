const express = require('express');
const verifyJWT = require('../middlewares/auth.middleware');
const {
  getVideoComments,
  addComment,
  updateComment,
  deleteComment
} = require('../controllers/comment.controller');

const commentRouter = express.Router();

// Get comments for a video

commentRouter.get('/video/:videoId', getVideoComments);

// Add a comment to a video
commentRouter.post('/video/:videoId', verifyJWT, addComment);

//Update and delete comments
commentRouter.patch("/:commentId", verifyJWT, updateComment);
commentRouter.delete("/:commentId", verifyJWT, deleteComment);



module.exports = commentRouter;
