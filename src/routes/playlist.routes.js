const express = require('express');
const {
  createPlaylist,
  addVideoToPlaylist,
} = require('../controllers/playlist.controller');
const verifyJWT = require('../middlewares/auth.middleware');

const playlistRouter = express.Router();

//Create playlist
playlistRouter.post('/', verifyJWT, createPlaylist);

//Add/remove videos from playlist
playlistRouter.post('/:playlistId/add/:videoId', verifyJWT, addVideoToPlaylist);

module.exports = playlistRouter;
