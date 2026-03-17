const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');


/*
-------------------------------------------------
REGISTER
POST /api/auth/register
-------------------------------------------------
*/
router.post('/register', async (req, res) => {
  const { name, email, password, role, department, staffId } = req.body;

  try {
    // Convert empty staffId to undefined so Mongoose sparse index ignores it
    const finalStaffId = (staffId && staffId.trim() !== '') ? staffId.trim() : undefined;

    let user = await User.findOne({ 
      $or: [
        { email }, 
        { staffId: finalStaffId || '___NON_EXISTENT_ID___' }
      ] 
    });

    if (user) {
      return res.status(400).json({ message: 'User already exists (Email or Staff ID taken)' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('FATAL: JWT_SECRET is not defined in .env');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    user = new User({
      name,
      email,
      password,
      role,
      department,
      staffId: finalStaffId
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      role: user.role,
      name: user.name
    });

  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 11000) {
        return res.status(400).json({ message: 'Duplicate value error: Email or ID already in use.' });
    }
    res.status(500).json({ message: 'Server error: ' + err.message });
  }

});


/*
-------------------------------------------------
LOGIN
POST /api/auth/login
-------------------------------------------------
*/
router.post('/login', async (req, res) => {

  const { email, password, role } = req.body; // email field will carry email or staffId from frontend

  try {

    const user = await User
      .findOne({ 
        $or: [
          { email: email }, 
          { staffId: email }
        ] 
      })
      .select('+password'); // important fix

    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Role validation fix
    if (role && user.role !== role) {
        return res.status(403).json({ message: `Access denied. You are not registered as a ${role}.` });
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    if (!process.env.JWT_SECRET) {
        console.error('FATAL: JWT_SECRET is not defined in .env');
        return res.status(500).json({ message: 'Server configuration error' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      role: user.role,
      department: user.department,
      name: user.name
    });

  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }

});

const multer = require('multer');
const path = require('path');

// Configure multer for profile photo uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/'); // Make sure this folder exists
  },
  filename: function (req, file, cb) {
    cb(null, 'profile-' + Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Images only!'));
    }
  }
});

/*
-------------------------------------------------
GET CURRENT USER
GET /api/auth/me
-------------------------------------------------
*/

router.get('/me', protect, async (req, res) => {
  res.json({
    _id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    department: req.user.department,
    staffId: req.user.staffId,
    contactNumber: req.user.contactNumber,
    bio: req.user.bio,
    profilePhoto: req.user.profilePhoto
  });
});

/*
-------------------------------------------------
UPDATE PROFILE
PUT /api/auth/profile
-------------------------------------------------
*/
router.put('/profile', protect, upload.single('profilePhoto'), async (req, res) => {
  const { name, email, password, bio, contactNumber } = req.body;

  try {
    const user = await User.findById(req.user._id).select('+password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (email) user.email = email;
    if (bio !== undefined) user.bio = bio;
    if (contactNumber !== undefined) user.contactNumber = contactNumber;
    
    // Add profile photo update if file is uploaded
    if (req.file) {
      user.profilePhoto = req.file.filename;
    }
    
    if (password) {
      user.password = password; // Pre-save hook will hash it
    }

    await user.save();

    res.json({
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        bio: user.bio,
        contactNumber: user.contactNumber,
        profilePhoto: user.profilePhoto
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});


module.exports = router;