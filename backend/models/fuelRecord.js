const mongoose = require('mongoose');

const fuelRecordSchema = new mongoose.Schema({
  // Vehicle Reference
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle reference is required']
  },
  
  // Fuel Transaction Details
  date: {
    type: Date,
    required: [true, 'Fueling date is required'],
    default: Date.now
  },
  liters: {
    type: Number,
    required: [true, 'Fuel quantity in liters is required'],
    min: [0.1, 'Fuel quantity must be at least 0.1 liters']
  },
  costPerLiter: {
    type: Number,
    required: [true, 'Cost per liter is required'],
    min: [0, 'Cost cannot be negative']
  },
  totalCost: {
    type: Number,
    required: [true, 'Total cost is required'],
    min: [0, 'Total cost cannot be negative']
  },
  currency: {
    type: String,
    default: 'KES'
  },
  
  // Odometer Tracking
  odometerReading: {
    type: Number,
    required: [true, 'Odometer reading is required'],
    min: [0, 'Odometer cannot be negative']
  },
  
  // Station & Receipt Details
  station: {
    name: {
      type: String,
      required: [true, 'Fuel station name is required'],
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    contact: String
  },
  receiptNumber: {
    type: String,
    trim: true
  },
  
  // Filled By Information
  filledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Changed from Staff to User
    required: [true, 'Person who filled fuel is required']
  },
  
  // Additional Details
  fuelType: {
    type: String,
    enum: ['petrol', 'diesel', 'premium', 'other'],
    required: [true, 'Fuel type is required']
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'fleet_card', 'credit', 'other'],
    default: 'cash'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  
  // Verification Fields
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
fuelRecordSchema.index({ vehicle: 1, date: -1 });
fuelRecordSchema.index({ date: -1 });
fuelRecordSchema.index({ filledBy: 1 });
fuelRecordSchema.index({ 'station.name': 1 });
fuelRecordSchema.index({ verified: 1 });

// Pre-save middleware
fuelRecordSchema.pre('save', function(next) {
  try {
    // Calculate total cost if not provided
    if (this.liters && this.costPerLiter && !this.totalCost) {
      this.totalCost = this.liters * this.costPerLiter;
    }
    
    // Round to 2 decimal places
    if (this.totalCost) {
      this.totalCost = Math.round(this.totalCost * 100) / 100;
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Virtual for fuel efficiency (to be populated in controller)
fuelRecordSchema.virtual('fuelEfficiency').get(function() {
  return null; // Calculated in controller with previous record
});

// Virtual for cost per km
fuelRecordSchema.virtual('costPerKm').get(function() {
  return null; // Calculated in controller
});

// Static method to get total fuel cost for a vehicle
fuelRecordSchema.statics.getTotalFuelCost = async function(vehicleId, startDate, endDate) {
  const matchStage = { vehicle: vehicleId };
  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) matchStage.date.$gte = new Date(startDate);
    if (endDate) matchStage.date.$lte = new Date(endDate);
  }

  const result = await this.aggregate([
    { $match: matchStage },
    { 
      $group: { 
        _id: null, 
        totalCost: { $sum: '$totalCost' },
        totalLiters: { $sum: '$liters' },
        averageCostPerLiter: { $avg: '$costPerLiter' },
        recordCount: { $sum: 1 },
        firstRecord: { $min: '$date' },
        lastRecord: { $max: '$date' }
      }
    }
  ]);
  
  return result[0] || { 
    totalCost: 0, 
    totalLiters: 0, 
    averageCostPerLiter: 0, 
    recordCount: 0 
  };
};

// Static method to get monthly fuel consumption
fuelRecordSchema.statics.getMonthlyFuelStats = async function(vehicleId, year) {
  return this.aggregate([
    { 
      $match: { 
        vehicle: vehicleId,
        date: { 
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },
    {
      $group: {
        _id: { month: { $month: '$date' } },
        totalCost: { $sum: '$totalCost' },
        totalLiters: { $sum: '$liters' },
        averageCostPerLiter: { $avg: '$costPerLiter' },
        recordCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.month': 1 } }
  ]);
};

// Static method to get fuel consumption by station
fuelRecordSchema.statics.getStationStats = async function(vehicleId) {
  return this.aggregate([
    { $match: { vehicle: vehicleId } },
    {
      $group: {
        _id: '$station.name',
        totalCost: { $sum: '$totalCost' },
        totalLiters: { $sum: '$liters' },
        averageCostPerLiter: { $avg: '$costPerLiter' },
        recordCount: { $sum: 1 },
        lastVisit: { $max: '$date' }
      }
    },
    { $sort: { totalCost: -1 } }
  ]);
};

// Method to verify a fuel record
fuelRecordSchema.methods.verify = async function(verifiedByUserId) {
  this.verified = true;
  this.verifiedBy = verifiedByUserId;
  this.verificationDate = new Date();
  return this.save();
};

// Remove auto-populate
// fuelRecordSchema.pre('find', function() {
//   this.populate('vehicle', 'plateNumber make model')
//       .populate('filledBy', 'name')
//       .populate('verifiedBy', 'name');
// });

// Ensure virtual fields are serialized
fuelRecordSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

fuelRecordSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model('FuelRecord', fuelRecordSchema);