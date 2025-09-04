const express = require('express');
const {
  createPlaylist,
  addVideoToPlaylist,
  getUserPlaylists,
  getPlaylistById
} = require('../controllers/playlist.controller');
const verifyJWT = require('../middlewares/auth.middleware');

const playlistRouter = express.Router();

//Create playlist
playlistRouter.post('/', verifyJWT, createPlaylist);

// Get user playlists
playlistRouter.post("/user", verifyJWT, getUserPlaylists);
playlistRouter.get("/user/:userId", verifyJWT, getUserPlaylists);
//Get playlist by ID
playlistRouter.get("/:playlistId", getPlaylistById);

//Add/remove videos from playlist
playlistRouter.post('/:playlistId/add/:videoId', verifyJWT, addVideoToPlaylist);

module.exports = playlistRouter;
