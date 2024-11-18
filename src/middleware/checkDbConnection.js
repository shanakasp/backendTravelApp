const mongoose = require("mongoose");

const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database connection is not ready",
      readyState: mongoose.connection.readyState,
    });
  }
  next();
};

module.exports = checkDbConnection;
