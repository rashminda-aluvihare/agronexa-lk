// Centralized error handler
// Expected error shape: { statusCode?: number, message: string, details?: any }
function errorHandler(err, _req, res, _next) {
  const status = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  // eslint-disable-next-line no-console
  if (status >= 500) console.error(err);

  return res.status(status).json({
    success: false,
    error: message,
    ...(process.env.NODE_ENV === 'development' && err.details ? { details: err.details } : {}),
  });
}

module.exports = { errorHandler };

