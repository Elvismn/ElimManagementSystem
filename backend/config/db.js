const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Connection options for better stability
    const options = {
      // Connection settings
      autoIndex: true, // Build indexes (set to false in production for performance)
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
      family: 4, // Use IPv4, skip trying IPv6
      
      // Retry settings
      retryWrites: true,
      retryReads: true,
      
      // Buffer commands when disconnected
      bufferCommands: true,
      bufferTimeoutMS: 20000, // How long to buffer commands
      
      // Connection pool settings
      maxPoolSize: 10, // Maintain up to 10 socket connections
      minPoolSize: 2, // Maintain at least 2 socket connections
      maxIdleTimeMS: 10000, // Close idle sockets after 10s
      
      // Heartbeat
      heartbeatFrequencyMS: 30000, // Check connection health every 30s
    };

    // Enable mongoose debugging only in development
    if (process.env.NODE_ENV === 'development') {
      mongoose.set('debug', true);
    }

    // Set mongoose options globally
    mongoose.set('strictQuery', true); // Prepare for Mongoose 7
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.db.databaseName}`);
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      console.log('🔄 MongoDB reconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    
    // Retry logic for critical connections
    console.log('Retrying connection in 5 seconds...');
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;