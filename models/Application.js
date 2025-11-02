const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  job: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
    required: true,
  },
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  resumeUrl: {
    type: String,
  },
  coverLetter: {
    type: String,
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'shortlisted', 'rejected', 'accepted'],
    default: 'pending',
  },
}, {
  timestamps: true,
});

applicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', applicationSchema);

