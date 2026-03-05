import { NavLink } from 'react-router-dom'
import { 
  Home, 
  Users, 
  Car, 
  UserCircle, 
  Briefcase, 
  GraduationCap,
  BarChart,
  BookOpen,
  Building,
  HeartHandshake,
  FileText,
  Fuel,
  Wrench,
  Folder,
  Settings,
  LogOut,
  X,
  Truck,
  UserCog
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const Sidebar = ({ mobileOpen, setMobileOpen }) => {
  const { user, logout } = useAuth()

  // Navigation items based on your backend models
  const navItems = [
    { to: '/dashboard', icon: <Home className="w-5 h-5" />, label: 'Dashboard', section: 'main' },
    
    // Academic Section
    { to: '/students', icon: <Users className="w-5 h-5" />, label: 'Students', section: 'academic' },
    { to: '/parents', icon: <UserCircle className="w-5 h-5" />, label: 'Parents', section: 'academic' },
    { to: '/staff', icon: <Briefcase className="w-5 h-5" />, label: 'Staff', section: 'academic' },
    { to: '/departments', icon: <Building className="w-5 h-5" />, label: 'Departments', section: 'academic' },
    
    // Stakeholders Section
    { to: '/stakeholders', icon: <HeartHandshake className="w-5 h-5" />, label: 'Stakeholders', section: 'stakeholders' },
    
    // Transportation Section
    { to: '/vehicles', icon: <Car className="w-5 h-5" />, label: 'Vehicles', section: 'transport' },
    { to: '/maintenance', icon: <Wrench className="w-5 h-5" />, label: 'Maintenance', section: 'transport' },
    { to: '/fuel-records', icon: <Fuel className="w-5 h-5" />, label: 'Fuel Records', section: 'transport' },
    { to: '/vehicle-documents', icon: <Folder className="w-5 h-5" />, label: 'Documents', section: 'transport' }
  ]

  const getUserInitials = () => {
    if (!user?.name) return 'A'
    return user.name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <>
      {/* Mobile sidebar backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
        fixed inset-y-0 left-0 z-50 w-64
        bg-white border-r border-gray-200
        transition-transform duration-300 ease-in-out
        flex flex-col
      `}>
        {/* Logo & Close button */}
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div className="ml-3">
              <div className="text-lg font-bold text-gray-900">Elim System</div>
              <div className="text-xs text-gray-500">Admin Portal</div>
            </div>
          </div>
          <button 
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            onClick={() => setMobileOpen(false)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {/* Dashboard */}
          <div className="mb-4">
            {navItems.filter(item => item.section === 'main').map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) => 
                  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-l-4 border-blue-600' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`
                }
                end
              >
                {({ isActive }) => (
                  <>
                    <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                      {item.icon}
                    </div>
                    <span className="font-medium text-sm">{item.label}</span>
                  </>
                )}
              </NavLink>
            ))}
          </div>

          {/* Academic Section */}
          <div className="mb-4">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Academic
            </h3>
            <div className="space-y-1">
              {navItems.filter(item => item.section === 'academic').map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  end
                >
                  {({ isActive }) => (
                    <>
                      <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {item.icon}
                      </div>
                      <span className="font-medium text-sm">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Stakeholders Section */}
          <div className="mb-4">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Partnerships
            </h3>
            <div className="space-y-1">
              {navItems.filter(item => item.section === 'stakeholders').map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  end
                >
                  {({ isActive }) => (
                    <>
                      <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {item.icon}
                      </div>
                      <span className="font-medium text-sm">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* Transportation Section */}
          <div className="mb-4">
            <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              Transportation
            </h3>
            <div className="space-y-1">
              {navItems.filter(item => item.section === 'transport').map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) => 
                    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-l-4 border-blue-600' 
                        : 'text-gray-700 hover:bg-gray-100'
                    }`
                  }
                  end
                >
                  {({ isActive }) => (
                    <>
                      <div className={`${isActive ? 'text-blue-600' : 'text-gray-500'}`}>
                        {item.icon}
                      </div>
                      <span className="font-medium text-sm">{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
          
          {/* System Section */}
          <div className="pt-4 mt-4 border-t border-gray-200">
            <NavLink
              to="/settings"
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-600 border-l-4 border-blue-600' 
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
            >
              {({ isActive }) => (
                <>
                  <Settings className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-gray-500'}`} />
                  <span className="font-medium text-sm">Settings</span>
                </>
              )}
            </NavLink>
            
            <button
              onClick={() => {
                logout()
                setMobileOpen(false)
              }}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors group"
            >
              <LogOut className="w-5 h-5 text-gray-500 group-hover:text-red-600" />
              <span className="font-medium text-sm">Logout</span>
            </button>
          </div>
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-gray-50 to-blue-50/50">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-sm">
              <span className="text-white font-bold text-sm">
                {getUserInitials()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'Admin User'}
              </p>
              <p className="text-xs text-gray-500 truncate">
                Administrator
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default Sidebar