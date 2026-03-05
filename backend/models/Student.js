const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
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
  studentId: { 
    type: String, 
    required: [true, "Student ID is required"], 
    unique: true,
    trim: true
  },
  grade: { 
    type: String, 
    required: [true, "Grade level is required"],
    enum: ["Nursery", "KG1", "KG2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"]
  },
  classroom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Classroom"
  },
  dateOfBirth: { 
    type: Date,
    required: [true, "Date of birth is required"]
  },
  gender: { 
    type: String, 
    enum: ["Male", "Female", "Other"],
    required: true
  },
  parents: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Parent"
  }],
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: { type: String, default: "Kenya" }
  },
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relationship: { type: String, required: true },
    isPrimary: { type: Boolean, default: false }
  }],
  medicalInfo: {
    bloodGroup: { type: String, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"] },
    allergies: [String],
    medications: [String],
    conditions: [String],
    doctorName: String,
    doctorPhone: String,
    notes: String
  },
  enrollmentDate: { 
    type: Date, 
    default: Date.now 
  },
  status: { 
    type: String, 
    enum: ["Active", "Inactive", "Transferred", "Graduated", "Suspended"], 
    default: "Active" 
  },
  profilePicture: {
    type: String,
    default: null
  }
}, { 
  timestamps: true 
});

// Virtuals
studentSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

studentSchema.virtual('age').get(function() {
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

// Methods
studentSchema.methods.isActive = function() {
  return this.status === "Active";
};

studentSchema.methods.getPrimaryEmergencyContact = function() {
  return this.emergencyContacts.find(contact => contact.isPrimary) || this.emergencyContacts[0];
};

// Indexes for better query performance
studentSchema.index({ studentId: 1 });
studentSchema.index({ grade: 1, status: 1 });
studentSchema.index({ firstName: 1, lastName: 1 });

// JSON configuration
studentSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

studentSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model("Student", studentSchema);