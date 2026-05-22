const errorHandler = (logger) => {
  return (err, req, res, next) => {
    logger.error('Unhandled server exception captured:', {
      message: err.message,
      stack: err.stack,
      path: req.path,
      method: req.method,
      query: req.query,
      body: req.body
    });

    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      success: false,
      message: err.message || 'Internal Server Error',
      // Include trace details in development env
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  };
};

module.exports = errorHandler;
