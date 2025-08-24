const express = require('express');
const connectDB = require('./config/db');
const userRouter = require('./routes/user.routes');
require ('dotenv').config();


const app = express();

connectDB();
app.use(express.json()); 

//Routes
app.use("/api/v1/users", userRouter);

//start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
