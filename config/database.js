const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  // Prevent multiple connection attempts
  if (mongoose.connection.readyState === 1) {
    console.log('✅ MongoDB already connected');
    isConnected = true;
    return mongoose.connection;
  }

  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobportal';
    
    // Check if MONGODB_URI is set and not a placeholder
    if (!mongoURI || mongoURI.trim() === '' || mongoURI.includes('username:password')) {
      console.error('\n❌ MongoDB Connection String not configured!');
      console.error('📝 Please update your .env file with your MongoDB connection string.');
      console.error('\n💡 For Local MongoDB:');
      console.error('   MONGODB_URI=mongodb://localhost:27017/jobportal');
      console.error('\n💡 For MongoDB Atlas:');
      console.error('   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/jobportal\n');
      throw new Error('MONGODB_URI is not configured. Please update your .env file with your MongoDB connection string.');
    }
    
    const isLocal = mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1');
    console.log(`Attempting to connect to MongoDB ${isLocal ? '(Local)' : '(Atlas)'}...`);
    
    // Connection options - different for local vs Atlas
    const connectionOptions = {
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      connectTimeoutMS: 10000, // Give up initial connection after 10s
      maxPoolSize: 10, // Maintain up to 10 socket connections
    };
    
    // Add Atlas-specific options only if connecting to Atlas
    if (!isLocal) {
      connectionOptions.retryWrites = true;
      connectionOptions.w = 'majority';
    }
    
    const conn = await mongoose.connect(mongoURI, connectionOptions);

    isConnected = true;
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err.message);
      isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
      isConnected = false;
    });

    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB reconnected');
      isConnected = true;
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed due to app termination');
      process.exit(0);
    });

  } catch (error) {
    isConnected = false;
    const mongoURI = process.env.MONGODB_URI || '';
    const isLocal = mongoURI.includes('localhost') || mongoURI.includes('127.0.0.1');
    
    console.error('\n❌ MongoDB Connection Error:', error.message);
    console.log('\n⚠️ Server will continue, but database operations will fail.');
    
    if (isLocal || mongoURI === '' || !mongoURI) {
      // Local MongoDB connection error
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🔧 QUICK FIX: Start MongoDB Locally');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n📋 Step-by-Step:');
      console.log('\n   1. Make sure MongoDB is installed');
      console.log('      Download from: https://www.mongodb.com/try/download/community');
      console.log('\n   2. Start MongoDB service:');
      console.log('      Windows: MongoDB should start automatically as a service');
      console.log('      Or run: mongod');
      console.log('\n   3. Verify MongoDB is running:');
      console.log('      Check if MongoDB service is running in Services (Windows)');
      console.log('      Or try: mongosh (should connect to local MongoDB)');
      console.log('\n   4. Update .env file:');
      console.log('      MONGODB_URI=mongodb://localhost:27017/jobportal');
      console.log('\n   5. Restart server: Press Ctrl+C, then run: npm run dev');
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('\n📚 For detailed instructions, see: LOCAL_MONGODB_SETUP.md');
      console.log('💡 Make sure MongoDB is running locally on port 27017!\n');
    } else {
      // Atlas connection error
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('🔧 QUICK FIX: Whitelist Your IP in Network Access');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('\n📋 Step-by-Step:');
      console.log('\n   1. Go to Network Access:');
      console.log('      🔗 https://cloud.mongodb.com/v2/6790bf37381dd473ac18b024#/security/network/accessList');
      console.log('\n   2. Click "Add IP Address" (green button, top right)');
      console.log('\n   3. Click "Allow Access from Anywhere"');
      console.log('      (This enters 0.0.0.0/0 automatically)');
      console.log('\n   4. Click "Confirm"');
      console.log('\n   5. ⏳ Wait 1-2 minutes for changes to take effect');
      console.log('\n   6. Restart server: Press Ctrl+C, then run: npm run dev');
      console.log('\n═══════════════════════════════════════════════════════════');
      console.log('\n📚 For detailed instructions, see: FIX_CONNECTION_NOW.md\n');
    }
  }
};

// Check connection status
const checkConnection = () => {
  return mongoose.connection.readyState === 1 && isConnected;
};

module.exports = { connectDB, checkConnection };

