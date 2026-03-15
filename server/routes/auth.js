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

    let user = await User.findOne({ 
      $or: [{ email }, { staffId: staffId || 'NON_EXISTENT_ID' }] 
    });

    if (user) {
      return res.status(400).json({ message: 'User already exists (Email or Staff ID taken)' });
    }

    user = new User({
      name,
      email,
      password,
      role,
      department,
      staffId
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      role: user.role
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: 'Server error' });

  }

});


/*
-------------------------------------------------
LOGIN
POST /api/auth/login
-------------------------------------------------
*/
router.post('/login', async (req, res) => {

  const { email, password } = req.body; // email field will carry email or staffId from frontend

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

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    res.json({
      token,
      role: user.role,
      department: user.department
    });

  } catch (err) {

    console.error(err);
    res.status(500).json({ message: 'Server error' });

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
    bio: req.user.bio
  });
});

/*
-------------------------------------------------
UPDATE PROFILE
PUT /api/auth/profile
-------------------------------------------------
*/
router.put('/profile', protect, async (req, res) => {
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
        contactNumber: user.contactNumber
      }
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;