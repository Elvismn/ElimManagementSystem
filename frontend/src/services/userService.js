// frontend/src/services/userService.js
import apiService from './apiService'

export const userService = {
  getProfile: () => apiService.getProfile(),
  updateProfile: (name, email) => apiService.updateProfile(name, email),
  changePassword: (currentPassword, newPassword) => apiService.changePassword(currentPassword, newPassword),
  getSystemStats: () => apiService.getSystemStats()
}