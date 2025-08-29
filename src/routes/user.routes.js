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
userRouter.post("/refresh-token", refreshAccessToken);



//Protected routes
userRouter.use(verifyJWT);
userRouter.post("/logout", logoutUser);
userRouter.patch("/change-password", changePassword)
userRouter.get("/current-user", getCurrentUser);
userRouter.patch("/update-account", updateAccountDetails);
userRouter.patch("/update-avatar", upload.single("avatar"), updateAvatar);
userRouter.patch("/update-cover-image", upload.single("coverImage"), updateCoverImage);










module.exports = userRouter;


