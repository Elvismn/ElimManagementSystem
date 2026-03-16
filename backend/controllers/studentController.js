const Student = require("../models/Student");
const Parent = require("../models/Parent");

// @desc    Create a new student
// @route   POST /api/students
// @access  Private (Admin only)
const createStudent = async (req, res) => {
  try {
    // Check if studentId already exists
    const existingStudent = await Student.findOne({ studentId: req.body.studentId });
    if (existingStudent) {
      return res.status(400).json({
        success: false,
        error: "Student ID already exists"
      });
    }

    const student = await Student.create(req.body);
    
    // Populate parent details if any parents are linked
    if (req.body.parents && req.body.parents.length > 0) {
      await student.populate({
        path: 'parents',
        select: 'firstName lastName phone email occupation'
      });
    }

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: { student }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all students with filtering and pagination
// @route   GET /api/students
// @access  Private (Admin only)
const getStudents = async (req, res) => {
  try {
    const { 
      grade, 
      status, 
      gender,
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter
    const filter = {};
    if (grade) filter.grade = grade;
    if (status) filter.status = status;
    if (gender) filter.gender = gender;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { studentId: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const students = await Student.find(filter)
      .populate({
        path: 'parents',
        select: 'firstName lastName phone email emergencyContacts'
      })
      .populate({
        path: 'classroom',
        select: 'name gradeLevel academicYear'
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Student.countDocuments(filter);

    // Get summary statistics
    const stats = await Student.aggregate([
      { $group: {
        _id: null,
        totalActive: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        totalInactive: { $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] } },
        totalMale: { $sum: { $cond: [{ $eq: ["$gender", "Male"] }, 1, 0] } },
        totalFemale: { $sum: { $cond: [{ $eq: ["$gender", "Female"] }, 1, 0] } }
      }}
    ]);

    res.json({
      success: true,
      data: {
        students,
        stats: stats[0] || { totalActive: 0, totalInactive: 0, totalMale: 0, totalFemale: 0 },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalStudents: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single student by ID
// @route   GET /api/students/:id
// @access  Private (Admin only)
const getStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id)
      .populate({
        path: 'parents',
        select: 'firstName lastName phone email occupation emergencyContacts address'
      })
      .populate({
        path: 'classroom',
        select: 'name gradeLevel academicYear classTeacher'
      })
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Add computed age
    student.age = student.dateOfBirth ? 
      Math.floor((new Date() - new Date(student.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    res.json({
      success: true,
      data: { student }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update student
// @route   PUT /api/students/:id
// @access  Private (Admin only)
const updateStudent = async (req, res) => {
  try {
    // Check if studentId is being updated and if it's unique
    if (req.body.studentId) {
      const existingStudent = await Student.findOne({ 
        studentId: req.body.studentId,
        _id: { $ne: req.params.id }
      });
      if (existingStudent) {
        return res.status(400).json({
          success: false,
          error: "Student ID already exists"
        });
      }
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate({
      path: 'parents',
      select: 'firstName lastName phone email'
    })
    .populate({
      path: 'classroom',
      select: 'name gradeLevel'
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: "Student updated successfully",
      data: { student }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete student
// @route   DELETE /api/students/:id
// @access  Private (Admin only)
const deleteStudent = async (req, res) => {
  try {
    const student = await Student.findById(req.params.id);

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Check if student has any active parents linked
    if (student.parents && student.parents.length > 0) {
      // Option 1: Prevent deletion
      return res.status(400).json({
        success: false,
        error: 'Cannot delete student with linked parents. Remove parent links first.'
      });
      
      // Option 2: Remove student from parents' records (uncomment if preferred)
      // await Parent.updateMany(
      //   { _id: { $in: student.parents } },
      //   { $pull: { children: student._id } }
      // );
    }

    await student.deleteOne();

    res.json({
      success: true,
      message: 'Student deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get students by grade
// @route   GET /api/students/grade/:grade
// @access  Private (Admin only)
const getStudentsByGrade = async (req, res) => {
  try {
    const { grade } = req.params;
    const { status = "Active" } = req.query;

    const students = await Student.find({ grade, status })
      .select('firstName lastName studentId gender dateOfBirth parents')
      .populate('parents', 'firstName lastName phone')
      .sort({ lastName: 1 });

    res.json({
      success: true,
      data: { 
        grade,
        total: students.length,
        students 
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update student status (bulk action)
// @route   PATCH /api/students/status
// @access  Private (Admin only)
const updateStudentStatus = async (req, res) => {
  try {
    const { studentIds, status } = req.body;

    if (!studentIds || !status) {
      return res.status(400).json({
        success: false,
        error: 'Please provide student IDs and status'
      });
    }

    const result = await Student.updateMany(
      { _id: { $in: studentIds } },
      { status },
      { runValidators: true }
    );

    res.json({
      success: true,
      message: `Updated ${result.modifiedCount} students`,
      data: { modifiedCount: result.modifiedCount }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createStudent,
  getStudents,
  getStudent,
  updateStudent,
  deleteStudent,
  getStudentsByGrade,
  updateStudentStatus
};