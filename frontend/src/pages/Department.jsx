import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, Building, Users, DollarSign, Edit, Trash2, 
  RefreshCw, Mail, Phone, MapPin, Calendar, BookOpen, FileText,
  Briefcase, CheckCircle, XCircle, Eye, ChevronDown, ChevronUp,
  Clock, Award, Folder, AlertCircle
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { departmentService, staffService } from '../services/apiService'

// Badge component
const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant] || variants.default} ${className}`}>
      {children}
    </span>
  )
}

// Card component
const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
    {children}
  </div>
)

// Constants matching backend enum
const STATUS_OPTIONS = ["Active", "Inactive", "Under Review"]
const DOCUMENT_TYPES = ["Policy", "Report", "Budget", "Other"]

const Departments = () => {
  const [departments, setDepartments] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [selectedDept, setSelectedDept] = useState(null)

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    location: true,
    budget: true,
    programs: true,
    services: true,
    documents: true
  })

  // Temporary input states for arrays
  const [programInput, setProgramInput] = useState({
    name: '',
    description: '',
    duration: '',
    coordinator: ''
  })

  const [serviceInput, setServiceInput] = useState({
    name: '',
    description: '',
    contactPerson: ''
  })

  const [documentInput, setDocumentInput] = useState({
    name: '',
    type: 'Policy',
    url: ''
  })

  const [roomNumberInput, setRoomNumberInput] = useState('')

  // Form data matching backend schema
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    code: '',
    headOfDepartment: '',
    description: '',
    contactEmail: '',
    contactPhone: '',
    
    // Location
    location: {
      building: '',
      floor: '',
      roomNumbers: []
    },
    
    // Budget
    budget: {
      allocated: '',
      spent: '',
      currency: 'KES',
      fiscalYear: new Date().getFullYear().toString()
    },
    
    // Dates
    establishedDate: new Date().toISOString().split('T')[0],
    
    // Status
    status: 'Active',
    
    // Programs (for academic departments)
    programs: [],
    
    // Services (for administrative departments)
    services: [],
    
    // Documents
    documents: [],
    
    // Subjects
    subjects: []
  })

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [deptRes, staffRes] = await Promise.all([
        departmentService.getDepartments({ limit: 100 }),
        staffService.getStaff({ limit: 100 })
      ])

      const departmentsData = deptRes.data?.data?.departments || deptRes.data?.departments || []
      const staffData = staffRes.data?.data?.staff || staffRes.data?.staff || []

      setDepartments(departmentsData)
      setStaff(staffData)
      setError('')
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      setError('Failed to load data. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Filter departments based on search and status
  const filteredDepartments = useMemo(() => {
    if (!Array.isArray(departments)) return []
    
    return departments.filter(dept => {
      // Search filter
      const matchesSearch = !searchTerm || (
        (dept.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dept.code?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dept.description?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (dept.contactEmail?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || dept.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [departments, searchTerm, statusFilter])

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleLocationChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [name]: value
      }
    }))
  }

  const handleBudgetChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      budget: {
        ...prev.budget,
        [name]: value
      }
    }))
  }

  // Array handlers
  const addRoomNumber = () => {
    if (roomNumberInput.trim() && !formData.location.roomNumbers.includes(roomNumberInput.trim())) {
      setFormData(prev => ({
        ...prev,
        location: {
          ...prev.location,
          roomNumbers: [...prev.location.roomNumbers, roomNumberInput.trim()]
        }
      }))
      setRoomNumberInput('')
    }
  }

  const removeRoomNumber = (index) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        roomNumbers: prev.location.roomNumbers.filter((_, i) => i !== index)
      }
    }))
  }

  const addProgram = () => {
    if (programInput.name) {
      setFormData(prev => ({
        ...prev,
        programs: [...prev.programs, { ...programInput }]
      }))
      setProgramInput({
        name: '',
        description: '',
        duration: '',
        coordinator: ''
      })
    }
  }

  const removeProgram = (index) => {
    setFormData(prev => ({
      ...prev,
      programs: prev.programs.filter((_, i) => i !== index)
    }))
  }

  const addService = () => {
    if (serviceInput.name) {
      setFormData(prev => ({
        ...prev,
        services: [...prev.services, { ...serviceInput }]
      }))
      setServiceInput({
        name: '',
        description: '',
        contactPerson: ''
      })
    }
  }

  const removeService = (index) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.filter((_, i) => i !== index)
    }))
  }

  const addDocument = () => {
    if (documentInput.name && documentInput.url) {
      setFormData(prev => ({
        ...prev,
        documents: [...prev.documents, { 
          ...documentInput,
          uploadedAt: new Date().toISOString()
        }]
      }))
      setDocumentInput({
        name: '',
        type: 'Policy',
        url: ''
      })
    }
  }

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  // CRUD Operations
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Prepare data matching backend schema
      const deptData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        headOfDepartment: formData.headOfDepartment || undefined,
        description: formData.description.trim() || undefined,
        contactEmail: formData.contactEmail.trim() || undefined,
        contactPhone: formData.contactPhone.trim() || undefined,
        location: {
          building: formData.location.building.trim() || undefined,
          floor: formData.location.floor.trim() || undefined,
          roomNumbers: formData.location.roomNumbers
        },
        budget: {
          allocated: formData.budget.allocated ? parseFloat(formData.budget.allocated) : 0,
          spent: formData.budget.spent ? parseFloat(formData.budget.spent) : 0,
          currency: formData.budget.currency,
          fiscalYear: formData.budget.fiscalYear || undefined
        },
        establishedDate: formData.establishedDate || new Date(),
        status: formData.status,
        programs: formData.programs,
        services: formData.services,
        documents: formData.documents
      }

      console.log('Submitting department data:', deptData)

      if (editingDept) {
        await departmentService.updateDepartment(editingDept._id, deptData)
        alert('Department updated successfully!')
      } else {
        await departmentService.createDepartment(deptData)
        alert('Department created successfully!')
      }

      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error('❌ Error saving department:', error)
      setError(error.response?.data?.error || 'Failed to save department')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (dept) => {
    setEditingDept(dept)
    
    // Populate form with department data
    setFormData({
      name: dept.name || '',
      code: dept.code || '',
      headOfDepartment: dept.headOfDepartment?._id || dept.headOfDepartment || '',
      description: dept.description || '',
      contactEmail: dept.contactEmail || '',
      contactPhone: dept.contactPhone || '',
      location: {
        building: dept.location?.building || '',
        floor: dept.location?.floor || '',
        roomNumbers: dept.location?.roomNumbers || []
      },
      budget: {
        allocated: dept.budget?.allocated?.toString() || '',
        spent: dept.budget?.spent?.toString() || '',
        currency: dept.budget?.currency || 'KES',
        fiscalYear: dept.budget?.fiscalYear || new Date().getFullYear().toString()
      },
      establishedDate: dept.establishedDate ? dept.establishedDate.split('T')[0] : new Date().toISOString().split('T')[0],
      status: dept.status || 'Active',
      programs: dept.programs || [],
      services: dept.services || [],
      documents: dept.documents || [],
      subjects: dept.subjects?.map(s => s._id || s) || []
    })
    
    setIsModalOpen(true)
  }

  const handleView = (dept) => {
    setSelectedDept(dept)
    setViewModalOpen(true)
  }

  const handleDelete = async (deptId) => {
    if (!window.confirm('Are you sure you want to delete this department? This action cannot be undone.')) {
      return
    }

    try {
      await departmentService.deleteDepartment(deptId)
      alert('Department deleted successfully!')
      fetchAllData()
    } catch (error) {
      console.error('❌ Error deleting department:', error)
      alert(error.response?.data?.error || 'Failed to delete department')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      headOfDepartment: '',
      description: '',
      contactEmail: '',
      contactPhone: '',
      location: {
        building: '',
        floor: '',
        roomNumbers: []
      },
      budget: {
        allocated: '',
        spent: '',
        currency: 'KES',
        fiscalYear: new Date().getFullYear().toString()
      },
      establishedDate: new Date().toISOString().split('T')[0],
      status: 'Active',
      programs: [],
      services: [],
      documents: [],
      subjects: []
    })
    setEditingDept(null)
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Helper functions
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Active': return 'success'
      case 'Inactive': return 'error'
      case 'Under Review': return 'warning'
      default: return 'default'
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatCurrency = (amount, currency = 'KES') => {
    if (!amount) return 'N/A'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }

  const getHeadOfDepartmentName = (dept) => {
    if (!dept.headOfDepartment) return 'Not assigned'
    if (typeof dept.headOfDepartment === 'object') {
      return `${dept.headOfDepartment.firstName || ''} ${dept.headOfDepartment.lastName || ''}`.trim()
    }
    const found = staff.find(s => s._id === dept.headOfDepartment)
    return found ? `${found.firstName || ''} ${found.lastName || ''}`.trim() : 'Unknown'
  }

  const getStaffCount = (dept) => {
    return staff.filter(s => s.department === dept._id || s.department?._id === dept._id).length
  }

  // Stats
  const stats = {
    total: departments.length,
    active: departments.filter(d => d.status === 'Active').length,
    totalBudget: departments.reduce((sum, d) => sum + (d.budget?.allocated || 0), 0),
    totalSpent: departments.reduce((sum, d) => sum + (d.budget?.spent || 0), 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Departments Management</h1>
          <p className="text-gray-600">
            {searchTerm ? (
              `Found ${filteredDepartments.length} of ${departments.length} departments`
            ) : (
              'Manage school departments and academic units'
            )}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button onClick={() => {
            resetForm()
            setIsModalOpen(true)
          }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Department
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-800">×</button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-3">
              <Building className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Departments</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-3">
              <CheckCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-yellow-500 rounded-lg p-3">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Budget</p>
              <p className="text-2xl font-bold">{formatCurrency(stats.totalBudget)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Staff</p>
              <p className="text-2xl font-bold">{staff.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, code, description, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Departments Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading departments...</p>
          </div>
        ) : filteredDepartments.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Building className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? 'No departments found' : 'No departments yet'}
            </p>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search.`
                : 'Get started by creating your first department'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Department
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDepartments.map((dept) => (
              <div key={dept._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{dept.name}</h3>
                      <p className="text-xs text-gray-500">Code: {dept.code}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleView(dept)} 
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(dept)} 
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(dept._id)} 
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Department details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span><strong>Head:</strong> {getHeadOfDepartmentName(dept)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span><strong>Staff:</strong> {getStaffCount(dept)} members</span>
                  </div>

                  {dept.contactEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{dept.contactEmail}</span>
                    </div>
                  )}

                  {dept.contactPhone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{dept.contactPhone}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span><strong>Budget:</strong> {formatCurrency(dept.budget?.allocated)}</span>
                  </div>

                  {dept.location?.building && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{dept.location.building} {dept.location.floor && `- Floor ${dept.location.floor}`}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span><strong>Est.:</strong> {formatDate(dept.establishedDate)}</span>
                  </div>

                  {dept.description && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-xs text-gray-600 line-clamp-2">{dept.description}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant={getStatusBadgeVariant(dept.status)}>
                      {dept.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Programs: {dept.programs?.length || 0}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Department Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingDept ? 'Edit Department' : 'Add New Department'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Basic Information */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('basic')}
            >
              <h3 className="font-semibold text-gray-900">Basic Information</h3>
              {expandedSections.basic ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.basic && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Department Name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., Mathematics Department"
                  />
                  <Input
                    label="Department Code"
                    name="code"
                    required
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="e.g., MATH"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Head of Department</label>
                    <select
                      name="headOfDepartment"
                      value={formData.headOfDepartment}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Head of Department</option>
                      {staff.map(member => (
                        <option key={member._id} value={member._id}>
                          {member.firstName} {member.lastName} - {member.position}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {STATUS_OPTIONS.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Established Date"
                  name="establishedDate"
                  type="date"
                  value={formData.establishedDate}
                  onChange={handleInputChange}
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Contact Email"
                    name="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={handleInputChange}
                    placeholder="dept@school.com"
                  />
                  <Input
                    label="Contact Phone"
                    name="contactPhone"
                    value={formData.contactPhone}
                    onChange={handleInputChange}
                    placeholder="+254 700 000 000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Brief description of the department..."
                  />
                </div>
              </div>
            )}
          </div>

          {/* Location */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('location')}
            >
              <h3 className="font-semibold text-gray-900">Location</h3>
              {expandedSections.location ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.location && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Building"
                    name="building"
                    value={formData.location.building}
                    onChange={handleLocationChange}
                    placeholder="e.g., Main Building"
                  />
                  <Input
                    label="Floor"
                    name="floor"
                    value={formData.location.floor}
                    onChange={handleLocationChange}
                    placeholder="e.g., 2nd Floor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Room Numbers</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add room number"
                      value={roomNumberInput}
                      onChange={(e) => setRoomNumberInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addRoomNumber())}
                    />
                    <Button type="button" variant="secondary" onClick={addRoomNumber}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.location.roomNumbers.map((room, index) => (
                      <Badge key={index} variant="info" className="flex items-center gap-1">
                        {room}
                        <button
                          type="button"
                          onClick={() => removeRoomNumber(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Budget */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('budget')}
            >
              <h3 className="font-semibold text-gray-900">Budget</h3>
              {expandedSections.budget ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.budget && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Allocated Budget"
                    name="allocated"
                    type="number"
                    value={formData.budget.allocated}
                    onChange={handleBudgetChange}
                    placeholder="0.00"
                  />
                  <Input
                    label="Spent Amount"
                    name="spent"
                    type="number"
                    value={formData.budget.spent}
                    onChange={handleBudgetChange}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      name="currency"
                      value={formData.budget.currency}
                      onChange={handleBudgetChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <Input
                    label="Fiscal Year"
                    name="fiscalYear"
                    value={formData.budget.fiscalYear}
                    onChange={handleBudgetChange}
                    placeholder="e.g., 2024"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Programs (for academic departments) */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('programs')}
            >
              <h3 className="font-semibold text-gray-900">Programs (Optional)</h3>
              {expandedSections.programs ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.programs && (
              <div className="p-4 space-y-4">
                {formData.programs.map((program, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded relative">
                    <button
                      type="button"
                      onClick={() => removeProgram(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="font-medium">{program.name}</p>
                    <p className="text-sm text-gray-600">{program.description}</p>
                    <p className="text-xs text-gray-500">Duration: {program.duration}</p>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Program name"
                    value={programInput.name}
                    onChange={(e) => setProgramInput({...programInput, name: e.target.value})}
                  />
                  <Input
                    placeholder="Duration"
                    value={programInput.duration}
                    onChange={(e) => setProgramInput({...programInput, duration: e.target.value})}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Description"
                    value={programInput.description}
                    onChange={(e) => setProgramInput({...programInput, description: e.target.value})}
                  />
                  <select
                    value={programInput.coordinator}
                    onChange={(e) => setProgramInput({...programInput, coordinator: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Coordinator</option>
                    {staff.map(member => (
                      <option key={member._id} value={member._id}>
                        {member.firstName} {member.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <Button type="button" variant="secondary" onClick={addProgram} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Program
                </Button>
              </div>
            )}
          </div>

          {/* Services (for administrative departments) */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('services')}
            >
              <h3 className="font-semibold text-gray-900">Services (Optional)</h3>
              {expandedSections.services ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.services && (
              <div className="p-4 space-y-4">
                {formData.services.map((service, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded relative">
                    <button
                      type="button"
                      onClick={() => removeService(index)}
                      className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-gray-600">{service.description}</p>
                  </div>
                ))}

                <Input
                  placeholder="Service name"
                  value={serviceInput.name}
                  onChange={(e) => setServiceInput({...serviceInput, name: e.target.value})}
                />
                <Input
                  placeholder="Description"
                  value={serviceInput.description}
                  onChange={(e) => setServiceInput({...serviceInput, description: e.target.value})}
                />
                <select
                  value={serviceInput.contactPerson}
                  onChange={(e) => setServiceInput({...serviceInput, contactPerson: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Select Contact Person</option>
                  {staff.map(member => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
                <Button type="button" variant="secondary" onClick={addService} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Service
                </Button>
              </div>
            )}
          </div>

          {/* Documents */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('documents')}
            >
              <h3 className="font-semibold text-gray-900">Documents</h3>
              {expandedSections.documents ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.documents && (
              <div className="p-4 space-y-4">
                {formData.documents.map((doc, index) => (
                  <div key={index} className="bg-gray-50 p-3 rounded flex justify-between items-center">
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-gray-500">{doc.type}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeDocument(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}

                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Document name"
                    value={documentInput.name}
                    onChange={(e) => setDocumentInput({...documentInput, name: e.target.value})}
                  />
                  <select
                    value={documentInput.type}
                    onChange={(e) => setDocumentInput({...documentInput, type: e.target.value})}
                    className="px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {DOCUMENT_TYPES.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>
                <Input
                  placeholder="Document URL"
                  value={documentInput.url}
                  onChange={(e) => setDocumentInput({...documentInput, url: e.target.value})}
                />
                <Button type="button" variant="secondary" onClick={addDocument} className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setIsModalOpen(false)
                resetForm()
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={submitting}
            >
              {submitting ? 'Saving...' : (editingDept ? 'Update Department' : 'Create Department')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Department Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Department Details"
        size="xl"
      >
        {selectedDept && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <Building className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{selectedDept.name}</h3>
                <p className="text-gray-600">Code: {selectedDept.code}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={getStatusBadgeVariant(selectedDept.status)}>
                    {selectedDept.status}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Basic Information</h4>
                  <div className="space-y-2">
                    <p><strong>Head of Department:</strong> {getHeadOfDepartmentName(selectedDept)}</p>
                    <p><strong>Established:</strong> {formatDate(selectedDept.establishedDate)}</p>
                    {selectedDept.contactEmail && (
                      <p><strong>Email:</strong> {selectedDept.contactEmail}</p>
                    )}
                    {selectedDept.contactPhone && (
                      <p><strong>Phone:</strong> {selectedDept.contactPhone}</p>
                    )}
                  </div>
                </div>

                {selectedDept.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Description</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {selectedDept.description}
                    </p>
                  </div>
                )}

                {selectedDept.location && (selectedDept.location.building || selectedDept.location.floor) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Location</h4>
                    <div className="space-y-1">
                      {selectedDept.location.building && (
                        <p><strong>Building:</strong> {selectedDept.location.building}</p>
                      )}
                      {selectedDept.location.floor && (
                        <p><strong>Floor:</strong> {selectedDept.location.floor}</p>
                      )}
                      {selectedDept.location.roomNumbers?.length > 0 && (
                        <p><strong>Rooms:</strong> {selectedDept.location.roomNumbers.join(', ')}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Budget</h4>
                  <div className="space-y-2">
                    <p><strong>Allocated:</strong> {formatCurrency(selectedDept.budget?.allocated)}</p>
                    <p><strong>Spent:</strong> {formatCurrency(selectedDept.budget?.spent)}</p>
                    <p><strong>Remaining:</strong> {formatCurrency(
                      (selectedDept.budget?.allocated || 0) - (selectedDept.budget?.spent || 0)
                    )}</p>
                    {selectedDept.budget?.fiscalYear && (
                      <p><strong>Fiscal Year:</strong> {selectedDept.budget.fiscalYear}</p>
                    )}
                  </div>
                </div>

                {selectedDept.programs?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Programs</h4>
                    <div className="space-y-2">
                      {selectedDept.programs.map((program, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <p className="font-medium">{program.name}</p>
                          <p className="text-xs text-gray-600">{program.description}</p>
                          {program.duration && (
                            <p className="text-xs text-gray-500">Duration: {program.duration}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedDept.services?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Services</h4>
                    <div className="space-y-2">
                      {selectedDept.services.map((service, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <p className="font-medium">{service.name}</p>
                          <p className="text-xs text-gray-600">{service.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  <p>Created: {formatDate(selectedDept.createdAt)}</p>
                  <p>Last Updated: {formatDate(selectedDept.updatedAt)}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setViewModalOpen(false)
                handleEdit(selectedDept)
              }}>
                Edit Department
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Departments