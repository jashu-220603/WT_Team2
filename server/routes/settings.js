const express = require('express');
const router = express.Router();
const Setting = require('../models/Setting');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/settings
// @desc    Get all settings
// @access  Admin
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const settings = await Setting.find();
        const settingsObj = {};
        settings.forEach(s => settingsObj[s.key] = s.value);
        res.json(settingsObj);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/settings
// @desc    Save settings
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const settings = req.body;
        for (const [key, value] of Object.entries(settings)) {
            await Setting.findOneAndUpdate(
                { key },
                { key, value, updatedAt: Date.now() },
                { upsert: true, new: true }
            );
        }
        res.json({ message: 'Settings saved successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
