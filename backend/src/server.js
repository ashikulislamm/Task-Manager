import 'dotenv/config';
import validateEnv from './config/env.validation.js';

// Validate environment configuration immediately before importing app modules
validateEnv();

import mongoose from 'mongoose';
import app from './app.js';
import connectDB from './config/db.js';
import logger from './utils/logger.js';

// Listen for uncaught exceptions before running any code
process.on('uncaughtException', (error) => {
  logger.error('UNCAUGHT EXCEPTION! Shutting down process...', error);
  process.exit(1);
});

const PORT = process.env.PORT || 3000;
let server;

// Establish database connection first, then start the Express server
connectDB()
  .then(() => {
    server = app.listen(PORT, () => {
      logger.info(`Server listening on http://localhost:${PORT} in ${process.env.NODE_ENV} mode`);
    });

    // Graceful shutdown handler
    const shutdown = (signal) => {
      logger.info(`Received ${signal}. Starting graceful shutdown...`);
      
      if (server) {
        server.close(async () => {
          logger.info('HTTP server closed.');
          try {
            await mongoose.connection.close(false);
            logger.info('MongoDB database connection closed.');
            process.exit(0);
          } catch (err) {
            logger.error('Error closing MongoDB connection:', err);
            process.exit(1);
          }
        });
      } else {
        process.exit(0);
      }

      // Force exit after 10 seconds if shutdown hangs
      setTimeout(() => {
        logger.warn('Graceful shutdown timed out, forcing exit.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  })
  .catch((error) => {
    logger.error('Database connection failed, server could not start:', error);
    process.exit(1);
  });

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('UNHANDLED REJECTION! Shutting down process...', reason);
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});
