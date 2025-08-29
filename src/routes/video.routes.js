const express = require("express");
const verifyJWT = require("../middlewares/auth.middleware");
const { upload } = require("../middlewares/multer.middleware");

const videoRouter = express.Router();

//Public routes



module.exports = videoRouter;
