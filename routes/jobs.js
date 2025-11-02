const express = require('express');
const Job = require('../models/Job');
const { auth } = require('../middleware/auth');
const { getRecommendations } = require('../recommendationService');
const { processSearchQuery, buildEnhancedQuery } = require('../groqService');
const { searchExternalLinksWithAI } = require('../webSearchService');

const router = express.Router();

// Get all jobs with optional filtering
router.get('/', async (req, res) => {
  try {
    const { search, location, skills, minExperience, status } = req.query;
    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'active';
    }

    // Process search query with Groq AI if search text is provided
    let processedSearch = null;
    if (search && search.trim() !== '') {
      try {
        // Process search text through Groq AI
        processedSearch = await processSearchQuery(search);
        console.log('AI Processed Search:', {
          original: processedSearch.originalQuery,
          processed: processedSearch.processedQuery,
          keywords: processedSearch.keywords,
          intent: processedSearch.intent
        });
        
        // Build enhanced query using AI-processed data
        const enhancedQuery = buildEnhancedQuery(processedSearch);
        Object.assign(query, enhancedQuery);
      } catch (error) {
        console.error('Error processing search with Groq:', error.message);
        // Fallback to basic search if Groq fails
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { company: { $regex: search, $options: 'i' } },
        ];
      }
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : skills.split(',');
      query.skills = { $in: skillArray };
    }

    if (minExperience) {
      query.experience = { $lte: parseInt(minExperience) };
    }

    const jobs = await Job.find(query)
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recommended jobs for a user
router.get('/recommended', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const recommendations = await getRecommendations(userId);
    res.json(recommendations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// AI-powered search with Groq processing details (must be before /:id route)
router.get('/search', async (req, res) => {
  try {
    const { q: searchQuery, location, skills, minExperience, status } = req.query;
    
    if (!searchQuery || searchQuery.trim() === '') {
      return res.status(400).json({ 
        message: 'Search query is required',
        processedSearch: null,
        jobs: []
      });
    }

    const query = {};

    if (status) {
      query.status = status;
    } else {
      query.status = 'active';
    }

    // Process search query with Groq AI (with timeout for faster fallback)
    let processedSearch = null;
    const groqPromise = processSearchQuery(searchQuery);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Groq timeout')), 2000) // 2 second timeout
    );

    try {
      processedSearch = await Promise.race([groqPromise, timeoutPromise]);
      console.log('AI Processed Search:', {
        original: processedSearch.originalQuery,
        processed: processedSearch.processedQuery,
        keywords: processedSearch.keywords,
        intent: processedSearch.intent
      });
      
      // Build enhanced query using AI-processed data
      const enhancedQuery = buildEnhancedQuery(processedSearch);
      Object.assign(query, enhancedQuery);
    } catch (error) {
      console.error('Error processing search with Groq:', error.message);
      // Immediately fallback to fast basic search
      const searchTerms = searchQuery.split(/\s+/).filter(term => term.length > 2);
      query.$or = [
        { title: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
        { company: { $regex: searchQuery, $options: 'i' } },
      ];
      // Also search individual terms for better matching
      if (searchTerms.length > 1) {
        searchTerms.forEach(term => {
          query.$or.push(
            { title: { $regex: term, $options: 'i' } },
            { description: { $regex: term, $options: 'i' } }
          );
        });
      }
      processedSearch = {
        originalQuery: searchQuery,
        processedQuery: searchQuery,
        keywords: searchTerms,
        searchTerms: searchTerms,
        intent: 'Fast search - matching your description',
        useAI: false
      };
    }

    // Apply additional filters
    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (skills) {
      const skillArray = Array.isArray(skills) ? skills : skills.split(',');
      query.skills = { $in: skillArray };
    }

    if (minExperience) {
      query.experience = { $lte: parseInt(minExperience) };
    }

    const jobs = await Job.find(query)
      .populate('postedBy', 'name email')
      .sort({ createdAt: -1 });

    // Fetch external links for the search query
    let externalLinks = [];
    try {
      externalLinks = await searchExternalLinksWithAI(searchQuery);
    } catch (error) {
      console.error('Error fetching external links:', error.message);
    }

    res.json({
      processedSearch: {
        originalQuery: processedSearch.originalQuery,
        processedQuery: processedSearch.processedQuery,
        keywords: processedSearch.keywords || [],
        skills: processedSearch.skills || [],
        intent: processedSearch.intent,
        jobTitle: processedSearch.jobTitle,
        jobLevel: processedSearch.jobLevel,
        searchTerms: processedSearch.searchTerms || [],
        useAI: processedSearch.useAI || false
      },
      jobs: jobs,
      totalResults: jobs.length,
      externalLinks: externalLinks
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get single job (must be after /search route)
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id).populate('postedBy', 'name email');
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create job (recruiter only)
router.post('/', auth, async (req, res) => {
  try {
    if (req.user.role !== 'recruiter' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only recruiters can post jobs' });
    }

    const job = new Job({
      ...req.body,
      postedBy: req.user._id,
    });

    await job.save();
    await job.populate('postedBy', 'name email');

    res.status(201).json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update job
router.put('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    Object.assign(job, req.body);
    await job.save();
    await job.populate('postedBy', 'name email');

    res.json(job);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete job
router.delete('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    if (job.postedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await job.deleteOne();
    res.json({ message: 'Job deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bookmark job
router.post('/:id/bookmark', auth, async (req, res) => {
  try {
    const user = req.user;
    const jobId = req.params.id;

    if (user.bookmarks.includes(jobId)) {
      user.bookmarks = user.bookmarks.filter(id => id.toString() !== jobId);
      await user.save();
      return res.json({ message: 'Job unbookmarked', bookmarked: false });
    } else {
      user.bookmarks.push(jobId);
      await user.save();
      return res.json({ message: 'Job bookmarked', bookmarked: true });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

