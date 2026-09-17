// Wraps an async route handler so any thrown/rejected error goes to
// Express's error middleware instead of crashing the process or
// needing a try/catch in every single controller.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
