import React, { useState, useEffect } from 'react'
import { 
  User, Mail, Calendar, Clock, Shield, CheckCircle, 
  Edit, Lock, Save, X, Eye, EyeOff, LogOut,
  Users, Car, Briefcase, GraduationCap, TrendingUp
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { userService } from '../services/userService'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'

const Card = ({ children, title, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {title && <div className="px-6 py-4 border-b border-gray-200"><h3 className="text-lg font-semibold text-gray-900">{title}</h3></div>}
    <div className="p-6">{children}</div>
  </div>
)

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
    <div className="flex items-center gap-4">
      <div className={`${color} rounded-lg p-3`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      <div>
        <p className="text-sm text-gray-600">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
)

const Profile = () => {
  const { user, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(true)
  const [systemStats, setSystemStats] = useState({
    totalStudents: 0,
    totalParents: 0,
    totalStaff: 0,
    totalVehicles: 0
  })

  // Profile edit modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    email: ''
  })
  const [editLoading, setEditLoading] = useState(false)

  // Password change modal state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  })
  const [passwordError, setPasswordError] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  useEffect(() => {
    fetchSystemStats()
  }, [])

  const fetchSystemStats = async () => {
    setStatsLoading(true)
    try {
      const response = await userService.getSystemStats()
      setSystemStats(response.data?.systemStats || {
        totalStudents: 0,
        totalParents: 0,
        totalStaff: 0,
        totalVehicles: 0
      })
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const handleEditClick = () => {
    setEditForm({
      name: user?.name || '',
      email: user?.email || ''
    })
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    setEditLoading(true)
    try {
      await userService.updateProfile(editForm.name, editForm.email)
      
      // Update local storage and context
      const updatedUser = { ...user, name: editForm.name, email: editForm.email }
      localStorage.setItem('user', JSON.stringify(updatedUser))
      
      alert('Profile updated successfully!')
      setIsEditModalOpen(false)
      window.location.reload()
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to update profile')
    } finally {
      setEditLoading(false)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New passwords do not match')
      return
    }
    
    if (passwordForm.newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    setPasswordLoading(true)
    try {
      await userService.changePassword(passwordForm.currentPassword, passwordForm.newPassword)
      alert('Password changed successfully!')
      setPasswordForm({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setIsPasswordModalOpen(false)
    } catch (error) {
      setPasswordError(error.response?.data?.error || 'Failed to change password')
    } finally {
      setPasswordLoading(false)
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getUserInitials = () => {
    if (!user?.name) return 'A'
    return user.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const stats = [
    { icon: GraduationCap, label: 'Total Students', value: systemStats.totalStudents, color: 'bg-blue-500' },
    { icon: Users, label: 'Total Parents', value: systemStats.totalParents, color: 'bg-green-500' },
    { icon: Briefcase, label: 'Total Staff', value: systemStats.totalStaff, color: 'bg-purple-500' },
    { icon: Car, label: 'Total Vehicles', value: systemStats.totalVehicles, color: 'bg-orange-500' }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">Manage your account settings and preferences</p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={handleEditClick}>
            <Edit className="w-4 h-4 mr-2" />
            Edit Profile
          </Button>
          <Button variant="secondary" onClick={() => setIsPasswordModalOpen(true)}>
            <Lock className="w-4 h-4 mr-2" />
            Change Password
          </Button>
          <Button variant="danger" onClick={logout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Profile Overview Card */}
      <Card>
        <div className="flex flex-col md:flex-row gap-6">
          {/* Avatar */}
          <div className="flex flex-col items-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-white text-4xl font-bold">{getUserInitials()}</span>
            </div>
            <div className="mt-3 flex gap-2">
              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Active
              </span>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1">
                <Shield className="w-3 h-3" /> Administrator
              </span>
            </div>
          </div>

          {/* User Info */}
          <div className="flex-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <User className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Full Name</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.name || 'Admin User'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="text-lg font-semibold text-gray-900">{user?.email || 'admin@elim.com'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Account Created</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(user?.createdAt)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Last Login</p>
                  <p className="text-lg font-semibold text-gray-900">{formatDate(user?.lastLogin)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* System Statistics */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">System Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statsLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div><div className="h-4 bg-gray-200 rounded w-20 mb-2"></div><div className="h-6 bg-gray-200 rounded w-16"></div></div>
                </div>
              </div>
            ))
          ) : (
            stats.map((stat, index) => (
              <StatCard key={index} icon={stat.icon} label={stat.label} value={stat.value.toLocaleString()} color={stat.color} />
            ))
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button onClick={handleEditClick} className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
              <Edit className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Edit Profile</span>
          </button>
          <button onClick={() => setIsPasswordModalOpen(true)} className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
              <Lock className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Change Password</span>
          </button>
          <button onClick={() => window.location.href = '/dashboard'} className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-2">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-700">Go to Dashboard</span>
          </button>
          <button onClick={fetchSystemStats} className="flex flex-col items-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            </div>
            <span className="text-sm font-medium text-gray-700">Refresh Stats</span>
          </button>
        </div>
      </Card>

      {/* Edit Profile Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Profile" size="md">
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <Input
            label="Full Name"
            name="name"
            required
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="Enter your full name"
          />
          <Input
            label="Email Address"
            name="email"
            type="email"
            required
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            placeholder="admin@example.com"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
            <Button type="submit" loading={editLoading}>{editLoading ? 'Saving...' : 'Save Changes'}</Button>
          </div>
        </form>
      </Modal>

      {/* Change Password Modal */}
      <Modal isOpen={isPasswordModalOpen} onClose={() => { setIsPasswordModalOpen(false); setPasswordError(''); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }} title="Change Password" size="md">
        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          {passwordError && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">{passwordError}</div>}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
            <div className="relative">
              <input type={showPassword.current ? "text" : "password"} required value={passwordForm.currentPassword} onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10" placeholder="Enter current password" />
              <button type="button" onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">{showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <div className="relative">
              <input type={showPassword.new ? "text" : "password"} required value={passwordForm.newPassword} onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10" placeholder="Enter new password (min. 6 characters)" />
              <button type="button" onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">{showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
            <div className="relative">
              <input type={showPassword.confirm ? "text" : "password"} required value={passwordForm.confirmPassword} onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10" placeholder="Confirm new password" />
              <button type="button" onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">{showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
            </div>
          </div>

          <div className="text-sm text-gray-500">Password must be at least 6 characters long.</div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="secondary" onClick={() => { setIsPasswordModalOpen(false); setPasswordError(''); setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' }); }}>Cancel</Button>
            <Button type="submit" loading={passwordLoading}>{passwordLoading ? 'Updating...' : 'Update Password'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Profile