const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStaff,
  updateBudget
} = require('../contollers/departmentController');

// All routes are protected (admin only)
router.use(protect, adminOnly);

// Special routes (before /:id)
router.patch('/:id/budget', updateBudget);
router.get('/:id/staff', getDepartmentStaff);

// CRUD routes
router.get('/', getDepartments);
router.get('/:id', getDepartment);
router.post('/', createDepartment);
router.put('/:id', updateDepartment);
router.delete('/:id', deleteDepartment);

module.exports = router;