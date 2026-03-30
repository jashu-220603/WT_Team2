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
router.get('/officers', protect, authorize('admin', 'dept-head'), async (req, res) => {

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
router.post('/officers', protect, authorize('admin', 'dept-head'), async (req, res) => {

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

    // If caller is Dept Head, overwrite department to their own
    let finalDept = department;
    if (req.user.role === 'dept-head') {
      finalDept = req.user.department;
    }

    const officer = new User({
      name,
      email,
      password,
      role: 'officer',
      department: finalDept,
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
Promote Officer to Department Head
PUT /api/admin/users/:id/promote
-------------------------------------------------
*/
router.put('/users/:id/promote', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const officer = await User.findById(id);
    if (!officer || officer.role !== 'officer') {
      return res.status(404).json({ message: 'Officer not found' });
    }

    // Optional: Demote existing dept-head for this department
    await User.updateMany(
      { department: officer.department, role: 'dept-head' },
      { role: 'officer' }
    );

    officer.role = 'dept-head';
    await officer.save();

    res.json({
      message: `${officer.name} has been promoted to Department Head for ${officer.department}`,
      user: officer
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
router.delete('/users/:id', protect, authorize('admin', 'dept-head'), async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // If caller is Admin
    if (req.user.role === 'admin') {
      // Admin can delete regular users but NOT officers anymore (as per request)
      if (targetUser.role === 'officer' || targetUser.role === 'dept-head') {
        return res.status(403).json({ 
          message: 'Admin no longer has permission to terminate officers. This action is restricted to Department Heads.' 
        });
      }
      
      // Admin cannot delete self
      if (req.user._id.toString() === id) {
        return res.status(400).json({ message: 'Admin cannot delete their own account' });
      }
    }

    // If caller is Dept Head
    if (req.user.role === 'dept-head') {
      // Dept Head can ONLY delete officers in THEIR department
      if (targetUser.role !== 'officer') {
        return res.status(403).json({ message: 'Department Head can only terminate officers.' });
      }
      if (targetUser.department !== req.user.department) {
        return res.status(403).json({ message: 'You can only terminate officers in your own department.' });
      }
    }

    await targetUser.deleteOne();

    let message = 'User deleted successfully';
    if (targetUser.role === 'officer') {
      message = `Officer ${targetUser.name} has been terminated. A legal notice has been sent to ${targetUser.email}.`;
    }

    res.json({ message });

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