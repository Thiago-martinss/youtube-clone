const express = require('express');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const userRouter = require('./routes/user.routes');
const { errorHandler, notFound } = require('./middlewares/error.middleware');
require ('dotenv').config();


const app = express();

connectDB();

app.use(express.json()); 
app.use(cookieParser());

//Routes
app.use("/api/v1/users", userRouter);

//Error middleware
app.use(errorHandler);
app.use(notFound);

//start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
