const mongoose = require("mongoose");

const departmentSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: [true, "Department name is required"],
    unique: true,
    trim: true
  },
  code: {
    type: String,
    required: [true, "Department code is required"],
    unique: true,
    uppercase: true,
    trim: true
  },
  headOfDepartment: { 
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff"
  },
  description: { 
    type: String,
    trim: true
  },
  contactEmail: {
    type: String,
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  contactPhone: {
    type: String,
    trim: true
  },
  location: {
    building: String,
    floor: String,
    roomNumbers: [String]
  },
  budget: {
    allocated: { type: Number, default: 0 },
    spent: { type: Number, default: 0 },
    currency: { type: String, default: "KES" },
    fiscalYear: String
  },
  establishedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ["Active", "Inactive", "Under Review"],
    default: "Active"
  },
  programs: [{
    name: String,
    description: String,
    duration: String,
    coordinator: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }
  }],
  
  // For academic departments
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject"
  }],
  
  // For administrative departments
  services: [{
    name: String,
    description: String,
    contactPerson: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" }
  }],
  
  // Documents
  documents: [{
    name: String,
    type: { type: String, enum: ["Policy", "Report", "Budget", "Other"] },
    url: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff"
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff"
  }
  
}, { 
  timestamps: true 
});

// Virtual for numberOfStaff
departmentSchema.virtual('staffCount').get(async function() {
  const count = await mongoose.model('Staff').countDocuments({ department: this._id });
  return count;
});

// Virtual for activeStaff
departmentSchema.virtual('activeStaffCount').get(async function() {
  const count = await mongoose.model('Staff').countDocuments({ 
    department: this._id,
    status: "Active" 
  });
  return count;
});

// Virtual for budget utilization
departmentSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget.allocated) return 0;
  return (this.budget.spent / this.budget.allocated) * 100;
});

// Methods
departmentSchema.methods.addStaff = async function(staffId) {
  // This is just a helper - actual association happens in Staff model
  const Staff = mongoose.model('Staff');
  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { department: this._id },
    { new: true }
  );
  return staff;
};

departmentSchema.methods.removeStaff = async function(staffId) {
  const Staff = mongoose.model('Staff');
  const staff = await Staff.findByIdAndUpdate(
    staffId,
    { $unset: { department: 1 } },
    { new: true }
  );
  return staff;
};

// Static method to get department summary
departmentSchema.statics.getSummary = async function() {
  const summary = await this.aggregate([
    { $group: {
      _id: null,
      totalDepartments: { $sum: 1 },
      activeDepartments: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
      totalBudget: { $sum: "$budget.allocated" },
      totalSpent: { $sum: "$budget.spent" }
    }}
  ]);
  
  return summary[0] || { totalDepartments: 0, activeDepartments: 0, totalBudget: 0, totalSpent: 0 };
};

// Indexes
departmentSchema.index({ name: 1 });
departmentSchema.index({ code: 1 });
departmentSchema.index({ status: 1 });
departmentSchema.index({ headOfDepartment: 1 });

// Remove auto-populate - use explicit population instead
// departmentSchema.pre('find', function() {
//   this.populate('headOfDepartment');
// });

// JSON configuration
departmentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

departmentSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model("Department", departmentSchema);