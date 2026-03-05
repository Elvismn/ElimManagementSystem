const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
  // Basic Identification
  plateNumber: {
    type: String,
    required: [true, 'Plate number is required'],
    unique: true,
    uppercase: true,
    trim: true
  },
  make: {
    type: String,
    required: [true, 'Vehicle make is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Vehicle model is required'],
    trim: true
  },
  year: {
    type: Number,
    required: [true, 'Manufacture year is required'],
    min: [1990, 'Year must be 1990 or later'],
    max: [new Date().getFullYear() + 1, 'Year cannot be in the future']
  },
  
  // Vehicle Specifications
  vehicleType: {
    type: String,
    required: true,
    enum: ['bus', 'van', 'sedan', 'truck', 'minibus', 'other'],
    default: 'bus'
  },
  color: {
    type: String,
    trim: true
  },
  capacity: {
    type: Number,
    required: [true, 'Passenger capacity is required'],
    min: [1, 'Capacity must be at least 1']
  },
  fuelType: {
    type: String,
    required: true,
    enum: ['petrol', 'diesel', 'electric', 'hybrid', 'cng'],
    default: 'diesel'
  },
  fuelTankCapacity: {
    type: Number,
    required: [true, 'Fuel tank capacity is required'],
    min: [1, 'Fuel capacity must be at least 1 liter']
  },
  
  // Financial Information
  purchaseDate: {
    type: Date,
    required: [true, 'Purchase date is required']
  },
  purchasePrice: {
    type: Number,
    required: [true, 'Purchase price is required'],
    min: [0, 'Purchase price cannot be negative']
  },
  currentValue: {
    type: Number,
    min: [0, 'Current value cannot be negative']
  },
  insurance: {
    provider: String,
    policyNumber: String,
    startDate: Date,
    expiryDate: Date,
    coverage: String,
    premium: Number
  },
  
  // Registration Details
  registration: {
    number: String,
    expiryDate: Date,
    issuingAuthority: String
  },
  
  // Operational Status
  status: {
    type: String,
    enum: ['active', 'maintenance', 'accident', 'retired', 'sold', 'reserved'],
    default: 'active'
  },
  
  // Mileage Tracking
  currentOdometer: {
    type: Number,
    default: 0,
    min: [0, 'Odometer cannot be negative']
  },
  lastServiceOdometer: {
    type: Number,
    default: 0
  },
  nextServiceOdometer: {
    type: Number,
    default: 5000 // Default 5000 km service interval
  },
  lastServiceDate: {
    type: Date
  },
  nextServiceDate: {
    type: Date
  },
  
  // School Assignment
  purpose: {
    type: String,
    enum: ['student_transport', 'staff_transport', 'goods_transport', 'multi_purpose', 'emergency'],
    default: 'student_transport'
  },
  assignedDriver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  assignedRoute: {
    type: String,
    trim: true
  },
  
  // Location Tracking
  currentLocation: {
    lat: Number,
    lng: Number,
    address: String,
    lastUpdated: Date
  },
  
  // Documents
  documents: [{
    name: String,
    type: { 
      type: String, 
      enum: ['insurance', 'registration', 'inspection', 'permit', 'other'],
      default: 'other'
    },
    fileUrl: String,
    issueDate: Date,
    expiryDate: Date,
    notes: String
  }],
  
  // Additional Information
  notes: {
    type: String,
    trim: true
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

// Indexes for better query performance
vehicleSchema.index({ plateNumber: 1 });
vehicleSchema.index({ status: 1 });
vehicleSchema.index({ vehicleType: 1 });
vehicleSchema.index({ assignedDriver: 1 });
vehicleSchema.index({ 'insurance.expiryDate': 1 });
vehicleSchema.index({ 'registration.expiryDate': 1 });

// Virtuals
vehicleSchema.virtual('age').get(function() {
  return new Date().getFullYear() - this.year;
});

vehicleSchema.virtual('depreciation').get(function() {
  if (!this.purchasePrice || !this.currentValue) return 0;
  return this.purchasePrice - this.currentValue;
});

vehicleSchema.virtual('depreciationPercentage').get(function() {
  if (!this.purchasePrice || !this.currentValue || this.purchasePrice === 0) return 0;
  return ((this.purchasePrice - this.currentValue) / this.purchasePrice * 100).toFixed(2);
});

vehicleSchema.virtual('insuranceStatus').get(function() {
  if (!this.insurance?.expiryDate) return 'unknown';
  const today = new Date();
  const expiry = new Date(this.insurance.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
});

vehicleSchema.virtual('registrationStatus').get(function() {
  if (!this.registration?.expiryDate) return 'unknown';
  const today = new Date();
  const expiry = new Date(this.registration.expiryDate);
  const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiry < 0) return 'expired';
  if (daysUntilExpiry <= 30) return 'expiring_soon';
  return 'valid';
});

// Methods
vehicleSchema.methods.isServiceDue = function() {
  // Check by odometer
  if (this.currentOdometer >= this.nextServiceOdometer) return true;
  
  // Check by date
  if (this.nextServiceDate && new Date() >= this.nextServiceDate) return true;
  
  return false;
};

vehicleSchema.methods.updateOdometer = function(newReading) {
  if (newReading < this.currentOdometer) {
    throw new Error('New odometer reading cannot be less than current reading');
  }
  this.currentOdometer = newReading;
  return this.save();
};

vehicleSchema.methods.calculateFuelEfficiency = function(liters, distance) {
  if (distance === 0) return 0;
  return (liters / distance) * 100; // liters per 100km
};

// Static methods
vehicleSchema.statics.getServiceDueVehicles = async function() {
  return this.find({
    $or: [
      { currentOdometer: { $gte: '$nextServiceOdometer' } },
      { nextServiceDate: { $lte: new Date() } }
    ],
    status: 'active'
  }).populate('assignedDriver', 'firstName lastName phone');
};

vehicleSchema.statics.getExpiringDocuments = async function(days = 30) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  
  return this.find({
    $or: [
      { 'insurance.expiryDate': { $lte: date } },
      { 'registration.expiryDate': { $lte: date } }
    ]
  }).select('plateNumber make model insurance registration');
};

// Remove auto-populate - use explicit population instead
// vehicleSchema.pre('find', function() {
//   this.populate('assignedDriver', 'firstName lastName phone');
// });

// Ensure virtual fields are serialized
vehicleSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

vehicleSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model('Vehicle', vehicleSchema);