const express = require('express');
const mongoose = require('mongoose');
const connectDB = require('./config/db');
require ('dotenv').config();


const app = express();

connectDB();


//start server
const PORT = process.env.PORT || 8000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
