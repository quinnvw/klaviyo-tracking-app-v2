require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGIN || '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Serve static files (for tracker.js)
app.use(express.static('public'));

// Routes
const trackRoute = require('./routes/track');
const identifyRoute = require('./routes/identify');

app.use('/track', trackRoute);
app.use('/identify', identifyRoute);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Klaviyo Tracking App is running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'Klaviyo Tracking App',
    version: '1.0.0',
    endpoints: {
      track: 'POST /track',
      identify: 'POST /identify',
      health: 'GET /health',
      tracker: 'GET /tracker.js'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Klaviyo Tracking App running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🎯 Track endpoint: http://localhost:${PORT}/track`);
  console.log(`👤 Identify endpoint: http://localhost:${PORT}/identify`);
});