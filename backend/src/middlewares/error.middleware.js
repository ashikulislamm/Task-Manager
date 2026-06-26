import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    // Determine status code for mongoose ValidationError or cast errors
    const statusCode = error.statusCode || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], error.stack || err.stack);
  }

  // Log with winston logger
  if (error.statusCode === 500) {
    logger.error(`${req.method} ${req.originalUrl} - 500 Internal Error:`, error);
  } else {
    logger.warn(`${req.method} ${req.originalUrl} - ${error.statusCode} client error: ${error.message}`);
  }

  // Redact raw details for 500 errors in production
  const message = process.env.NODE_ENV === 'production' && error.statusCode === 500
    ? 'An unexpected error occurred. Please try again later.'
    : error.message;

  const response = {
    success: false,
    message,
    ...(error.errors && error.errors.length > 0 ? { errors: error.errors } : {}),
  };

  res.status(error.statusCode).json(response);
};

export default errorHandler;
