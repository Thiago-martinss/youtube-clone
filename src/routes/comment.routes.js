const express = require("express");
const verifyJWT = require("../middlewares/auth.middleware");
const {
  getVideoComments,

} = require("../controllers/comment.controller");


const commentRouter = express.Router();


commentRouter.get("/video/:videoId", getVideoComments);



module.exports = commentRouter;
