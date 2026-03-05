const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');
const {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getStudentsByGrade,
  updateStudentStatus
} = require('../contollers/studentController');

// All routes are protected (admin only)
router.use(protect, adminOnly);

// Special routes first (before /:id to avoid conflicts)
router.get('/grade/:grade', getStudentsByGrade);
router.patch('/status', updateStudentStatus);

// CRUD routes
router.get('/', getStudents);
router.get('/:id', getStudent);
router.post('/', createStudent);
router.put('/:id', updateStudent);
router.delete('/:id', deleteStudent);

module.exports = router;