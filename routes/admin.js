const express = require('express');
const Job = require('../models/Job');
const Application = require('../models/Application');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require admin access
router.use(auth);
router.use(authorize('admin'));

// Get dashboard statistics
router.get('/stats', async (req, res) => {
  try {
    const totalJobs = await Job.countDocuments();
    const activeJobs = await Job.countDocuments({ status: 'active' });
    const totalApplications = await Application.countDocuments();
    const totalUsers = await User.countDocuments();
    const totalRecruiters = await User.countDocuments({ role: 'recruiter' });
    const totalCandidates = await User.countDocuments({ role: 'candidate' });

    // Jobs by status
    const jobsByStatus = await Job.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Applications by status
    const applicationsByStatus = await Application.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);

    // Jobs posted over time (last 30 days)
    const jobsOverTime = await Job.aggregate([
      {
        $match: {
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Top companies by job postings
    const topCompanies = await Job.aggregate([
      {
        $group: {
          _id: '$company',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      overview: {
        totalJobs,
        activeJobs,
        totalApplications,
        totalUsers,
        totalRecruiters,
        totalCandidates,
      },
      jobsByStatus,
      applicationsByStatus,
      jobsOverTime,
      topCompanies,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all jobs (admin view)
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all applications (admin view)
router.get('/applications', async (req, res) => {
  try {
    const applications = await Application.find()
      .populate('job', 'title company')
      .populate('candidate', 'name email')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

