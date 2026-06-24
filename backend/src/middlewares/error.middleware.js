import ApiError from '../utils/ApiError.js';

const errorHandler = (err, req, res, next) => {
  let error = err;

  if (!(error instanceof ApiError)) {
    // Determine status code for mongoose ValidationError or cast errors
    const statusCode = error.statusCode || (error.name === 'ValidationError' || error.name === 'CastError' ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    error = new ApiError(statusCode, message, error.errors || [], error.stack);
  }

  const response = {
    success: false,
    message: error.message,
    ...(error.errors && error.errors.length > 0 ? { errors: error.errors } : {}),
  };

  // Log the stack trace in development for 500 status codes
  if (process.env.NODE_ENV !== 'production' && error.statusCode === 500) {
    console.error(err);
  }

  res.status(error.statusCode).json(response);
};

export default errorHandler;
