// Required dependencies
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const cors = require("cors");

const app = express();

// Middleware
app.use(express.json());
app.use(cors());
app.use("/uploads", express.static("uploads"));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "-"));
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Not an image! Please upload only images."), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// MongoDB connection
mongoose
  .connect("mongodb://localhost:27017/cardapp", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Successfully connected to MongoDB.");
  })
  .catch((error) => {
    console.error("Error connecting to MongoDB:", error);
    process.exit(1);
  });

// MongoDB connection monitoring
mongoose.connection.on("connected", () => {
  console.log("Mongoose connected to MongoDB");
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected from MongoDB");
});

// Handle application termination
process.on("SIGINT", async () => {
  try {
    await mongoose.connection.close();
    console.log("Mongoose connection closed through app termination");
    process.exit(0);
  } catch (err) {
    console.error("Error closing Mongoose connection:", err);
    process.exit(1);
  }
});

// Database connection check middleware
const checkDbConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      error: "Database connection is not ready",
      readyState: mongoose.connection.readyState,
    });
  }
  next();
};

app.use(checkDbConnection);

// Schemas
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  location: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const cardSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  image: { type: String, required: true },
  date: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);
const Card = mongoose.model("Card", cardSchema);

// Authentication middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization").replace("Bearer ", "");
    const decoded = jwt.verify(token, "your_jwt_secret");
    const user = await User.findOne({ _id: decoded._id });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).send({ error: "Please authenticate" });
  }
};

// Error handling middleware for file upload
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
  next(err);
};

app.use(handleMulterError);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    dbStatus:
      mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    timestamp: new Date(),
  });
});

// User Routes

// Signup
app.post("/api/users/signup", async (req, res) => {
  try {
    const { name, email, password, location } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      password: hashedPassword,
      location,
    });

    await user.save();
    const token = jwt.sign({ _id: user._id }, "your_jwt_secret", {
      expiresIn: "7d",
    });

    res.status(201).json({
      message: "User created successfully",
      userId: user._id,
      token,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const token = jwt.sign({ _id: user._id }, "your_jwt_secret", {
      expiresIn: "7d",
    });

    res.json({
      message: "Login successful",
      userId: user._id,
      token,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Get user details
app.get("/api/users/:userId", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Card Routes

// Create card with file upload
app.post("/api/cards", auth, upload.single("image"), async (req, res) => {
  try {
    const { title, description, date } = req.body;

    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const imagePath = req.file.path.replace(/\\/g, "/");

    const card = new Card({
      userId: req.user._id,
      title,
      description,
      image: imagePath,
      date: new Date(date),
    });

    await card.save();
    res.status(201).json({
      message: "Card created successfully",
      card,
    });
  } catch (error) {
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error("Error deleting file:", err);
      });
    }
    res.status(400).json({ error: error.message });
  }
});

// Get all cards by user ID
app.get("/api/cards/user/:userId", auth, async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.params.userId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update card with file upload
app.put(
  "/api/cards/:cardId",
  auth,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description, date } = req.body;

      const card = await Card.findOne({
        _id: req.params.cardId,
        userId: req.user._id,
      });

      if (!card) {
        return res.status(404).json({ error: "Card not found" });
      }

      if (req.file) {
        if (fs.existsSync(card.image)) {
          fs.unlinkSync(card.image);
        }
        card.image = req.file.path.replace(/\\/g, "/");
      }

      card.title = title || card.title;
      card.description = description || card.description;
      card.date = date ? new Date(date) : card.date;

      await card.save();
      res.json({
        message: "Card updated successfully",
        card,
      });
    } catch (error) {
      if (req.file) {
        fs.unlink(req.file.path, (err) => {
          if (err) console.error("Error deleting file:", err);
        });
      }
      res.status(400).json({ error: error.message });
    }
  }
);

// Delete card
app.delete("/api/cards/:cardId", auth, async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.cardId,
      userId: req.user._id,
    });

    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    if (fs.existsSync(card.image)) {
      fs.unlinkSync(card.image);
    }

    await card.deleteOne();

    res.json({
      message: "Card deleted successfully",
      card,
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
