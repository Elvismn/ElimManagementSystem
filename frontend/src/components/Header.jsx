import { Bell, Search, User, Menu, LogOut, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

const Header = ({ setMobileOpen, onSearch }) => {
  const { user, logout } = useAuth()
  const [searchQuery, setSearchQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const navigate = useNavigate()

  const handleSearch = (e) => {
    e.preventDefault()
    if (onSearch && searchQuery.trim()) {
      onSearch(searchQuery)
    }
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

  return (
    <header className="sticky top-0 z-40 bg-white shadow-sm border-b">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Mobile menu button */}
          <button 
            className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Logo on mobile (center) */}
          <div className="lg:hidden flex-1 text-center">
            <div className="inline-flex items-center gap-2">
              <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center">
                <User className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold text-gray-900">Elim System</span>
            </div>
          </div>

          {/* Search - Hidden on mobile when logo is shown */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-4">
            <form onSubmit={handleSearch} className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search students, vehicles, staff..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </form>
          </div>

          {/* Right side icons */}
          <div className="flex items-center gap-4">
            {/* Search icon for mobile */}
            <button 
              className="lg:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
              onClick={() => {
                // Toggle mobile search or open search modal
                const mobileSearch = document.getElementById('mobile-search')
                if (mobileSearch) mobileSearch.classList.toggle('hidden')
              }}
            >
              <Search className="w-5 h-5" />
            </button>

            {/* Notifications */}
            <button className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* User dropdown */}
            <div className="relative">
              <button 
                className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded-lg"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {getUserInitials()}
                  </span>
                </div>
                <div className="text-left hidden lg:block">
                  <div className="text-sm font-medium text-gray-900">
                    {user?.name || 'Admin User'}
                  </div>
                  <div className="text-xs text-gray-500">Administrator</div>
                </div>
              </button>

              {/* Dropdown menu */}
              {showDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-30"
                    onClick={() => setShowDropdown(false)}
                  />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-40">
                    <div className="py-1">
                      <button 
                        onClick={() => {
                          setShowDropdown(false)
                          navigate('/profile')
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <User className="w-4 h-4" />
                        Your Profile
                      </button>
                      <button 
                        onClick={() => {
                          setShowDropdown(false)
                          navigate('/settings')
                        }}
                        className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Settings className="w-4 h-4" />
                        Settings
                      </button>
                      <div className="border-t my-1"></div>
                      <button
                        onClick={() => {
                          setShowDropdown(false)
                          logout()
                        }}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-600"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar (appears below header) */}
        <div id="mobile-search" className="lg:hidden py-3 border-t hidden">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </form>
        </div>
      </div>
    </header>
  )
}

export default Header