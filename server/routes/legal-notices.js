const express = require('express');
const router = express.Router();
const LegalNotice = require('../models/LegalNotice');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');

// @route   POST /api/legal-notices
// @desc    Send a new legal notice (Admin only)
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { officerId, title, content } = req.body;

        if (!officerId || !title || !content) {
            return res.status(400).json({ message: "Missing required fields." });
        }

        const officer = await User.findById(officerId);
        if (!officer || officer.role !== 'officer') {
            return res.status(404).json({ message: "Officer not found." });
        }

        const legalNotice = new LegalNotice({
            officerId,
            title,
            content
        });

        await legalNotice.save();

        // Trigger Notification for the Officer
        try {
            const Notification = require('../models/Notification');
            await Notification.create({
                user: officerId,
                title: "Official Legal Notice Received",
                message: `You have received a new legal notice: "${title}". Please review it in the Legal Notices section.`,
                type: "concern_responded" // Using a relevant existing type or similar
            });
        } catch (notifErr) {
            console.error("Failed to trigger notification for legal notice:", notifErr);
        }

        res.status(201).json({ message: "Legal notice sent successfully.", legalNotice });
    } catch (err) {
        console.error("Send Legal Notice Error: ", err);
        res.status(500).json({ message: "Server error." });
    }
});

// @route   GET /api/legal-notices/mine
// @desc    Get my legal notices
// @access  Officer
router.get('/mine', protect, authorize('officer'), async (req, res) => {
    try {
        const notices = await LegalNotice.find({ officerId: req.user._id }).sort({ createdAt: -1 });
        res.json({ notices });
    } catch (err) {
        console.error("Fetch Legal Notices Error: ", err);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
