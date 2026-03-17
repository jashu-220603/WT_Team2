const mongoose = require('mongoose');

const ComplaintSchema = new mongoose.Schema({

  complaintId: {
    type: String,
    unique: true
  },

  title: {
    type: String,
    trim: true
  },

  citizenName: {
    type: String
  },

  description: {
    type: String,
    required: true
  },

  category: {
    type: String,
    required: true
  },

  subcategory: {
    type: String
  },

  location: {
    type: String,
    required: true
  },

  image: {
    type: String
  },

  priority: {
    type: String,
    enum: ['Low','Medium','High'],
    default: 'Medium'
  },


  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  assignedOfficer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  status: {
    type: String,
    enum: ['Submitted','Assigned','Pending','In Progress','Resolved','Closed'],
    default: 'Submitted'
  },

  history: [
    {
      status: String,

      changedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },

      date: {
        type: Date,
        default: Date.now
      },

      remarks: String
    }
  ],

  rating: {
    type: Number,
    min: 1,
    max: 5
  },

  feedback: {
    type: String
  },

  resolutionImage: {
    type: String
  }

},
{
  timestamps: true
});

module.exports = mongoose.model('Complaint', ComplaintSchema);