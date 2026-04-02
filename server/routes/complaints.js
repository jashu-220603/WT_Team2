const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const Complaint = require('../models/Complaint');
const Notification = require('../models/Notification');
const Counter = require('../models/Counter');
const User = require('../models/User');

/*
-------------------------------------------------------
Get Public Stats
GET /api/complaints/public/stats
-------------------------------------------------------
*/
router.get('/public/stats', async (req, res) => {
  try {
    const total = await Complaint.countDocuments();
    const resolved = await Complaint.countDocuments({ status: { $in: ['Resolved', 'Closed'] } });
    const pending = total - resolved;
    
    res.json({
      total,
      resolved,
      pending,
      lastUpdated: new Date()
    });
  } catch (err) {
    console.error('Public stats error:', err);
    res.status(500).json({ message: "Server error" });
  }
});

/*
-------------------------------------------------------
Create Complaint (User only)
POST /api/complaints
-------------------------------------------------------
*/
router.post(
'/',
protect,
authorize('user'),
upload.single('image'),
async (req, res) => {

  try {

    let { title, description, category, subcategory, location, priority } = req.body;

    if (!description) {
      return res.status(400).json({
        message: "Description is required"
      });
    }

    // If location is missing (e.g., user didn't allow geolocation), store a placeholder
    if (!location) {
      location = "Unknown";
    }

    // Generate sequential complaint ID: CMP-000001
    const counter = await Counter.findOneAndUpdate(
      { id: 'complaintId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    
    // Format to 6 digits, e.g., 000001
    const seqStr = String(counter.seq).padStart(6, '0');
    const complaintId = `CMP-${seqStr}`;

    const complaint = new Complaint({
      complaintId,
      title,
      citizenName: req.user.name,
      description,
      category,
      subcategory,
      location,
      user: req.user._id,
      priority: priority || 'Medium',
      image: req.file ? (req.file.secure_url || req.file.url || (req.file.path && req.file.path.startsWith('http') ? req.file.path : req.file.filename)) : null
    });

    let assignedOfficer = null;

    // Auto-assign logic for low priority complaints
    if (complaint.priority === 'Low') {
      const groundOfficer = await User.findOne({
        role: 'officer',
        department: category,
        officerLevel: 'Ground'
      });

      if (groundOfficer) {
        complaint.assignedOfficer = groundOfficer._id;
        complaint.status = 'Assigned';
        complaint.history.push({
          status: 'Assigned',
          remarks: 'Auto-assigned to Ground Level Officer due to Low Priority',
          changedBy: req.user._id,
          date: new Date()
        });
        assignedOfficer = groundOfficer;
      }
    }

    await complaint.save();
    
    // Notify User
    await Notification.create({
      user: req.user._id,
      type: 'complaint_status',
      title: 'Complaint Received',
      message: `Your complaint ${complaintId} has been successfully submitted.` + (assignedOfficer ? ' It has been auto-assigned to an officer.' : ''),
      relatedComplaint: complaint._id
    });

    // Notify Officer if auto-assigned
    if (assignedOfficer) {
      await Notification.create({
        user: assignedOfficer._id,
        type: 'assignment',
        title: 'New Complaint Auto-Assigned',
        message: `A Low Priority complaint (${complaintId}) has been auto-assigned to you.`,
        relatedComplaint: complaint._id
      });
    }

    res.status(201).json({
      message: "Complaint submitted successfully",
      complaint
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});


/*
-------------------------------------------------------
Get Complaints
User → own complaints
Officer → assigned complaints
Admin → all complaints
GET /api/complaints
-------------------------------------------------------
*/
router.get('/', protect, async (req, res) => {

  try {

    let filter = {};

    if (req.user.role === 'user') {
      filter.user = req.user._id;
    }

    if (req.user.role === 'officer') {
      filter.assignedOfficer = req.user._id;
    }

    const complaints = await Complaint.find(filter)
      .populate('user', 'name email')
      .populate('assignedOfficer', 'name email department contactNumber bio profilePhoto')
      .sort({ createdAt: -1 });

    // For officers, check which complaints have concerns
    const Concern = require('../models/Concern');
    const complaintsWithStatus = await Promise.all(complaints.map(async (c) => {
      const concernCount = await Concern.countDocuments({ complaint: c._id });
      return {
        ...c.toObject(),
        hasConcern: concernCount > 0
      };
    }));

    res.json(complaintsWithStatus);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});


/*
-------------------------------------------------------
Get Single Complaint
GET /api/complaints/:id
-------------------------------------------------------
*/
router.get('/:id', protect, async (req, res) => {

  try {

    let complaint;
    
    if (mongoose.Types.ObjectId.isValid(req.params.id)) {
      complaint = await Complaint.findById(req.params.id)
        .populate('user', 'name email')
        .populate('assignedOfficer', 'name email department contactNumber bio profilePhoto');
    } else {
      complaint = await Complaint.findOne({ complaintId: req.params.id })
        .populate('user', 'name email')
        .populate('assignedOfficer', 'name email department contactNumber bio profilePhoto');
    }

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found"
      });
    }

    // Access Control
    if (
      (req.user.role === 'user' && !complaint.user.equals(req.user._id)) ||
      (req.user.role === 'officer' && !complaint.assignedOfficer?.equals(req.user._id))
    ) {
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          message: "Access denied"
        });
      }
    }

    res.json(complaint);

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});


/*
-------------------------------------------------------
Update Complaint Status
Officer / Admin
PUT /api/complaints/:id/status
-------------------------------------------------------
*/
router.put('/:id/status', protect, authorize('officer','admin'), upload.single('resolutionImage'), async (req, res) => {

  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid complaint ID"
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found"
      });
    }

    // Officer can update only assigned complaints
    if (req.user.role === 'officer') {

      if (!complaint.assignedOfficer || !complaint.assignedOfficer.equals(req.user._id)) {
        return res.status(403).json({
          message: "You are not assigned to this complaint"
        });
      }

    }

    const { status, remarks } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Status is required"
      });
    }

    complaint.status = status;
    
    if (req.file) {
      // If using Cloudinary, path is the secure URL. If local, use only filename.
      complaint.resolutionImage = req.file.secure_url || req.file.url || (req.file.path && req.file.path.startsWith('http') ? req.file.path : req.file.filename);
    }

    complaint.history.push({
      status,
      remarks,
      changedBy: req.user._id,
      date: new Date()
    });

    await complaint.save();
    
    // Notify User
    let title = 'Complaint Update';
    if (status === 'In Progress') title = 'Complaint In Progress';
    if (status === 'Resolved') title = 'Complaint Resolved';
    
    await Notification.create({
      user: complaint.user,
      type: 'complaint_status',
      title: title,
      message: `Your complaint ${complaint.complaintId} status has been updated to: ${status}`,
      relatedComplaint: complaint._id
    });

    res.json({
      message: "Complaint status updated successfully",
      complaint
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});

/*
-------------------------------------------------------
Rate Complaint (User only)
PUT /api/complaints/:id/rate
-------------------------------------------------------
*/
router.put('/:id/rate', protect, authorize('user'), async (req, res) => {
  try {
    const { rating, feedback } = req.body;
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    if (!complaint.user.equals(req.user._id)) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (complaint.status !== 'Resolved' && complaint.status !== 'Closed') {
      return res.status(400).json({ message: "Only resolved complaints can be rated" });
    }

    complaint.rating = rating;
    complaint.feedback = feedback;

    await complaint.save();

    res.json({ message: "Thank you for your feedback!", complaint });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


/*
-------------------------------------------------------
Assign Complaint (Admin only)
PUT /api/complaints/:id/assign
-------------------------------------------------------
*/
router.put('/:id/assign', protect, authorize('admin'), async (req, res) => {

  try {

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        message: "Invalid complaint ID"
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        message: "Complaint not found"
      });
    }

    const { officerId, status, remarks } = req.body;

    if (!officerId) {
      return res.status(400).json({
        message: "Officer ID is required"
      });
    }

    complaint.assignedOfficer = officerId;
    complaint.status = status || "Assigned";

    complaint.history.push({
      status: status || "Assigned",
      remarks: remarks || "Assigned by Admin",
      changedBy: req.user._id,
      date: new Date()
    });

    await complaint.save();
    
    // Notify User
    await Notification.create({
      user: complaint.user,
      type: 'assignment',
      title: 'Complaint Assigned',
      message: `Your complaint ${complaint.complaintId} has been ${status === 'Reassigned' ? 'reassigned' : 'assigned'} to an officer.`,
      relatedComplaint: complaint._id
    });

    res.json({
      message: "Officer assigned successfully",
      complaint
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: "Server error" });

  }

});


module.exports = router;