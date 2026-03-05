const mongoose = require("mongoose");

const parentSchema = new mongoose.Schema({
  // Personal Information
  firstName: { 
    type: String, 
    required: [true, "First name is required"],
    trim: true
  },
  lastName: { 
    type: String, 
    required: [true, "Last name is required"],
    trim: true
  },
  email: { 
    type: String, 
    required: [true, "Email is required"],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  phone: { 
    type: String, 
    required: [true, "Phone number is required"],
    trim: true
  },
  alternativePhone: { 
    type: String, 
    trim: true
  },
  
  // Professional Information
  occupation: {
    type: String,
    trim: true
  },
  employer: {
    type: String,
    trim: true
  },
  
  // Relationship to students
  relationship: {
    type: String,
    enum: ["Father", "Mother", "Guardian", "Grandparent", "Other"],
    required: [true, "Relationship is required"]
  },
  
  // Children/Students linked to this parent
  children: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student"
  }],
  
  // Address
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: "Kenya" }
  },
  
  // Emergency Contact (if different from parent)
  emergencyContact: {
    name: { type: String, trim: true },
    relationship: { type: String, trim: true },
    phone: { type: String, trim: true },
    alternativePhone: { type: String, trim: true }
  },
  
  // Communication Preferences
  communicationPreferences: {
    email: { type: Boolean, default: true },
    sms: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    phoneCalls: { type: Boolean, default: true }
  },
  
  // Additional Information
  notes: {
    type: String,
    trim: true
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  // ID/Passport
  identification: {
    type: { 
      type: String, 
      enum: ["National ID", "Passport", "Alien ID", "Other"],
    },
    number: String,
    issuedDate: Date,
    expiryDate: Date
  }
  
}, { 
  timestamps: true 
});

// Virtual for full name
parentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for number of children
parentSchema.virtual('childrenCount').get(function() {
  return this.children ? this.children.length : 0;
});

// Indexes for better query performance
parentSchema.index({ email: 1 });
parentSchema.index({ phone: 1 });
parentSchema.index({ firstName: 1, lastName: 1 });
parentSchema.index({ isActive: 1 });

// JSON configuration
parentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

parentSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model("Parent", parentSchema);