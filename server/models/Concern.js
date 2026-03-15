const mongoose = require('mongoose');

const ConcernSchema = new mongoose.Schema({
  complaint: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Complaint',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  description: {
    type: String,
    required: true
  },
  image: {
    type: String
  },
  adminResponse: {
    type: String,
    default: ''
  },
  officerResponse: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['Open', 'Addressed', 'Closed'],
    default: 'Open'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Concern', ConcernSchema);
