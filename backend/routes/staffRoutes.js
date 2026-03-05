const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createStaff,
  getStaff,
  getOneStaff,
  updateStaff,
  deleteStaff,
  markAttendance,
  addPerformanceReview,
  updateStatus
} = require('../contollers/staffController');

// All routes are protected (admin only)
router.use(protect, adminOnly);

// Special routes (before /:id)
router.patch('/:id/status', updateStatus);
router.post('/:id/attendance', markAttendance);
router.post('/:id/performance-review', addPerformanceReview);

// CRUD routes
router.get('/', getStaff);
router.get('/:id', getOneStaff);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.delete('/:id', deleteStaff);

module.exports = router;