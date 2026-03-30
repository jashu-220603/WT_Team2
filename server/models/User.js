const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({

  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  password: {
    type: String,
    required: function() { return !this.googleId; },
    select: false
  },

  googleId: {
    type: String,
    unique: true,
    sparse: true
  },

  role: {
    type: String,
    enum: ['user', 'officer', 'admin', 'dept-head'],
    default: 'user'
  },

  department: {
    type: String,
    default: ''
  },

  officerLevel: {
    type: String,
    enum: ['Ground', 'Senior'],
    default: 'Ground'
  },

  staffId: {
    type: String,
    unique: true,
    sparse: true, // Allows null/missing values for regular users
    trim: true
  },

  contactNumber: {
    type: String,
    trim: true
  },

  bio: {
    type: String,
    trim: true
  },

  profilePhoto: {
    type: String,
    default: ''
  },

  createdAt: {
    type: Date,
    default: Date.now
  }

});

/* ================================
   HASH PASSWORD BEFORE SAVE
================================ */

UserSchema.pre('save', async function(next) {

  if (!this.isModified('password') || !this.password) {
    return next();
  }

  const salt = await bcrypt.genSalt(10);

  this.password = await bcrypt.hash(this.password, salt);

  next();

});

/* ================================
   PASSWORD MATCH FUNCTION
================================ */

UserSchema.methods.matchPassword = async function(enteredPassword) {

  return await bcrypt.compare(enteredPassword, this.password);

};

module.exports = mongoose.model('User', UserSchema);