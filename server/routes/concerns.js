const express = require('express');
const router = express.Router();
const Concern = require('../models/Concern');
const Complaint = require('../models/Complaint');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const LegalNotice = require('../models/LegalNotice');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const User = require('../models/User');

// ---- Business Logic Helpers ----

/**
 * Count working days (Mon-Fri) between two dates
 */
function countWorkingDays(startDate, endDate) {
    let count = 0;
    const cur = new Date(startDate);
    cur.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    while (cur < end) {
        const day = cur.getDay();
        if (day !== 0 && day !== 6) count++; // Skip Saturday (6) and Sunday (0)
        cur.setDate(cur.getDate() + 1);
    }
    return count;
}

/**
 * Check if two dates fall on the same calendar day
 */
function isSameDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

/**
 * Determine escalation level based on concern number
 */
function getEscalationLevel(concernNumber) {
    if (concernNumber === 1) return 'Normal';
    if (concernNumber === 2) return 'Warning';
    return 'Critical';
}

// @route   POST /api/concerns
// @desc    Raise a new concern (with 7-day, same-day, and 3-concern rules)
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

        if (complaint && complaint.status && ['Resolved', 'Closed'].includes(complaint.status)) {
            return res.status(400).json({ message: "Cannot raise a concern for a resolved or closed complaint." });
        }

        // Rule: 7 calendar days must have passed since complaint submission
        const submissionDate = complaint.createdAt || new Date();
        const diffInMs = new Date() - new Date(submissionDate);
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

        if (diffInDays < 7) {
            return res.status(400).json({ 
                message: "you can raise a concern after 7 days of submission only.",
                daysPassed: diffInDays,
                remaining: 7 - diffInDays
            });
        }

        // Rule: Max 3 concerns per complaint
        const concernCount = await Concern.countDocuments({ complaint: complaintId });
        if (concernCount >= 3) {
            return res.status(400).json({ message: "Maximum of 3 concerns per complaint reached." });
        }

        // Rule: Only 1 concern per day per complaint
        if (complaint.lastConcernDate && isSameDay(complaint.lastConcernDate, new Date())) {
            return res.status(400).json({ message: "You can only raise one concern per day for this complaint." });
        }

        const newConcernNumber = concernCount + 1;
        const escalationLevel = getEscalationLevel(newConcernNumber);

        const newConcern = new Concern({
            complaint: complaintId,
            user: req.user._id,
            description,
            image: req.file ? (req.file.path && req.file.path.startsWith('http') ? req.file.path : req.file.filename) : null,
            escalationLevel,
            concernNumber: newConcernNumber
        });

        await newConcern.save();

        // Update complaint concernCount and lastConcernDate
        complaint.concernCount = newConcernNumber;
        complaint.lastConcernDate = new Date();
        await complaint.save();

        // Log feedback entry
        const feedbackEntry = new Feedback({
            name: req.user.name,
            email: req.user.email,
            feedbackText: `[Concern #${newConcernNumber} - ${escalationLevel}]: ${description}`,
            type: 'Concern',
            complaint: complaintId
        });
        await feedbackEntry.save();

        // Build notification text
        const evidenceAttached = req.file ? 'Yes' : 'No';
        const notificationTitle = `Concern #${newConcernNumber} Raised — ${escalationLevel}`;
        const notificationText = `Complaint ID: ${complaint.complaintId}\nEscalation: ${escalationLevel}\nDescription: ${description}\nEvidence: ${evidenceAttached}`;

        // Notify Department Head ONLY (and not the officers)
        let deptHead = await User.findOne({ role: 'dept-head', department: complaint.category });
        
        // Fallback for UI mismatches (e.g. "Road Problems" vs "Road Damage")
        if (!deptHead && complaint.category) {
            const firstWord = complaint.category.split(' ')[0];
            deptHead = await User.findOne({ 
                role: 'dept-head', 
                department: { $regex: new RegExp(`^${firstWord}`, 'i') } 
            });
        }
        
        const notifications = [];
        if (deptHead) {
            notifications.push({
                user: deptHead._id,
                type: 'concern_raised',
                title: notificationTitle,
                message: notificationText,
                relatedComplaint: complaint._id,
                relatedConcern: newConcern._id
            });
        } else {
            console.warn(`No Department Head found for category: ${complaint.category}`);
            // Fallback to Admin if no Dept Head exists? User said "only to dept head only", 
            // but for system robustness we might notify admin if no dept head is assigned.
            // I'll stick to the strict rule but log a warning.
        }

        await Notification.insertMany(notifications);

        // ---- AUTO LEGAL NOTICE on 3rd concern ----
        let legalNotice = null;
        if (newConcernNumber === 3 && complaint.assignedOfficer) {
            const noticeContent = 
                `This is a formal notice issued due to the failure to resolve Complaint ${complaint.complaintId} ` +
                `(Category: ${complaint.category}) within the prescribed time.\n\n` +
                `Three formal concerns have been raised by the complainant. ` +
                `This complaint has remained unresolved for more than 7 working days. ` +
                `You are hereby required to take immediate action and provide a written response within 3 working days.\n\n` +
                `Complainant Concern Summary: ${description}`;

            legalNotice = new LegalNotice({
                officerId: complaint.assignedOfficer,
                complaint: complaint._id,
                complainantId: req.user._id,
                title: `Legal Notice — Complaint ${complaint.complaintId}`,
                content: noticeContent,
                escalationLevel: 'Critical',
                isAutoGenerated: true,
                status: 'Pending'
            });
            await legalNotice.save();

            // Add remark to complaint history
            complaint.history.push({
                status: complaint.status,
                changedBy: req.user._id,
                remarks: `Legal Notice automatically generated after 3rd concern. Notice ID: ${legalNotice._id}`
            });
            await complaint.save();

            // Notify officer about the legal notice
            await Notification.create({
                user: complaint.assignedOfficer,
                type: 'legal_notice',
                title: '⚠ Legal Notice Issued Against You',
                message: `A legal notice has been auto-generated for unresolved Complaint ${complaint.complaintId}. Please respond immediately.`,
                relatedComplaint: complaint._id,
                relatedConcern: newConcern._id
            });

            // Notify admins about legal notice generation
            for (const admin of admins) {
                await Notification.create({
                    user: admin._id,
                    type: 'legal_notice',
                    title: `Legal Notice Auto-Generated — ${complaint.complaintId}`,
                    message: `A legal notice was automatically generated for Complaint ${complaint.complaintId} (3 concerns raised).`,
                    relatedComplaint: complaint._id,
                    relatedConcern: newConcern._id
                });
            }
        }

        res.status(201).json({ 
            message: "Concern raised successfully.", 
            concern: newConcern,
            escalationLevel,
            concernNumber: newConcernNumber,
            legalNoticeGenerated: !!legalNotice
        });
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

// @route   GET /api/concerns/complaint/:complaintId
// @desc    Get all concerns for a specific complaint
// @access  Protected
router.get('/complaint/:complaintId', protect, async (req, res) => {
    try {
        const concerns = await Concern.find({ complaint: req.params.complaintId })
            .populate('user', 'name email')
            .sort({ createdAt: 1 }); // oldest first so numbering is chronological
        res.json(concerns);
    } catch (err) {
        console.error("Get Concerns Error:", err);
        res.status(500).json({ message: "Server error while fetching concerns." });
    }
});

// @route   GET /api/concerns/dept
// @desc    Get concerns for the dept-head's own department (server-side filtered)
// @access  Dept-Head
router.get('/dept', protect, authorize('dept-head'), async (req, res) => {
    try {
        const deptHeadDept = req.user.department;
        if (!deptHeadDept) return res.json([]);

        // Get the first word of the dept head's department for fuzzy match
        const deptFirstWord = deptHeadDept.split(' ')[0].toLowerCase();

        // Find all complaints whose category starts with the same word
        const allComplaints = await Complaint.find({}, '_id category');
        const matchingComplaintIds = allComplaints
            .filter(c => c.category && c.category.split(' ')[0].toLowerCase() === deptFirstWord)
            .map(c => c._id);

        if (matchingComplaintIds.length === 0) return res.json([]);

        const concerns = await Concern.find({ complaint: { $in: matchingComplaintIds } })
            .populate('complaint', 'complaintId category status')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });

        res.json(concerns);
    } catch (err) {
        console.error("Get Dept Concerns Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// @route   GET /api/concerns/all
// @desc    Get all concerns with complaint & user details (Admin view)
// @access  Admin, Dept-Head
router.get('/all', protect, authorize('admin', 'dept-head'), async (req, res) => {
    try {
        const concerns = await Concern.find()
            .populate('complaint', 'complaintId category status concernCount')
            .populate('user', 'name email')
            .sort({ createdAt: -1 });
        res.json(concerns);
    } catch (err) {
        console.error("Get All Concerns Error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

// @route   PUT /api/concerns/:id/respond
// @desc    Respond to a concern (Admin or Officer or Dept-Head)
// @access  Admin/Officer/Dept-Head
router.put('/:id/respond', protect, authorize('admin', 'officer', 'dept-head'), async (req, res) => {
    try {
        const { response, adminResponse, officerResponse, status } = req.body;
        const concern = await Concern.findById(req.params.id).populate('complaint');

        if (!concern) {
            return res.status(404).json({ message: "Concern not found." });
        }

        const msg = response || adminResponse || officerResponse;

        if (req.user.role === 'admin' || req.user.role === 'dept-head') {
            concern.adminResponse = msg;
        } else {
            concern.officerResponse = msg;
        }

        if (status) concern.status = status;
        await concern.save();

        // Add to complaint history
        if (concern.complaint) {
            concern.complaint.history.push({
                status: concern.complaint.status,
                changedBy: req.user._id,
                remarks: `[Concern Response by ${req.user.role}] ${msg}`
            });
            await concern.complaint.save();
        }

        // Notify User
        const newNotification = new Notification({
            user: concern.user,
            type: 'concern_responded',
            title: 'Response to your Concern',
            message: `${req.user.role.charAt(0).toUpperCase() + req.user.role.slice(1)} (${req.user.name}) responded to your concern for Complaint: ${concern.complaint?.complaintId || ''}\nResponse: ${msg}`,
            relatedComplaint: concern.complaint?._id,
            relatedConcern: concern._id
        });

        await newNotification.save();

        res.json({ message: "Response submitted successfully.", concern });
    } catch (err) {
        console.error("Respond Concern Error:", err);
        res.status(500).json({ message: "Server error while responding to concern." });
    }
});

// @route   GET /api/concerns/eligible/:complaintId
// @desc    Check if concern can be raised for a complaint
// @access  User
router.get('/eligible/:complaintId', protect, authorize('user'), async (req, res) => {
    try {
        const complaint = await Complaint.findById(req.params.complaintId);
        if (!complaint) return res.status(404).json({ message: "Complaint not found." });

        if (['Resolved', 'Closed'].includes(complaint.status)) {
            return res.json({ eligible: false, reason: "Complaint is already resolved or closed." });
        }

        const submissionDate = complaint.createdAt || new Date();
        const diffInMs = new Date() - new Date(submissionDate);
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        const remainingDays = Math.max(0, 7 - diffInDays);
        const alreadyToday = complaint.lastConcernDate && isSameDay(complaint.lastConcernDate, new Date());
        const concernCount = complaint.concernCount || 0;

        if (diffInDays < 7) {
            return res.json({ 
                eligible: false, 
                reason: "you can raise a concern after 7 days of submission only.",
                daysPassed: diffInDays,
                remainingDays,
                concernCount
            });
        }
        if (alreadyToday) {
            return res.json({ eligible: false, reason: "You already raised a concern today.", concernCount });
        }
        if (concernCount >= 3) {
            return res.json({ eligible: false, reason: "Maximum 3 concerns reached.", concernCount });
        }

        return res.json({ 
            eligible: true, 
            daysPassed: diffInDays, 
            concernCount,
            nextEscalationLevel: getEscalationLevel(concernCount + 1)
        });
    } catch (err) {
        console.error("Eligible check error:", err);
        res.status(500).json({ message: "Server error." });
    }
});

module.exports = router;
