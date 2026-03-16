const Stakeholder = require("../models/Stakeholder");
const Staff = require("../models/Staff");

// @desc    Create a new stakeholder
// @route   POST /api/stakeholders
// @access  Private (Admin only)
const createStakeholder = async (req, res) => {
  try {
    // Check if stakeholder with same name and organization exists
    const existingStakeholder = await Stakeholder.findOne({
      name: req.body.name,
      'organization.name': req.body.organization?.name
    });
    
    if (existingStakeholder) {
      return res.status(400).json({
        success: false,
        error: "Stakeholder with this name and organization already exists"
      });
    }

    // Add createdBy from authenticated user
    req.body.createdBy = req.user.id;

    const stakeholder = await Stakeholder.create(req.body);
    
    // Populate references
    if (stakeholder.assignedTo) {
      await stakeholder.populate('assignedTo', 'firstName lastName email');
    }

    res.status(201).json({
      success: true,
      message: "Stakeholder created successfully",
      data: { stakeholder }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get all stakeholders with filtering and pagination
// @route   GET /api/stakeholders
// @access  Private (Admin only)
const getStakeholders = async (req, res) => {
  try {
    const { 
      type, 
      status, 
      priority,
      search, 
      page = 1, 
      limit = 10,
      sortBy = 'name',
      sortOrder = 'asc'
    } = req.query;
    
    // Build filter
    const filter = {};
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'organization.name': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'contactPerson.name': { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const stakeholders = await Stakeholder.find(filter)
      .populate('assignedTo', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName')
      .sort(sort)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    // Get total count for pagination
    const total = await Stakeholder.countDocuments(filter);

    // Get summary statistics
    const stats = await Stakeholder.getSummary();

    res.json({
      success: true,
      data: {
        stakeholders,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalStakeholders: total,
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

// @desc    Get single stakeholder by ID
// @route   GET /api/stakeholders/:id
// @access  Private (Admin only)
const getStakeholder = async (req, res) => {
  try {
    const stakeholder = await Stakeholder.findById(req.params.id)
      .populate('assignedTo', 'firstName lastName email phone')
      .populate('createdBy', 'firstName lastName')
      .populate('lastUpdatedBy', 'firstName lastName')
      .populate('engagementHistory.attendedBy', 'firstName lastName')
      .populate('supportedProjects.projectId', 'name startDate endDate status')
      .lean();

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    // Sort engagements by date (most recent first)
    if (stakeholder.engagementHistory) {
      stakeholder.engagementHistory.sort((a, b) => b.date - a.date);
    }

    res.json({
      success: true,
      data: { stakeholder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update stakeholder
// @route   PUT /api/stakeholders/:id
// @access  Private (Admin only)
const updateStakeholder = async (req, res) => {
  try {
    // Add lastUpdatedBy
    req.body.lastUpdatedBy = req.user.id;

    const stakeholder = await Stakeholder.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
    .populate('assignedTo', 'firstName lastName email')
    .populate('lastUpdatedBy', 'firstName lastName');

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    res.json({
      success: true,
      message: "Stakeholder updated successfully",
      data: { stakeholder }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete stakeholder
// @route   DELETE /api/stakeholders/:id
// @access  Private (Admin only)
const deleteStakeholder = async (req, res) => {
  try {
    const stakeholder = await Stakeholder.findById(req.params.id);

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    // Check if stakeholder has active contributions/projects
    if (stakeholder.supportedProjects && stakeholder.supportedProjects.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete stakeholder with active projects. Please remove project associations first.'
      });
    }

    await stakeholder.deleteOne();

    res.json({
      success: true,
      message: 'Stakeholder deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add engagement to stakeholder
// @route   POST /api/stakeholders/:id/engagements
// @access  Private (Admin only)
const addEngagement = async (req, res) => {
  try {
    const stakeholder = await Stakeholder.findById(req.params.id);
    
    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    // Add attendedBy from authenticated user if not provided
    if (!req.body.attendedBy) {
      req.body.attendedBy = req.user.id;
    }

    await stakeholder.addEngagement(req.body);

    // Populate the new engagement
    await stakeholder.populate({
      path: 'engagementHistory.attendedBy',
      select: 'firstName lastName'
    });

    res.json({
      success: true,
      message: 'Engagement added successfully',
      data: { 
        engagement: stakeholder.engagementHistory[stakeholder.engagementHistory.length - 1],
        allEngagements: stakeholder.engagementHistory 
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get stakeholder engagements
// @route   GET /api/stakeholders/:id/engagements
// @access  Private (Admin only)
const getEngagements = async (req, res) => {
  try {
    const { limit = 10, page = 1 } = req.query;
    
    const stakeholder = await Stakeholder.findById(req.params.id)
      .populate('engagementHistory.attendedBy', 'firstName lastName email');

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    // Sort and paginate engagements
    const engagements = stakeholder.engagementHistory
      .sort((a, b) => b.date - a.date)
      .slice((parseInt(page) - 1) * parseInt(limit), parseInt(page) * parseInt(limit));

    res.json({
      success: true,
      data: {
        engagements,
        totalEngagements: stakeholder.engagementHistory.length,
        currentPage: parseInt(page),
        totalPages: Math.ceil(stakeholder.engagementHistory.length / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update stakeholder status
// @route   PATCH /api/stakeholders/:id/status
// @access  Private (Admin only)
const updateStatus = async (req, res) => {
  try {
    const { status, reason } = req.body;

    const stakeholder = await Stakeholder.findByIdAndUpdate(
      req.params.id,
      { 
        status,
        notes: reason ? `${new Date().toLocaleDateString()}: Status changed to ${status}. Reason: ${reason}` : undefined
      },
      { new: true }
    );

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    res.json({
      success: true,
      message: `Stakeholder status updated to ${status}`,
      data: { status: stakeholder.status }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Assign stakeholder to staff
// @route   PATCH /api/stakeholders/:id/assign
// @access  Private (Admin only)
const assignStakeholder = async (req, res) => {
  try {
    const { staffId } = req.body;

    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({
        success: false,
        error: 'Staff member not found'
      });
    }

    const stakeholder = await Stakeholder.findByIdAndUpdate(
      req.params.id,
      { assignedTo: staffId },
      { new: true }
    ).populate('assignedTo', 'firstName lastName email');

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    res.json({
      success: true,
      message: `Stakeholder assigned to ${staff.firstName} ${staff.lastName}`,
      data: { assignedTo: stakeholder.assignedTo }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Add document to stakeholder
// @route   POST /api/stakeholders/:id/documents
// @access  Private (Admin only)
const addDocument = async (req, res) => {
  try {
    const { name, type, url, description } = req.body;

    const stakeholder = await Stakeholder.findByIdAndUpdate(
      req.params.id,
      { 
        $push: { 
          documents: { name, type, url, description, uploadedAt: new Date() }
        }
      },
      { new: true }
    );

    if (!stakeholder) {
      return res.status(404).json({
        success: false,
        error: 'Stakeholder not found'
      });
    }

    res.json({
      success: true,
      message: 'Document added successfully',
      data: { documents: stakeholder.documents }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
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
};