const express = require('express');
const {
  getChannelInfo,
  updateChannelInfo,
  updateNotificationSettings,
  getChannelVideos,
  getChannelShareLink,
} = require('../controllers/channel.controller');
const verifyJWT = require('../middlewares/auth.middleware');
const { upload } = require('../middlewares/multer.middleware');

const channelRouter = express.Router();

//Public Routes
channelRouter.get('/:username', getChannelInfo);

channelRouter.get('/:username/videos', getChannelVideos);

//channel Customization
channelRouter.patch(
  '/update',
  upload.fields([{ name: 'coverImage', maxCount: 1 }]),
  updateChannelInfo
);

module.exports = channelRouter;
