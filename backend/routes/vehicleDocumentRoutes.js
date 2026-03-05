const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  getVehicleDocuments,
  getVehicleDocument,
  createVehicleDocument,
  updateVehicleDocument,
  deleteVehicleDocument,
  verifyVehicleDocument,
  renewVehicleDocument,
  getExpiringDocuments,
  getExpiredDocuments,
  getDocumentAnalytics,
  bulkUpdateDocumentStatus,
  getReminderCandidates
} = require('../contollers/vehicleDocumentController');

// All routes require authentication and admin privileges
router.use(protect, adminOnly);

// Special routes (before /:id)
router.get('/expiring', getExpiringDocuments);
router.get('/expired', getExpiredDocuments);
router.get('/reminders', getReminderCandidates);
router.get('/analytics', getDocumentAnalytics);
router.get('/vehicle/:vehicleId/analytics', getDocumentAnalytics);
router.post('/bulk-update', bulkUpdateDocumentStatus);
router.patch('/:id/verify', verifyVehicleDocument);
router.patch('/:id/renew', renewVehicleDocument);

// CRUD routes
router.get('/', getVehicleDocuments);
router.get('/:id', getVehicleDocument);
router.post('/', createVehicleDocument);
router.put('/:id', updateVehicleDocument);
router.delete('/:id', deleteVehicleDocument);

module.exports = router;