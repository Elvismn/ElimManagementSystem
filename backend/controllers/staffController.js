const Staff = require("../models/Staff");
const Department = require("../models/Department");

// @desc    Create a new staff member
// @route   POST /api/staff
// @access  Private (Admin only)
const createStaff = async (req, res) => {
  try {
    const existingEmail = await Staff.findOne({ email: req.body.email });
    if (existingEmail) {
      return res.status(400).json({
        success: false,
        error: "A staff member with this email already exists"
      });
    }

    const existingEmployeeId = await Staff.findOne({ employeeId: req.body.employeeId });
    if (existingEmployeeId) {
      return res.status(400).json({
        success: false,
        error: "Employee ID already exists"
      });
    }

    if (req.body.phone) {
      const phoneExists = await Staff.findOne({ phone: req.body.phone });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: "Phone number already in use"
        });
      }
    }

    const staff = await Staff.create(req.body);
    
    await staff.populate({
      path: 'department',
      select: 'name headOfDepartment'
    });

    res.status(201).json({
      success: true,
      message: "Staff member created successfully",
      data: { staff }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all staff members with filtering and pagination
// @route   GET /api/staff
// @access  Private (Admin only)
const getStaff = async (req, res) => {
  try {
    const { 
      department, 
      position,
      status,
      employmentType,
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    const filter = {};
    if (department) filter.department = department;
    if (position) filter.position = position;
    if (status) filter.status = status;
    if (employmentType) filter.employmentType = employmentType;
    
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const staff = await Staff.find(filter)
      .populate({
        path: 'department',
        select: 'name headOfDepartment',
        match: { _id: { $exists: true } }
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Staff.countDocuments(filter);

    const stats = await Staff.aggregate([
      { $group: {
        _id: null,
        totalActive: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
        totalOnLeave: { $sum: { $cond: [{ $eq: ["$status", "On Leave"] }, 1, 0] } },
        totalInactive: { $sum: { $cond: [{ $eq: ["$status", "Inactive"] }, 1, 0] } },
        totalTeachers: { $sum: { $cond: [{ $eq: ["$position", "Teacher"] }, 1, 0] } }
      }}
    ]);

    const departmentDistribution = [];
    const deptMap = new Map();
    
    for (const member of staff) {
      if (member.department && member.department.name) {
        const deptName = member.department.name;
        deptMap.set(deptName, (deptMap.get(deptName) || 0) + 1);
      }
    }
    
    for (const [deptName, count] of deptMap.entries()) {
      departmentDistribution.push({ department: deptName, count });
    }

    res.json({
      success: true,
      data: {
        staff,
        stats: stats[0] || { totalActive: 0, totalOnLeave: 0, totalInactive: 0, totalTeachers: 0 },
        departmentDistribution,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalStaff: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        }
      }
    });
  } catch (error) {
    console.error('❌ Get staff error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single staff member by ID
// @route   GET /api/staff/:id
// @access  Private (Admin only)
const getOneStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id)
      .populate('department', 'name headOfDepartment description')
      .populate('performanceReviews.reviewer', 'firstName lastName employeeId')
      .lean();

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    staff.age = staff.dateOfBirth ? 
      Math.floor((new Date() - new Date(staff.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000)) : null;
    
    staff.yearsOfService = staff.hireDate ?
      Math.floor((new Date() - new Date(staff.hireDate)) / (365.25 * 24 * 60 * 60 * 1000)) : null;

    res.json({
      success: true,
      data: { staff }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Private (Admin only)
const updateStaff = async (req, res) => {
  try {
    if (req.body.email) {
      const existingEmail = await Staff.findOne({ 
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          error: "Email already in use by another staff member"
        });
      }
    }

    if (req.body.employeeId) {
      const existingEmployeeId = await Staff.findOne({ 
        employeeId: req.body.employeeId,
        _id: { $ne: req.params.id }
      });
      if (existingEmployeeId) {
        return res.status(400).json({
          success: false,
          error: "Employee ID already in use"
        });
      }
    }

    if (req.body.phone) {
      const phoneExists = await Staff.findOne({ 
        phone: req.body.phone,
        _id: { $ne: req.params.id }
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: "Phone number already in use"
        });
      }
    }

    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('department', 'name headOfDepartment');

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      message: "Staff member updated successfully",
      data: { staff }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete staff member
// @route   DELETE /api/staff/:id
// @access  Private (Admin only)
const deleteStaff = async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id);

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    const isHeadOfDepartment = await Department.findOne({ headOfDepartment: staff._id });
    if (isHeadOfDepartment) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete staff member who is head of a department. Please reassign department head first.'
      });
    }

    await staff.deleteOne();

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Mark attendance
// @route   POST /api/staff/:id/attendance
// @access  Private (Admin only)
const markAttendance = async (req, res) => {
  try {
    const { date, status, checkIn, checkOut, notes } = req.body;
    
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    const existingAttendance = staff.attendance.find(a => 
      new Date(a.date).toDateString() === new Date(date).toDateString()
    );

    if (existingAttendance) {
      existingAttendance.status = status || existingAttendance.status;
      existingAttendance.checkIn = checkIn || existingAttendance.checkIn;
      existingAttendance.checkOut = checkOut || existingAttendance.checkOut;
      existingAttendance.notes = notes || existingAttendance.notes;
    } else {
      staff.attendance.push({ date, status, checkIn, checkOut, notes });
    }

    await staff.save();

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: { attendance: staff.attendance }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add performance review
// @route   POST /api/staff/:id/performance-review
// @access  Private (Admin only)
const addPerformanceReview = async (req, res) => {
  try {
    const { reviewDate, rating, comments, goals, nextReviewDate } = req.body;
    
    const staff = await Staff.findById(req.params.id);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    staff.performanceReviews.push({
      reviewDate,
      reviewer: req.user.id,
      rating,
      comments,
      goals,
      nextReviewDate
    });

    await staff.save();

    res.json({
      success: true,
      message: 'Performance review added successfully',
      data: { performanceReviews: staff.performanceReviews }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update staff status
// @route   PATCH /api/staff/:id/status
// @access  Private (Admin only)
const updateStatus = async (req, res) => {
  try {
    const { status, notes } = req.body;
    
    const staff = await Staff.findByIdAndUpdate(
      req.params.id,
      { status, notes },
      { new: true }
    ).populate('department', 'name');

    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      message: `Staff status updated to ${status}`,
      data: { status: staff.status }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createStaff,
  getStaff,
  getOneStaff,
  updateStaff,
  deleteStaff,
  markAttendance,
  addPerformanceReview,
  updateStatus
};