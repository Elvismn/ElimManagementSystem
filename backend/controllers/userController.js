const User = require("../models/User");

const setupAdmin = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if admin already exists
    const adminExists = await User.findOne({ role: "admin" });
    if (adminExists) {
      return res.status(400).json({
        success: false,
        error: "Admin account already exists. Setup is disabled."
      });
    }

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "Please provide name, email, and password"
      });
    }

    // Create admin user
    const user = await User.create({
      name,
      email,
      password,
      role: "admin"
    });

    res.status(201).json({
      success: true,
      message: "Admin account created successfully",
      data: {
        user: user.toJSON() // toJSON removes password
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get current admin profile
// @route   GET /api/users/profile
// @access  Private (Admin only)
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update admin profile
// @route   PUT /api/users/profile
// @access  Private (Admin only)
const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const userId = req.user.id;

    // Build update object
    const updateData = {};
    if (name) updateData.name = name;
    if (email) {
      // Check if email is already taken by another user
      const existingUser = await User.findOne({ 
        email, 
        _id: { $ne: userId } 
      });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already in use'
        });
      }
      updateData.email = email;
    }

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Change password
// @route   PUT /api/users/change-password
// @access  Private (Admin only)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide current password and new password'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    // Find the user
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const isValidPassword = await user.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};


const getSystemStats = async (req, res) => {
  try {
    // Get admin info
    const admin = await User.findOne({ role: "admin" }).select('-password');
    
    // Get counts from other collections (you can expand these later)
    const Student = require("../models/Student");
    const Parent = require("../models/Parent");
    const Staff = require("../models/Staff");
    const Vehicle = require("../models/Vehicle");

    const [
      totalStudents,
      totalParents,
      totalStaff,
      totalVehicles
    ] = await Promise.all([
      Student.countDocuments(),
      Parent.countDocuments(),
      Staff.countDocuments(),
      Vehicle.countDocuments()
    ]);

    res.json({
      success: true,
      data: {
        admin: {
          name: admin.name,
          email: admin.email,
          lastLogin: admin.lastLogin,
          accountCreated: admin.createdAt
        },
        systemStats: {
          totalStudents,
          totalParents,
          totalStaff,
          totalVehicles
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};


const updateLastLogin = async (userId) => {
  try {
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date()
    });
  } catch (error) {
    console.error("Error updating last login:", error);
  }
};

module.exports = {
  setupAdmin,
  getProfile,
  updateProfile,
  changePassword,
  getSystemStats,
  updateLastLogin
};