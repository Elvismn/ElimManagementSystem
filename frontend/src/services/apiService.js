import axios from 'axios';

// Base API configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTHENTICATION SERVICES
// ============================================
export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ============================================
// USER PROFILE SERVICES
// ============================================
export const userService = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data) => api.put('/users/profile', data),
  changePassword: (currentPassword, newPassword) => 
    api.put('/users/change-password', { currentPassword, newPassword }),
  getSystemStats: () => api.get('/users/stats'),
};

// ============================================
// STUDENT SERVICES
// ============================================
export const studentService = {
  getStudents: (params) => api.get('/students', { params }),
  getStudent: (id) => api.get(`/students/${id}`),
  createStudent: (data) => api.post('/students', data),
  updateStudent: (id, data) => api.put(`/students/${id}`, data),
  deleteStudent: (id) => api.delete(`/students/${id}`),
  getStudentsByGrade: (grade, params) => api.get(`/students/grade/${grade}`, { params }),
  updateStudentStatus: (data) => api.patch('/students/status', data),
};

// ============================================
// PARENT SERVICES
// ============================================
export const parentService = {
  getParents: (params) => api.get('/parents', { params }),
  getParent: (id) => api.get(`/parents/${id}`),
  createParent: (data) => api.post('/parents', data),
  updateParent: (id, data) => api.put(`/parents/${id}`, data),
  deleteParent: (id) => api.delete(`/parents/${id}`),
  addChild: (parentId, studentId) => api.post(`/parents/${parentId}/children/${studentId}`),
  removeChild: (parentId, studentId) => api.delete(`/parents/${parentId}/children/${studentId}`),
  toggleStatus: (id) => api.patch(`/parents/${id}/toggle-status`),
};

// ============================================
// STAFF SERVICES
// ============================================
export const staffService = {
  getStaff: (params) => api.get('/staff', { params }),
  getStaffMember: (id) => api.get(`/staff/${id}`),
  createStaff: (data) => api.post('/staff', data),
  updateStaff: (id, data) => api.put(`/staff/${id}`, data),
  deleteStaff: (id) => api.delete(`/staff/${id}`),
  markAttendance: (id, data) => api.post(`/staff/${id}/attendance`, data),
  addPerformanceReview: (id, data) => api.post(`/staff/${id}/performance-review`, data),
  updateStatus: (id, data) => api.patch(`/staff/${id}/status`, data),
};

// ============================================
// DEPARTMENT SERVICES
// ============================================
export const departmentService = {
  getDepartments: (params) => api.get('/departments', { params }),
  getDepartment: (id) => api.get(`/departments/${id}`),
  createDepartment: (data) => api.post('/departments', data),
  updateDepartment: (id, data) => api.put(`/departments/${id}`, data),
  deleteDepartment: (id) => api.delete(`/departments/${id}`),
  getDepartmentStaff: (id, params) => api.get(`/departments/${id}/staff`, { params }),
  updateBudget: (id, data) => api.patch(`/departments/${id}/budget`, data),
};

// ============================================
// STAKEHOLDER SERVICES
// ============================================
export const stakeholderService = {
  getStakeholders: (params) => api.get('/stakeholders', { params }),
  getStakeholder: (id) => api.get(`/stakeholders/${id}`),
  createStakeholder: (data) => api.post('/stakeholders', data),
  updateStakeholder: (id, data) => api.put(`/stakeholders/${id}`, data),
  deleteStakeholder: (id) => api.delete(`/stakeholders/${id}`),
  addEngagement: (id, data) => api.post(`/stakeholders/${id}/engagements`, data),
  getEngagements: (id, params) => api.get(`/stakeholders/${id}/engagements`, { params }),
  updateStatus: (id, data) => api.patch(`/stakeholders/${id}/status`, data),
  assignStakeholder: (id, staffId) => api.patch(`/stakeholders/${id}/assign`, { staffId }),
  addDocument: (id, data) => api.post(`/stakeholders/${id}/documents`, data),
};

// ============================================
// VEHICLE SERVICES
// ============================================
export const vehicleService = {
  getVehicles: (params) => api.get('/vehicles', { params }),
  getVehicle: (id) => api.get(`/vehicles/${id}`),
  createVehicle: (data) => api.post('/vehicles', data),
  updateVehicle: (id, data) => api.put(`/vehicles/${id}`, data),
  deleteVehicle: (id) => api.delete(`/vehicles/${id}`),
  updateOdometer: (id, odometer) => api.patch(`/vehicles/${id}/odometer`, { odometer }),
  assignDriver: (id, driverId) => api.patch(`/vehicles/${id}/assign-driver`, { driverId }),
  getVehiclesNeedingService: () => api.get('/vehicles/needing-service'),
  getExpiringDocuments: (days) => api.get('/vehicles/expiring-documents', { params: { days } }),
};

// ============================================
// MAINTENANCE RECORD SERVICES
// ============================================
export const maintenanceService = {
  getMaintenanceRecords: (params) => api.get('/maintenance', { params }),
  getMaintenanceRecord: (id) => api.get(`/maintenance/${id}`),
  createMaintenanceRecord: (data) => api.post('/maintenance', data),
  updateMaintenanceRecord: (id, data) => api.put(`/maintenance/${id}`, data),
  deleteMaintenanceRecord: (id) => api.delete(`/maintenance/${id}`),
  verifyMaintenanceRecord: (id) => api.patch(`/maintenance/${id}/verify`),
  getMaintenanceAnalytics: (vehicleId, params) => 
    api.get(`/maintenance/vehicle/${vehicleId}/analytics`, { params }),
  getUpcomingMaintenance: (params) => api.get('/maintenance/upcoming', { params }),
  getMaintenanceForecast: (vehicleId, months) => 
    api.get(`/maintenance/vehicle/${vehicleId}/forecast`, { params: { months } }),
  getOverdueMaintenance: () => api.get('/maintenance/overdue'),
};

// ============================================
// VEHICLE DOCUMENT SERVICES
// ============================================
export const vehicleDocumentService = {
  getDocuments: (params) => api.get('/vehicle-documents', { params }),
  getDocument: (id) => api.get(`/vehicle-documents/${id}`),
  createDocument: (data) => api.post('/vehicle-documents', data),
  updateDocument: (id, data) => api.put(`/vehicle-documents/${id}`, data),
  deleteDocument: (id) => api.delete(`/vehicle-documents/${id}`),
  verifyDocument: (id) => api.patch(`/vehicle-documents/${id}/verify`),
  renewDocument: (id, data) => api.patch(`/vehicle-documents/${id}/renew`, data),
  getExpiringDocuments: (params) => api.get('/vehicle-documents/expiring', { params }),
  getExpiredDocuments: (params) => api.get('/vehicle-documents/expired', { params }),
  getDocumentAnalytics: (vehicleId) => 
    api.get(vehicleId ? `/vehicle-documents/vehicle/${vehicleId}/analytics` : '/vehicle-documents/analytics'),
  bulkUpdateDocuments: (data) => api.post('/vehicle-documents/bulk-update', data),
  getReminderCandidates: () => api.get('/vehicle-documents/reminders'),
};

// ============================================
// FUEL RECORD SERVICES
// ============================================
export const fuelRecordService = {
  getFuelRecords: (params) => api.get('/fuel-records', { params }),
  getFuelRecord: (id) => api.get(`/fuel-records/${id}`),
  createFuelRecord: (data) => api.post('/fuel-records', data),
  updateFuelRecord: (id, data) => api.put(`/fuel-records/${id}`, data),
  deleteFuelRecord: (id) => api.delete(`/fuel-records/${id}`),
  verifyFuelRecord: (id) => api.patch(`/fuel-records/${id}/verify`),
  getFuelAnalytics: (vehicleId, params) => 
    api.get(`/fuel-records/vehicle/${vehicleId}/analytics`, { params }),
  getUnverifiedFuelRecords: (params) => api.get('/fuel-records/unverified', { params }),
  bulkVerifyFuelRecords: (recordIds) => api.post('/fuel-records/bulk-verify', { recordIds }),
};

// ============================================
// DASHBOARD/OVERVIEW SERVICE
// ============================================
export const dashboardService = {
  getSystemStats: () => api.get('/users/stats'),
  getVehiclesNeedingService: () => api.get('/vehicles/needing-service'),
  getExpiringDocuments: (days = 30) => api.get('/vehicle-documents/expiring', { params: { days } }),
  getUpcomingMaintenance: (days = 30) => api.get('/maintenance/upcoming', { params: { days } }),
  getUnverifiedFuelRecords: (limit = 5) => 
    api.get('/fuel-records/unverified', { params: { limit } }),
};

// Export the configured axios instance for custom requests
export default api;