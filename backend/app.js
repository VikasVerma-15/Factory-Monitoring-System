const express = require('express');
const cors = require('cors');

const eventRoutes = require('./routes/events');
const metricsRoutes = require('./routes/metrics');
const seedRoutes = require('./routes/seed');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/events', eventRoutes);
app.use('/api/metrics', metricsRoutes);
app.use('/api/seed', seedRoutes);

// Health check
app.get('/api/health', (req, res) => {
  const mongoose = require('mongoose');
  const dbStatus = mongoose.connection.readyState;
  const dbStates = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  res.json({ 
    status: 'ok', 
    message: 'Factory Monitor API is running',
    database: {
      status: dbStates[dbStatus] || 'unknown',
      readyState: dbStatus
    }
  });
});

module.exports = app;


