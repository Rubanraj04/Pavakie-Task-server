const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobportal';
    
    console.log('Attempting to connect to MongoDB...');
    console.log('Connection String:', mongoURI.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    const conn = await mongoose.connect(mongoURI);

    console.log('\n✅ MongoDB Connected Successfully!');
    console.log(`📍 Host: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    console.log(`🔌 Ready State: ${conn.connection.readyState === 1 ? 'Connected' : 'Not Connected'}`);
    
    // Test a simple operation
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`\n📁 Collections in database: ${collections.length}`);
    if (collections.length > 0) {
      collections.forEach(col => {
        console.log(`   - ${col.name}`);
      });
    } else {
      console.log('   (No collections found - database is empty)');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ MongoDB Connection Error:');
    console.error('Error Message:', error.message);
    
    if (error.message.includes('authentication')) {
      console.error('\n💡 Tip: Check your username and password in the connection string');
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('DNS')) {
      console.error('\n💡 Tip: Check your MongoDB Atlas cluster URL');
      console.error('💡 Tip: Make sure your IP is whitelisted in MongoDB Atlas Network Access');
    } else if (error.message.includes('timeout')) {
      console.error('\n💡 Tip: Check your internet connection');
      console.error('💡 Tip: Check MongoDB Atlas cluster is running');
    }
    
    process.exit(1);
  }
};

connectDB();

