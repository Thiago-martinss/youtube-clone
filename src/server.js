const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
const userRouter = require('./routes/user.routes');
require ('dotenv').config();


const app = express();

connectDB();

//Routes
app.use('/api/users', userRouter);

//start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
