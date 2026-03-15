const express = require('express');
const router = express.Router();
const Task = require('../models/Task');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/tasks
// @desc    Get all tasks
// @access  Admin/Officer
router.get('/', protect, authorize('admin', 'officer'), async (req, res) => {
    try {
        const query = req.user.role === 'admin' ? {} : { officer: req.user._id };
        const tasks = await Task.find(query).populate('officer', 'name department').sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   POST /api/tasks
// @desc    Create a task
// @access  Admin
router.post('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { title, description, department, officer, priority, dueDate } = req.body;
        const task = new Task({
            title,
            description,
            department,
            officer,
            priority,
            dueDate
        });
        await task.save();
        res.status(201).json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   PUT /api/tasks/:id
// @desc    Update task status
// @access  Admin/Officer
router.put('/:id', protect, authorize('admin', 'officer'), async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (req.user.role !== 'admin' && task.officer.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        task.status = status;
        await task.save();
        res.json(task);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/tasks/:id
// @desc    Delete task
// @access  Admin
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const task = await Task.findById(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });
        await task.deleteOne();
        res.json({ message: 'Task deleted' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
