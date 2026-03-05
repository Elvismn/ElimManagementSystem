import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

const Layout = () => {
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleSearch = (query) => {
    console.log('Searching for:', query)
    // Implement global search logic here
    // This will search across all models
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header setMobileOpen={setMobileOpen} onSearch={handleSearch} />
        
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
        
        {/* Footer (optional) */}
        <footer className="bg-white border-t py-4 px-6 lg:pl-72">
          <div className="text-center text-sm text-gray-600">
            © 2024 Elim Management System. All rights reserved.
          </div>
        </footer>
      </div>
    </div>
  )
}

export default Layout