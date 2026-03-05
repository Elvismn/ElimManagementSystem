const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('../models/User');
const connectDB = require('../config/db');

dotenv.config();

const createAdmin = async () => {
  try {
    // Connect to database
    await connectDB();
    
    // Check if admin already exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (adminExists) {
      console.log('❌ Admin already exists:');
      console.log('Email:', adminExists.email);
      console.log('Name:', adminExists.name);
      process.exit(0);
    }

    // Create admin
    const admin = await User.create({
      name: 'System Administrator',
      email: 'admin@elim.com',
      password: 'Admin@123',
      role: 'admin'
    });

    console.log('✅ Admin created successfully:');
    console.log('Email:', admin.email);
    console.log('Name:', admin.name);
    console.log('⚠️  Please change this password after first login!');
    
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    if (error.code === 11000) {
      console.error('Duplicate email error - admin might already exist');
    }
  } finally {
    // Close database connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  }
};

// Run the function
createAdmin();