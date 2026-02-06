const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectToMongoDB, closeMongoDB, client } = require('./database/mongodb');

// Import your new "Fat Routes"
const authRoutes = require('./auth_path');
const eventRoutes = require('./event_path');

const app = express();

// Security Headers
app.use(helmet({
  contentSecurityPolicy: false, // Set to false if using external scripts like Razorpay/Unsplash
}));

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." }
});

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'https://independent-irita-clubspot-9e43f2fa.koyeb.app'],
  methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD', 'DELETE'],
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.set('trust proxy', 1); 
app.use(express.static(path.join(__dirname, '../dist')));

// Mount the Feature Routes
app.use('/api', apiLimiter);
app.use('/api/auth', authRoutes);   // Handles /api/auth/google, /api/auth/me
app.use('/api/events', eventRoutes); // Handles /api/events, /api/events/join

// Catch-all
app.get(/.*/, (req, res) => {
    res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

module.exports = { app, connectToMongoDB, closeMongoDB, client };