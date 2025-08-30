const express = require('express');
const verifyJWT = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/multer.middleware');
const { publishVideo } = require('../controllers/video.controller');

const videoRouter = express.Router();

//Public routes

//Protected routes
videoRouter.post(
  '/',
  upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  publishVideo
);

module.exports = videoRouter;
