// Custom error class
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.timestamp = new Date().toISOString();
  }
}

// Centralized error handling middleware
export const errorHandler = (err, req, res, next) => {
  // Log error
  const errorLog = {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  };
  console.error('[Error Handler]', JSON.stringify(errorLog, null, 2));

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;
  const isDev = process.env.NODE_ENV === 'development';

  // Build response
  const errorResponse = {
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      statusCode,
      timestamp: err.timestamp || new Date().toISOString(),
    },
  };

  // Add stack trace in development
  if (isDev && err.stack) {
    errorResponse.error.stack = err.stack;
  }

  // Send response
  res.status(statusCode).json(errorResponse);
};

// Async handler wrapper to catch Promise rejections
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
