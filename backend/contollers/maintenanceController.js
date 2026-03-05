const MaintenanceRecord = require('../models/maintenanceRecord');
const Vehicle = require('../models/Vehicle');

// @desc    Get all maintenance records with advanced filtering
// @route   GET /api/maintenance
// @access  Private (Admin only)
const getMaintenanceRecords = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      vehicle, 
      type,
      status,
      garage,
      startDate,
      endDate,
      minCost,
      maxCost,
      approvedBy,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (vehicle) filter.vehicle = vehicle;
    if (type) filter.type = type;
    if (status) filter.status = status;
    if (garage) filter['garage.name'] = { $regex: garage, $options: 'i' };
    if (approvedBy) filter.approvedBy = approvedBy;

    // Cost range filter
    if (minCost || maxCost) {
      filter.cost = {};
      if (minCost) filter.cost.$gte = parseFloat(minCost);
      if (maxCost) filter.cost.$lte = parseFloat(maxCost);
    }

    // Date range filter
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const maintenanceRecords = await MaintenanceRecord.find(filter)
      .populate('vehicle', 'plateNumber make model currentOdometer')
      .populate('approvedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await MaintenanceRecord.countDocuments(filter);

    // Get statistics
    const stats = await MaintenanceRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$cost' },
          averageCost: { $avg: '$cost' },
          minCost: { $min: '$cost' },
          maxCost: { $max: '$cost' },
          recordCount: { $sum: 1 },
          completedCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } 
          },
          scheduledCount: { 
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] } 
          }
        }
      }
    ]);

    // Get cost by type
    const costByType = await MaintenanceRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$type',
          totalCost: { $sum: '$cost' },
          averageCost: { $avg: '$cost' },
          recordCount: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    res.json({
      success: true,
      data: {
        maintenanceRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        stats: stats[0] || {
          totalCost: 0,
          averageCost: 0,
          minCost: 0,
          maxCost: 0,
          recordCount: 0,
          completedCount: 0,
          scheduledCount: 0
        },
        costByType
      }
    });
  } catch (error) {
    console.error('❌ Get maintenance records error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single maintenance record
// @route   GET /api/maintenance/:id
// @access  Private (Admin only)
const getMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenanceRecord = await MaintenanceRecord.findById(id)
      .populate('vehicle', 'plateNumber make model currentOdometer fuelType')
      .populate('approvedBy', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .lean();

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance record not found'
      });
    }

    // Get vehicle maintenance history
    const maintenanceHistory = await MaintenanceRecord.find({
      vehicle: maintenanceRecord.vehicle._id,
      _id: { $ne: id }
    })
    .select('date type cost status odometerReading')
    .sort({ date: -1 })
    .limit(5)
    .lean();

    res.json({
      success: true,
      data: {
        maintenanceRecord,
        maintenanceHistory
      }
    });
  } catch (error) {
    console.error('❌ Get maintenance record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new maintenance record
// @route   POST /api/maintenance
// @access  Private (Admin only)
const createMaintenanceRecord = async (req, res) => {
  try {
    const maintenanceData = req.body;

    // Verify vehicle exists
    const vehicle = await Vehicle.findById(maintenanceData.vehicle);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Check if odometer reading is logical
    if (maintenanceData.odometerReading && maintenanceData.odometerReading < vehicle.currentOdometer) {
      return res.status(400).json({
        success: false,
        error: `Odometer reading (${maintenanceData.odometerReading}) cannot be less than vehicle's current odometer (${vehicle.currentOdometer})`
      });
    }

    // Set createdBy from authenticated user
    maintenanceData.createdBy = req.user.id;
    maintenanceData.approvedBy = req.user.id; // Admin approves automatically

    // Calculate next service odometer if not provided
    if (maintenanceData.odometerReading && maintenanceData.serviceInterval && !maintenanceData.nextServiceOdometer) {
      maintenanceData.nextServiceOdometer = maintenanceData.odometerReading + maintenanceData.serviceInterval;
    }

    const maintenanceRecord = await MaintenanceRecord.create(maintenanceData);
    
    // Update vehicle's current odometer if this reading is higher
    if (maintenanceData.odometerReading > vehicle.currentOdometer) {
      await Vehicle.findByIdAndUpdate(
        maintenanceData.vehicle,
        { 
          currentOdometer: maintenanceData.odometerReading,
          lastServiceOdometer: maintenanceData.odometerReading,
          lastServiceDate: maintenanceData.date || new Date(),
          nextServiceOdometer: maintenanceData.nextServiceOdometer || maintenanceData.odometerReading + 5000,
          nextServiceDate: maintenanceData.nextServiceDate || new Date(Date.now() + 180 * 24 * 60 * 60 * 1000) // 6 months
        }
      );
    }

    await maintenanceRecord.populate([
      { path: 'vehicle', select: 'plateNumber make model' },
      { path: 'approvedBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Maintenance record created successfully',
      data: { maintenanceRecord }
    });
  } catch (error) {
    console.error('❌ Create maintenance record error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update maintenance record
// @route   PUT /api/maintenance/:id
// @access  Private (Admin only)
const updateMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const maintenanceRecord = await MaintenanceRecord.findById(id);
    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance record not found'
      });
    }

    // If vehicle is being changed, verify new vehicle exists
    if (updateData.vehicle && updateData.vehicle !== maintenanceRecord.vehicle.toString()) {
      const vehicle = await Vehicle.findById(updateData.vehicle);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }
    }

    // Update completion date if status changed to completed
    if (updateData.status === 'completed' && maintenanceRecord.status !== 'completed') {
      updateData.completionDate = new Date();
    }

    // Add lastUpdatedBy
    updateData.lastUpdatedBy = req.user.id;

    const updatedRecord = await MaintenanceRecord.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'vehicle', select: 'plateNumber make model currentOdometer' },
      { path: 'approvedBy', select: 'name email' },
      { path: 'verifiedBy', select: 'name email' },
      { path: 'lastUpdatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Maintenance record updated successfully',
      data: { maintenanceRecord: updatedRecord }
    });
  } catch (error) {
    console.error('❌ Update maintenance record error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete maintenance record
// @route   DELETE /api/maintenance/:id
// @access  Private (Admin only)
const deleteMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const maintenanceRecord = await MaintenanceRecord.findById(id);

    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance record not found'
      });
    }

    // Optional: Check if record is too old to delete
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (maintenanceRecord.createdAt < thirtyDaysAgo) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete maintenance records older than 30 days. Consider marking as cancelled instead.'
      });
    }

    await maintenanceRecord.deleteOne();

    res.json({
      success: true,
      message: 'Maintenance record deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete maintenance record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Verify maintenance record
// @route   PATCH /api/maintenance/:id/verify
// @access  Private (Admin only)
const verifyMaintenanceRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const maintenanceRecord = await MaintenanceRecord.findById(id);
    if (!maintenanceRecord) {
      return res.status(404).json({
        success: false,
        error: 'Maintenance record not found'
      });
    }

    if (maintenanceRecord.verified) {
      return res.status(400).json({
        success: false,
        error: 'Maintenance record is already verified'
      });
    }

    maintenanceRecord.verified = true;
    maintenanceRecord.verifiedBy = req.user.id;
    maintenanceRecord.verificationDate = new Date();
    
    if (notes) {
      maintenanceRecord.notes = maintenanceRecord.notes 
        ? `${maintenanceRecord.notes}\nVerification notes: ${notes}`
        : `Verification notes: ${notes}`;
    }

    await maintenanceRecord.save();
    await maintenanceRecord.populate('verifiedBy', 'name email');

    res.json({
      success: true,
      message: 'Maintenance record verified successfully',
      data: { maintenanceRecord }
    });
  } catch (error) {
    console.error('❌ Verify maintenance record error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get maintenance analytics for a vehicle
// @route   GET /api/maintenance/vehicle/:vehicleId/analytics
// @access  Private (Admin only)
const getMaintenanceAnalytics = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Verify vehicle exists
    const vehicle = await Vehicle.findById(vehicleId).select('plateNumber make model currentOdometer');
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Monthly maintenance costs
    const monthlyMaintenance = await MaintenanceRecord.aggregate([
      { 
        $match: { 
          vehicle: vehicle._id,
          status: 'completed',
          date: { 
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { month: { $month: '$date' } },
          totalCost: { $sum: '$cost' },
          averageCost: { $avg: '$cost' },
          recordCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.month': 1 } }
    ]);

    // Maintenance type analysis
    const typeAnalysis = await MaintenanceRecord.aggregate([
      { 
        $match: { 
          vehicle: vehicle._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$type',
          totalCost: { $sum: '$cost' },
          averageCost: { $avg: '$cost' },
          recordCount: { $sum: 1 },
          lastMaintenance: { $max: '$date' }
        }
      },
      { $sort: { totalCost: -1 } }
    ]);

    // Garage performance
    const garageAnalysis = await MaintenanceRecord.aggregate([
      { 
        $match: { 
          vehicle: vehicle._id,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$garage.name',
          totalCost: { $sum: '$cost' },
          averageCost: { $avg: '$cost' },
          recordCount: { $sum: 1 },
          lastVisit: { $max: '$date' }
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: 10 }
    ]);

    // Parts consumption analysis
    const partsAnalysis = await MaintenanceRecord.aggregate([
      { 
        $match: { 
          vehicle: vehicle._id,
          status: 'completed',
          'partsReplaced.0': { $exists: true }
        }
      },
      { $unwind: '$partsReplaced' },
      {
        $group: {
          _id: '$partsReplaced.name',
          totalCost: { $sum: '$partsReplaced.totalCost' },
          totalQuantity: { $sum: '$partsReplaced.quantity' },
          averageUnitCost: { $avg: '$partsReplaced.unitCost' },
          replacementCount: { $sum: 1 }
        }
      },
      { $sort: { totalCost: -1 } },
      { $limit: 15 }
    ]);

    // Cost per kilometer calculation
    const firstMaintenance = await MaintenanceRecord.findOne({ 
      vehicle: vehicle._id,
      status: 'completed' 
    }).sort({ date: 1 });

    const lastMaintenance = await MaintenanceRecord.findOne({ 
      vehicle: vehicle._id,
      status: 'completed' 
    }).sort({ date: -1 });

    let costPerKm = 0;
    let maintenanceDistance = 0;

    if (firstMaintenance && lastMaintenance && firstMaintenance.odometerReading) {
      maintenanceDistance = lastMaintenance.odometerReading - firstMaintenance.odometerReading;
      const totalMaintenanceCost = typeAnalysis.reduce((sum, item) => sum + item.totalCost, 0);
      
      if (maintenanceDistance > 0) {
        costPerKm = totalMaintenanceCost / maintenanceDistance;
      }
    }

    res.json({
      success: true,
      data: {
        vehicle,
        analytics: {
          monthlyMaintenance,
          typeAnalysis,
          garageAnalysis,
          partsAnalysis,
          summary: {
            totalMaintenanceCost: typeAnalysis.reduce((sum, item) => sum + item.totalCost, 0),
            totalRecords: typeAnalysis.reduce((sum, item) => sum + item.recordCount, 0),
            maintenanceDistance,
            costPerKm: Math.round(costPerKm * 100) / 100,
            mostCommonType: typeAnalysis[0]?._id || 'N/A',
            mostExpensiveType: [...typeAnalysis].sort((a, b) => b.averageCost - a.averageCost)[0]?._id || 'N/A'
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Get maintenance analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get upcoming/scheduled maintenance
// @route   GET /api/maintenance/upcoming
// @access  Private (Admin only)
const getUpcomingMaintenance = async (req, res) => {
  try {
    const { page = 1, limit = 10, days = 30 } = req.query;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + parseInt(days));

    const filter = {
      $or: [
        { nextServiceDate: { $lte: futureDate, $gte: new Date() } },
        { 
          status: { $in: ['scheduled', 'in_progress'] },
          date: { $gte: new Date() }
        }
      ]
    };

    const upcomingMaintenance = await MaintenanceRecord.find(filter)
      .populate('vehicle', 'plateNumber make model currentOdometer')
      .populate('approvedBy', 'name')
      .sort({ nextServiceDate: 1, date: 1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await MaintenanceRecord.countDocuments(filter);

    res.json({
      success: true,
      data: {
        upcomingMaintenance,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total
        }
      }
    });
  } catch (error) {
    console.error('❌ Get upcoming maintenance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get maintenance cost forecast
// @route   GET /api/maintenance/vehicle/:vehicleId/forecast
// @access  Private (Admin only)
const getMaintenanceForecast = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { months = 12 } = req.query;

    const vehicle = await Vehicle.findById(vehicleId).select('plateNumber make model currentOdometer');
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Get historical maintenance data (last 2 years)
    const twoYearsAgo = new Date();
    twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);

    const historicalData = await MaintenanceRecord.aggregate([
      { 
        $match: { 
          vehicle: vehicle._id,
          status: 'completed',
          date: { $gte: twoYearsAgo }
        }
      },
      {
        $group: {
          _id: { 
            year: { $year: '$date' },
            month: { $month: '$date' }
          },
          monthlyCost: { $sum: '$cost' },
          recordCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Calculate average monthly cost
    const averageMonthlyCost = historicalData.length > 0 
      ? historicalData.reduce((sum, item) => sum + item.monthlyCost, 0) / historicalData.length
      : 0;

    // Get upcoming scheduled maintenance
    const upcomingScheduled = await MaintenanceRecord.find({
      vehicle: vehicle._id,
      status: 'scheduled',
      date: { $gte: new Date() }
    })
    .select('date type cost description')
    .sort({ date: 1 })
    .limit(5)
    .lean();

    // Simple forecasting based on historical average + scheduled
    const forecast = Array.from({ length: parseInt(months) }, (_, i) => {
      const forecastDate = new Date();
      forecastDate.setMonth(forecastDate.getMonth() + i + 1);
      
      // Check if there's scheduled maintenance for this month
      const scheduledThisMonth = upcomingScheduled.filter(s => {
        const sDate = new Date(s.date);
        return sDate.getMonth() === forecastDate.getMonth() && 
               sDate.getFullYear() === forecastDate.getFullYear();
      });

      const scheduledCost = scheduledThisMonth.reduce((sum, s) => sum + s.cost, 0);
      
      return {
        month: forecastDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        forecastedCost: Math.round(scheduledCost || averageMonthlyCost),
        hasScheduled: scheduledThisMonth.length > 0,
        scheduledDetails: scheduledThisMonth
      };
    });

    res.json({
      success: true,
      data: {
        vehicle,
        forecast: {
          historicalData,
          averageMonthlyCost: Math.round(averageMonthlyCost),
          monthlyForecast: forecast,
          totalForecast: Math.round(forecast.reduce((sum, item) => sum + item.forecastedCost, 0)),
          upcomingScheduled
        }
      }
    });
  } catch (error) {
    console.error('❌ Get maintenance forecast error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get overdue maintenance
// @route   GET /api/maintenance/overdue
// @access  Private (Admin only)
const getOverdueMaintenance = async (req, res) => {
  try {
    const overdue = await MaintenanceRecord.getOverdueMaintenance();

    res.json({
      success: true,
      data: {
        overdue,
        count: overdue.length
      }
    });
  } catch (error) {
    console.error('❌ Get overdue maintenance error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getMaintenanceRecords,
  getMaintenanceRecord,
  createMaintenanceRecord,
  updateMaintenanceRecord,
  deleteMaintenanceRecord,
  verifyMaintenanceRecord,
  getMaintenanceAnalytics,
  getUpcomingMaintenance,
  getMaintenanceForecast,
  getOverdueMaintenance
};