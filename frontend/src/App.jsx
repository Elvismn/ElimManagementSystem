import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Layout from './components/Layout'
import Settings from './pages/Settings'
import Students from './pages/Students'
import Parents from './components/Parents'
import './App.css'

// Placeholder components for other routes
const Staff = () => <div className="p-6 bg-white rounded-lg shadow">Staff Page (Coming Soon)</div>
const Vehicles = () => <div className="p-6 bg-white rounded-lg shadow">Vehicles Page (Coming Soon)</div>
const Departments = () => <div className="p-6 bg-white rounded-lg shadow">Departments Page (Coming Soon)</div>
const Stakeholders = () => <div className="p-6 bg-white rounded-lg shadow">Stakeholders Page (Coming Soon)</div>
const Maintenance = () => <div className="p-6 bg-white rounded-lg shadow">Maintenance Page (Coming Soon)</div>
const FuelRecords = () => <div className="p-6 bg-white rounded-lg shadow">Fuel Records Page (Coming Soon)</div>
const VehicleDocuments = () => <div className="p-6 bg-white rounded-lg shadow">Vehicle Documents Page (Coming Soon)</div>
const Profile = () => <div className="p-6 bg-white rounded-lg shadow">Profile Page (Coming Soon)</div>

// Protected Route wrapper using token check
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token')
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected Routes with Layout */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }>
            {/* Redirect root to dashboard */}
            <Route index element={<Navigate to="/dashboard" replace />} />
            
            {/* Main Routes */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="students" element={<Students />} />
            <Route path="parents" element={<Parents />} />
            <Route path="staff" element={<Staff />} />
            <Route path="vehicles" element={<Vehicles />} />
            <Route path="departments" element={<Departments />} />
            <Route path="stakeholders" element={<Stakeholders />} />
            <Route path="maintenance" element={<Maintenance />} />
            <Route path="fuel-records" element={<FuelRecords />} />
            <Route path="vehicle-documents" element={<VehicleDocuments />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          
          {/* 404 - Not Found */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
              <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                <p className="text-gray-600 mb-4">Page not found</p>
                <a href="/" className="text-blue-600 hover:text-blue-800 underline">
                  Go back to dashboard
                </a>
              </div>
            </div>
          } />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App