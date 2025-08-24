const express = require("express");
const cookieParser = require("cookie-parser");

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
const verifyJWT = require("../middlewares/auth.middleware");

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

userRouter.post("/logout", verifyJWT, logoutUser);


module.exports = userRouter;


