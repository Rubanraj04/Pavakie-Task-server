const express = require('express');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

/**
 * Update user profile
 * PUT /api/users/profile
 * Supports all profile fields including personal info, professional info, education, work history, etc.
 */
router.put('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Personal Information
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.phone !== undefined) user.phone = req.body.phone;
    if (req.body.dateOfBirth !== undefined) user.dateOfBirth = req.body.dateOfBirth;
    if (req.body.bio !== undefined) user.bio = req.body.bio;
    if (req.body.profilePicture !== undefined) user.profilePicture = req.body.profilePicture;

    // Location
    if (req.body.location !== undefined) {
      if (req.body.location.city !== undefined) user.location.city = req.body.location.city;
      if (req.body.location.state !== undefined) user.location.state = req.body.location.state;
      if (req.body.location.country !== undefined) user.location.country = req.body.location.country;
      if (req.body.location.zipCode !== undefined) user.location.zipCode = req.body.location.zipCode;
    }

    // Professional Information
    if (req.body.skills !== undefined) user.skills = req.body.skills;
    if (req.body.experience !== undefined) user.experience = parseInt(req.body.experience) || 0;
    if (req.body.jobTitle !== undefined) user.jobTitle = req.body.jobTitle;
    if (req.body.currentCompany !== undefined) user.currentCompany = req.body.currentCompany;

    // Education
    if (req.body.education !== undefined) {
      user.education = req.body.education.map(edu => ({
        degree: edu.degree,
        field: edu.field,
        institution: edu.institution,
        startDate: edu.startDate ? new Date(edu.startDate) : undefined,
        endDate: edu.endDate ? new Date(edu.endDate) : undefined,
        currentlyStudying: edu.currentlyStudying || false,
        description: edu.description
      }));
    }

    // Work History
    if (req.body.workHistory !== undefined) {
      user.workHistory = req.body.workHistory.map(work => ({
        title: work.title,
        company: work.company,
        location: work.location,
        startDate: new Date(work.startDate),
        endDate: work.endDate ? new Date(work.endDate) : undefined,
        currentlyWorking: work.currentlyWorking || false,
        description: work.description,
        achievements: work.achievements || []
      }));
    }

    // Certifications
    if (req.body.certifications !== undefined) {
      user.certifications = req.body.certifications.map(cert => ({
        name: cert.name,
        issuer: cert.issuer,
        issueDate: cert.issueDate ? new Date(cert.issueDate) : undefined,
        expiryDate: cert.expiryDate ? new Date(cert.expiryDate) : undefined,
        credentialId: cert.credentialId,
        credentialUrl: cert.credentialUrl
      }));
    }

    // Languages
    if (req.body.languages !== undefined) {
      user.languages = req.body.languages;
    }

    // Social Links
    if (req.body.linkedIn !== undefined) user.linkedIn = req.body.linkedIn;
    if (req.body.github !== undefined) user.github = req.body.github;
    if (req.body.portfolio !== undefined) user.portfolio = req.body.portfolio;
    if (req.body.website !== undefined) user.website = req.body.website;

    // Job Preferences (for candidates)
    if (req.body.preferredJobTypes !== undefined) user.preferredJobTypes = req.body.preferredJobTypes;
    if (req.body.preferredLocations !== undefined) user.preferredLocations = req.body.preferredLocations;
    if (req.body.salaryExpectation !== undefined) {
      if (req.body.salaryExpectation.min !== undefined) user.salaryExpectation.min = req.body.salaryExpectation.min;
      if (req.body.salaryExpectation.max !== undefined) user.salaryExpectation.max = req.body.salaryExpectation.max;
      if (req.body.salaryExpectation.currency !== undefined) user.salaryExpectation.currency = req.body.salaryExpectation.currency;
    }
    if (req.body.availability !== undefined) user.availability = req.body.availability;

    // Resume (read-only fields - updated via upload endpoint)
    // These are kept for backward compatibility
    if (req.body.resumeUrl !== undefined) user.resumeUrl = req.body.resumeUrl;
    if (req.body.resumeKeywords !== undefined) user.resumeKeywords = req.body.resumeKeywords;

    await user.save();
    
    // Return user without password
    const userResponse = await User.findById(user._id).select('-password');
    res.json(userResponse);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ message: error.message || 'Error updating profile' });
  }
});

// Get bookmarked jobs
router.get('/bookmarks', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('bookmarks');
    res.json(user.bookmarks || []);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

