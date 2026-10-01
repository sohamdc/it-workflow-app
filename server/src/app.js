const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const testProtectedRoutes = require('./routes/testProtected');
const auditRoutes = require('./routes/audit');
const sopRoutes = require('./routes/sop');
const projectRoutes = require('./routes/projects');
const stageRoutes = require('./routes/stages');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true,
}));

app.use(express.json());
app.use(cookieParser());

app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/test-protected', testProtectedRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/sop', sopRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/projects', stageRoutes); // same prefix, different route file

app.use(errorHandler);

module.exports = app;