const mongoose = require('mongoose');

const maintenanceRecordSchema = new mongoose.Schema({
  // Vehicle Reference
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle reference is required']
  },
  
  // Maintenance Details
  date: {
    type: Date,
    required: [true, 'Maintenance date is required'],
    default: Date.now
  },
  type: {
    type: String,
    required: [true, 'Maintenance type is required'],
    enum: [
      'routine_service', 
      'oil_change', 
      'tire_replacement',
      'brake_repair',
      'engine_repair', 
      'transmission',
      'electrical',
      'body_work',
      'accident_repair',
      'battery_replacement',
      'air_conditioning',
      'inspection',
      'other'
    ],
    default: 'routine_service'
  },
  
  // Service Details
  description: {
    type: String,
    required: [true, 'Maintenance description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  cost: {
    type: Number,
    required: [true, 'Maintenance cost is required'],
    min: [0, 'Cost cannot be negative']
  },
  
  // Garage/Service Provider
  garage: {
    name: {
      type: String,
      required: [true, 'Garage/service provider name is required'],
      trim: true
    },
    contact: {
      phone: String,
      email: String,
      person: String
    },
    address: String
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  
  // Odometer Tracking
  odometerReading: {
    type: Number,
    required: [true, 'Odometer reading is required'],
    min: [0, 'Odometer cannot be negative']
  },
  
  // Parts Replaced (Array for multiple parts)
  partsReplaced: [{
    name: {
      type: String,
      required: true,
      trim: true
    },
    partNumber: String,
    quantity: {
      type: Number,
      default: 1,
      min: 1
    },
    unitCost: {
      type: Number,
      min: 0
    },
    totalCost: {
      type: Number,
      min: 0
    }
  }],
  
  // Next Service Information
  nextServiceDate: {
    type: Date
  },
  nextServiceOdometer: {
    type: Number,
    min: [0, 'Odometer cannot be negative']
  },
  serviceInterval: {
    type: Number,
    default: 5000, // km
    min: [100, 'Service interval must be at least 100 km']
  },
  
  // Approval & Verification
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Changed from Staff to User (admin)
    required: [true, 'Approving user is required']
  },
  verified: {
    type: Boolean,
    default: false
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' // Changed from Staff to User
  },
  verificationDate: {
    type: Date
  },
  
  // Status Tracking
  status: {
    type: String,
    enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
    default: 'scheduled'
  },
  completionDate: {
    type: Date
  },
  
  // Additional Information
  warranty: {
    hasWarranty: { type: Boolean, default: false },
    warrantyPeriod: Number, // in months
    warrantyExpiryDate: Date,
    warrantyDetails: String
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // Documents
  documents: [{
    name: String,
    fileUrl: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true
});

// Indexes for performance
maintenanceRecordSchema.index({ vehicle: 1, date: -1 });
maintenanceRecordSchema.index({ type: 1 });
maintenanceRecordSchema.index({ status: 1 });
maintenanceRecordSchema.index({ 'garage.name': 1 });
maintenanceRecordSchema.index({ nextServiceDate: 1 });
maintenanceRecordSchema.index({ approvedBy: 1 });

// Pre-save middleware
maintenanceRecordSchema.pre('save', function(next) {
  try {
    // Calculate total cost for parts if not provided
    if (this.partsReplaced && this.partsReplaced.length > 0) {
      this.partsReplaced.forEach(part => {
        if (part.quantity && part.unitCost && !part.totalCost) {
          part.totalCost = part.quantity * part.unitCost;
        }
      });
    }
    
    // Set completion date if status is completed
    if (this.status === 'completed' && !this.completionDate) {
      this.completionDate = new Date();
    }
    
    // Calculate next service odometer if not provided
    if (this.odometerReading && this.serviceInterval && !this.nextServiceOdometer) {
      this.nextServiceOdometer = this.odometerReading + this.serviceInterval;
    }
    
    // Calculate next service date if not provided (default 6 months from completion)
    if (this.status === 'completed' && !this.nextServiceDate) {
      const nextDate = new Date();
      nextDate.setMonth(nextDate.getMonth() + 6);
      this.nextServiceDate = nextDate;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for total parts cost
maintenanceRecordSchema.virtual('totalPartsCost').get(function() {
  if (!this.partsReplaced || this.partsReplaced.length === 0) return 0;
  return this.partsReplaced.reduce((total, part) => total + (part.totalCost || 0), 0);
});

// Virtual for labor cost (total cost - parts cost)
maintenanceRecordSchema.virtual('laborCost').get(function() {
  return this.cost - this.totalPartsCost;
});

// Virtual for days since maintenance
maintenanceRecordSchema.virtual('daysSinceMaintenance').get(function() {
  if (!this.completionDate && !this.date) return null;
  const maintenanceDate = this.completionDate || this.date;
  const today = new Date();
  const diffTime = Math.abs(today - new Date(maintenanceDate));
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
});

// Virtual for isOverdue check
maintenanceRecordSchema.virtual('isOverdue').get(function() {
  if (this.status === 'completed') return false;
  if (this.nextServiceDate && new Date() > this.nextServiceDate) return true;
  return false;
});

// Static method to get maintenance statistics for a vehicle
maintenanceRecordSchema.statics.getMaintenanceStats = async function(vehicleId, startDate, endDate) {
  const matchStage = { vehicle: vehicleId, status: 'completed' };
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) matchStage.date.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: matchStage },
    { 
      $group: { 
        _id: null, 
        totalCost: { $sum: '$cost' },
        averageCost: { $avg: '$cost' },
        recordCount: { $sum: 1 },
        types: { $addToSet: '$type' }
      }
    }
  ]);
};

// Static method to get maintenance by type
maintenanceRecordSchema.statics.getMaintenanceByType = async function(vehicleId, year) {
  return this.aggregate([
    { 
      $match: { 
        vehicle: vehicleId,
        status: 'completed',
        date: { 
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: '$type',
        totalCost: { $sum: '$cost' },
        recordCount: { $sum: 1 },
        averageCost: { $avg: '$cost' }
      }
    },
    { $sort: { totalCost: -1 } }
  ]);
};

// Static method to get overdue maintenance
maintenanceRecordSchema.statics.getOverdueMaintenance = async function() {
  const vehicles = await mongoose.model('Vehicle').find({
    $or: [
      { nextServiceDate: { $lte: new Date() } },
      { currentOdometer: { $gte: '$nextServiceOdometer' } }
    ]
  }).select('_id plateNumber make model');

  const vehicleIds = vehicles.map(v => v._id);

  return this.find({
    vehicle: { $in: vehicleIds },
    status: { $nin: ['completed', 'cancelled'] }
  })
  .populate('vehicle', 'plateNumber make model currentOdometer nextServiceOdometer')
  .populate('approvedBy', 'name email')
  .sort({ date: -1 });
};

// Method to schedule next service
maintenanceRecordSchema.methods.scheduleNextService = function() {
  if (this.nextServiceDate || this.nextServiceOdometer) {
    return {
      nextServiceDate: this.nextServiceDate,
      nextServiceOdometer: this.nextServiceOdometer,
      serviceInterval: this.serviceInterval
    };
  }
  return null;
};

// Remove auto-populate - use explicit population
// maintenanceRecordSchema.pre('find', function() {
//   this.populate('vehicle', 'plateNumber make model currentOdometer')
//       .populate('approvedBy', 'name')
//       .populate('verifiedBy', 'name');
// });

// Ensure virtual fields are serialized
maintenanceRecordSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

maintenanceRecordSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model('MaintenanceRecord', maintenanceRecordSchema);