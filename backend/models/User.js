const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require('jsonwebtoken'); // Add this if you're using JWT

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
    trim: true
  },
  email: {
    type: String,
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, "Password is required"],
    minlength: 6
  },
  role: {
    type: String,
    enum: ["admin"],
    default: "admin"
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// FIXED: Hash password before saving (Mongoose 9.x compatible)
userSchema.pre('save', async function() {
  // Only hash if password is modified or new
  if (!this.isModified('password')) return;
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to return user data without sensitive info
userSchema.methods.toJSON = function() {
  const userObject = this.toObject();
  delete userObject.password;
  return userObject;
};

// Method to generate JWT token
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign(
    { id: this._id, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

// FIXED: Static method to seed admin (without pre-save issues)
userSchema.statics.seedAdmin = async function() {
  try {
    const adminExists = await this.findOne({ role: "admin" });
    
    if (!adminExists) {
      const adminData = {
        name: "System Administrator",
        email: process.env.ADMIN_EMAIL || "admin@elim.com",
        password: process.env.ADMIN_PASSWORD || "Admin@123",
        role: "admin"
      };
      
      // Create using the model (this will trigger pre-save)
      await this.create(adminData);
      console.log("✅ Admin user created successfully");
    } else {
      console.log("ℹ️ Admin user already exists");
    }
  } catch (error) {
    console.error("❌ Error seeding admin:", error);
    throw error;
  }
};

module.exports = mongoose.model("User", userSchema);