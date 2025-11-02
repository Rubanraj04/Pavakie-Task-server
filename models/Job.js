const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  company: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
  requirements: [{
    type: String,
  }],
  skills: [{
    type: String,
  }],
  experience: {
    type: Number,
    default: 0,
  },
  location: {
    type: String,
  },
  salary: {
    min: Number,
    max: Number,
    currency: {
      type: String,
      default: 'USD',
    },
  },
  postedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  applicants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  status: {
    type: String,
    enum: ['active', 'closed', 'draft'],
    default: 'active',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Job', jobSchema);

