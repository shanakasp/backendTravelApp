const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/database");

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// Connect to Database
connectDB();

// Import Routes
const userRoutes = require("./routes/userRoutes");
const cardRoutes = require("./routes/cardRoutes");

// Use Routes
app.use("/api/users", userRoutes);
app.use("/api/cards", cardRoutes);

// Health check endpoint
// app.get("/api/health", (req, res) => {
//   res.json({
//     status: "ok",
//     dbStatus:
//       mongoose.connection.readyState === 1 ? "connected" : "disconnected",
//     timestamp: new Date(),
//   });
// });

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
