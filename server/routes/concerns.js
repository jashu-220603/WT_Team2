const express = require('express');
const router = express.Router();
const Concern = require('../models/Concern');
const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// @route   POST /api/concerns
// @desc    Raise a new concern
// @access  User only
router.post('/', protect, authorize('user'), upload.single('image'), async (req, res) => {
    try {
        const { complaintId, description } = req.body;

        if (!complaintId || !description) {
            return res.status(400).json({ message: "Complaint ID and description are required." });
        }

        const complaint = await Complaint.findById(complaintId);
        if (!complaint) {
            return res.status(404).json({ message: "Complaint not found." });
        }

        const newConcern = new Concern({
            complaint: complaintId,
            user: req.user._id,
            description,
            image: req.file ? req.file.filename : null
        });

        await newConcern.save();

        // Notify Admin and assigned Officer
        const admins = await require('../models/User').find({ role: 'admin' });
        const notifications = admins.map(admin => ({
            user: admin._id,
            type: 'concern_raised',
            title: 'New Concern Raised',
            message: `A concern has been raised for Complaint ID: ${complaint.complaintId}`,
            relatedComplaint: complaintId
        }));

        if (complaint.assignedOfficer) {
            notifications.push({
                user: complaint.assignedOfficer,
                type: 'concern_raised',
                title: 'New Concern Raised',
                message: `A concern has been raised for your assigned Complaint ID: ${complaint.complaintId}`,
                relatedComplaint: complaintId
            });
        }

        await Notification.insertMany(notifications);

        res.status(201).json({ message: "Concern raised successfully.", concern: newConcern });
    } catch (err) {
        console.error("Raise Concern Error:", err);
        res.status(500).json({ message: "Server error while raising concern." });
    }
});

// @route   PUT /api/concerns/:id/respond
// @desc    Respond to a concern (Admin or Officer)
// @access  Admin/Officer
router.put('/:id/respond', protect, authorize('admin', 'officer'), async (req, res) => {
    try {
        const { response, status } = req.body;
        const concern = await Concern.findById(req.params.id).populate('complaint');

        if (!concern) {
            return res.status(404).json({ message: "Concern not found." });
        }

        if (req.user.role === 'admin') {
            concern.adminResponse = response;
        } else {
            concern.officerResponse = response;
        }

        if (status) concern.status = status;
        await concern.save();

        // Notify User
        const newNotification = new Notification({
            user: concern.user,
            type: 'concern_responded',
            title: 'Response to your Concern',
            message: `${req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)} responded to your concern for Complaint: ${concern.complaint.complaintId}`,
            relatedComplaint: concern.complaint._id
        });

        await newNotification.save();

        res.json({ message: "Response submitted successfully.", concern });
    } catch (err) {
        console.error("Respond Concern Error:", err);
        res.status(500).json({ message: "Server error while responding to concern." });
    }
});

module.exports = router;
