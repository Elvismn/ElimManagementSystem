const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateOdometer,
  assignDriver,
  getVehiclesNeedingService,
  getExpiringDocuments
} = require('../contollers/vehicleController');

// All routes require authentication and admin privileges
router.use(protect, adminOnly);

// Special routes (before /:id)
router.get('/needing-service', getVehiclesNeedingService);
router.get('/expiring-documents', getExpiringDocuments);
router.patch('/:id/odometer', updateOdometer);
router.patch('/:id/assign-driver', assignDriver);

// CRUD routes
router.get('/', getVehicles);
router.get('/:id', getVehicle);
router.post('/', createVehicle);
router.put('/:id', updateVehicle);
router.delete('/:id', deleteVehicle);

module.exports = router;