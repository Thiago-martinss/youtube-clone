const express = require("express");
const {
  getUserNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteNotification,
} = require("../controllers/notification.controller");
const verifyJWT = require("../middlewares/auth.middleware");

const notificationRouter = express.Router();

//Apply auth middleware to all routes
notificationRouter.use(verifyJWT);

//Get user notification
notificationRouter.get("/", getUserNotifications);

module.exports = notificationRouter;
