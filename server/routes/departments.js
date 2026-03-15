const express = require('express');
const router = express.Router();
const Department = require('../models/Department');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/departments
// @desc    Get all departments
// @access  Public (for login)
router.get('/', async (req, res) => {
    try {
        const departments = await Department.find().sort({ name: 1 });
        res.json(departments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/departments
// @desc    Create/Update department
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { name, icon, description } = req.body;
        let dept = await Department.findOne({ name });
        if (dept) {
            dept.icon = icon || dept.icon;
            dept.description = description || dept.description;
            await dept.save();
            return res.json(dept);
        }
        dept = new Department({ name, icon, description });
        await dept.save();
        res.status(201).json(dept);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
