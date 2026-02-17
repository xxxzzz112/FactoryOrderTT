const { HttpError } = require('../utils/httpError');

function errorHandler(err, req, res, next) {
  const isHttp = err instanceof HttpError;
  const statusCode = isHttp ? err.statusCode : 500;

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json({
    error: {
      message: isHttp ? err.message : '服务器内部错误',
      details: isHttp ? err.details : null
    }
  });
}

module.exports = { errorHandler };

