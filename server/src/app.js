const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const healthRoutes = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Allow the frontend (different port) to call this API with cookies included.
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/health', healthRoutes);

// Must be registered AFTER all routes — Express calls this for any error
// passed via next(err) or thrown in a route.
app.use(errorHandler);

module.exports = app;