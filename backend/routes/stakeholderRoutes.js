const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createStakeholder,
  getStakeholders,
  getStakeholder,
  updateStakeholder,
  deleteStakeholder,
  addEngagement,
  getEngagements,
  updateStatus,
  assignStakeholder,
  addDocument
} = require('../contollers/stakeholderController');

// All routes are protected (admin only)
router.use(protect, adminOnly);

// Special routes (before /:id)
router.patch('/:id/status', updateStatus);
router.patch('/:id/assign', assignStakeholder);
router.post('/:id/engagements', addEngagement);
router.get('/:id/engagements', getEngagements);
router.post('/:id/documents', addDocument);

// CRUD routes
router.get('/', getStakeholders);
router.get('/:id', getStakeholder);
router.post('/', createStakeholder);
router.put('/:id', updateStakeholder);
router.delete('/:id', deleteStakeholder);

module.exports = router;