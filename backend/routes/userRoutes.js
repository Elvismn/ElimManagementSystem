const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  setupAdmin,
  getProfile,
  updateProfile,
  changePassword,
  getSystemStats
} = require('../contollers/userController');

// Debug middleware
router.use((req, res, next) => {
  console.log(`🔧 USER ROUTE: ${req.method} ${req.originalUrl}`);
  next();
});

// Public routes
router.post('/setup-admin', setupAdmin);

// Protected routes - all require authentication
router.use(protect); // All routes below this require auth

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);

// System stats
router.get('/stats', getSystemStats);

// Test route
router.get('/test-route', (req, res) => {
  console.log('✅ Test route hit!');
  res.json({ 
    success: true, 
    message: 'Test route working',
    user: req.user // Will show the authenticated user
  });
});

module.exports = router;