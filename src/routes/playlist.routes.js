const express = require('express');
const { createPlaylist } = require('../controllers/playlist.controller');
const verifyJWT = require('../middlewares/auth.middleware');

const playlistRouter = express.Router();

//Create playlist
playlistRouter.post('/', verifyJWT, createPlaylist);

module.exports = playlistRouter;
