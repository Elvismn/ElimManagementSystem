const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { login, getMe, logout } = require('../contollers/authController');

// Public routes
router.post('/login', login);

// Protected routes
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;