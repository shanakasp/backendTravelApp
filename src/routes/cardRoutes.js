const express = require("express");
const router = express.Router();
const cardController = require("../controllers/cardController");
const auth = require("../middleware/auth");
const upload = require("../config/multer");
const checkDbConnection = require("../middleware/checkDbConnection");
const errorHandler = require("../middleware/errorHandler");

router.post(
  "/",
  auth,
  checkDbConnection,
  upload.single("image"),
  cardController.createCard
);

router.get(
  "/user/:userId",
  auth,
  checkDbConnection,
  cardController.getUserCards
);

router.put(
  "/:cardId",
  auth,
  checkDbConnection,
  upload.single("image"),
  cardController.updateCard
);

router.get("/:cardId", auth, checkDbConnection, cardController.getCard);

router.delete("/:cardId", auth, checkDbConnection, cardController.deleteCard);

// Error handling middleware
router.use(errorHandler);

module.exports = router;
