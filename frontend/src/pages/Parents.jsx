import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, UserCircle, Users, Mail, Phone, Edit, Trash2, 
  RefreshCw, MapPin, AlertCircle, Briefcase, Heart, CheckCircle, XCircle, Eye
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { parentService, studentService } from '../services/apiService'

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
const RELATIONSHIP_OPTIONS = ["Father", "Mother", "Guardian", "Grandparent", "Other"]
const ID_TYPE_OPTIONS = ["National ID", "Passport", "Alien ID", "Other"]
const COUNTRY_OPTIONS = ["Kenya", "Uganda", "Tanzania", "Rwanda", "Burundi", "Other"]

const Parents = () => {
  const [parents, setParents] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingParent, setEditingParent] = useState(null)
  const [selectedParent, setSelectedParent] = useState(null)

  // Form data matching backend schema exactly
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternativePhone: '',
    
    // Professional Information
    occupation: '',
    employer: '',
    
    // Relationship
    relationship: 'Guardian',
    
    // Children
    children: [],
    
    // Address
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Kenya'
    },
    
    // Emergency Contact
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      alternativePhone: ''
    },
    
    // Communication Preferences
    communicationPreferences: {
      email: true,
      sms: true,
      whatsapp: false,
      phoneCalls: true
    },
    
    // Additional Information
    notes: '',
    
    // Status
    isActive: true,
    
    // Identification
    identification: {
      type: '',
      number: '',
      issuedDate: '',
      expiryDate: ''
    }
  })

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [parentsRes, studentsRes] = await Promise.all([
        parentService.getParents({ limit: 100 }),
        studentService.getStudents({ limit: 100 })
      ])

      const parentsData = parentsRes.data?.data?.parents || parentsRes.data?.parents || []
      const studentsData = studentsRes.data?.data?.students || studentsRes.data?.students || []

      setParents(parentsData)
      setStudents(studentsData)
      setError('')
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      setError('Failed to load data. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Filter parents based on search and status
  const filteredParents = useMemo(() => {
    if (!Array.isArray(parents)) return []
    
    return parents.filter(parent => {
      // Search filter
      const matchesSearch = !searchTerm || (
        (parent.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (parent.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (parent.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (parent.phone?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (parent.occupation?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'active' && parent.isActive) ||
        (statusFilter === 'inactive' && !parent.isActive)
      
      return matchesSearch && matchesStatus
    })
  }, [parents, searchTerm, statusFilter])

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleAddressChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      address: {
        ...prev.address,
        [name]: value
      }
    }))
  }

  const handleEmergencyContactChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      emergencyContact: {
        ...prev.emergencyContact,
        [name]: value
      }
    }))
  }

  const handleCommunicationChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      communicationPreferences: {
        ...prev.communicationPreferences,
        [key]: value
      }
    }))
  }

  const handleIdentificationChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      identification: {
        ...prev.identification,
        [name]: value
      }
    }))
  }

  const handleChildSelection = (studentId) => {
    setFormData(prev => ({
      ...prev,
      children: prev.children.includes(studentId)
        ? prev.children.filter(id => id !== studentId)
        : [...prev.children, studentId]
    }))
  }

  // CRUD Operations
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Prepare data matching backend schema exactly
      const parentData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        alternativePhone: formData.alternativePhone.trim() || undefined,
        occupation: formData.occupation.trim() || undefined,
        employer: formData.employer.trim() || undefined,
        relationship: formData.relationship,
        children: formData.children,
        address: {
          street: formData.address.street.trim(),
          city: formData.address.city.trim(),
          state: formData.address.state.trim(),
          postalCode: formData.address.postalCode.trim(),
          country: formData.address.country
        },
        emergencyContact: {
          name: formData.emergencyContact.name.trim() || undefined,
          relationship: formData.emergencyContact.relationship.trim() || undefined,
          phone: formData.emergencyContact.phone.trim() || undefined,
          alternativePhone: formData.emergencyContact.alternativePhone.trim() || undefined
        },
        communicationPreferences: formData.communicationPreferences,
        notes: formData.notes.trim() || undefined,
        isActive: formData.isActive,
        identification: {
          type: formData.identification.type || undefined,
          number: formData.identification.number.trim() || undefined,
          issuedDate: formData.identification.issuedDate || undefined,
          expiryDate: formData.identification.expiryDate || undefined
        }
      }

      console.log('Submitting parent data:', parentData)

      if (editingParent) {
        await parentService.updateParent(editingParent._id, parentData)
        alert('Parent updated successfully!')
      } else {
        await parentService.createParent(parentData)
        alert('Parent created successfully!')
      }

      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error('❌ Error saving parent:', error)
      setError(error.response?.data?.error || 'Failed to save parent')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (parent) => {
    setEditingParent(parent)
    
    // Populate form with parent data
    setFormData({
      firstName: parent.firstName || '',
      lastName: parent.lastName || '',
      email: parent.email || '',
      phone: parent.phone || '',
      alternativePhone: parent.alternativePhone || '',
      occupation: parent.occupation || '',
      employer: parent.employer || '',
      relationship: parent.relationship || 'Guardian',
      children: parent.children?.map(c => c._id || c) || [],
      address: {
        street: parent.address?.street || '',
        city: parent.address?.city || '',
        state: parent.address?.state || '',
        postalCode: parent.address?.postalCode || '',
        country: parent.address?.country || 'Kenya'
      },
      emergencyContact: {
        name: parent.emergencyContact?.name || '',
        relationship: parent.emergencyContact?.relationship || '',
        phone: parent.emergencyContact?.phone || '',
        alternativePhone: parent.emergencyContact?.alternativePhone || ''
      },
      communicationPreferences: {
        email: parent.communicationPreferences?.email ?? true,
        sms: parent.communicationPreferences?.sms ?? true,
        whatsapp: parent.communicationPreferences?.whatsapp ?? false,
        phoneCalls: parent.communicationPreferences?.phoneCalls ?? true
      },
      notes: parent.notes || '',
      isActive: parent.isActive ?? true,
      identification: {
        type: parent.identification?.type || '',
        number: parent.identification?.number || '',
        issuedDate: parent.identification?.issuedDate ? parent.identification.issuedDate.split('T')[0] : '',
        expiryDate: parent.identification?.expiryDate ? parent.identification.expiryDate.split('T')[0] : ''
      }
    })
    
    setIsModalOpen(true)
  }

  const handleView = (parent) => {
    setSelectedParent(parent)
    setViewModalOpen(true)
  }

  const handleDelete = async (parentId) => {
    if (!window.confirm('Are you sure you want to delete this parent? This action cannot be undone.')) {
      return
    }

    try {
      await parentService.deleteParent(parentId)
      alert('Parent deleted successfully!')
      fetchAllData()
    } catch (error) {
      console.error('❌ Error deleting parent:', error)
      alert(error.response?.data?.error || 'Failed to delete parent')
    }
  }

  const handleToggleStatus = async (parentId, currentStatus) => {
    try {
      await parentService.toggleStatus(parentId)
      alert(`Parent ${currentStatus ? 'deactivated' : 'activated'} successfully!`)
      fetchAllData()
    } catch (error) {
      console.error('❌ Error toggling status:', error)
      alert(error.response?.data?.error || 'Failed to update status')
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      alternativePhone: '',
      occupation: '',
      employer: '',
      relationship: 'Guardian',
      children: [],
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Kenya'
      },
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        alternativePhone: ''
      },
      communicationPreferences: {
        email: true,
        sms: true,
        whatsapp: false,
        phoneCalls: true
      },
      notes: '',
      isActive: true,
      identification: {
        type: '',
        number: '',
        issuedDate: '',
        expiryDate: ''
      }
    })
    setEditingParent(null)
  }

  // Helper functions
  const getChildNames = (parent) => {
    if (!parent.children?.length) return 'No children linked'
    
    return parent.children.map(child => {
      if (typeof child === 'object') {
        return `${child.firstName || ''} ${child.lastName || ''}`.trim()
      }
      const found = students.find(s => s._id === child)
      return found ? `${found.firstName || ''} ${found.lastName || ''}`.trim() : 'Unknown'
    }).filter(name => name).join(', ')
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const stats = {
    total: parents.length,
    active: parents.filter(p => p.isActive).length,
    inactive: parents.filter(p => !p.isActive).length,
    withChildren: parents.filter(p => p.children?.length > 0).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Parents Management</h1>
          <p className="text-gray-600">
            {searchTerm ? (
              `Found ${filteredParents.length} of ${parents.length} parents`
            ) : (
              'Manage parent accounts and child associations'
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
            Add Parent
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
              <UserCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Parents</p>
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
            <div className="bg-gray-500 rounded-lg p-3">
              <XCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-2xl font-bold">{stats.inactive}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">With Children</p>
              <p className="text-2xl font-bold">{stats.withChildren}</p>
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
                placeholder="Search by name, email, phone, occupation..."
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
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Parents Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading parents...</p>
          </div>
        ) : filteredParents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <UserCircle className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? 'No parents found' : 'No parents yet'}
            </p>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search.`
                : 'Get started by adding your first parent'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Parent
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParents.map((parent) => (
              <div key={parent._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <UserCircle className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {parent.firstName} {parent.lastName}
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <Mail className="w-3 h-3" /> {parent.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleView(parent)} 
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(parent)} 
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(parent._id)} 
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Parent details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{parent.phone} {parent.alternativePhone && `/ ${parent.alternativePhone}`}</span>
                  </div>

                  {(parent.occupation || parent.employer) && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Briefcase className="w-4 h-4" />
                      <span>
                        {parent.occupation} 
                        {parent.employer && ` at ${parent.employer}`}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-gray-600">
                    <Heart className="w-4 h-4" />
                    <span>Relationship: {parent.relationship}</span>
                  </div>

                  {parent.address?.street && (
                    <div className="flex items-start gap-2 text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span className="truncate">
                        {parent.address.street}, {parent.address.city}, {parent.address.country}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="truncate">Children: {getChildNames(parent)}</span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant={parent.isActive ? 'success' : 'error'}>
                      {parent.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                    <button
                      onClick={() => handleToggleStatus(parent._id, parent.isActive)}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Toggle Status
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Parent Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingParent ? 'Edit Parent' : 'Add New Parent'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Personal Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="First Name"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleInputChange}
                placeholder="Enter first name"
              />
              <Input
                label="Last Name"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleInputChange}
                placeholder="Enter last name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleInputChange}
                placeholder="parent@example.com"
              />
              <Input
                label="Phone"
                name="phone"
                required
                value={formData.phone}
                onChange={handleInputChange}
                placeholder="Phone number"
              />
            </div>

            <div className="mt-4">
              <Input
                label="Alternative Phone"
                name="alternativePhone"
                value={formData.alternativePhone}
                onChange={handleInputChange}
                placeholder="Alternative phone number"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Occupation"
                name="occupation"
                value={formData.occupation}
                onChange={handleInputChange}
                placeholder="e.g., Teacher, Engineer"
              />
              <Input
                label="Employer"
                name="employer"
                value={formData.employer}
                onChange={handleInputChange}
                placeholder="Company/Organization"
              />
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Relationship to Student <span className="text-red-500">*</span>
              </label>
              <select
                name="relationship"
                required
                value={formData.relationship}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                {RELATIONSHIP_OPTIONS.map(rel => (
                  <option key={rel} value={rel}>{rel}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Address</h3>
            <Input
              label="Street Address"
              name="street"
              value={formData.address.street}
              onChange={handleAddressChange}
              placeholder="Street address"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="City"
                name="city"
                value={formData.address.city}
                onChange={handleAddressChange}
                placeholder="City"
              />
              <Input
                label="State/Province"
                name="state"
                value={formData.address.state}
                onChange={handleAddressChange}
                placeholder="State"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Postal Code"
                name="postalCode"
                value={formData.address.postalCode}
                onChange={handleAddressChange}
                placeholder="Postal code"
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <select
                  name="country"
                  value={formData.address.country}
                  onChange={handleAddressChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {COUNTRY_OPTIONS.map(country => (
                    <option key={country} value={country}>{country}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Emergency Contact</h3>
            <Input
              label="Contact Name"
              name="name"
              value={formData.emergencyContact.name}
              onChange={handleEmergencyContactChange}
              placeholder="Emergency contact name"
            />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Relationship"
                name="relationship"
                value={formData.emergencyContact.relationship}
                onChange={handleEmergencyContactChange}
                placeholder="e.g., Spouse, Sibling"
              />
              <Input
                label="Phone"
                name="phone"
                value={formData.emergencyContact.phone}
                onChange={handleEmergencyContactChange}
                placeholder="Phone number"
              />
            </div>
            <div className="mt-4">
              <Input
                label="Alternative Phone"
                name="alternativePhone"
                value={formData.emergencyContact.alternativePhone}
                onChange={handleEmergencyContactChange}
                placeholder="Alternative phone"
              />
            </div>
          </div>

          {/* Children Selection */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Link Children</h3>
            <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto">
              {students.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No students available</p>
              ) : (
                <div className="space-y-2">
                  {students.map(student => (
                    <label key={student._id} className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                      <input
                        type="checkbox"
                        checked={formData.children.includes(student._id)}
                        onChange={() => handleChildSelection(student._id)}
                        className="h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">
                        {student.firstName} {student.lastName} - Grade {student.grade} (ID: {student.studentId})
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {formData.children.length > 0 && (
              <p className="text-sm text-gray-500 mt-2">
                Selected: {formData.children.length} student{formData.children.length !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Communication Preferences */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Communication Preferences</h3>
            <div className="grid grid-cols-2 gap-4">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.communicationPreferences.email}
                  onChange={(e) => handleCommunicationChange('email', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Email</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.communicationPreferences.sms}
                  onChange={(e) => handleCommunicationChange('sms', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">SMS</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.communicationPreferences.whatsapp}
                  onChange={(e) => handleCommunicationChange('whatsapp', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">WhatsApp</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.communicationPreferences.phoneCalls}
                  onChange={(e) => handleCommunicationChange('phoneCalls', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="text-sm text-gray-700">Phone Calls</span>
              </label>
            </div>
          </div>

          {/* Identification */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Identification (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                <select
                  name="type"
                  value={formData.identification.type}
                  onChange={handleIdentificationChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select ID Type</option>
                  {ID_TYPE_OPTIONS.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
              <Input
                label="ID Number"
                name="number"
                value={formData.identification.number}
                onChange={handleIdentificationChange}
                placeholder="ID number"
              />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input
                label="Issue Date"
                name="issuedDate"
                type="date"
                value={formData.identification.issuedDate}
                onChange={handleIdentificationChange}
              />
              <Input
                label="Expiry Date"
                name="expiryDate"
                type="date"
                value={formData.identification.expiryDate}
                onChange={handleIdentificationChange}
              />
            </div>
          </div>

          {/* Additional Notes */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Additional Notes</h3>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Any additional information about the parent..."
            />
          </div>

          {/* Status */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Status</h3>
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                className="h-4 w-4 text-blue-600 rounded"
              />
              <span className="text-sm text-gray-700">Active (visible and usable in the system)</span>
            </label>
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
              {submitting ? 'Saving...' : (editingParent ? 'Update Parent' : 'Create Parent')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Parent Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Parent Details"
        size="lg"
      >
        {selectedParent && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                <UserCircle className="w-8 h-8 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedParent.firstName} {selectedParent.lastName}
                </h3>
                <p className="text-gray-600 flex items-center gap-1">
                  <Mail className="w-4 h-4" /> {selectedParent.email}
                </p>
                <Badge 
                  variant={selectedParent.isActive ? 'success' : 'error'}
                  className="mt-2"
                >
                  {selectedParent.isActive ? 'Active' : 'Inactive'}
                </Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    <p><strong>Phone:</strong> {selectedParent.phone}</p>
                    {selectedParent.alternativePhone && (
                      <p><strong>Alternative:</strong> {selectedParent.alternativePhone}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Professional</h4>
                  <div className="space-y-2">
                    <p><strong>Occupation:</strong> {selectedParent.occupation || 'N/A'}</p>
                    <p><strong>Employer:</strong> {selectedParent.employer || 'N/A'}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Relationship</h4>
                  <p><strong>Relationship to Student:</strong> {selectedParent.relationship}</p>
                </div>

                {selectedParent.address && (selectedParent.address.street || selectedParent.address.city) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                    <div className="space-y-1">
                      <p>{selectedParent.address.street}</p>
                      <p>
                        {selectedParent.address.city}
                        {selectedParent.address.state && `, ${selectedParent.address.state}`}
                        {selectedParent.address.postalCode && ` ${selectedParent.address.postalCode}`}
                      </p>
                      <p>{selectedParent.address.country}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Children</h4>
                  <div className="space-y-2">
                    {selectedParent.children?.length > 0 ? (
                      selectedParent.children.map((child, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <p className="font-medium">
                            {typeof child === 'object' 
                              ? `${child.firstName} ${child.lastName}`
                              : `Student ID: ${child}`}
                          </p>
                          {typeof child === 'object' && (
                            <p className="text-sm text-gray-600">Grade: {child.grade}</p>
                          )}
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-400">No children linked</p>
                    )}
                  </div>
                </div>

                {selectedParent.emergencyContact?.name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Emergency Contact</h4>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <p><strong>Name:</strong> {selectedParent.emergencyContact.name}</p>
                      <p><strong>Relationship:</strong> {selectedParent.emergencyContact.relationship}</p>
                      <p><strong>Phone:</strong> {selectedParent.emergencyContact.phone}</p>
                      {selectedParent.emergencyContact.alternativePhone && (
                        <p><strong>Alternative:</strong> {selectedParent.emergencyContact.alternativePhone}</p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Communication Preferences</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedParent.communicationPreferences?.email && (
                      <Badge variant="info">Email</Badge>
                    )}
                    {selectedParent.communicationPreferences?.sms && (
                      <Badge variant="info">SMS</Badge>
                    )}
                    {selectedParent.communicationPreferences?.whatsapp && (
                      <Badge variant="info">WhatsApp</Badge>
                    )}
                    {selectedParent.communicationPreferences?.phoneCalls && (
                      <Badge variant="info">Phone Calls</Badge>
                    )}
                  </div>
                </div>

                {selectedParent.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {selectedParent.notes}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  <p>Created: {formatDate(selectedParent.createdAt)}</p>
                  <p>Last Updated: {formatDate(selectedParent.updatedAt)}</p>
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
                handleEdit(selectedParent)
              }}>
                Edit Parent
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Parents