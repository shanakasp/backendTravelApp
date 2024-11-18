const multer = require("multer");
const fs = require("fs");

const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "File too large! Max size is 5MB",
      });
    }
    return res.status(400).json({
      error: err.message,
    });
  }

  if (req.file) {
    fs.unlink(req.file.path, (unlinkErr) => {
      if (unlinkErr) console.error("Error deleting file:", unlinkErr);
    });
  }

  next(err);
};

module.exports = handleMulterError;
