const Department = require("../models/Department");
const Staff = require("../models/Staff");

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private (Admin only)
const createDepartment = async (req, res) => {
  try {
    // Check if department name already exists
    const existingName = await Department.findOne({ name: req.body.name });
    if (existingName) {
      return res.status(400).json({
        success: false,
        error: "Department with this name already exists"
      });
    }

    // Check if department code already exists
    if (req.body.code) {
      const existingCode = await Department.findOne({ code: req.body.code.toUpperCase() });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          error: "Department with this code already exists"
        });
      }
    }

    // Add createdBy from authenticated user
    req.body.createdBy = req.user.id;

    const department = await Department.create(req.body);
    
    // If head of department is assigned, update the staff record
    if (req.body.headOfDepartment) {
      await Staff.findByIdAndUpdate(
        req.body.headOfDepartment,
        { $set: { 'position': 'Head of Department' } }
      );
    }

    await department.populate([
      { path: 'headOfDepartment', select: 'firstName lastName email employeeId' },
      { path: 'createdBy', select: 'firstName lastName' }
    ]);

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      data: { department }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all departments with filtering and pagination
// @route   GET /api/departments
// @access  Private (Admin only)
const getDepartments = async (req, res) => {
  try {
    const { 
      search, 
      status,
      page = 1, 
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter
    const filter = {};
    if (status) filter.status = status;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const departments = await Department.find(filter)
      .populate({
        path: 'headOfDepartment',
        select: 'firstName lastName email employeeId profilePicture'
      })
      .populate('programs.coordinator', 'firstName lastName')
      .populate('services.contactPerson', 'firstName lastName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get staff counts for each department
    const departmentsWithStats = await Promise.all(
      departments.map(async (dept) => {
        const staffCount = await Staff.countDocuments({ department: dept._id });
        const activeStaffCount = await Staff.countDocuments({ 
          department: dept._id,
          status: "Active" 
        });
        return {
          ...dept,
          staffCount,
          activeStaffCount
        };
      })
    );

    // Get total count for pagination
    const total = await Department.countDocuments(filter);

    // Get summary statistics
    const summary = await Department.getSummary();

    res.json({
      success: true,
      data: {
        departments: departmentsWithStats,
        summary,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalDepartments: total,
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

// @desc    Get single department by ID
// @route   GET /api/departments/:id
// @access  Private (Admin only)
const getDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate({
        path: 'headOfDepartment',
        select: 'firstName lastName email employeeId phone profilePicture qualifications'
      })
      .populate('programs.coordinator', 'firstName lastName email employeeId')
      .populate('services.contactPerson', 'firstName lastName phone email')
      .populate('subjects', 'name code gradeLevel')
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .lean();

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    // Get all staff in this department
    const staff = await Staff.find({ department: department._id })
      .select('firstName lastName employeeId position email phone status')
      .sort({ lastName: 1 });

    // Get staff statistics
    const staffStats = {
      total: staff.length,
      active: staff.filter(s => s.status === "Active").length,
      onLeave: staff.filter(s => s.status === "On Leave").length,
      inactive: staff.filter(s => s.status === "Inactive").length
    };

    res.json({
      success: true,
      data: {
        department,
        staff,
        staffStats
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private (Admin only)
const updateDepartment = async (req, res) => {
  try {
    // Check if department name is being updated and if it's unique
    if (req.body.name) {
      const existingName = await Department.findOne({ 
        name: req.body.name,
        _id: { $ne: req.params.id }
      });
      if (existingName) {
        return res.status(400).json({
          success: false,
          error: "Department name already in use"
        });
      }
    }

    // Check if department code is being updated and if it's unique
    if (req.body.code) {
      const existingCode = await Department.findOne({ 
        code: req.body.code.toUpperCase(),
        _id: { $ne: req.params.id }
      });
      if (existingCode) {
        return res.status(400).json({
          success: false,
          error: "Department code already in use"
        });
      }
    }

    // Check if head of department is being changed
    const currentDept = await Department.findById(req.params.id);
    if (currentDept && req.body.headOfDepartment && 
        currentDept.headOfDepartment?.toString() !== req.body.headOfDepartment) {
      
      // Remove HOD status from previous HOD
      if (currentDept.headOfDepartment) {
        await Staff.findByIdAndUpdate(
          currentDept.headOfDepartment,
          { $set: { position: 'Teacher' } } // or appropriate default
        );
      }
      
      // Set new HOD
      await Staff.findByIdAndUpdate(
        req.body.headOfDepartment,
        { $set: { position: 'Head of Department' } }
      );
    }

    // Add lastUpdatedBy
    req.body.lastUpdatedBy = req.user.id;

    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('headOfDepartment', 'firstName lastName email employeeId')
    .populate('lastUpdatedBy', 'firstName lastName');

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    res.json({
      success: true,
      message: "Department updated successfully",
      data: { department }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete department
// @route   DELETE /api/departments/:id
// @access  Private (Admin only)
const deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    // Check if department has staff assigned
    const staffCount = await Staff.countDocuments({ department: department._id });
    if (staffCount > 0) {
      return res.status(400).json({
        success: false,
        error: `Cannot delete department with ${staffCount} staff members assigned. Please reassign staff first.`
      });
    }

    // If department has a head, remove their HOD status
    if (department.headOfDepartment) {
      await Staff.findByIdAndUpdate(
        department.headOfDepartment,
        { $set: { position: 'Teacher' } }
      );
    }

    await department.deleteOne();

    res.json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get department staff
// @route   GET /api/departments/:id/staff
// @access  Private (Admin only)
const getDepartmentStaff = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    
    const filter = { department: req.params.id };
    if (status) filter.status = status;

    const staff = await Staff.find(filter)
      .select('firstName lastName employeeId position email phone status profilePicture')
      .sort({ lastName: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Staff.countDocuments(filter);

    res.json({
      success: true,
      data: {
        staff,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalStaff: total
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

// @desc    Update department budget
// @route   PATCH /api/departments/:id/budget
// @access  Private (Admin only)
const updateBudget = async (req, res) => {
  try {
    const { allocated, spent, currency, fiscalYear } = req.body;
    
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }

    // Update budget fields
    if (allocated !== undefined) department.budget.allocated = allocated;
    if (spent !== undefined) department.budget.spent = spent;
    if (currency) department.budget.currency = currency;
    if (fiscalYear) department.budget.fiscalYear = fiscalYear;

    await department.save();

    res.json({
      success: true,
      message: 'Budget updated successfully',
      data: { budget: department.budget }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createDepartment,
  getDepartments,
  getDepartment,
  updateDepartment,
  deleteDepartment,
  getDepartmentStaff,
  updateBudget
};