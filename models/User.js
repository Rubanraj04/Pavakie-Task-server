const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const educationSchema = new mongoose.Schema({
  degree: { type: String, required: true },
  field: { type: String, required: true },
  institution: { type: String, required: true },
  startDate: { type: Date },
  endDate: { type: Date },
  currentlyStudying: { type: Boolean, default: false },
  description: { type: String }
}, { _id: true });

const workExperienceSchema = new mongoose.Schema({
  title: { type: String, required: true },
  company: { type: String, required: true },
  location: { type: String },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  currentlyWorking: { type: Boolean, default: false },
  description: { type: String },
  achievements: [{ type: String }]
}, { _id: true });

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['candidate', 'recruiter', 'admin'],
    default: 'candidate',
  },
  // Personal Information
  phone: {
    type: String,
  },
  location: {
    city: { type: String },
    state: { type: String },
    country: { type: String },
    zipCode: { type: String }
  },
  dateOfBirth: {
    type: Date,
  },
  bio: {
    type: String,
    maxlength: 1000,
  },
  profilePicture: {
    type: String,
  },
  // Professional Information
  skills: [{
    type: String,
  }],
  experience: {
    type: Number,
    default: 0,
  },
  jobTitle: {
    type: String,
  },
  currentCompany: {
    type: String,
  },
  education: [educationSchema],
  workHistory: [workExperienceSchema],
  certifications: [{
    name: { type: String },
    issuer: { type: String },
    issueDate: { type: Date },
    expiryDate: { type: Date },
    credentialId: { type: String },
    credentialUrl: { type: String }
  }],
  languages: [{
    language: { type: String },
    proficiency: { 
      type: String, 
      enum: ['Beginner', 'Intermediate', 'Advanced', 'Native'],
      default: 'Intermediate'
    }
  }],
  // Resume Information
  resumeFileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Resume',
  },
  resumeFileName: {
    type: String,
  },
  resumeFileType: {
    type: String,
  },
  resumeUrl: {
    type: String,
  },
  resumeKeywords: [{
    type: String,
  }],
  resumeUploadedAt: {
    type: Date,
  },
  // Social Links
  linkedIn: {
    type: String,
  },
  github: {
    type: String,
  },
  portfolio: {
    type: String,
  },
  website: {
    type: String,
  },
  // Job Preferences (for candidates)
  preferredJobTypes: [{
    type: String,
    enum: ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Internship'],
  }],
  preferredLocations: [{
    type: String,
  }],
  salaryExpectation: {
    min: { type: Number },
    max: { type: Number },
    currency: { type: String, default: 'USD' }
  },
  availability: {
    type: String,
    enum: ['Immediately', '1 month', '2 months', '3+ months', 'Not looking'],
    default: 'Immediately'
  },
  bookmarks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Job',
  }],
}, {
  timestamps: true,
});

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

