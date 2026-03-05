const mongoose = require('mongoose');

const vehicleDocumentSchema = new mongoose.Schema({
  // Vehicle Reference
  vehicle: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicle',
    required: [true, 'Vehicle reference is required']
  },
  
  // Document Identification
  documentType: {
    type: String,
    required: [true, 'Document type is required'],
    enum: [
      'insurance',
      'inspection_certificate', 
      'registration',
      'fitness_certificate',
      'road_license',
      'emission_test',
      'purchase_documents',
      'warranty',
      'service_manual',
      'other'
    ],
    default: 'insurance'
  },
  
  // Document Details
  title: {
    type: String,
    required: [true, 'Document title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  documentNumber: {
    type: String,
    required: [true, 'Document number is required'],
    trim: true
  },
  
  // Validity Period
  issueDate: {
    type: Date,
    required: [true, 'Issue date is required']
  },
  expiryDate: {
    type: Date,
    required: [true, 'Expiry date is required']
  },
  
  // Provider/Issuer Information
  provider: {
    name: {
      type: String,
      required: [true, 'Document provider is required'],
      trim: true
    },
    contact: {
      phone: String,
      email: String,
      person: String
    },
    address: String
  },
  
  // File Storage
  fileUrl: {
    type: String,
    trim: true
  },
  fileName: {
    type: String,
    trim: true
  },
  fileSize: {
    type: Number,
    min: 0
  },
  
  // Financial Information (for insurance, etc.)
  premium: {
    type: Number,
    min: [0, 'Premium cannot be negative']
  },
  coverage: {
    type: String,
    trim: true
  },
  currency: {
    type: String,
    default: 'KES'
  },
  
  // Status & Tracking
  status: {
    type: String,
    enum: ['active', 'expired', 'renewed', 'cancelled', 'pending'],
    default: 'active'
  },
  
  // Renewal Information
  renewalReminder: {
    type: Boolean,
    default: true
  },
  reminderDays: {
    type: Number,
    default: 30, // Days before expiry to send reminder
    min: [1, 'Reminder days must be at least 1'],
    max: [365, 'Reminder days cannot exceed 365']
  },
  lastReminderSent: {
    type: Date
  },
  
  // Verification
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
  
  // Additional Information
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    trim: true
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
vehicleDocumentSchema.index({ vehicle: 1, documentType: 1 });
vehicleDocumentSchema.index({ expiryDate: 1 });
vehicleDocumentSchema.index({ status: 1 });
vehicleDocumentSchema.index({ documentNumber: 1 });
vehicleDocumentSchema.index({ 'provider.name': 1 });

// Virtual for days until expiry
vehicleDocumentSchema.virtual('daysUntilExpiry').get(function() {
  if (!this.expiryDate) return null;
  const today = new Date();
  const expiry = new Date(this.expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for expiry status
vehicleDocumentSchema.virtual('expiryStatus').get(function() {
  const days = this.daysUntilExpiry;
  if (days === null) return 'unknown';
  if (days < 0) return 'expired';
  if (days <= 7) return 'critical';
  if (days <= 30) return 'warning';
  return 'valid';
});

// Virtual for requires renewal
vehicleDocumentSchema.virtual('requiresRenewal').get(function() {
  return this.daysUntilExpiry <= this.reminderDays;
});

// Pre-save middleware
vehicleDocumentSchema.pre('save', function(next) {
  try {
    if (this.expiryDate) {
      const today = new Date();
      if (new Date(this.expiryDate) < today && this.status !== 'renewed' && this.status !== 'expired') {
        this.status = 'expired';
      }
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Static method to find expiring documents
vehicleDocumentSchema.statics.getExpiringDocuments = function(days = 30) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);

  return this.find({
    expiryDate: { $lte: targetDate, $gte: new Date() },
    status: 'active'
  }).populate('vehicle', 'plateNumber make model');
};

// Static method to get expired documents
vehicleDocumentSchema.statics.getExpiredDocuments = function() {
  return this.find({
    expiryDate: { $lt: new Date() },
    status: { $in: ['active', 'pending'] }
  }).populate('vehicle', 'plateNumber make model');
};

// Static method to get document statistics
vehicleDocumentSchema.statics.getDocumentStats = function(vehicleId = null) {
  const matchStage = vehicleId ? { vehicle: vehicleId } : {};

  return this.aggregate([
    { $match: matchStage },
    { 
      $group: { 
        _id: '$documentType',
        count: { $sum: 1 },
        activeCount: { 
          $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } 
        },
        expiredCount: { 
          $sum: { 
            $cond: [{ $lt: ['$expiryDate', new Date()] }, 1, 0] 
          } 
        },
        expiringCount: {
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
        }
      }
    },
    { $sort: { count: -1 } }
  ]);
};

// Method to renew document
vehicleDocumentSchema.methods.renewDocument = function(newExpiryDate, newDocumentNumber = null, newPremium = null) {
  // Store old data for history tracking
  const oldData = {
    documentNumber: this.documentNumber,
    expiryDate: this.expiryDate,
    premium: this.premium,
    status: this.status
  };
  
  // Update current document
  if (newDocumentNumber) {
    this.documentNumber = newDocumentNumber;
  }
  if (newPremium) {
    this.premium = newPremium;
  }
  this.expiryDate = newExpiryDate;
  this.status = 'active';
  this.verified = false;
  this.verifiedBy = null;
  this.verificationDate = null;
  
  return oldData; // Return the old data for historical tracking
};

// Method to check if reminder should be sent
vehicleDocumentSchema.methods.shouldSendReminder = function() {
  if (!this.renewalReminder) return false;
  if (this.status !== 'active') return false;
  if (this.daysUntilExpiry <= 0) return false;
  if (this.daysUntilExpiry > this.reminderDays) return false;
  
  // Check if reminder was already sent recently (within last 7 days)
  if (this.lastReminderSent) {
    const daysSinceLastReminder = Math.ceil((new Date() - this.lastReminderSent) / (1000 * 60 * 60 * 24));
    if (daysSinceLastReminder < 7) return false;
  }
  
  return true;
};

// Remove auto-populate
// vehicleDocumentSchema.pre('find', function() {
//   this.populate('vehicle', 'plateNumber make model')
//       .populate('verifiedBy', 'name');
// });

// Ensure virtual fields are serialized
vehicleDocumentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

vehicleDocumentSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model('VehicleDocument', vehicleDocumentSchema);