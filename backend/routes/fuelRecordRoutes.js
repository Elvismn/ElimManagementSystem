const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getFuelRecords,
  getFuelRecord,
  createFuelRecord,
  updateFuelRecord,
  deleteFuelRecord,
  verifyFuelRecord,
  getFuelAnalytics,
  getUnverifiedFuelRecords,
  bulkVerifyFuelRecords
} = require('../contollers/fuelRecordController');

// All routes require authentication and admin privileges
router.use(protect, adminOnly);

// Special routes (before /:id)
router.get('/unverified', getUnverifiedFuelRecords);
router.get('/vehicle/:vehicleId/analytics', getFuelAnalytics);
router.post('/bulk-verify', bulkVerifyFuelRecords);
router.patch('/:id/verify', verifyFuelRecord);

// CRUD routes
router.get('/', getFuelRecords);
router.get('/:id', getFuelRecord);
router.post('/', createFuelRecord);
router.put('/:id', updateFuelRecord);
router.delete('/:id', deleteFuelRecord);

module.exports = router;