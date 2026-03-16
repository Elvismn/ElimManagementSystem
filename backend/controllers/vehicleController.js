const Vehicle = require('../models/Vehicle');
const Staff = require('../models/Staff');

// @desc    Get all vehicles with pagination and filtering
// @route   GET /api/vehicles
// @access  Private (Admin only)
const getVehicles = async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      vehicleType, 
      purpose,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (vehicleType) filter.vehicleType = vehicleType;
    if (purpose) filter.purpose = purpose;
    
    if (search) {
      filter.$or = [
        { plateNumber: { $regex: search, $options: 'i' } },
        { make: { $regex: search, $options: 'i' } },
        { model: { $regex: search, $options: 'i' } }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const vehicles = await Vehicle.find(filter)
      .populate('assignedDriver', 'firstName lastName phone email')
      .sort(sortConfig)
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit))
      .lean();

    const total = await Vehicle.countDocuments(filter);

    // Get summary statistics
    const stats = await Vehicle.aggregate([
      {
        $group: {
          _id: null,
          totalVehicles: { $sum: 1 },
          activeVehicles: { 
            $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
          },
          inMaintenance: { 
            $sum: { $cond: [{ $eq: ['$status', 'maintenance'] }, 1, 0] } 
          },
          totalValue: { $sum: '$currentValue' },
          averageAge: { $avg: { $subtract: [new Date().getFullYear(), '$year'] } }
        }
      }
    ]);

    // Get vehicles needing service
    const vehiclesNeedingService = await Vehicle.find({
      $or: [
        { currentOdometer: { $gte: '$nextServiceOdometer' } },
        { nextServiceDate: { $lte: new Date() } }
      ],
      status: 'active'
    }).countDocuments();

    res.json({
      success: true,
      data: {
        vehicles,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          totalVehicles: total,
          hasNext: parseInt(page) < Math.ceil(total / parseInt(limit)),
          hasPrev: parseInt(page) > 1
        },
        stats: {
          ...(stats[0] || {
            totalVehicles: 0,
            activeVehicles: 0,
            inMaintenance: 0,
            totalValue: 0,
            averageAge: 0
          }),
          vehiclesNeedingService
        }
      }
    });
  } catch (error) {
    console.error('❌ Get vehicles error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get single vehicle with detailed information
// @route   GET /api/vehicles/:id
// @access  Private (Admin only)
const getVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findById(id)
      .populate('assignedDriver', 'firstName lastName phone email employeeId')
      .populate('createdBy', 'name email')
      .populate('lastUpdatedBy', 'name email')
      .lean();

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    // Get fuel records (if FuelRecord model exists)
    let fuelStats = { totalFuelCost: 0, averageFuelEfficiency: 0 };
    let recentFuel = [];
    
    try {
      const FuelRecord = require('../models/FuelRecord');
      recentFuel = await FuelRecord.find({ vehicle: id })
        .sort({ date: -1 })
        .limit(5)
        .lean();
      
      const fuelAggregation = await FuelRecord.aggregate([
        { $match: { vehicle: vehicle._id } },
        { 
          $group: { 
            _id: null, 
            totalFuelCost: { $sum: '$totalCost' },
            totalLiters: { $sum: '$liters' },
            avgCostPerLiter: { $avg: '$costPerLiter' }
          } 
        }
      ]);
      
      if (fuelAggregation[0]) {
        fuelStats = fuelAggregation[0];
      }
    } catch (e) {
      // FuelRecord model not yet created
      console.log('FuelRecord model not available');
    }

    // Get maintenance records (if MaintenanceRecord model exists)
    let maintenanceStats = { totalMaintenanceCost: 0 };
    let recentMaintenance = [];
    
    try {
      const MaintenanceRecord = require('../models/MaintenanceRecord');
      recentMaintenance = await MaintenanceRecord.find({ vehicle: id })
        .sort({ date: -1 })
        .limit(5)
        .lean();
      
      const maintenanceAggregation = await MaintenanceRecord.aggregate([
        { $match: { vehicle: vehicle._id, status: 'completed' } },
        { $group: { _id: null, totalMaintenanceCost: { $sum: '$cost' } } }
      ]);
      
      if (maintenanceAggregation[0]) {
        maintenanceStats = maintenanceAggregation[0];
      }
    } catch (e) {
      // MaintenanceRecord model not yet created
      console.log('MaintenanceRecord model not available');
    }

    // Check service status
    const serviceDue = vehicle.isServiceDue();

    res.json({
      success: true,
      data: {
        vehicle,
        summary: {
          serviceDue,
          insuranceStatus: vehicle.insuranceStatus,
          registrationStatus: vehicle.registrationStatus,
          totalFuelCost: fuelStats.totalFuelCost || 0,
          totalMaintenanceCost: maintenanceStats.totalMaintenanceCost || 0
        },
        recentActivity: {
          fuel: recentFuel,
          maintenance: recentMaintenance
        }
      }
    });
  } catch (error) {
    console.error('❌ Get vehicle error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Create new vehicle
// @route   POST /api/vehicles
// @access  Private (Admin only)
const createVehicle = async (req, res) => {
  try {
    const vehicleData = req.body;

    // Check if plate number already exists
    const existingVehicle = await Vehicle.findOne({ 
      plateNumber: vehicleData.plateNumber.toUpperCase() 
    });
    
    if (existingVehicle) {
      return res.status(400).json({
        success: false,
        error: 'Vehicle with this plate number already exists'
      });
    }

    // Set current value if not provided (same as purchase price for new vehicles)
    if (!vehicleData.currentValue && vehicleData.purchasePrice) {
      vehicleData.currentValue = vehicleData.purchasePrice;
    }

    // Set next service odometer if not provided
    if (!vehicleData.nextServiceOdometer && vehicleData.currentOdometer) {
      vehicleData.nextServiceOdometer = vehicleData.currentOdometer + 5000;
    }

    // Add createdBy from authenticated user
    vehicleData.createdBy = req.user.id;

    const vehicle = await Vehicle.create(vehicleData);
    await vehicle.populate('assignedDriver', 'firstName lastName phone');

    res.status(201).json({
      success: true,
      message: 'Vehicle created successfully',
      data: { vehicle }
    });
  } catch (error) {
    console.error('❌ Create vehicle error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update vehicle
// @route   PUT /api/vehicles/:id
// @access  Private (Admin only)
const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // If plate number is being updated, check for duplicates
    if (updateData.plateNumber) {
      const existingVehicle = await Vehicle.findOne({
        plateNumber: updateData.plateNumber.toUpperCase(),
        _id: { $ne: id }
      });
      
      if (existingVehicle) {
        return res.status(400).json({
          success: false,
          error: 'Another vehicle with this plate number already exists'
        });
      }
    }

    // Add lastUpdatedBy from authenticated user
    updateData.lastUpdatedBy = req.user.id;

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('assignedDriver', 'firstName lastName phone');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicle updated successfully',
      data: { vehicle }
    });
  } catch (error) {
    console.error('❌ Update vehicle error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Delete vehicle (soft delete by changing status)
// @route   DELETE /api/vehicles/:id
// @access  Private (Admin only)
const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { 
        status: 'retired',
        lastUpdatedBy: req.user.id 
      },
      { new: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      message: 'Vehicle marked as retired successfully',
      data: { vehicle }
    });
  } catch (error) {
    console.error('❌ Delete vehicle error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Update vehicle odometer
// @route   PATCH /api/vehicles/:id/odometer
// @access  Private (Admin only)
const updateOdometer = async (req, res) => {
  try {
    const { id } = req.params;
    const { odometer } = req.body;

    if (!odometer || odometer < 0) {
      return res.status(400).json({
        success: false,
        error: 'Valid odometer reading is required'
      });
    }

    const vehicle = await Vehicle.findById(id);
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    await vehicle.updateOdometer(odometer);

    res.json({
      success: true,
      message: 'Odometer updated successfully',
      data: { currentOdometer: vehicle.currentOdometer }
    });
  } catch (error) {
    console.error('❌ Update odometer error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Assign driver to vehicle
// @route   PATCH /api/vehicles/:id/assign-driver
// @access  Private (Admin only)
const assignDriver = async (req, res) => {
  try {
    const { id } = req.params;
    const { driverId } = req.body;

    // Check if driver exists
    if (driverId) {
      const driver = await Staff.findById(driverId);
      if (!driver) {
        return res.status(404).json({
          success: false,
          error: 'Driver not found'
        });
      }
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { 
        assignedDriver: driverId || null,
        lastUpdatedBy: req.user.id
      },
      { new: true }
    ).populate('assignedDriver', 'firstName lastName phone');

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        error: 'Vehicle not found'
      });
    }

    res.json({
      success: true,
      message: driverId ? 'Driver assigned successfully' : 'Driver unassigned successfully',
      data: { assignedDriver: vehicle.assignedDriver }
    });
  } catch (error) {
    console.error('❌ Assign driver error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get vehicles needing service
// @route   GET /api/vehicles/needing-service
// @access  Private (Admin only)
const getVehiclesNeedingService = async (req, res) => {
  try {
    const vehicles = await Vehicle.getServiceDueVehicles();

    res.json({
      success: true,
      data: {
        vehicles,
        count: vehicles.length
      }
    });
  } catch (error) {
    console.error('❌ Get vehicles needing service error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// @desc    Get vehicles with expiring documents
// @route   GET /api/vehicles/expiring-documents
// @access  Private (Admin only)
const getExpiringDocuments = async (req, res) => {
  try {
    const { days = 30 } = req.query;
    
    const vehicles = await Vehicle.getExpiringDocuments(parseInt(days));

    // Format response
    const expiring = {
      insurance: [],
      registration: []
    };

    vehicles.forEach(vehicle => {
      if (vehicle.insurance?.expiryDate) {
        const daysToExpiry = Math.ceil((new Date(vehicle.insurance.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= parseInt(days)) {
          expiring.insurance.push({
            vehicle: `${vehicle.plateNumber} - ${vehicle.make} ${vehicle.model}`,
            expiryDate: vehicle.insurance.expiryDate,
            daysToExpiry
          });
        }
      }
      
      if (vehicle.registration?.expiryDate) {
        const daysToExpiry = Math.ceil((new Date(vehicle.registration.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        if (daysToExpiry <= parseInt(days)) {
          expiring.registration.push({
            vehicle: `${vehicle.plateNumber} - ${vehicle.make} ${vehicle.model}`,
            expiryDate: vehicle.registration.expiryDate,
            daysToExpiry
          });
        }
      }
    });

    res.json({
      success: true,
      data: {
        expiring,
        totalCount: expiring.insurance.length + expiring.registration.length
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

module.exports = {
  getVehicles,
  getVehicle,
  createVehicle,
  updateVehicle,
  deleteVehicle,
  updateOdometer,
  assignDriver,
  getVehiclesNeedingService,
  getExpiringDocuments
};