const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

// Load env vars
dotenv.config();

// Import database connection
const connectDB = require('./config/db');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { protect, adminOnly } = require('./middleware/authMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const studentRoutes = require('./routes/studentRoutes');
const parentRoutes = require('./routes/parentRoutes');
const staffRoutes = require('./routes/staffRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const stakeholderRoutes = require('./routes/stakeholderRoutes');
const vehicleRoutes = require('./routes/vehicleRoutes');
const maintenanceRoutes = require('./routes/maintenaceRoutes');
const vehicleDocumentRoutes = require('./routes/vehicleDocumentRoutes');
const fuelRecordRoutes = require('./routes/fuelRecordRoutes');

// Connect to database
connectDB();  

const app = express();

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.originalUrl}`);
  next();
});

// Routes
console.log('🔄 Loading routes...');

// Public routes
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes loaded: /api/auth');

// Protected routes (profile management)
app.use('/api/users', userRoutes);
console.log('✅ User routes loaded: /api/users');

// Protected admin routes (require authentication + admin privileges)
app.use('/api/students', studentRoutes);
console.log('✅ Student routes loaded: /api/students');

app.use('/api/parents', parentRoutes);
console.log('✅ Parent routes loaded: /api/parents');

app.use('/api/staff', staffRoutes);
console.log('✅ Staff routes loaded: /api/staff');

app.use('/api/departments', departmentRoutes);
console.log('✅ Department routes loaded: /api/departments');

app.use('/api/stakeholders', stakeholderRoutes);
console.log('✅ Stakeholder routes loaded: /api/stakeholders');

app.use('/api/vehicles', vehicleRoutes);
console.log('✅ Vehicle routes loaded: /api/vehicles');

app.use('/api/maintenance', maintenanceRoutes);
console.log('✅ Maintenance routes loaded: /api/maintenance');

app.use('/api/vehicle-documents', vehicleDocumentRoutes);
console.log('✅ Vehicle document routes loaded: /api/vehicle-documents');

app.use('/api/fuel-records', fuelRecordRoutes);
console.log('✅ Fuel record routes loaded: /api/fuel-records');

console.log('✅ All admin routes loaded successfully!');
console.log('🎯 Total routes registered: 11');

// Home route with all endpoints
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Elim Management System API',
    version: '1.0.0',
    endpoints: {
      authentication: {
        login: 'POST /api/auth/login',
        me: 'GET /api/auth/me',
        logout: 'POST /api/auth/logout'
      },
      userManagement: {
        profile: 'GET /api/users/profile',
        updateProfile: 'PUT /api/users/profile',
        changePassword: 'PUT /api/users/change-password',
        stats: 'GET /api/users/stats'
      },
      coreManagement: {
        students: '/api/students',
        parents: '/api/parents',
        staff: '/api/staff',
        departments: '/api/departments',
        stakeholders: '/api/stakeholders'
      },
      vehicleManagement: {
        vehicles: '/api/vehicles',
        maintenance: '/api/maintenance',
        documents: '/api/vehicle-documents',
        fuelRecords: '/api/fuel-records'
      }
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found`
  });
});

// Error handler middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}`);
});

module.exports = app;