const config = require('../config');

module.exports = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500, message = err.message, extra = {};
  if (err.name === 'MulterError') {
    status = err.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File too large. The limit is 5 MB per resume.' :
      err.code === 'LIMIT_FILE_COUNT' ? 'Too many files in one upload.' : 'Unexpected file upload field.';
  } else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body.'; }
  else if (err.type === 'entity.too.large') { status = 413; message = 'Request body too large.'; }
  else if (err.name === 'ValidationError') { status = 400; message = Object.values(err.errors || {}).map(e => e.message).join(' ') || 'Invalid data.'; }
  else if (err.name === 'CastError') { status = 400; message = 'Invalid identifier or value.'; }
  else if (err.code === 11000) { status = 409; message = 'That record already exists.'; }
  if (err.code && typeof err.code === 'string' && err.status) extra.code = err.code;
  if (err.details) extra.details = err.details;
  if (status >= 500) {
    console.error(err);
    if (config.isProd) message = 'Server error. Please try again.';
  }
  res.status(status).json({ message: message || 'Server error', ...extra });
};
