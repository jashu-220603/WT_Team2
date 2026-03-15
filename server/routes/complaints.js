const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

const Complaint = require('../models/Complaint');


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

    let { title, description, category, subcategory, location } = req.body;

    if (!title || !description) {
      return res.status(400).json({
        message: "Title and description are required"
      });
    }

    // If location is missing (e.g., user didn't allow geolocation), store a placeholder
    if (!location) {
      location = "Unknown";
    }

    // Generate random complaint ID: CMP-XXXXXX
    const randomNum = Math.floor(100000000 + Math.random() * 900000000);
    const complaintId = `CMP-${randomNum}`;

    const complaint = new Complaint({
      complaintId,
      title,
      citizenName: req.user.name,
      description,
      category,
      subcategory,
      location,
      user: req.user._id,
      image: req.file ? req.file.filename : null
    });

    await complaint.save();

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
      .populate('assignedOfficer', 'name email department contactNumber bio')
      .sort({ createdAt: -1 });

    res.json(complaints);

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
        .populate('assignedOfficer', 'name email department contactNumber bio');
    } else {
      complaint = await Complaint.findOne({ complaintId: req.params.id })
        .populate('user', 'name email')
        .populate('assignedOfficer', 'name email department contactNumber bio');
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
      complaint.resolutionImage = req.file.filename;
    }

    complaint.history.push({
      status,
      remarks,
      changedBy: req.user._id,
      date: new Date()
    });

    await complaint.save();

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

    const { officerId } = req.body;

    if (!officerId) {
      return res.status(400).json({
        message: "Officer ID is required"
      });
    }

    complaint.assignedOfficer = officerId;
    complaint.status = "Assigned";

    complaint.history.push({
      status: "Assigned",
      changedBy: req.user._id,
      date: new Date()
    });

    await complaint.save();

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