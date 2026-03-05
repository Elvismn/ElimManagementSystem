const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createParent,
  getParents,
  getParent,
  updateParent,
  deleteParent,
  addChild,
  removeChild,
  toggleStatus
} = require('../contollers/parentController');

// All routes are protected (admin only)
router.use(protect, adminOnly);

// Special routes (before /:id)
router.patch('/:id/toggle-status', toggleStatus);
router.post('/:id/children/:studentId', addChild);
router.delete('/:id/children/:studentId', removeChild);

// CRUD routes
router.get('/', getParents);
router.get('/:id', getParent);
router.post('/', createParent);
router.put('/:id', updateParent);
router.delete('/:id', deleteParent);

module.exports = router;