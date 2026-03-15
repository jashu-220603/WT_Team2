const mongoose = require('mongoose');

const LegalNoticeSchema = new mongoose.Schema({
  officerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['Delivered', 'Read'],
    default: 'Delivered'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('LegalNotice', LegalNoticeSchema);
