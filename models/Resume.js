const mongoose = require('mongoose');

/**
 * Resume Model for MongoDB GridFS storage
 * This model stores metadata about uploaded resumes
 * The actual file is stored in MongoDB GridFS buckets
 */
const resumeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  fileName: {
    type: String,
    required: true,
  },
  fileType: {
    type: String,
    required: true,
    enum: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  },
  fileSize: {
    type: Number,
    required: true,
  },
  gridFSFileId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  keywords: [{
    type: String,
  }],
  uploadedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for faster queries
resumeSchema.index({ userId: 1, uploadedAt: -1 });

module.exports = mongoose.model('Resume', resumeSchema);

