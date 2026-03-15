const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { protect, authorize } = require('../middleware/auth');

// @route   GET /api/reports/export-csv
// @desc    Export complaints to CSV
// @access  Admin
router.get('/export-csv', protect, authorize('admin'), async (req, res) => {
    try {
        const complaints = await Complaint.find().populate('user', 'name email').populate('assignedOfficer', 'name');
        
        let csv = 'Complaint ID,Title,Category,Status,Priority,Citizen,Officer,Date\n';
        complaints.forEach(c => {
            csv += `"${c.complaintId || c._id}","${c.title}","${c.category}","${c.status}","${c.priority}","${c.user?.name || 'Anonymous'}","${c.assignedOfficer?.name || 'Unassigned'}","${new Date(c.createdAt).toLocaleDateString()}"\n`;
        });

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=complaints_report.csv');
        res.status(200).send(csv);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   GET /api/reports/summary
// @desc    Get monthly summary data (simulated PDF endpoint for now, returns JSON)
// @access  Admin
router.get('/summary', protect, authorize('admin'), async (req, res) => {
    try {
        const stats = await Complaint.aggregate([
            { $group: { _id: "$status", count: { $sum: 1 } } }
        ]);
        res.json(stats);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router;
