const express = require('express');
const {
  createPlaylist,
  addVideoToPlaylist,
  getUserPlaylists,
  getPlaylistById,
  removeVideoFromPlaylist,
  updatePlaylist,
  deletePlaylist
} = require('../controllers/playlist.controller');
const verifyJWT = require('../middlewares/auth.middleware');

const playlistRouter = express.Router();

//Create playlist
playlistRouter.post('/', verifyJWT, createPlaylist);

// Get user playlists
playlistRouter.post('/user', verifyJWT, getUserPlaylists);
playlistRouter.get('/user/:userId', verifyJWT, getUserPlaylists);
//Get playlist by ID
playlistRouter.get('/:playlistId', getPlaylistById);

//Update playlist
playlistRouter.patch('/:playlistId', verifyJWT, updatePlaylist);

//Add/remove videos from playlist
playlistRouter.post('/:playlistId/add/:videoId', verifyJWT, addVideoToPlaylist);

playlistRouter.patch(
  '/:playlistId/remove/:videoId',
  verifyJWT,
  removeVideoFromPlaylist
);

module.exports = playlistRouter;
