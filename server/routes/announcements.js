const express = require('express');
const router = express.Router();
const Announcement = require('../models/Announcement');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/announcements
// @desc    Get all active announcements
// @access  Public
router.get('/', async (req, res) => {
    try {
        const announcements = await Announcement.find({ active: true }).sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   GET /api/announcements/admin
// @desc    Get all announcements (for admin)
// @access  Admin only
router.get('/admin', protect, authorize('admin'), async (req, res) => {
    try {
        const announcements = await Announcement.find().sort({ createdAt: -1 });
        res.json(announcements);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   POST /api/announcements
// @desc    Create a new announcement
// @access  Admin only
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, content } = req.body;
        if (!title || !content) {
            return res.status(400).json({ message: "Title and content are required" });
        }

        const newAnnouncement = new Announcement({
            title,
            content,
            postedBy: req.user._id
        });

        await newAnnouncement.save();
        res.status(201).json(newAnnouncement);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   DELETE /api/announcements/:id
// @desc    Delete an announcement
// @access  Admin only
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const announcement = await Announcement.findById(req.params.id);
        if (!announcement) {
            return res.status(404).json({ message: "Announcement not found" });
        }
        await announcement.deleteOne();
        res.json({ message: "Announcement removed" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
