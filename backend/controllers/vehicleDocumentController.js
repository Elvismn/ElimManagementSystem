const VehicleDocument = require('../models/vehicleDocument');
const Vehicle = require('../models/Vehicle');

// @desc    Get all vehicle documents with advanced filtering
// @route   GET /api/vehicle-documents
// @access  Private (Admin only)
const getVehicleDocuments = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      vehicle, 
      documentType,
      status,
      provider,
      verified,
      expiryStatus, // 'expired', 'critical', 'warning', 'valid'
      search,
      sortBy = 'expiryDate',
      sortOrder = 'asc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (vehicle) filter.vehicle = vehicle;
    if (documentType) filter.documentType = documentType;
    if (status) filter.status = status;
    if (verified !== undefined) filter.verified = verified === 'true';
    if (provider) filter['provider.name'] = { $regex: provider, $options: 'i' };
    
    // Search in title, document number, notes
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { documentNumber: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } }
      ];
    }

    // Expiry status filter
    if (expiryStatus) {
      const today = new Date();
      const criticalDate = new Date();
      criticalDate.setDate(criticalDate.getDate() + 7);
      const warningDate = new Date();
      warningDate.setDate(warningDate.getDate() + 30);

      switch (expiryStatus) {
        case 'expired':
          filter.expiryDate = { $lt: today };
          filter.status = { $in: ['active', 'pending'] };
          break;
        case 'critical':
          filter.expiryDate = { $gte: today, $lte: criticalDate };
          filter.status = 'active';
          break;
        case 'warning':
          filter.expiryDate = { $gte: criticalDate, $lte: warningDate };
          filter.status = 'active';
          break;
        case 'valid':
          filter.expiryDate = { $gt: warningDate };
          filter.status = 'active';
          break;
      }
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const vehicleDocuments = await VehicleDocument.find(filter)
      .populate('vehicle', 'plateNumber make model')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await VehicleDocument.countDocuments(filter);

    // Get document statistics
    const stats = await VehicleDocument.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalDocuments: { $sum: 1 },
          activeCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
          },
          expiredCount: { 
            $sum: { $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0] } 
          },
          expiringSoonCount: {
            $sum: {
              $cond: [
                { 
                  $and: [
                    { $gte: ['$expiryDate', new Date()] },
                    { $lte: ['$expiryDate', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)] }
                  ]
                }, 1, 0
              ]
            }
          },
          verifiedCount: { 
            $sum: { $cond: ['$verified', 1, 0] } 
          },
          totalPremium: { $sum: '$premium' }
        }
      }
    ]);

    // Get count by document type
    const countByType = await VehicleDocument.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$documentType',
          count: { $sum: 1 },
          activeCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
          },
          expiredCount: { 
            $sum: { $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0] } 
          }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        documents: vehicleDocuments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        stats: stats[0] || {
          totalDocuments: 0,
          activeCount: 0,
          expiredCount: 0,
          expiringSoonCount: 0,
          verifiedCount: 0,
          totalPremium: 0
        },
        countByType
      }
    });
  } catch (error) {
    console.error('❌ Get vehicle documents error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single vehicle document
// @route   GET /api/vehicle-documents/:id
// @access  Private (Admin only)
const getVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicleDocument = await VehicleDocument.findById(id)
      .populate('vehicle', 'plateNumber make model year color currentOdometer')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .lean();

    if (!vehicleDocument) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle document not found'
      });
    }

    // Get other documents for the same vehicle
    const otherDocuments = await VehicleDocument.find({
      vehicle: vehicleDocument.vehicle._id,
      _id: { $ne: id }
    })
    .select('documentType title documentNumber expiryDate status')
    .sort({ expiryDate: 1 })
    .limit(5)
    .lean();

    res.json({
      success: true,
      data: {
        document: vehicleDocument,
        otherDocuments
      }
    });
  } catch (error) {
    console.error('❌ Get vehicle document error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new vehicle document
// @route   POST /api/vehicle-documents
// @access  Private (Admin only)
const createVehicleDocument = async (req, res) => {
  try {
    const documentData = req.body;

    // Verify vehicle exists
    const vehicle = await Vehicle.findById(documentData.vehicle);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Check for duplicate document numbers for the same type
    if (documentData.documentNumber) {
      const existingDoc = await VehicleDocument.findOne({
        documentType: documentData.documentType,
        documentNumber: documentData.documentNumber,
        vehicle: documentData.vehicle
      });
      
      if (existingDoc) {
        return res.status(400).json({
          success: false,
          error: 'A document with this number already exists for this vehicle'
        });
      }
    }

    // Set default reminder days based on document type
    if (!documentData.reminderDays) {
      const defaultReminders = {
        'insurance': 30,
        'inspection_certificate': 30,
        'registration': 60,
        'fitness_certificate': 30,
        'road_license': 60,
        'emission_test': 30
      };
      documentData.reminderDays = defaultReminders[documentData.documentType] || 30;
    }

    // Add createdBy from authenticated user
    documentData.createdBy = req.user.id;

    const vehicleDocument = await VehicleDocument.create(documentData);
    
    await vehicleDocument.populate([
      { path: 'vehicle', select: 'plateNumber make model' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Vehicle document created successfully',
      data: { document: vehicleDocument }
    });
  } catch (error) {
    console.error('❌ Create vehicle document error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update vehicle document
// @route   PUT /api/vehicle-documents/:id
// @access  Private (Admin only)
const updateVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const vehicleDocument = await VehicleDocument.findById(id);
    if (!vehicleDocument) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle document not found'
      });
    }

    // If vehicle is being changed, verify new vehicle exists
    if (updateData.vehicle && updateData.vehicle !== vehicleDocument.vehicle.toString()) {
      const vehicle = await Vehicle.findById(updateData.vehicle);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }
    }

    // Check for duplicate document numbers if document number is being updated
    if (updateData.documentNumber && updateData.documentNumber !== vehicleDocument.documentNumber) {
      const existingDoc = await VehicleDocument.findOne({
        documentType: updateData.documentType || vehicleDocument.documentType,
        documentNumber: updateData.documentNumber,
        vehicle: updateData.vehicle || vehicleDocument.vehicle,
        _id: { $ne: id }
      });
      
      if (existingDoc) {
        return res.status(400).json({
          success: false,
          error: 'Another document with this number already exists for this vehicle'
        });
      }
    }

    // Add lastUpdatedBy
    updateData.lastUpdatedBy = req.user.id;

    const updatedDocument = await VehicleDocument.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'vehicle', select: 'plateNumber make model' },
      { path: 'verifiedBy', select: 'name email' },
      { path: 'lastUpdatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Vehicle document updated successfully',
      data: { document: updatedDocument }
    });
  } catch (error) {
    console.error('❌ Update vehicle document error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete vehicle document
// @route   DELETE /api/vehicle-documents/:id
// @access  Private (Admin only)
const deleteVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicleDocument = await VehicleDocument.findById(id);

    if (!vehicleDocument) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle document not found'
      });
    }

    // Check if document is expired or old
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (vehicleDocument.expiryDate > thirtyDaysAgo) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete active or recently expired documents. Consider marking as cancelled instead.'
      });
    }

    await vehicleDocument.deleteOne();

    res.json({
      success: true,
      message: 'Vehicle document deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete vehicle document error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Verify vehicle document
// @route   PATCH /api/vehicle-documents/:id/verify
// @access  Private (Admin only)
const verifyVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicleDocument = await VehicleDocument.findById(id);
    if (!vehicleDocument) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle document not found'
      });
    }

    if (vehicleDocument.verified) {
      return res.status(400).json({
        success: false,
        error: 'Document is already verified'
      });
    }

    vehicleDocument.verified = true;
    vehicleDocument.verifiedBy = req.user.id;
    vehicleDocument.verificationDate = new Date();

    await vehicleDocument.save();
    await vehicleDocument.populate('verifiedBy', 'name email');

    res.json({
      success: true,
      message: 'Vehicle document verified successfully',
      data: { document: vehicleDocument }
    });
  } catch (error) {
    console.error('❌ Verify vehicle document error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Renew vehicle document
// @route   PATCH /api/vehicle-documents/:id/renew
// @access  Private (Admin only)
const renewVehicleDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { newExpiryDate, newDocumentNumber, newPremium, notes } = req.body;

    if (!newExpiryDate) {
      return res.status(400).json({
        success: false,
        error: 'New expiry date is required'
      });
    }

    const vehicleDocument = await VehicleDocument.findById(id);
    if (!vehicleDocument) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle document not found'
      });
    }

    // Create renewal record
    const oldData = vehicleDocument.renewDocument(
      newExpiryDate, 
      newDocumentNumber, 
      newPremium
    );

    if (notes) {
      vehicleDocument.notes = notes;
    }

    // Add lastUpdatedBy
    vehicleDocument.lastUpdatedBy = req.user.id;

    await vehicleDocument.save();
    await vehicleDocument.populate([
      { path: 'vehicle', select: 'plateNumber make model' },
      { path: 'verifiedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Vehicle document renewed successfully',
      data: { 
        document: vehicleDocument,
        renewal: {
          previousDocument: oldData,
          renewedAt: new Date(),
          renewedBy: req.user.id
        }
      }
    });
  } catch (error) {
    console.error('❌ Renew vehicle document error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get expiring documents
// @route   GET /api/vehicle-documents/expiring
// @access  Private (Admin only)
const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30, page = 1, limit = 10 } = req.query;

    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + parseInt(days));

    const expiringDocuments = await VehicleDocument.find({
      expiryDate: { $lte: targetDate, $gte: new Date() },
      status: 'active'
    })
    .populate('vehicle', 'plateNumber make model')
    .populate('verifiedBy', 'name')
    .sort({ expiryDate: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

    const total = await VehicleDocument.countDocuments({
      expiryDate: { $lte: targetDate, $gte: new Date() },
      status: 'active'
    });

    // Categorize by urgency
    const criticalDate = new Date();
    criticalDate.setDate(criticalDate.getDate() + 7);

    const categorized = expiringDocuments.map(doc => ({
      ...doc,
      urgency: new Date(doc.expiryDate) <= criticalDate ? 'critical' : 'warning'
    }));

    res.json({
      success: true,
      data: {
        documents: categorized,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total
        },
        summary: {
          critical: categorized.filter(doc => doc.urgency === 'critical').length,
          warning: categorized.filter(doc => doc.urgency === 'warning').length,
          total: total
        }
      }
    });
  } catch (error) {
    console.error('❌ Get expiring documents error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get expired documents
// @route   GET /api/vehicle-documents/expired
// @access  Private (Admin only)
const getExpiredDocuments = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const expiredDocuments = await VehicleDocument.find({
      expiryDate: { $lt: new Date() },
      status: { $in: ['active', 'pending'] }
    })
    .populate('vehicle', 'plateNumber make model')
    .populate('verifiedBy', 'name')
    .sort({ expiryDate: 1 })
    .limit(parseInt(limit))
    .skip((parseInt(page) - 1) * parseInt(limit))
    .lean();

    const total = await VehicleDocument.countDocuments({
      expiryDate: { $lt: new Date() },
      status: { $in: ['active', 'pending'] }
    });

    res.json({
      success: true,
      data: {
        documents: expiredDocuments,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total
        }
      }
    });
  } catch (error) {
    console.error('❌ Get expired documents error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get document analytics
// @route   GET /api/vehicle-documents/analytics
// @route   GET /api/vehicle-documents/vehicle/:vehicleId/analytics
// @access  Private (Admin only)
const getDocumentAnalytics = async (req, res) => {
  try {
    const { vehicleId } = req.params;

    let matchStage = {};
    if (vehicleId) {
      const vehicle = await Vehicle.findById(vehicleId);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }
      matchStage.vehicle = vehicle._id;
    }

    // Document type distribution
    const typeDistribution = await VehicleDocument.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$documentType',
          count: { $sum: 1 },
          activeCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
          },
          expiredCount: { 
            $sum: { $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0] } 
          },
          verifiedCount: { 
            $sum: { $cond: ['$verified', 1, 0] } 
          },
          totalPremium: { $sum: '$premium' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Expiry timeline (next 12 months)
    const expiryTimeline = await VehicleDocument.aggregate([
      { 
        $match: { 
          ...matchStage,
          expiryDate: { $gte: new Date() }
        }
      },
      {
        $group: {
          _id: { 
            month: { $month: '$expiryDate' }, 
            year: { $year: '$expiryDate' } 
          },
          count: { $sum: 1 },
          totalPremium: { $sum: '$premium' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Provider analysis
    const providerAnalysis = await VehicleDocument.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$provider.name',
          count: { $sum: 1 },
          documentTypes: { $addToSet: '$documentType' },
          totalPremium: { $sum: '$premium' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Verification status
    const verificationStats = await VehicleDocument.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$verified',
          count: { $sum: 1 }
        }
      }
    ]);

    // Status distribution
    const statusDistribution = await VehicleDocument.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        analytics: {
          typeDistribution,
          expiryTimeline,
          providerAnalysis,
          verificationStats,
          statusDistribution,
          summary: {
            totalDocuments: typeDistribution.reduce((sum, item) => sum + item.count, 0),
            activeDocuments: typeDistribution.reduce((sum, item) => sum + item.activeCount, 0),
            expiredDocuments: typeDistribution.reduce((sum, item) => sum + item.expiredCount, 0),
            verifiedDocuments: typeDistribution.reduce((sum, item) => sum + item.verifiedCount, 0),
            totalPremium: typeDistribution.reduce((sum, item) => sum + (item.totalPremium || 0), 0),
            uniqueProviders: providerAnalysis.length,
            mostCommonType: typeDistribution[0]?._id || 'N/A'
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Get document analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Bulk update document status
// @route   POST /api/vehicle-documents/bulk-update
// @access  Private (Admin only)
const bulkUpdateDocumentStatus = async (req, res) => {
  try {
    const { documentIds, status, verified, notes } = req.body;

    if (!documentIds || !Array.isArray(documentIds) || documentIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Document IDs array is required'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (verified !== undefined) {
      updateData.verified = verified;
      if (verified) {
        updateData.verifiedBy = req.user.id;
        updateData.verificationDate = new Date();
      }
    }
    if (notes) updateData.notes = notes;
    
    updateData.lastUpdatedBy = req.user.id;

    const result = await VehicleDocument.updateMany(
      { _id: { $in: documentIds } },
      updateData
    );

    const updatedDocuments = await VehicleDocument.find({ _id: { $in: documentIds } })
      .populate('vehicle', 'plateNumber make model')
      .populate('verifiedBy', 'name email');

    res.json({
      success: true,
      message: `${result.modifiedCount} documents updated successfully`,
      data: {
        updatedCount: result.modifiedCount,
        documents: updatedDocuments
      }
    });
  } catch (error) {
    console.error('❌ Bulk update document status error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get reminder candidates
// @route   GET /api/vehicle-documents/reminders
// @access  Private (Admin only)
const getReminderCandidates = async (req, res) => {
  try {
    const documents = await VehicleDocument.find({
      renewalReminder: true,
      status: 'active',
      expiryDate: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      }
    }).populate('vehicle', 'plateNumber make model');

    // Filter documents that should receive a reminder now
    const reminderCandidates = documents.filter(doc => doc.shouldSendReminder());

    res.json({
      success: true,
      data: {
        candidates: reminderCandidates,
        count: reminderCandidates.length
      }
    });
  } catch (error) {
    console.error('❌ Get reminder candidates error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
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
};