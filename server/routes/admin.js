const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const { protect, authorize } = require('../middleware/auth');

const User = require('../models/User');
const Complaint = require('../models/Complaint');


/*
-------------------------------------------------
Get All Users (Admin)
GET /api/admin/users
-------------------------------------------------
*/
router.get('/users', protect, authorize('admin'), async (req, res) => {

  try {

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      count: users.length,
      users
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: 'Server error' });

  }

});


/*
-------------------------------------------------
Get All Officers
GET /api/admin/officers
-------------------------------------------------
*/
router.get('/officers', protect, authorize('admin'), async (req, res) => {

  try {

    const officers = await User.find({ role: 'officer' })
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      count: officers.length,
      officers
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: 'Server error' });

  }

});


/*
-------------------------------------------------
Create Officer
POST /api/admin/officers
-------------------------------------------------
*/
router.post('/officers', protect, authorize('admin'), async (req, res) => {

  try {

    const { name, email, password, department, officerLevel } = req.body;

    if (!name || !email || !password || !department) {
      return res.status(400).json({
        message: 'All fields are required'
      });
    }

    const existing = await User.findOne({ email });

    if (existing) {
      return res.status(400).json({
        message: 'Email already exists'
      });
    }

    const officer = new User({
      name,
      email,
      password,
      role: 'officer',
      department,
      officerLevel: officerLevel || 'Ground'
    });

    await officer.save();

    const safeOfficer = officer.toObject();
    delete safeOfficer.password;

    res.status(201).json({
      message: 'Officer created successfully',
      officer: safeOfficer
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: 'Server error' });

  }

});


/*
-------------------------------------------------
Delete User / Officer
DELETE /api/admin/users/:id
-------------------------------------------------
*/
router.delete('/users/:id', protect, authorize('admin'), async (req, res) => {

  try {

    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        message: 'Invalid user ID'
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        message: 'Admin cannot delete their own account'
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    await user.deleteOne();

    let message = 'User deleted successfully';
    if (user.role === 'officer') {
      message = `Officer ${user.name} has been terminated. A legal notice regarding the submission of the resignation letter has been sent to ${user.email}.`;
    }

    res.json({
      message
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: 'Server error' });

  }

});


/*
-------------------------------------------------
Admin Dashboard Statistics
GET /api/admin/stats
-------------------------------------------------
*/
router.get('/stats', protect, authorize('admin'), async (req, res) => {

  try {

    const totalComplaints = await Complaint.countDocuments();

    const submitted = await Complaint.countDocuments({ status: 'Submitted' });
    const assigned = await Complaint.countDocuments({ status: 'Assigned' });
    const inProgress = await Complaint.countDocuments({ status: 'In Progress' });
    const resolved = await Complaint.countDocuments({ status: 'Resolved' });
    const closed = await Complaint.countDocuments({ status: 'Closed' });

    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalOfficers = await User.countDocuments({ role: 'officer' });

    res.json({
      totalComplaints,
      submitted,
      assigned,
      inProgress,
      resolved,
      closed,
      totalUsers,
      totalOfficers
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: 'Server error' });

  }

});


module.exports = router;