const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
const { validateUserInput } = require('../utils/validation');
const { generateToken } = require('../utils/jwt');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, skills, experience } = req.body;

    // Validate input
    const validation = validateUserInput({ name, email, password });
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join(', ') });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Validate role
    const validRoles = ['candidate', 'recruiter', 'admin'];
    if (role && !validRoles.includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be candidate, recruiter, or admin' });
    }

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: role || 'candidate',
      skills: Array.isArray(skills) ? skills : [],
      experience: parseInt(experience) || 0,
    });

    await user.save();

    // Generate token
    const token = generateToken(user._id);

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills,
        experience: user.experience,
      },
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already registered' });
    }
    if (error.message === 'Database query timeout' || error.name === 'MongoServerError') {
      return res.status(503).json({ 
        message: 'Database connection timeout. Please whitelist your IP in MongoDB Atlas Network Access.',
        error: 'DATABASE_TIMEOUT'
      });
    }
    console.error('Registration error:', error);
    res.status(500).json({ message: error.message || 'Registration failed. Please try again.' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    // Check MongoDB connection
    const { checkConnection } = require('../config/database');
    if (!checkConnection()) {
      return res.status(503).json({ 
        message: 'Database connection failed. Please check MongoDB connection and whitelist your IP in MongoDB Atlas.',
        error: 'DATABASE_CONNECTION_ERROR'
      });
    }

    // Find user (case-insensitive email search) with timeout
    const user = await Promise.race([
      User.findOne({ email: email.toLowerCase().trim() }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 8000)
      )
    ]);

    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills,
        experience: user.experience,
      },
    });
  } catch (error) {
    if (error.message === 'Database query timeout' || error.name === 'MongoServerError') {
      return res.status(503).json({ 
        message: 'Database connection timeout. Please whitelist your IP in MongoDB Atlas Network Access.',
        error: 'DATABASE_TIMEOUT'
      });
    }
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed. Please try again.' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password').populate('bookmarks');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Refresh token (optional - can extend token expiration)
router.post('/refresh', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate new token using utility function
    const token = generateToken(user._id);

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        skills: user.skills,
        experience: user.experience,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

