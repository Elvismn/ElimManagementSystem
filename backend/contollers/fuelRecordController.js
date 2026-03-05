const FuelRecord = require('../models/FuelRecord');
const Vehicle = require('../models/Vehicle');

// @desc    Get all fuel records with advanced filtering
// @route   GET /api/fuel-records
// @access  Private (Admin only)
const getFuelRecords = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      vehicle, 
      startDate, 
      endDate,
      station,
      filledBy,
      fuelType,
      paymentMethod,
      verified,
      minLiters,
      maxLiters,
      minCost,
      maxCost,
      sortBy = 'date',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (vehicle) filter.vehicle = vehicle;
    if (fuelType) filter.fuelType = fuelType;
    if (paymentMethod) filter.paymentMethod = paymentMethod;
    if (filledBy) filter.filledBy = filledBy;
    if (verified !== undefined) filter.verified = verified === 'true';
    if (station) filter['station.name'] = { $regex: station, $options: 'i' };

    // Liters range filter
    if (minLiters || maxLiters) {
      filter.liters = {};
      if (minLiters) filter.liters.$gte = parseFloat(minLiters);
      if (maxLiters) filter.liters.$lte = parseFloat(maxLiters);
    }

    // Cost range filter
    if (minCost || maxCost) {
      filter.totalCost = {};
      if (minCost) filter.totalCost.$gte = parseFloat(minCost);
      if (maxCost) filter.totalCost.$lte = parseFloat(maxCost);
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

    const fuelRecords = await FuelRecord.find(filter)
      .populate('vehicle', 'plateNumber make model')
      .populate('filledBy', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await FuelRecord.countDocuments(filter);

    // Get statistics
    const stats = await FuelRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          totalLiters: { $sum: '$liters' },
          averageCostPerLiter: { $avg: '$costPerLiter' },
          recordCount: { $sum: 1 },
          averageLitersPerRecord: { $avg: '$liters' },
          minCost: { $min: '$totalCost' },
          maxCost: { $max: '$totalCost' },
          minLiters: { $min: '$liters' },
          maxLiters: { $max: '$liters' }
        }
      }
    ]);

    // Get stats by fuel type
    const statsByFuelType = await FuelRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$fuelType',
          totalCost: { $sum: '$totalCost' },
          totalLiters: { $sum: '$liters' },
          recordCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        fuelRecords,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        stats: stats[0] || {
          totalCost: 0,
          totalLiters: 0,
          averageCostPerLiter: 0,
          recordCount: 0,
          averageLitersPerRecord: 0,
          minCost: 0,
          maxCost: 0,
          minLiters: 0,
          maxLiters: 0
        },
        statsByFuelType
      }
    });
  } catch (error) {
    console.error('❌ Get fuel records error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single fuel record
// @route   GET /api/fuel-records/:id
// @access  Private (Admin only)
const getFuelRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const fuelRecord = await FuelRecord.findById(id)
      .populate('vehicle', 'plateNumber make model fuelType currentOdometer')
      .populate('filledBy', 'name email')
      .populate('verifiedBy', 'name email')
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .lean();

    if (!fuelRecord) {
      return res.status(404).json({
        success: false,
        error: 'Fuel record not found'
      });
    }

    // Get previous fuel record for efficiency calculation
    const previousRecord = await FuelRecord.findOne({
      vehicle: fuelRecord.vehicle._id,
      date: { $lt: fuelRecord.date },
      odometerReading: { $exists: true }
    })
    .sort({ date: -1 })
    .lean();

    // Calculate fuel efficiency if previous record exists
    if (previousRecord && previousRecord.odometerReading) {
      const distance = fuelRecord.odometerReading - previousRecord.odometerReading;
      if (distance > 0) {
        fuelRecord.fuelEfficiency = {
          distance,
          liters: fuelRecord.liters,
          kmPerLiter: (distance / fuelRecord.liters).toFixed(2),
          litersPer100km: ((fuelRecord.liters / distance) * 100).toFixed(2),
          costPerKm: (fuelRecord.totalCost / distance).toFixed(2)
        };
      }
    }

    res.json({
      success: true,
      data: { 
        fuelRecord,
        previousRecord: previousRecord || null
      }
    });
  } catch (error) {
    console.error('❌ Get fuel record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new fuel record
// @route   POST /api/fuel-records
// @access  Private (Admin only)
const createFuelRecord = async (req, res) => {
  try {
    const fuelData = req.body;

    // Verify vehicle exists
    const vehicle = await Vehicle.findById(fuelData.vehicle);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Check if odometer reading is logical (not less than current)
    if (fuelData.odometerReading && fuelData.odometerReading < vehicle.currentOdometer) {
      return res.status(400).json({
        success: false,
        error: `Odometer reading (${fuelData.odometerReading}) cannot be less than vehicle's current odometer (${vehicle.currentOdometer})`
      });
    }

    // Calculate total cost if not provided
    if (fuelData.liters && fuelData.costPerLiter && !fuelData.totalCost) {
      fuelData.totalCost = fuelData.liters * fuelData.costPerLiter;
    }

    // Add createdBy from authenticated user
    fuelData.createdBy = req.user.id;
    fuelData.filledBy = req.user.id; // Admin is filling the record

    const fuelRecord = await FuelRecord.create(fuelData);
    
    // Update vehicle's current odometer
    if (fuelData.odometerReading > vehicle.currentOdometer) {
      await Vehicle.findByIdAndUpdate(
        fuelData.vehicle,
        { 
          currentOdometer: fuelData.odometerReading,
          lastUpdatedBy: req.user.id
        }
      );
    }

    await fuelRecord.populate([
      { path: 'vehicle', select: 'plateNumber make model' },
      { path: 'filledBy', select: 'name email' },
      { path: 'createdBy', select: 'name email' }
    ]);

    res.status(201).json({
      success: true,
      message: 'Fuel record created successfully',
      data: { fuelRecord }
    });
  } catch (error) {
    console.error('❌ Create fuel record error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update fuel record
// @route   PUT /api/fuel-records/:id
// @access  Private (Admin only)
const updateFuelRecord = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const fuelRecord = await FuelRecord.findById(id);
    if (!fuelRecord) {
      return res.status(404).json({
        success: false,
        error: 'Fuel record not found'
      });
    }

    // If vehicle is being changed, verify new vehicle exists
    if (updateData.vehicle && updateData.vehicle !== fuelRecord.vehicle.toString()) {
      const vehicle = await Vehicle.findById(updateData.vehicle);
      if (!vehicle) {
        return res.status(404).json({
          success: false,
          error: 'Vehicle not found'
        });
      }
    }

    // Recalculate total cost if liters or cost per liter changed
    if ((updateData.liters || updateData.costPerLiter) && !updateData.totalCost) {
      const liters = updateData.liters || fuelRecord.liters;
      const costPerLiter = updateData.costPerLiter || fuelRecord.costPerLiter;
      updateData.totalCost = liters * costPerLiter;
    }

    // Update vehicle odometer if odometer reading is changed
    if (updateData.odometerReading && updateData.odometerReading !== fuelRecord.odometerReading) {
      const vehicleId = updateData.vehicle || fuelRecord.vehicle;
      const vehicle = await Vehicle.findById(vehicleId);
      
      if (updateData.odometerReading > vehicle.currentOdometer) {
        await Vehicle.findByIdAndUpdate(
          vehicleId,
          { 
            currentOdometer: updateData.odometerReading,
            lastUpdatedBy: req.user.id
          }
        );
      }
    }

    // Add lastUpdatedBy
    updateData.lastUpdatedBy = req.user.id;

    const updatedRecord = await FuelRecord.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate([
      { path: 'vehicle', select: 'plateNumber make model' },
      { path: 'filledBy', select: 'name email' },
      { path: 'verifiedBy', select: 'name email' },
      { path: 'lastUpdatedBy', select: 'name email' }
    ]);

    res.json({
      success: true,
      message: 'Fuel record updated successfully',
      data: { fuelRecord: updatedRecord }
    });
  } catch (error) {
    console.error('❌ Update fuel record error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete fuel record
// @route   DELETE /api/fuel-records/:id
// @access  Private (Admin only)
const deleteFuelRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const fuelRecord = await FuelRecord.findById(id);

    if (!fuelRecord) {
      return res.status(404).json({
        success: false,
        error: 'Fuel record not found'
      });
    }

    // Check if record is older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    if (fuelRecord.createdAt < thirtyDaysAgo) {
      return res.status(400).json({
        success: false,
        error: 'Cannot delete fuel records older than 30 days'
      });
    }

    await fuelRecord.deleteOne();

    res.json({
      success: true,
      message: 'Fuel record deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete fuel record error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Verify fuel record
// @route   PATCH /api/fuel-records/:id/verify
// @access  Private (Admin only)
const verifyFuelRecord = async (req, res) => {
  try {
    const { id } = req.params;

    const fuelRecord = await FuelRecord.findById(id);
    if (!fuelRecord) {
      return res.status(404).json({
        success: false,
        error: 'Fuel record not found'
      });
    }

    if (fuelRecord.verified) {
      return res.status(400).json({
        success: false,
        error: 'Fuel record is already verified'
      });
    }

    await fuelRecord.verify(req.user.id);
    await fuelRecord.populate('verifiedBy', 'name email');

    res.json({
      success: true,
      message: 'Fuel record verified successfully',
      data: { fuelRecord }
    });
  } catch (error) {
    console.error('❌ Verify fuel record error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get fuel analytics for a vehicle
// @route   GET /api/fuel-records/vehicle/:vehicleId/analytics
// @access  Private (Admin only)
const getFuelAnalytics = async (req, res) => {
  try {
    const { vehicleId } = req.params;
    const { year = new Date().getFullYear() } = req.query;

    // Verify vehicle exists
    const vehicle = await Vehicle.findById(vehicleId).select('plateNumber make model fuelType currentOdometer');
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Monthly fuel consumption
    const monthlyFuel = await FuelRecord.getMonthlyFuelStats(vehicleId, year);

    // Station-wise spending
    const stationAnalytics = await FuelRecord.getStationStats(vehicleId);

    // Overall stats
    const overallStats = await FuelRecord.getTotalFuelCost(vehicleId);

    // Fuel efficiency calculation
    const fuelRecords = await FuelRecord.find({ 
      vehicle: vehicleId,
      odometerReading: { $exists: true }
    })
    .sort({ date: 1 })
    .select('date odometerReading liters totalCost')
    .lean();

    let efficiencyData = [];
    for (let i = 1; i < fuelRecords.length; i++) {
      const current = fuelRecords[i];
      const previous = fuelRecords[i - 1];
      
      if (current.odometerReading > previous.odometerReading) {
        const distance = current.odometerReading - previous.odometerReading;
        efficiencyData.push({
          date: current.date,
          distance,
          liters: current.liters,
          kmPerLiter: (distance / current.liters).toFixed(2),
          costPerKm: (current.totalCost / distance).toFixed(2),
          fromOdometer: previous.odometerReading,
          toOdometer: current.odometerReading
        });
      }
    }

    // Average efficiency
    const avgEfficiency = efficiencyData.length > 0
      ? efficiencyData.reduce((sum, item) => sum + parseFloat(item.kmPerLiter), 0) / efficiencyData.length
      : 0;

    res.json({
      success: true,
      data: {
        vehicle: {
          plateNumber: vehicle.plateNumber,
          make: vehicle.make,
          model: vehicle.model,
          fuelType: vehicle.fuelType,
          currentOdometer: vehicle.currentOdometer
        },
        analytics: {
          summary: {
            totalRecords: overallStats.recordCount,
            totalCost: overallStats.totalCost,
            totalLiters: overallStats.totalLiters,
            averageCostPerLiter: overallStats.averageCostPerLiter,
            averageEfficiency: avgEfficiency.toFixed(2),
            periodStart: overallStats.firstRecord,
            periodEnd: overallStats.lastRecord
          },
          monthlyFuel,
          stationAnalytics,
          efficiency: {
            data: efficiencyData.slice(-10), // Last 10 efficiency records
            average: avgEfficiency.toFixed(2),
            best: efficiencyData.length > 0 
              ? Math.max(...efficiencyData.map(e => parseFloat(e.kmPerLiter))).toFixed(2)
              : 0,
            worst: efficiencyData.length > 0
              ? Math.min(...efficiencyData.map(e => parseFloat(e.kmPerLiter))).toFixed(2)
              : 0
          }
        }
      }
    });
  } catch (error) {
    console.error('❌ Get fuel analytics error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get fuel records needing verification
// @route   GET /api/fuel-records/unverified
// @access  Private (Admin only)
const getUnverifiedFuelRecords = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    const fuelRecords = await FuelRecord.find({ verified: false })
      .populate('vehicle', 'plateNumber make model')
      .populate('filledBy', 'name email')
      .sort({ date: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await FuelRecord.countDocuments({ verified: false });

    // Get unverified stats
    const unverifiedStats = await FuelRecord.aggregate([
      { $match: { verified: false } },
      {
        $group: {
          _id: null,
          totalCost: { $sum: '$totalCost' },
          totalLiters: { $sum: '$liters' },
          recordCount: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        fuelRecords,
        stats: unverifiedStats[0] || { totalCost: 0, totalLiters: 0, recordCount: 0 },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalRecords: total
        }
      }
    });
  } catch (error) {
    console.error('❌ Get unverified fuel records error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Bulk verify fuel records
// @route   POST /api/fuel-records/bulk-verify
// @access  Private (Admin only)
const bulkVerifyFuelRecords = async (req, res) => {
  try {
    const { recordIds } = req.body;

    if (!recordIds || !Array.isArray(recordIds) || recordIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Record IDs array is required'
      });
    }

    const result = await FuelRecord.updateMany(
      { 
        _id: { $in: recordIds },
        verified: false 
      },
      { 
        verified: true, 
        verifiedBy: req.user.id,
        verificationDate: new Date(),
        lastUpdatedBy: req.user.id
      }
    );

    const verifiedRecords = await FuelRecord.find({ _id: { $in: recordIds } })
      .populate('vehicle', 'plateNumber make model')
      .populate('verifiedBy', 'name email');

    res.json({
      success: true,
      message: `${result.modifiedCount} fuel records verified successfully`,
      data: {
        verifiedCount: result.modifiedCount,
        records: verifiedRecords
      }
    });
  } catch (error) {
    console.error('❌ Bulk verify fuel records error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = {
  getFuelRecords,
  getFuelRecord,
  createFuelRecord,
  updateFuelRecord,
  deleteFuelRecord,
  verifyFuelRecord,
  getFuelAnalytics,
  getUnverifiedFuelRecords,
  bulkVerifyFuelRecords
};