import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import { rateLimit } from 'express-rate-limit';
import mongoose from 'mongoose';

import apiRouter from './routes/index.js';
import errorHandler from './middlewares/error.middleware.js';
import ApiError from './utils/ApiError.js';
import { csrfProtection } from './middlewares/csrf.middleware.js';
import logger from './utils/logger.js';

const app = express();

// Apply response compression
app.use(compression());

// Set security HTTP headers
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Enable CORS with support for credentials (cookies)
const allowedOrigins = process.env.CLIENT_URL
  ? process.env.CLIENT_URL.split(',').map(url => url.trim().replace(/\/$/, ''))
  : ['http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, postman, curl)
      if (!origin) return callback(null, true);
      
      const cleanOrigin = origin.trim().replace(/\/$/, '');
      if (allowedOrigins.includes(cleanOrigin) || allowedOrigins.includes('*')) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}. Allowed origins: ${allowedOrigins}`);
        callback(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token'],
  })
);

// Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  message: { success: false, message: 'Too many requests from this IP, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Development logging
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// Body parsers with request payload limits (protects against DOS)
app.use(express.json({ limit: '15kb' }));
app.use(express.urlencoded({ extended: true, limit: '15kb' }));

// Cookie parser
app.use(cookieParser());

// Anti-CSRF protection (must run after cookie parsing)
app.use(csrfProtection);

// Home route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Task Manager API is running',
  });
});

// Database-connected health check
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'UP' : 'DOWN',
    uptime: process.uptime(),
    timestamp: new Date(),
    database: states[dbState] || 'unknown',
  });
});

// API Routes
app.use('/api', apiRouter);

// Handle undefined routes
app.use((req, res, next) => {
  next(new ApiError(404, `Route ${req.originalUrl} not found`));
});

// Global error handler
app.use(errorHandler);

export default app;
