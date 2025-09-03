const express = require('express');
const verifyJWT = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/multer.middleware');
const {
  publishVideo,
  getAllVideos,
  getVideoById,
  updateVideo,
  deleteVideo
} = require('../controllers/video.controller');

const videoRouter = express.Router();

//Public routes
videoRouter.get('/', getAllVideos);

//Protected routes
videoRouter.use(verifyJWT);
videoRouter.post(
  '/',
  upload.fields([
    { name: 'videoFile', maxCount: 1 },
    { name: 'thumbnail', maxCount: 1 },
  ]),
  publishVideo
);
videoRouter.get('/:videoId', getVideoById);
videoRouter.patch('/:videoId', upload.single('thumbnail'), updateVideo);
videoRouter.delete('/:videoId', deleteVideo);

module.exports = videoRouter;
