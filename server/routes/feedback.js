const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');
const auth = require('../middleware/auth');

// @route   POST /api/feedback/submit
// @desc    Submit new citizen feedback
// @access  Public
router.post('/submit', async (req, res) => {
    try {
        const { name, email, feedbackText } = req.body;

        if (!name || !email || !feedbackText) {
            return res.status(400).json({ message: "Please provide name, email, and feedback text." });
        }

        const newFeedback = new Feedback({
            name,
            email,
            feedbackText
        });

        await newFeedback.save();

        res.status(201).json({ message: "Feedback submitted successfully." });
    } catch (err) {
        console.error("Submit Feedback Error:", err);
        res.status(500).json({ message: "Server error while saving feedback." });
    }
});

// @route   GET /api/feedback/all
// @desc    Get all feedbacks
// @access  Admin only
router.get('/all', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied. Admins only." });
        }

        const feedbacks = await Feedback.find().sort({ createdAt: -1 });
        res.status(200).json(feedbacks);
    } catch (err) {
        console.error("Get Feedbacks Error:", err);
        res.status(500).json({ message: "Server error while fetching feedbacks." });
    }
});

module.exports = router;
