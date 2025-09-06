const express = require('express');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const userRouter = require('./routes/user.routes');
const channelRouter = require('./routes/channel.routes');
const videoRouter = require('./routes/video.routes');
const notificationRouter = require('./routes/notification.routes');
const playlistRouter = require('./routes/playlist.routes');
const commentRouter = require('./routes/comment.routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
require ('dotenv').config();


const app = express();

connectDB();

app.use(express.json()); 
app.use(cookieParser());

//Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/channels", channelRouter);
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/notifications", notificationRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/comments", commentRouter);

//Error middleware
app.use(errorHandler);
app.use(notFound);

//start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
