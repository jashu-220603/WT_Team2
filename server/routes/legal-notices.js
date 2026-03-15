const express = require('express');
const router = express.Router();
const LegalNotice = require('../models/LegalNotice');
const auth = require('../middleware/auth');
const User = require('../models/User');

// @route   POST /api/legal-notices
// @desc    Send a new legal notice (Admin only)
// @access  Admin
router.post('/', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied." });
        }

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
        res.status(201).json({ message: "Legal notice sent successfully.", legalNotice });
    } catch (err) {
        console.error("Send Legal Notice Error: ", err);
        res.status(500).json({ message: "Server error." });
    }
});

// @route   GET /api/legal-notices/mine
// @desc    Get my legal notices
// @access  Officer
router.get('/mine', auth, async (req, res) => {
    try {
        if (req.user.role !== 'officer') {
            return res.status(403).json({ message: "Access denied." });
        }

        const notices = await LegalNotice.find({ officerId: req.user.id }).sort({ createdAt: -1 });
        res.json({ notices });
    } catch (err) {
        console.error("Fetch Legal Notices Error: ", err);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
