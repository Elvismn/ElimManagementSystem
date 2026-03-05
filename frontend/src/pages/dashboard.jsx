import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { 
  Users, Car, GraduationCap, DollarSign, TrendingUp, Calendar, 
  AlertCircle, RefreshCw, FileText, Wrench, Fuel, 
  Briefcase, Building2, HeartHandshake, Truck, FileCheck
} from 'lucide-react'
import { dashboardService } from '../services/dashboardService'

// Reusable Card component (local to dashboard)
const Card = ({ children, title, subtitle, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden ${className}`}>
    {(title || subtitle) && (
      <div className="px-6 py-4 border-b border-gray-200">
        {title && <h3 className="text-lg font-semibold text-gray-900">{title}</h3>}
        {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
)

// Toast notification
const showToast = {
  success: (message) => console.log('✅', message),
  error: (message) => console.error('❌', message),
  info: (message) => console.log('ℹ️', message)
}

const Dashboard = () => {
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalParents: 0,
    totalStaff: 0,
    totalVehicles: 0,
    totalDepartments: 0,
    totalStakeholders: 0,
    activeVehicles: 0,
    vehiclesInMaintenance: 0,
    upcomingMaintenance: 0,
    expiringDocuments: 0,
    unverifiedFuelRecords: 0,
    totalFuelCost: 0,
    totalMaintenanceCost: 0
  })

  const [recentActivity, setRecentActivity] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch system stats from your backend
      const systemStats = await dashboardService.getSystemStats()
      
      // Fetch vehicles needing service
      const vehiclesNeedingService = await dashboardService.getVehiclesNeedingService()
      
      // Fetch expiring documents
      const expiringDocs = await dashboardService.getExpiringDocuments(30)
      
      // Fetch upcoming maintenance
      const upcomingMaintenance = await dashboardService.getUpcomingMaintenance(30)
      
      // Fetch unverified fuel records
      const unverifiedFuel = await dashboardService.getUnverifiedFuelRecords(5)

      setStats({
        totalStudents: systemStats?.data?.systemStats?.totalStudents || 0,
        totalParents: systemStats?.data?.systemStats?.totalParents || 0,
        totalStaff: systemStats?.data?.systemStats?.totalStaff || 0,
        totalVehicles: systemStats?.data?.systemStats?.totalVehicles || 0,
        totalDepartments: systemStats?.data?.systemStats?.totalDepartments || 0,
        totalStakeholders: systemStats?.data?.systemStats?.totalStakeholders || 0,
        activeVehicles: systemStats?.data?.systemStats?.activeVehicles || 0,
        vehiclesInMaintenance: systemStats?.data?.systemStats?.vehiclesInMaintenance || 0,
        upcomingMaintenance: upcomingMaintenance?.data?.totalRecords || 0,
        expiringDocuments: expiringDocs?.data?.summary?.total || 0,
        unverifiedFuelRecords: unverifiedFuel?.data?.stats?.recordCount || 0,
        totalFuelCost: systemStats?.data?.systemStats?.totalFuelCost || 0,
        totalMaintenanceCost: systemStats?.data?.systemStats?.totalMaintenanceCost || 0
      })

      // Generate recent activity from real data
      const activities = []

      // Add maintenance activities
      if (upcomingMaintenance?.data?.upcomingMaintenance) {
        upcomingMaintenance.data.upcomingMaintenance.slice(0, 3).forEach(m => {
          activities.push({
            id: `maint-${m._id}`,
            type: 'maintenance',
            action: `Maintenance scheduled for ${m.vehicle?.plateNumber || 'vehicle'}`,
            user: 'System',
            time: new Date(m.date).toLocaleDateString(),
            raw: m
          })
        })
      }

      // Add expiring documents
      if (expiringDocs?.data?.documents) {
        expiringDocs.data.documents.slice(0, 3).forEach(d => {
          activities.push({
            id: `doc-${d._id}`,
            type: 'document',
            action: `${d.documentType} expiring for ${d.vehicle?.plateNumber || 'vehicle'}`,
            user: 'System',
            time: `${d.daysUntilExpiry} days left`,
            raw: d
          })
        })
      }

      // Add unverified fuel records
      if (unverifiedFuel?.data?.fuelRecords) {
        unverifiedFuel.data.fuelRecords.slice(0, 3).forEach(f => {
          activities.push({
            id: `fuel-${f._id}`,
            type: 'fuel',
            action: `${f.liters}L fuel record for ${f.vehicle?.plateNumber || 'vehicle'} needs verification`,
            user: f.filledBy?.name || 'Unknown',
            time: new Date(f.date).toLocaleDateString(),
            raw: f
          })
        })
      }

      // Sort by date (most recent first) and limit to 10
      setRecentActivity(activities.sort((a, b) => 
        new Date(b.time) - new Date(a.time)
      ).slice(0, 10))

      setLoading(false)
    } catch (error) {
      console.error('Dashboard error:', error)
      showToast.error('Failed to load dashboard data')
      setLoading(false)
    }
  }

  const handleManualRefresh = async () => {
    setRefreshing(true)
    await fetchDashboardData()
    setRefreshing(false)
    showToast.success('Dashboard refreshed')
  }

  // Navigation handlers based on your routes
  const handleNavigation = (path) => {
    navigate(path)
  }

  const handleAlertClick = (alertType) => {
    switch(alertType) {
      case 'maintenance':
        navigate('/maintenance')
        break
      case 'documents':
        navigate('/vehicle-documents')
        break
      case 'fuel':
        navigate('/fuel-records')
        break
      default:
        break
    }
  }

  const handleQuickAction = (action) => {
    switch(action) {
      case 'students':
        navigate('/students')
        break
      case 'parents':
        navigate('/parents')
        break
      case 'staff':
        navigate('/staff')
        break
      case 'vehicles':
        navigate('/vehicles')
        break
      case 'departments':
        navigate('/departments')
        break
      case 'stakeholders':
        navigate('/stakeholders')
        break
      case 'maintenance':
        navigate('/maintenance')
        break
      case 'fuel':
        navigate('/fuel-records')
        break
      case 'documents':
        navigate('/vehicle-documents')
        break
      default:
        break
    }
  }

  const formatCurrency = (amount) => {
    return `KES ${(amount || 0).toLocaleString()}`
  }

  // Main stat cards based on your backend models
  const statCards = [
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: <Users className="h-6 w-6" />,
      color: 'from-blue-500 to-blue-600',
      onClick: () => handleNavigation('/students')
    },
    {
      title: 'Total Parents',
      value: stats.totalParents,
      icon: <GraduationCap className="h-6 w-6" />,
      color: 'from-purple-500 to-purple-600',
      onClick: () => handleNavigation('/parents')
    },
    {
      title: 'Staff Members',
      value: stats.totalStaff,
      icon: <Briefcase className="h-6 w-6" />,
      color: 'from-indigo-500 to-indigo-600',
      onClick: () => handleNavigation('/staff')
    },
    {
      title: 'School Vehicles',
      value: stats.totalVehicles,
      icon: <Car className="h-6 w-6" />,
      color: 'from-green-500 to-emerald-600',
      onClick: () => handleNavigation('/vehicles')
    }
  ]

  const secondaryStatCards = [
    {
      title: 'Departments',
      value: stats.totalDepartments,
      icon: <Building2 className="h-6 w-6" />,
      color: 'from-yellow-500 to-amber-600',
      onClick: () => handleNavigation('/departments')
    },
    {
      title: 'Stakeholders',
      value: stats.totalStakeholders,
      icon: <HeartHandshake className="h-6 w-6" />,
      color: 'from-pink-500 to-rose-600',
      onClick: () => handleNavigation('/stakeholders')
    },
    {
      title: 'Active Vehicles',
      value: stats.activeVehicles,
      icon: <Truck className="h-6 w-6" />,
      color: 'from-cyan-500 to-sky-600',
      onClick: () => handleNavigation('/vehicles')
    },
    {
      title: 'Total Fuel Cost',
      value: formatCurrency(stats.totalFuelCost),
      icon: <Fuel className="h-6 w-6" />,
      color: 'from-orange-500 to-amber-600',
      onClick: () => handleNavigation('/fuel-records')
    }
  ]

  // Alert cards based on real data
  const alertCards = [
    {
      title: 'Vehicles in Maintenance',
      value: stats.vehiclesInMaintenance,
      icon: <Wrench className="h-6 w-6" />,
      color: 'from-orange-500 to-red-600',
      description: 'Currently in workshop',
      onClick: () => handleAlertClick('maintenance')
    },
    {
      title: 'Upcoming Maintenance',
      value: stats.upcomingMaintenance,
      icon: <Calendar className="h-6 w-6" />,
      color: 'from-yellow-500 to-orange-600',
      description: 'Due within 30 days',
      onClick: () => handleAlertClick('maintenance')
    },
    {
      title: 'Expiring Documents',
      value: stats.expiringDocuments,
      icon: <FileText className="h-6 w-6" />,
      color: 'from-red-500 to-pink-600',
      description: 'Need attention',
      onClick: () => handleAlertClick('documents')
    },
    {
      title: 'Unverified Fuel Records',
      value: stats.unverifiedFuelRecords,
      icon: <FileCheck className="h-6 w-6" />,
      color: 'from-purple-500 to-violet-600',
      description: 'Awaiting verification',
      onClick: () => handleAlertClick('fuel')
    }
  ]

  // Quick actions based on your routes
  const quickActions = [
    { label: 'Students', icon: <Users className="w-5 h-5" />, action: 'students', color: 'blue' },
    { label: 'Parents', icon: <GraduationCap className="w-5 h-5" />, action: 'parents', color: 'purple' },
    { label: 'Staff', icon: <Briefcase className="w-5 h-5" />, action: 'staff', color: 'indigo' },
    { label: 'Vehicles', icon: <Car className="w-5 h-5" />, action: 'vehicles', color: 'green' },
    { label: 'Departments', icon: <Building2 className="w-5 h-5" />, action: 'departments', color: 'yellow' },
    { label: 'Stakeholders', icon: <HeartHandshake className="w-5 h-5" />, action: 'stakeholders', color: 'pink' },
    { label: 'Maintenance', icon: <Wrench className="w-5 h-5" />, action: 'maintenance', color: 'orange' },
    { label: 'Fuel Records', icon: <Fuel className="w-5 h-5" />, action: 'fuel', color: 'amber' }
  ]

  // Activity icon mapping
  const getActivityIcon = (type) => {
    switch(type) {
      case 'maintenance': return <Wrench className="w-4 h-4 text-orange-500" />
      case 'document': return <FileText className="w-4 h-4 text-red-500" />
      case 'fuel': return <Fuel className="w-4 h-4 text-yellow-500" />
      default: return <TrendingUp className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Welcome to Elim Management System</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button 
            onClick={() => showToast.info('Report generation coming soon')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <button
            key={index}
            onClick={stat.onClick}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all text-left w-full"
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? (
                      <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} rounded-xl p-3 shadow-md`}>
                  <div className="text-white">{stat.icon}</div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Secondary Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {secondaryStatCards.map((stat, index) => (
          <button
            key={index}
            onClick={stat.onClick}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all text-left w-full"
          >
            <div className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {loading ? (
                      <span className="inline-block w-12 h-6 bg-gray-200 animate-pulse rounded"></span>
                    ) : (
                      stat.value
                    )}
                  </p>
                </div>
                <div className={`bg-gradient-to-br ${stat.color} rounded-xl p-3 shadow-md`}>
                  <div className="text-white">{stat.icon}</div>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Alerts Section */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {alertCards.map((alert, index) => (
          <button
            key={index}
            onClick={alert.onClick}
            className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-all text-left w-full"
          >
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <div className={`bg-gradient-to-br ${alert.color} rounded-lg p-2`}>
                  <div className="text-white w-5 h-5">{alert.icon}</div>
                </div>
                <span className="text-2xl font-bold text-gray-900">
                  {loading ? (
                    <span className="inline-block w-8 h-6 bg-gray-200 animate-pulse rounded"></span>
                  ) : (
                    alert.value
                  )}
                </span>
              </div>
              <p className="font-semibold text-gray-900">{alert.title}</p>
              <p className="text-sm text-gray-600">{alert.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Quick Actions */}
      <Card title="Quick Actions" subtitle="Navigate to different sections">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, index) => (
            <button
              key={index}
              onClick={() => handleQuickAction(action.action)}
              className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br from-${action.color}-100 to-${action.color}-50 flex items-center justify-center mb-2 group-hover:scale-110 transition-transform`}>
                <div className={`text-${action.color}-600`}>{action.icon}</div>
              </div>
              <span className="text-sm font-medium text-gray-700 text-center">{action.label}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Recent Activity */}
      <Card title="Recent Activity" subtitle="Latest system activities">
        {loading ? (
          <div className="py-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">Loading activities...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentActivity.length === 0 ? (
              <div className="py-8 text-center">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No recent activity found</p>
                <p className="text-sm text-gray-400 mt-1">Activities will appear as data is added</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div 
                  key={activity.id} 
                  className="flex items-center justify-between py-3 border-b last:border-0 hover:bg-gray-50 px-2 rounded transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{activity.action}</div>
                      <div className="text-sm text-gray-500">by {activity.user}</div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500">{activity.time}</div>
                </div>
              ))
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default Dashboard