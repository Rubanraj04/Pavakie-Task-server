const express = require('express');
const Application = require('../models/Application');
const Job = require('../models/Job');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Apply for a job
router.post('/', auth, async (req, res) => {
  try {
    const { jobId, coverLetter, resumeUrl } = req.body;

    // Check if job exists
    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    // Check if already applied
    const existingApplication = await Application.findOne({
      job: jobId,
      candidate: req.user._id,
    });

    if (existingApplication) {
      return res.status(400).json({ message: 'Already applied for this job' });
    }

    // Create application
    const application = new Application({
      job: jobId,
      candidate: req.user._id,
      coverLetter,
      resumeUrl: resumeUrl || req.user.resumeUrl,
    });

    await application.save();

    // Add to job applicants
    job.applicants.push(req.user._id);
    await job.save();

    await application.populate('job', 'title company');
    await application.populate('candidate', 'name email');

    res.status(201).json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's applications
router.get('/my-applications', auth, async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user._id })
      .populate('job', 'title company location')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get applications for a job (recruiter)
router.get('/job/:jobId', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);

    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const applications = await Application.find({ job: req.params.jobId })
      .populate('candidate', 'name email skills experience resumeUrl')
      .sort({ createdAt: -1 });

    res.json(applications);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update application status
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const application = await Application.findById(req.params.id).populate('job');

    if (!application) {
      return res.status(404).json({ message: 'Application not found' });
    }

    if (application.job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    application.status = status;
    await application.save();

    res.json(application);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

