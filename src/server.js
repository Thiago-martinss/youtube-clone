const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

const app = express();




//start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
