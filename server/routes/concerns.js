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

// @route   GET /api/concerns/officer
// @desc    Get all concerns for complaints assigned to the logged-in officer (privacy-safe)
// @access  Officer only
router.get('/officer', protect, async (req, res) => {
    try {
        if (req.user.role !== 'officer' && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Access denied." });
        }

        // Find all complaints assigned to this officer
        const assignedComplaints = await Complaint.find({ assignedOfficer: req.user._id }, '_id complaintId title status');

        const complaintIds = assignedComplaints.map(c => c._id);

        // Fetch concerns for those complaints (no citizen info)
        const concerns = await Concern.find({ complaint: { $in: complaintIds } })
            .populate('complaint', 'complaintId title status')
            .sort({ createdAt: -1 })
            .select('description image status officerResponse adminResponse createdAt complaint');

        res.json(concerns);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

// @route   GET /api/concerns/:complaintId
// @desc    Get concerns for a specific complaint (Private)
// @access  Admin/User
router.get('/:complaintId', protect, async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.complaintId);
        if (!complaint) return res.status(404).json({ message: "Complaint not found" });

        // Privacy: Only Admin or the User who owns the complaint/concern can see details
        if (req.user.role !== 'admin' && !complaint.user.equals(req.user._id)) {
            return res.status(403).json({ message: "Access denied. Officers cannot view concern details." });
        }

        const concerns = await Concern.find({ complaint: req.params.complaintId }).sort({ createdAt: -1 });
        res.json(concerns);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
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
