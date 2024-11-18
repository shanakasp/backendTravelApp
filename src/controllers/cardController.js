const fs = require("fs");
const Card = require("../models/Card");

exports.createCard = async (req, res) => {
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
};

exports.getUserCards = async (req, res) => {
  try {
    const cards = await Card.find({ userId: req.params.userId });
    res.json(cards);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCard = async (req, res) => {
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
};

exports.getCard = async (req, res) => {
  try {
    const card = await Card.findOne({
      _id: req.params.cardId,
      userId: req.user._id,
    });

    if (!card) {
      return res.status(404).json({ error: "Card not found" });
    }

    res.json(card);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCard = async (req, res) => {
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
};
