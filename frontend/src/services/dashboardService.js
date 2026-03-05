import api from './apiService'

export const dashboardService = {
  getSystemStats: () => api.get('/users/stats'),
  
  getVehiclesNeedingService: () => api.get('/vehicles/needing-service'),
  
  getExpiringDocuments: (days = 30) => 
    api.get('/vehicle-documents/expiring', { params: { days } }),
  
  getUpcomingMaintenance: (days = 30) => 
    api.get('/maintenance/upcoming', { params: { days } }),
  
  getUnverifiedFuelRecords: (limit = 5) => 
    api.get('/fuel-records/unverified', { params: { limit } }),
  
  clearCache: () => {
    // Optional: Implement cache clearing logic
    console.log('Cache cleared')
  }
}