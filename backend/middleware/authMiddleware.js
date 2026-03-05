const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verifies token and attaches user to request
const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // Check if token exists
    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Not authorized to access this route. Please login.'
      });
    }

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from token
      const user = await User.findById(decoded.id).select('-password');

      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'User not found or token is invalid.'
        });
      }

      // Check if user is active
      if (!user.isActive) {
        return res.status(401).json({
          success: false,
          error: 'Your account has been deactivated. Please contact administrator.'
        });
      }

      // Update last login (optional - can be moved to login controller instead)
      // Doing this here might slow down every request, better to do it only at login
      
      // Attach user to request
      req.user = user;
      next();
      
    } catch (jwtError) {
      console.error('JWT Verification Error:', jwtError.message);
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          error: 'Invalid token. Please login again.'
        });
      }
      
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'Token expired. Please login again.'
        });
      }
      
      return res.status(401).json({
        success: false,
        error: 'Authentication failed. Please login again.'
      });
    }
  } catch (error) {
    console.error('Auth Middleware Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'Server error during authentication.'
    });
  }
};

// Admin only middleware (since we only have one role)
const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required.'
    });
  }

  // Check if user has admin role
  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin privileges required.'
    });
  }

  next();
};

// Optional: If you want to keep role-based for future expansion
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Optional: For specific permissions (if you implement a permission system later)
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required.'
      });
    }

    // Simple permission check - admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // If you implement a permissions array in User model later
    if (req.user.permissions && !req.user.permissions.includes(permission)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. ${permission} permission required.`
      });
    }

    next();
  };
};

module.exports = {
  protect,
  adminOnly,
  authorize,
  hasPermission
};