const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { connectDB } = require('./config/database');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB().then(() => {
  // Initialize GridFS after MongoDB connection
  const { initGridFS } = require('./services/gridfsService');
  initGridFS().catch(err => {
    console.error('Warning: Could not initialize GridFS:', err.message);
  });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/users', require('./routes/users'));
app.use('/api/applications', require('./routes/applications'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/upload', require('./routes/upload'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Error handling for port conflicts
server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`\n❌ ERROR: Port ${PORT} is already in use!`);
    console.error(`\nTo fix this, you can:`);
    console.error(`1. Kill the process using port ${PORT}:`);
    console.error(`   Windows: netstat -ano | findstr :${PORT}`);
    console.error(`   Then: taskkill /PID <PID> /F`);
    console.error(`   Or: Get-Process -Id (Get-NetTCPConnection -LocalPort ${PORT}).OwningProcess | Stop-Process`);
    console.error(`\n2. Use a different port by setting PORT in your .env file`);
    console.error(`   Example: PORT=5001`);
    process.exit(1);
  } else {
    console.error('Server error:', error);
    process.exit(1);
  }
});

