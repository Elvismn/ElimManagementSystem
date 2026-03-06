import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, RefreshCw, Edit, Trash2, Eye, User, 
  Calendar, Users, MapPin, Phone, Mail, AlertCircle,
  Heart, UserPlus, X, ChevronDown, ChevronUp
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { studentService, parentService } from '../services/apiService'

// Badge component
const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
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
const GRADE_LEVELS = [
  "Nursery", "KG1", "KG2", "Grade 1", "Grade 2", "Grade 3", "Grade 4", 
  "Grade 5", "Grade 6", "Grade 7", "Grade 8", "Grade 9", "Grade 10", 
  "Grade 11", "Grade 12"
]

const GENDER_OPTIONS = ["Male", "Female", "Other"]

const STATUS_OPTIONS = ["Active", "Inactive", "Transferred", "Graduated", "Suspended"]

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"]

const Students = () => {
  const [students, setStudents] = useState([])
  const [parents, setParents] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    emergency: true,
    medical: true,
    parents: true
  })

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)

  // Form data matching backend schema exactly
  const [formData, setFormData] = useState({
    // Basic Information
    firstName: '',
    lastName: '',
    studentId: '',
    grade: '',
    dateOfBirth: '',
    gender: 'Male',
    
    // Relationships
    parents: [],
    classroom: '',
    
    // Address (object as per backend)
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Kenya'
    },
    
    // Emergency Contacts (array of objects)
    emergencyContacts: [{
      name: '',
      phone: '',
      relationship: '',
      isPrimary: true
    }],
    
    // Medical Information (object as per backend)
    medicalInfo: {
      bloodGroup: '',
      allergies: [],
      medications: [],
      conditions: [],
      doctorName: '',
      doctorPhone: '',
      notes: ''
    },
    
    // Status
    status: 'Active',
    enrollmentDate: new Date().toISOString().split('T')[0],
    profilePicture: null
  })

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [studentsRes, parentsRes] = await Promise.all([
        studentService.getStudents(),
        parentService.getParents({ limit: 100 })
      ])

      const studentsData = studentsRes.data?.data?.students || studentsRes.data?.students || []
      const parentsData = parentsRes.data?.data?.parents || parentsRes.data?.parents || []

      setStudents(studentsData)
      setParents(parentsData)
      setError('')
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      setError('Failed to load data. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Filter students based on search and status
  const filteredStudents = useMemo(() => {
    if (!Array.isArray(students)) return []
    
    return students.filter(student => {
      const matchesSearch = !searchTerm || (
        (student.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.studentId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (student.grade?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      
      const matchesStatus = statusFilter === 'all' || student.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [students, searchTerm, statusFilter])

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
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

  const handleEmergencyContactChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: prev.emergencyContacts.map((contact, i) => 
        i === index ? { ...contact, [field]: value } : contact
      )
    }))
  }

  const addEmergencyContact = () => {
    setFormData(prev => ({
      ...prev,
      emergencyContacts: [
        ...prev.emergencyContacts,
        { name: '', phone: '', relationship: '', isPrimary: false }
      ]
    }))
  }

  const removeEmergencyContact = (index) => {
    if (formData.emergencyContacts.length > 1) {
      setFormData(prev => ({
        ...prev,
        emergencyContacts: prev.emergencyContacts.filter((_, i) => i !== index)
      }))
    }
  }

  const handleMedicalInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        ...prev.medicalInfo,
        [field]: value
      }
    }))
  }

  const handleArrayFieldChange = (field, value) => {
    // Convert comma-separated string to array
    const array = value.split(',').map(item => item.trim()).filter(item => item)
    setFormData(prev => ({
      ...prev,
      medicalInfo: {
        ...prev.medicalInfo,
        [field]: array
      }
    }))
  }

  const handleParentSelection = (e) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value)
    setFormData(prev => ({ ...prev, parents: selectedOptions }))
  }

  // CRUD Operations
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Prepare data matching backend schema exactly
      const studentData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        studentId: formData.studentId.trim(),
        grade: formData.grade,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        parents: formData.parents,
        classroom: formData.classroom || undefined,
        address: {
          street: formData.address.street.trim(),
          city: formData.address.city.trim(),
          state: formData.address.state.trim(),
          postalCode: formData.address.postalCode.trim(),
          country: formData.address.country
        },
        emergencyContacts: formData.emergencyContacts.filter(ec => ec.name && ec.phone),
        medicalInfo: {
          bloodGroup: formData.medicalInfo.bloodGroup || undefined,
          allergies: formData.medicalInfo.allergies,
          medications: formData.medicalInfo.medications,
          conditions: formData.medicalInfo.conditions,
          doctorName: formData.medicalInfo.doctorName.trim() || undefined,
          doctorPhone: formData.medicalInfo.doctorPhone.trim() || undefined,
          notes: formData.medicalInfo.notes.trim() || undefined
        },
        enrollmentDate: formData.enrollmentDate || new Date(),
        status: formData.status
      }

      console.log('Submitting student data:', studentData)

      if (editingStudent) {
        await studentService.updateStudent(editingStudent._id, studentData)
        alert('Student updated successfully!')
      } else {
        await studentService.createStudent(studentData)
        alert('Student created successfully!')
      }

      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error('❌ Error saving student:', error)
      setError(error.response?.data?.error || 'Failed to save student')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (student) => {
    setEditingStudent(student)
    
    // Populate form with student data
    setFormData({
      firstName: student.firstName || '',
      lastName: student.lastName || '',
      studentId: student.studentId || '',
      grade: student.grade || '',
      dateOfBirth: student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '',
      gender: student.gender || 'Male',
      parents: student.parents?.map(p => p._id || p) || [],
      classroom: student.classroom?._id || student.classroom || '',
      address: {
        street: student.address?.street || '',
        city: student.address?.city || '',
        state: student.address?.state || '',
        postalCode: student.address?.postalCode || '',
        country: student.address?.country || 'Kenya'
      },
      emergencyContacts: student.emergencyContacts?.length ? student.emergencyContacts : [{
        name: '',
        phone: '',
        relationship: '',
        isPrimary: true
      }],
      medicalInfo: {
        bloodGroup: student.medicalInfo?.bloodGroup || '',
        allergies: student.medicalInfo?.allergies || [],
        medications: student.medicalInfo?.medications || [],
        conditions: student.medicalInfo?.conditions || [],
        doctorName: student.medicalInfo?.doctorName || '',
        doctorPhone: student.medicalInfo?.doctorPhone || '',
        notes: student.medicalInfo?.notes || ''
      },
      status: student.status || 'Active',
      enrollmentDate: student.enrollmentDate ? student.enrollmentDate.split('T')[0] : new Date().toISOString().split('T')[0],
      profilePicture: student.profilePicture || null
    })
    
    setIsModalOpen(true)
  }

  const handleView = (student) => {
    setSelectedStudent(student)
    setViewModalOpen(true)
  }

  const handleDelete = async (studentId) => {
    if (!window.confirm('Are you sure you want to delete this student? This action cannot be undone.')) {
      return
    }

    try {
      await studentService.deleteStudent(studentId)
      alert('Student deleted successfully!')
      fetchAllData()
    } catch (error) {
      console.error('❌ Error deleting student:', error)
      alert(error.response?.data?.error || 'Failed to delete student')
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      studentId: '',
      grade: '',
      dateOfBirth: '',
      gender: 'Male',
      parents: [],
      classroom: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Kenya'
      },
      emergencyContacts: [{
        name: '',
        phone: '',
        relationship: '',
        isPrimary: true
      }],
      medicalInfo: {
        bloodGroup: '',
        allergies: [],
        medications: [],
        conditions: [],
        doctorName: '',
        doctorPhone: '',
        notes: ''
      },
      status: 'Active',
      enrollmentDate: new Date().toISOString().split('T')[0],
      profilePicture: null
    })
    setEditingStudent(null)
  }

  // Helper functions
  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Active': return 'success'
      case 'Inactive': return 'error'
      case 'Graduated': return 'purple'
      case 'Transferred': return 'info'
      case 'Suspended': return 'warning'
      default: return 'default'
    }
  }

  const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 'N/A'
    const today = new Date()
    const birthDate = new Date(dateOfBirth)
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getParentNames = (student) => {
    if (!student.parents?.length) return 'No parents assigned'
    
    return student.parents.map(parent => {
      if (typeof parent === 'object') {
        return `${parent.firstName || ''} ${parent.lastName || ''}`.trim()
      }
      const found = parents.find(p => p._id === parent)
      return found ? `${found.firstName || ''} ${found.lastName || ''}`.trim() : 'Unknown'
    }).filter(name => name).join(', ') || 'No parents assigned'
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students Management</h1>
          <p className="text-gray-600">
            {searchTerm ? (
              `Found ${filteredStudents.length} of ${students.length} students`
            ) : (
              'Manage student information and records'
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
            Add Student
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

      {/* Search and Filter */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, ID, or grade..."
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

      {/* Students Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading students...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <User className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? 'No students found' : 'No students yet'}
            </p>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search.`
                : 'Get started by adding your first student'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Student
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStudents.map((student) => (
              <div key={student._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      {student.profilePicture ? (
                        <img src={student.profilePicture} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <User className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {student.firstName} {student.lastName}
                      </h3>
                      <p className="text-xs text-gray-500">ID: {student.studentId}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleView(student)} 
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(student)} 
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(student._id)} 
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Student details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>Age: {calculateAge(student.dateOfBirth)} | Grade: {student.grade}</span>
                  </div>

                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4" />
                    <span className="truncate">{getParentNames(student)}</span>
                  </div>

                  {student.address?.street && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{student.address.street}, {student.address.city}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant={getStatusBadgeVariant(student.status)}>
                      {student.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Enrolled: {formatDate(student.enrollmentDate || student.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingStudent ? 'Edit Student' : 'Add New Student'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Personal Information Section */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('personal')}
            >
              <h3 className="font-semibold text-gray-900">Personal Information</h3>
              {expandedSections.personal ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.personal && (
              <div className="p-4 space-y-4">
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

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Student ID"
                    name="studentId"
                    required
                    value={formData.studentId}
                    onChange={handleInputChange}
                    placeholder="e.g., STU001"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grade <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="grade"
                      required
                      value={formData.grade}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Grade</option>
                      {GRADE_LEVELS.map(grade => (
                        <option key={grade} value={grade}>{grade}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="gender"
                      required
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {GENDER_OPTIONS.map(gender => (
                        <option key={gender} value={gender}>{gender}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Enrollment Date</label>
                  <input
                    type="date"
                    name="enrollmentDate"
                    value={formData.enrollmentDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    {STATUS_OPTIONS.map(status => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Parents Section */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('parents')}
            >
              <h3 className="font-semibold text-gray-900">Parents/Guardians</h3>
              {expandedSections.parents ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.parents && (
              <div className="p-4">
                <select
                  multiple
                  value={formData.parents}
                  onChange={handleParentSelection}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
                >
                  {parents.map(parent => (
                    <option key={parent._id} value={parent._id}>
                      {parent.firstName} {parent.lastName} - {parent.relationship || 'Parent'}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple parents</p>
                {parents.length === 0 && (
                  <p className="text-sm text-amber-600 mt-2">
                    No parents found. Please add parents first.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Address Section */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('address')}
            >
              <h3 className="font-semibold text-gray-900">Address</h3>
              {expandedSections.address ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.address && (
              <div className="p-4 space-y-4">
                <Input
                  label="Street Address"
                  name="street"
                  value={formData.address.street}
                  onChange={handleAddressChange}
                  placeholder="Street address"
                />
                <div className="grid grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Postal Code"
                    name="postalCode"
                    value={formData.address.postalCode}
                    onChange={handleAddressChange}
                    placeholder="Postal code"
                  />
                  <Input
                    label="Country"
                    name="country"
                    value={formData.address.country}
                    onChange={handleAddressChange}
                    placeholder="Country"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contacts Section */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('emergency')}
            >
              <h3 className="font-semibold text-gray-900">Emergency Contacts</h3>
              {expandedSections.emergency ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.emergency && (
              <div className="p-4 space-y-4">
                {formData.emergencyContacts.map((contact, index) => (
                  <div key={index} className="border rounded-lg p-4 relative">
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={() => removeEmergencyContact(index)}
                        className="absolute top-2 right-2 text-red-500 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        label="Name"
                        value={contact.name}
                        onChange={(e) => handleEmergencyContactChange(index, 'name', e.target.value)}
                        placeholder="Contact name"
                      />
                      <Input
                        label="Phone"
                        value={contact.phone}
                        onChange={(e) => handleEmergencyContactChange(index, 'phone', e.target.value)}
                        placeholder="Phone number"
                      />
                      <Input
                        label="Relationship"
                        value={contact.relationship}
                        onChange={(e) => handleEmergencyContactChange(index, 'relationship', e.target.value)}
                        placeholder="e.g., Father, Mother"
                      />
                    </div>
                    <div className="mt-2 flex items-center">
                      <input
                        type="checkbox"
                        id={`primary-${index}`}
                        checked={contact.isPrimary}
                        onChange={(e) => handleEmergencyContactChange(index, 'isPrimary', e.target.checked)}
                        className="mr-2"
                      />
                      <label htmlFor={`primary-${index}`} className="text-sm text-gray-600">
                        Primary emergency contact
                      </label>
                    </div>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addEmergencyContact}
                  className="w-full"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Another Emergency Contact
                </Button>
              </div>
            )}
          </div>

          {/* Medical Information Section */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('medical')}
            >
              <h3 className="font-semibold text-gray-900">Medical Information</h3>
              {expandedSections.medical ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.medical && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Blood Group</label>
                    <select
                      value={formData.medicalInfo.bloodGroup}
                      onChange={(e) => handleMedicalInfoChange('bloodGroup', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Blood Group</option>
                      {BLOOD_GROUPS.map(bg => (
                        <option key={bg} value={bg}>{bg}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Allergies (comma separated)"
                    value={formData.medicalInfo.allergies.join(', ')}
                    onChange={(e) => handleArrayFieldChange('allergies', e.target.value)}
                    placeholder="e.g., Peanuts, Dust, Penicillin"
                  />
                  <Input
                    label="Medications (comma separated)"
                    value={formData.medicalInfo.medications.join(', ')}
                    onChange={(e) => handleArrayFieldChange('medications', e.target.value)}
                    placeholder="e.g., Ventolin, EpiPen"
                  />
                </div>

                <Input
                  label="Medical Conditions (comma separated)"
                  value={formData.medicalInfo.conditions.join(', ')}
                  onChange={(e) => handleArrayFieldChange('conditions', e.target.value)}
                  placeholder="e.g., Asthma, Diabetes"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Doctor Name"
                    value={formData.medicalInfo.doctorName}
                    onChange={(e) => handleMedicalInfoChange('doctorName', e.target.value)}
                    placeholder="Primary care physician"
                  />
                  <Input
                    label="Doctor Phone"
                    value={formData.medicalInfo.doctorPhone}
                    onChange={(e) => handleMedicalInfoChange('doctorPhone', e.target.value)}
                    placeholder="Doctor's contact number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    value={formData.medicalInfo.notes}
                    onChange={(e) => handleMedicalInfoChange('notes', e.target.value)}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Any additional medical information"
                  />
                </div>
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
              {submitting ? 'Saving...' : (editingStudent ? 'Update Student' : 'Create Student')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Student Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Student Details"
        size="lg"
      >
        {selectedStudent && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                {selectedStudent.profilePicture ? (
                  <img src={selectedStudent.profilePicture} alt="" className="w-16 h-16 rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedStudent.firstName} {selectedStudent.lastName}
                </h3>
                <p className="text-gray-600">ID: {selectedStudent.studentId}</p>
                <Badge 
                  variant={getStatusBadgeVariant(selectedStudent.status)}
                  className="mt-2"
                >
                  {selectedStudent.status}
                </Badge>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h4>
                  <div className="space-y-2">
                    <p><strong>Age:</strong> {calculateAge(selectedStudent.dateOfBirth)}</p>
                    <p><strong>Gender:</strong> {selectedStudent.gender}</p>
                    <p><strong>Date of Birth:</strong> {formatDate(selectedStudent.dateOfBirth)}</p>
                    <p><strong>Grade:</strong> {selectedStudent.grade}</p>
                    <p><strong>Enrollment Date:</strong> {formatDate(selectedStudent.enrollmentDate || selectedStudent.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                  <div className="space-y-2">
                    {selectedStudent.address?.street && <p>{selectedStudent.address.street}</p>}
                    {selectedStudent.address?.city && (
                      <p>
                        {selectedStudent.address.city}
                        {selectedStudent.address.state && `, ${selectedStudent.address.state}`}
                        {selectedStudent.address.postalCode && ` ${selectedStudent.address.postalCode}`}
                      </p>
                    )}
                    {selectedStudent.address?.country && <p>{selectedStudent.address.country}</p>}
                    {!selectedStudent.address?.street && <p className="text-gray-400">No address provided</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Parents/Guardians</h4>
                  <p><strong>Parents:</strong> {getParentNames(selectedStudent)}</p>
                </div>

                {selectedStudent.emergencyContacts?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Emergency Contacts</h4>
                    <div className="space-y-3">
                      {selectedStudent.emergencyContacts.map((contact, idx) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <p className="font-medium">{contact.name} {contact.isPrimary && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded ml-2">Primary</span>}</p>
                          <p className="text-sm">Phone: {contact.phone}</p>
                          <p className="text-sm">Relationship: {contact.relationship}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStudent.medicalInfo && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Medical Information</h4>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                      {selectedStudent.medicalInfo.bloodGroup && (
                        <p><strong>Blood Group:</strong> {selectedStudent.medicalInfo.bloodGroup}</p>
                      )}
                      {selectedStudent.medicalInfo.allergies?.length > 0 && (
                        <p><strong>Allergies:</strong> {selectedStudent.medicalInfo.allergies.join(', ')}</p>
                      )}
                      {selectedStudent.medicalInfo.medications?.length > 0 && (
                        <p><strong>Medications:</strong> {selectedStudent.medicalInfo.medications.join(', ')}</p>
                      )}
                      {selectedStudent.medicalInfo.conditions?.length > 0 && (
                        <p><strong>Conditions:</strong> {selectedStudent.medicalInfo.conditions.join(', ')}</p>
                      )}
                      {selectedStudent.medicalInfo.doctorName && (
                        <p><strong>Doctor:</strong> {selectedStudent.medicalInfo.doctorName} {selectedStudent.medicalInfo.doctorPhone && `(${selectedStudent.medicalInfo.doctorPhone})`}</p>
                      )}
                      {selectedStudent.medicalInfo.notes && (
                        <p><strong>Notes:</strong> {selectedStudent.medicalInfo.notes}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                setViewModalOpen(false)
                handleEdit(selectedStudent)
              }}>
                Edit Student
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Students