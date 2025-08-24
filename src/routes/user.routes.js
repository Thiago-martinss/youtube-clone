const express = require("express");

const {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  getUserChannelProfile,
  getWatchHistory,
  requestPasswordReset,
  resetPassword,
  updateCoverImage,
} = require("../controllers/user.controller");
const { upload } = require("../middlewares/multer.middleware");
//const verifyJWT = require("../middlewares/auth.middleware");

const userRouter = express.Router();

//Public routes
userRouter.post(
  "/register",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "coverImage", maxCount: 1 },
  ]),
  registerUser
);

userRouter.post("/login", loginUser);


module.exports = userRouter;


