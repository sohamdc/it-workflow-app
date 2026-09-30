// Central error handler. Any route that calls next(err) or throws inside
// an async handler (if wrapped) ends up here, so error responses stay consistent.
function errorHandler(err, req, res, next) {
  console.error(err); // helpful during development; keep for now

  const status = err.status || 500;
  const message = err.message || 'Something went wrong';

  res.status(status).json({ message });
}

module.exports = errorHandler;