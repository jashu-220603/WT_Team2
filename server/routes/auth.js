const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE');


/*
-------------------------------------------------
REGISTER
POST /api/auth/register
-------------------------------------------------
*/
router.post('/register', async (req, res) => {
  const { name, email, password, role, department, staffId } = req.body;
  try {
    const identifier = email.toLowerCase().trim();
    const finalStaffId = (staffId && staffId.trim() !== '') ? staffId.trim() : undefined;

    let user = await User.findOne({ 
      $or: [
        { email: identifier }, 
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

    // Enforce ID formats
    if (role === 'admin') {
      if (!finalStaffId || !finalStaffId.startsWith('adm-')) {
        return res.status(400).json({ message: 'Admin ID must follow pattern "adm-001"' });
      }
    }

    if (role === 'dept-head') {
      if (!finalStaffId || !finalStaffId.startsWith('head-')) {
        return res.status(400).json({ message: 'Department Head ID must follow pattern "head-001"' });
      }
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

    const { email, password, role, department } = req.body; // email field carries staffId/email

    try {
        // Lowercase identifiers as emails are stored in lowercase in the DB
        const identifier = email.toLowerCase().trim();
        const user = await User.findOne({ 
            $or: [{ email: identifier }, { staffId: email }] 
        }).select('+password');

        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Role validation
        if (role && user.role !== role) {
            return res.status(403).json({ message: `Access denied. You are not registered as a ${role}.` });
        }

        // Special check for Dept Head
        if (role === 'dept-head' && department && user.department !== department) {
            return res.status(403).json({ message: `Access denied. You are not the head of the ${department} department.` });
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

/*
-------------------------------------------------
GOOGLE LOGIN
POST /api/auth/google
-------------------------------------------------
*/
router.post('/google', async (req, res) => {
  const { credential, role } = req.body;
  if (!credential) {
    return res.status(400).json({ message: 'No Google credential provided' });
  }

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      // If GOOGLE_CLIENT_ID is not set we omit audience requirement or let it use the fallback
      audience: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE'
    });

    const payload = ticket.getPayload();
    const { email, name, sub: googleId, picture } = payload;

    let user = await User.findOne({ email });

    if (!user) {
      if (role && role !== 'citizen') {
        return res.status(403).json({ message: 'Google login is only allowed for citizens.' });
      }
      user = new User({
        name,
        email,
        role: 'user', // maps to 'citizen' on frontend
        googleId,
        profilePhoto: picture
      });
      await user.save();
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
      if (user.role !== 'user' && role === 'citizen') {
        return res.status(403).json({ message: 'Officers and Admins must use regular login.' });
      }
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      role: user.role,
      name: user.name,
      email: user.email,
      profilePhoto: user.profilePhoto, // Added this
      department: user.department || ''
    });

  } catch (err) {
    console.error('Google Auth Error:', err);
    // As it is a boilerplate for users without ID, we can optionally bypass verification locally, but it's insecure.
    res.status(500).json({ message: 'Google authentication failed. Please check Google Client ID.' });
  }
});

const upload = require('../middleware/upload');


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
      // If using Cloudinary, path is the secure URL. If local, use only filename.
      user.profilePhoto = req.file.path && req.file.path.startsWith('http') ? req.file.path : req.file.filename;
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



/*
-------------------------------------------------
RESET PASSWORD (FROM FORGOT PASSWORD)
POST /api/auth/reset-password
-------------------------------------------------
*/
router.post('/reset-password', async (req, res) => {
  const { identifier, newPassword } = req.body;

  if (!identifier || !newPassword) {
    return res.status(400).json({ message: 'Identifier and new password are required' });
  }

  try {
    const emailLower = identifier.toLowerCase().trim();
    // Find user by email or staffId
    const user = await User.findOne({
      $or: [{ email: emailLower }, { staffId: identifier }]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found with this Email / ID' });
    }

    // Update password (pre-save hook will hash it)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    console.error('Reset Password Error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});


module.exports = router;