const mongoose = require("mongoose");

const stakeholderSchema = new mongoose.Schema({
  // Basic Information
  name: { 
    type: String, 
    required: [true, "Stakeholder name is required"],
    trim: true
  },
  type: { 
    type: String, 
    enum: [
      "Distributor", 
      "Collaborator", 
      "Wellwisher", 
      "Sponsor", 
      "Partner",
      "Investor",
      "Contractor",
      "Consultant",
      "Regulatory Body",
      "NGO",
      "Alumni",
      "Parent Association",
      "Other"
    ], 
    required: [true, "Stakeholder type is required"]
  },
  subType: {
    type: String,
    trim: true
  },
  
  // Contact Information
  contactPerson: {
    name: { type: String, trim: true },
    title: { type: String, trim: true },
    phone: { type: String, trim: true },
    email: { 
      type: String, 
      lowercase: true,
      trim: true,
      match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
    },
    alternativePhone: { type: String, trim: true }
  },
  
  // Organization Details
  organization: {
    name: { type: String, trim: true },
    registrationNumber: { type: String, trim: true },
    website: { type: String, trim: true },
    industry: { type: String, trim: true },
    size: {
      type: String,
      enum: ["Small", "Medium", "Large", "Enterprise", "Individual"]
    },
    yearEstablished: Number
  },
  
  // Contact Details
  primaryPhone: { 
    type: String, 
    trim: true
  },
  secondaryPhone: { 
    type: String, 
    trim: true
  },
  email: { 
    type: String, 
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  
  // Address
  address: {
    street: { type: String, trim: true },
    city: { type: String, trim: true },
    state: { type: String, trim: true },
    postalCode: { type: String, trim: true },
    country: { type: String, default: "Kenya" }
  },
  
  // Social Media
  socialMedia: {
    facebook: String,
    twitter: String,
    linkedin: String,
    instagram: String
  },
  
  // Contribution/Partnership Details
  contribution: { 
    type: String,
    trim: true
  },
  contributionType: {
    type: String,
    enum: ["Financial", "Material", "Service", "Technical", "Advocacy", "Mixed"]
  },
  contributionValue: {
    amount: Number,
    currency: { type: String, default: "KES" },
    frequency: {
      type: String,
      enum: ["One-time", "Monthly", "Quarterly", "Annually", "Ongoing"]
    }
  },
  inKindContribution: {
    description: String,
    estimatedValue: Number,
    items: [String]
  },
  
  // Partnership Timeline
  relationshipStart: {
    type: Date,
    default: Date.now
  },
  relationshipEnd: {
    type: Date
  },
  isOngoing: {
    type: Boolean,
    default: true
  },
  renewalDate: {
    type: Date
  },
  
  // Agreement/Contract
  agreement: {
    documentUrl: String,
    signedDate: Date,
    expiryDate: Date,
    terms: String,
    signedBy: String
  },
  
  // Engagement History
  engagementHistory: [{
    date: { type: Date, default: Date.now },
    type: {
      type: String,
      enum: ["Meeting", "Call", "Email", "Event", "Visit", "Other"]
    },
    description: String,
    outcome: String,
    nextSteps: String,
    attendedBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    followUpDate: Date
  }],
  
  // Support/Projects Associated
  supportedProjects: [{
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    projectName: String,
    role: String,
    contribution: String
  }],
  
  // Status
  status: {
    type: String,
    enum: ["Active", "Inactive", "Pending", "Under Negotiation", "Completed", "Dormant"],
    default: "Active"
  },
  
  // Priority/Importance
  priority: {
    type: String,
    enum: ["High", "Medium", "Low"],
    default: "Medium"
  },
  
  // Documents
  documents: [{
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ["Agreement", "MoU", "Invoice", "Report", "Certificate", "Other"],
      default: "Other"
    },
    url: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
    description: String
  }],
  
  // Notes
  notes: {
    type: String,
    trim: true
  },
  
  // Tags for categorization
  tags: [String],
  
  // Internal Information
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff"
  },
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

// Virtuals
stakeholderSchema.virtual('fullOrganization').get(function() {
  return this.organization?.name || this.name;
});

stakeholderSchema.virtual('primaryContact').get(function() {
  return this.contactPerson?.name || this.name;
});

stakeholderSchema.virtual('isActive').get(function() {
  return this.status === "Active";
});

stakeholderSchema.virtual('partnershipDuration').get(function() {
  if (!this.relationshipStart) return null;
  const end = this.relationshipEnd || new Date();
  const start = new Date(this.relationshipStart);
  const years = (end - start) / (365.25 * 24 * 60 * 60 * 1000);
  return Math.round(years * 10) / 10;
});

// Methods
stakeholderSchema.methods.addEngagement = async function(engagementData) {
  this.engagementHistory.push(engagementData);
  await this.save();
  return this.engagementHistory;
};

stakeholderSchema.methods.getRecentEngagements = function(limit = 5) {
  return this.engagementHistory
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
};

// Static method to get stakeholder summary
stakeholderSchema.statics.getSummary = async function() {
  const summary = await this.aggregate([
    { $group: {
      _id: null,
      totalStakeholders: { $sum: 1 },
      activeStakeholders: { $sum: { $cond: [{ $eq: ["$status", "Active"] }, 1, 0] } },
      pendingStakeholders: { $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] } }
    }}
  ]);

  const typeDistribution = await this.aggregate([
    { $group: { _id: "$type", count: { $sum: 1 } } },
    { $sort: { count: -1 } }
  ]);

  const priorityDistribution = await this.aggregate([
    { $group: { _id: "$priority", count: { $sum: 1 } } }
  ]);

  return {
    summary: summary[0] || { totalStakeholders: 0, activeStakeholders: 0, pendingStakeholders: 0 },
    typeDistribution,
    priorityDistribution
  };
};

// Indexes
stakeholderSchema.index({ name: 1 });
stakeholderSchema.index({ type: 1 });
stakeholderSchema.index({ status: 1 });
stakeholderSchema.index({ priority: 1 });
stakeholderSchema.index({ 'organization.name': 1 });
stakeholderSchema.index({ tags: 1 });

// JSON configuration
stakeholderSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    delete ret.__v;
    return ret;
  }
});

stakeholderSchema.set('toObject', {
  virtuals: true
});

module.exports = mongoose.model("Stakeholder", stakeholderSchema);