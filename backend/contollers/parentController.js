const Parent = require("../models/Parent");
const Student = require("../models/Student");

// @desc    Create a new parent
// @route   POST /api/parents
// @access  Private (Admin only)
const createParent = async (req, res) => {
  try {
    // Check if email already exists
    const existingParent = await Parent.findOne({ email: req.body.email });
    if (existingParent) {
      return res.status(400).json({
        success: false,
        error: "A parent with this email already exists"
      });
    }

    // Check if phone already exists (optional - if you want unique phones)
    if (req.body.phone) {
      const phoneExists = await Parent.findOne({ phone: req.body.phone });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: "A parent with this phone number already exists"
        });
      }
    }

    const parent = await Parent.create(req.body);
    
    // If children are provided, update the Student records
    if (req.body.children && req.body.children.length > 0) {
      await Student.updateMany(
        { _id: { $in: req.body.children } },
        { $addToSet: { parents: parent._id } }
      );
    }

    // Populate children
    if (req.body.children && req.body.children.length > 0) {
      await parent.populate({
        path: 'children',
        select: 'firstName lastName studentId grade status'
      });
    }

    res.status(201).json({
      success: true,
      message: "Parent created successfully",
      data: { parent }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all parents with filtering and pagination
// @route   GET /api/parents
// @access  Private (Admin only)
const getParents = async (req, res) => {
  try {
    const { 
      search, 
      isActive,
      relationship,
      page = 1, 
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;
    
    // Build filter
    const filter = {};
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (relationship) filter.relationship = relationship;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { occupation: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const parents = await Parent.find(filter)
      .populate({
        path: 'children',
        select: 'firstName lastName studentId grade status profilePicture'
      })
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Parent.countDocuments(filter);

    // Get summary statistics
    const stats = await Parent.aggregate([
      { $group: {
        _id: null,
        totalActive: { $sum: { $cond: [{ $eq: ["$isActive", true] }, 1, 0] } },
        totalInactive: { $sum: { $cond: [{ $eq: ["$isActive", false] }, 1, 0] } },
        totalWithChildren: { $sum: { $cond: [{ $gt: [{ $size: "$children" }, 0] }, 1, 0] } }
      }}
    ]);

    res.json({
      success: true,
      data: {
        parents,
        stats: stats[0] || { totalActive: 0, totalInactive: 0, totalWithChildren: 0 },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalParents: total,
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

// @desc    Get single parent by ID
// @route   GET /api/parents/:id
// @access  Private (Admin only)
const getParent = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id)
      .populate({
        path: 'children',
        select: 'firstName lastName studentId grade status dateOfBirth profilePicture emergencyContacts',
        populate: {
          path: 'classroom',
          select: 'name gradeLevel'
        }
      })
      .lean();

    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    res.json({
      success: true,
      data: { parent }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update parent
// @route   PUT /api/parents/:id
// @access  Private (Admin only)
const updateParent = async (req, res) => {
  try {
    // Check if email is being updated and if it's unique
    if (req.body.email) {
      const existingParent = await Parent.findOne({ 
        email: req.body.email,
        _id: { $ne: req.params.id }
      });
      if (existingParent) {
        return res.status(400).json({
          success: false,
          error: "Email already in use by another parent"
        });
      }
    }

    // Check if phone is being updated and if it's unique
    if (req.body.phone) {
      const phoneExists = await Parent.findOne({ 
        phone: req.body.phone,
        _id: { $ne: req.params.id }
      });
      if (phoneExists) {
        return res.status(400).json({
          success: false,
          error: "Phone number already in use by another parent"
        });
      }
    }

    // Get the current parent to compare children changes
    const currentParent = await Parent.findById(req.params.id);
    
    const parent = await Parent.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate({
      path: 'children',
      select: 'firstName lastName studentId grade'
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    // Handle children updates if changed
    if (req.body.children && JSON.stringify(currentParent.children) !== JSON.stringify(req.body.children)) {
      // Remove parent from old children
      await Student.updateMany(
        { _id: { $in: currentParent.children } },
        { $pull: { parents: parent._id } }
      );
      
      // Add parent to new children
      await Student.updateMany(
        { _id: { $in: req.body.children } },
        { $addToSet: { parents: parent._id } }
      );
    }

    res.json({
      success: true,
      message: "Parent updated successfully",
      data: { parent }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete parent
// @route   DELETE /api/parents/:id
// @access  Private (Admin only)
const deleteParent = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id);

    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    // Remove parent reference from all their children
    if (parent.children && parent.children.length > 0) {
      await Student.updateMany(
        { _id: { $in: parent.children } },
        { $pull: { parents: parent._id } }
      );
    }

    await parent.deleteOne();

    res.json({
      success: true,
      message: 'Parent deleted successfully and removed from children records'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add child to parent
// @route   POST /api/parents/:id/children/:studentId
// @access  Private (Admin only)
const addChild = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    // Check if parent exists
    const parent = await Parent.findById(id);
    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    // Check if student exists
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Add child to parent if not already there
    if (!parent.children.includes(studentId)) {
      parent.children.push(studentId);
      await parent.save();
    }

    // Add parent to student if not already there
    if (!student.parents.includes(id)) {
      student.parents.push(id);
      await student.save();
    }

    await parent.populate({
      path: 'children',
      select: 'firstName lastName studentId grade'
    });

    res.json({
      success: true,
      message: 'Child added successfully',
      data: { parent }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Remove child from parent
// @route   DELETE /api/parents/:id/children/:studentId
// @access  Private (Admin only)
const removeChild = async (req, res) => {
  try {
    const { id, studentId } = req.params;

    // Remove child from parent
    const parent = await Parent.findByIdAndUpdate(
      id,
      { $pull: { children: studentId } },
      { new: true }
    ).populate({
      path: 'children',
      select: 'firstName lastName studentId grade'
    });

    // Remove parent from student
    await Student.findByIdAndUpdate(
      studentId,
      { $pull: { parents: id } }
    );

    res.json({
      success: true,
      message: 'Child removed successfully',
      data: { parent }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Toggle parent active status
// @route   PATCH /api/parents/:id/toggle-status
// @access  Private (Admin only)
const toggleStatus = async (req, res) => {
  try {
    const parent = await Parent.findById(req.params.id);
    
    if (!parent) {
      return res.status(404).json({
        success: false,
        error: 'Parent not found'
      });
    }

    parent.isActive = !parent.isActive;
    await parent.save();

    res.json({
      success: true,
      message: `Parent ${parent.isActive ? 'activated' : 'deactivated'} successfully`,
      data: { isActive: parent.isActive }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  createParent,
  getParents,
  getParent,
  updateParent,
  deleteParent,
  addChild,
  removeChild,
  toggleStatus
};