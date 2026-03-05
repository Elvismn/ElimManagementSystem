const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
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
  employeeId: {
    type: String,
    unique: true,
    required: [true, "Employee ID is required"],
    trim: true
  },
  position: {
    type: String,
    required: [true, "Position is required"],
    trim: true
  },
  jobTitle: {
    type: String,
    trim: true
  },
  department: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Department",
    required: [true, "Department is required"]
  },
  
  // Employment Details
  employmentType: {
    type: String,
    enum: ["Full-time", "Part-time", "Contract", "Intern", "Temporary"],
    default: "Full-time"
  },
  hireDate: {
    type: Date,
    required: [true, "Hire date is required"],
    default: Date.now
  },
  contractEndDate: {
    type: Date
  },
  
  // Compensation
  salary: {
    amount: { type: Number },
    currency: { type: String, default: "KES" },
    paymentFrequency: { 
      type: String, 
      enum: ["Monthly", "Bi-weekly", "Weekly"], 
      default: "Monthly" 
    },
    bankDetails: {
      bankName: String,
      accountName: String,
      accountNumber: String,
      branchCode: String
    }
  },
  
  // Qualifications & Skills
  qualifications: [{
    degree: { type: String, required: true },
    institution: { type: String, required: true },
    yearCompleted: { type: Number },
    grade: String,
    certificate: String // URL to certificate file
  }],
  
  certifications: [{
    name: { type: String, required: true },
    issuingOrganization: { type: String, required: true },
    issueDate: Date,
    expiryDate: Date,
    certificateId: String,
    certificateFile: String // URL to certificate file
  }],
  
  subjects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Subject" // Assuming you have a Subject model
  }],
  
  skills: [String],
  
  // Emergency Contact
  emergencyContact: {
    name: { type: String, required: true },
    relationship: { type: String, required: true },
    phone: { type: String, required: true },
    alternativePhone: String,
    email: String,
    address: String
  },
  
  // Address
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: "Kenya" }
  },
  
  // Personal Details
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other", "Prefer not to say"]
  },
  maritalStatus: {
    type: String,
    enum: ["Single", "Married", "Divorced", "Widowed", "Other"]
  },
  nationality: {
    type: String,
    default: "Kenyan"
  },
  identification: {
    type: { 
      type: String, 
      enum: ["National ID", "Passport", "Alien ID", "Other"],
    },
    number: String,
    issuedDate: Date,
    expiryDate: Date,
    document: String // URL to ID document
  },
  
  // Profile
  profilePicture: {
    type: String,
    default: null
  },
  
  // Work Information
  workSchedule: {
    monday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    thursday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    friday: { start: String, end: String, isWorking: { type: Boolean, default: true } },
    saturday: { start: String, end: String, isWorking: { type: Boolean, default: false } },
    sunday: { start: String, end: String, isWorking: { type: Boolean, default: false } }
  },
  
  // Leave and Attendance
  leaveBalance: {
    annual: { type: Number, default: 21 },
    sick: { type: Number, default: 12 },
    personal: { type: Number, default: 5 },
    unpaid: { type: Number, default: 0 }
  },
  
  attendance: [{
    date: { type: Date, required: true },
    checkIn: Date,
    checkOut: Date,
    status: { 
      type: String, 
      enum: ["Present", "Absent", "Late", "Half-day", "Leave"], 
      default: "Present" 
    },
    notes: String
  }],
  
  // Performance
  performanceReviews: [{
    reviewDate: { type: Date, required: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    rating: { type: Number, min: 1, max: 5 },
    comments: String,
    goals: [String],
    nextReviewDate: Date
  }],
  
  // Documents
  documents: [{
    name: { type: String, required: true },
    type: { type: String, enum: ["Contract", "ID", "Certificate", "Other"] },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Status
  status: {
    type: String,
    enum: ["Active", "Inactive", "On Leave", "Terminated", "Resigned", "Retired"],
    default: "Active"
  },
  
  // Notes
  notes: {
    type: String,
    trim: true
  }
  
}, { 
  timestamps: true 
});

// Virtuals
staffSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

staffSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

staffSchema.virtual('yearsOfService').get(function() {
  if (!this.hireDate) return null;
  const today = new Date();
  const hireDate = new Date(this.hireDate);
  return Math.floor((today - hireDate) / (365.25 * 24 * 60 * 60 * 1000));
});

staffSchema.virtual('isActive').get(function() {
  return this.status === "Active";
});

// Methods
staffSchema.methods.calculateLeaveBalance = function() {
  // You can implement logic here to calculate leave balance based on hire date
  return this.leaveBalance;
};

staffSchema.methods.markAttendance = function(date, status, notes = '') {
  this.attendance.push({ date, status, notes });
  return this.save();
};

// Indexes for better query performance
staffSchema.index({ employeeId: 1 });
staffSchema.index({ email: 1 });
staffSchema.index({ department: 1, position: 1 });
staffSchema.index({ status: 1 });
staffSchema.index({ firstName: 1, lastName: 1 });

// Remove auto-populate and use explicit population instead
// staffSchema.pre('find', function() {
//   this.populate('user').populate('department').populate('subjects');
// });

// JSON configuration
staffSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

staffSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model("Staff", staffSchema);