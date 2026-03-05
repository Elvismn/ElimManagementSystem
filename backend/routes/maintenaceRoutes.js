const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getMaintenanceRecords,
  getMaintenanceRecord,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  verifyMaintenanceRecord,
  getMaintenanceAnalytics,
  getUpcomingMaintenance,
  getMaintenanceForecast,
  getOverdueMaintenance
} = require('../contollers/maintenanceController');

// All routes require authentication and admin privileges
router.use(protect, adminOnly);

// Special routes (before /:id)
router.get('/upcoming', getUpcomingMaintenance);
router.get('/overdue', getOverdueMaintenance);
router.get('/vehicle/:vehicleId/analytics', getMaintenanceAnalytics);
router.get('/vehicle/:vehicleId/forecast', getMaintenanceForecast);
router.patch('/:id/verify', verifyMaintenanceRecord);

// CRUD routes
router.get('/', getMaintenanceRecords);
router.get('/:id', getMaintenanceRecord);
router.post('/', createMaintenanceRecord);
router.put('/:id', updateMaintenanceRecord);
router.delete('/:id', deleteMaintenanceRecord);

module.exports = router;