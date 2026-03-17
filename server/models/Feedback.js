const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  feedbackText: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['General', 'Complaint', 'Concern'],
    default: 'General'
  },
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint'
  },
  officer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Feedback', FeedbackSchema);
