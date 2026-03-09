import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, Briefcase, User, Mail, Phone, Edit, Trash2, 
  RefreshCw, GraduationCap, BookOpen, Award, Calendar, DollarSign, 
  Building, MapPin, Heart, FileText, CheckCircle, XCircle, Eye,
  ChevronDown, ChevronUp, UserPlus, Clock, AlertCircle
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { staffService, departmentService } from '../services/apiService'

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
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Temporary"]
const PAYMENT_FREQUENCIES = ["Monthly", "Bi-weekly", "Weekly"]
const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"]
const MARITAL_STATUS = ["Single", "Married", "Divorced", "Widowed", "Other"]
const NATIONALITY = ["Kenyan", "Ugandan", "Tanzanian", "Rwandan", "Burundian", "Other"]
const ID_TYPES = ["National ID", "Passport", "Alien ID", "Other"]
const STATUS_OPTIONS = ["Active", "Inactive", "On Leave", "Terminated", "Resigned", "Retired"]

// Days of week for work schedule
const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Monday' },
  { key: 'tuesday', label: 'Tuesday' },
  { key: 'wednesday', label: 'Wednesday' },
  { key: 'thursday', label: 'Thursday' },
  { key: 'friday', label: 'Friday' },
  { key: 'saturday', label: 'Saturday' },
  { key: 'sunday', label: 'Sunday' }
]

const Staff = () => {
  const [staff, setStaff] = useState([])
  const [departments, setDepartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState(null)
  const [selectedStaff, setSelectedStaff] = useState(null)

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    personal: true,
    professional: true,
    employment: true,
    compensation: true,
    qualifications: true,
    emergency: true,
    address: true,
    schedule: true,
    identification: true
  })

  // Form data matching backend schema exactly
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    alternativePhone: '',
    
    // Professional Information
    employeeId: '',
    position: '',
    jobTitle: '',
    department: '',
    
    // Employment Details
    employmentType: 'Full-time',
    hireDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    
    // Compensation
    salary: {
      amount: '',
      currency: 'KES',
      paymentFrequency: 'Monthly',
      bankDetails: {
        bankName: '',
        accountName: '',
        accountNumber: '',
        branchCode: ''
      }
    },
    
    // Qualifications
    qualifications: [],
    certifications: [],
    subjects: [],
    skills: [],
    
    // Emergency Contact
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      alternativePhone: '',
      email: '',
      address: ''
    },
    
    // Address
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Kenya'
    },
    
    // Personal Details
    dateOfBirth: '',
    gender: '',
    maritalStatus: '',
    nationality: 'Kenyan',
    
    // Identification
    identification: {
      type: '',
      number: '',
      issuedDate: '',
      expiryDate: '',
      document: ''
    },
    
    // Work Schedule
    workSchedule: {
      monday: { start: '09:00', end: '17:00', isWorking: true },
      tuesday: { start: '09:00', end: '17:00', isWorking: true },
      wednesday: { start: '09:00', end: '17:00', isWorking: true },
      thursday: { start: '09:00', end: '17:00', isWorking: true },
      friday: { start: '09:00', end: '17:00', isWorking: true },
      saturday: { start: '', end: '', isWorking: false },
      sunday: { start: '', end: '', isWorking: false }
    },
    
    // Leave Balance
    leaveBalance: {
      annual: 21,
      sick: 12,
      personal: 5,
      unpaid: 0
    },
    
    // Status
    status: 'Active',
    
    // Notes
    notes: '',
    
    // Profile
    profilePicture: null
  })

  // Temporary input states for arrays
  const [qualificationInput, setQualificationInput] = useState({
    degree: '',
    institution: '',
    yearCompleted: '',
    grade: ''
  })
  
  const [certificationInput, setCertificationInput] = useState({
    name: '',
    issuingOrganization: '',
    issueDate: '',
    expiryDate: '',
    certificateId: ''
  })
  
  const [skillInput, setSkillInput] = useState('')

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [staffRes, deptRes] = await Promise.all([
        staffService.getStaff({ limit: 100 }),
        departmentService.getDepartments({ limit: 100 })
      ])

      const staffData = staffRes.data?.data?.staff || staffRes.data?.staff || []
      const departmentsData = deptRes.data?.data?.departments || deptRes.data?.departments || []

      setStaff(staffData)
      setDepartments(departmentsData)
      setError('')
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      setError('Failed to load data. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Filter staff based on search and status
  const filteredStaff = useMemo(() => {
    if (!Array.isArray(staff)) return []
    
    return staff.filter(member => {
      // Search filter
      const matchesSearch = !searchTerm || (
        (member.firstName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.lastName?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (member.position?.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || member.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
  }, [staff, searchTerm, statusFilter])

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      // Handle nested objects (e.g., 'salary.amount')
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

  const handleBankDetailsChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      salary: {
        ...prev.salary,
        bankDetails: {
          ...prev.salary.bankDetails,
          [name]: value
        }
      }
    }))
  }

  const handleWorkScheduleChange = (day, field, value) => {
    setFormData(prev => ({
      ...prev,
      workSchedule: {
        ...prev.workSchedule,
        [day]: {
          ...prev.workSchedule[day],
          [field]: value
        }
      }
    }))
  }

  const handleLeaveBalanceChange = (type, value) => {
    setFormData(prev => ({
      ...prev,
      leaveBalance: {
        ...prev.leaveBalance,
        [type]: parseInt(value) || 0
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

  // Array handlers
  const addQualification = () => {
    if (qualificationInput.degree && qualificationInput.institution) {
      setFormData(prev => ({
        ...prev,
        qualifications: [...prev.qualifications, { ...qualificationInput }]
      }))
      setQualificationInput({
        degree: '',
        institution: '',
        yearCompleted: '',
        grade: ''
      })
    }
  }

  const removeQualification = (index) => {
    setFormData(prev => ({
      ...prev,
      qualifications: prev.qualifications.filter((_, i) => i !== index)
    }))
  }

  const addCertification = () => {
    if (certificationInput.name && certificationInput.issuingOrganization) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, { ...certificationInput }]
      }))
      setCertificationInput({
        name: '',
        issuingOrganization: '',
        issueDate: '',
        expiryDate: '',
        certificateId: ''
      })
    }
  }

  const removeCertification = (index) => {
    setFormData(prev => ({
      ...prev,
        certifications: prev.certifications.filter((_, i) => i !== index)
    }))
  }

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }))
      setSkillInput('')
    }
  }

  const removeSkill = (index) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter((_, i) => i !== index)
    }))
  }

  // CRUD Operations
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Prepare data matching backend schema
      const staffData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        alternativePhone: formData.alternativePhone.trim() || undefined,
        employeeId: formData.employeeId.trim(),
        position: formData.position,
        jobTitle: formData.jobTitle.trim() || undefined,
        department: formData.department,
        employmentType: formData.employmentType,
        hireDate: formData.hireDate,
        contractEndDate: formData.contractEndDate || undefined,
        salary: {
          amount: formData.salary.amount ? parseFloat(formData.salary.amount) : undefined,
          currency: formData.salary.currency,
          paymentFrequency: formData.salary.paymentFrequency,
          bankDetails: {
            bankName: formData.salary.bankDetails.bankName.trim() || undefined,
            accountName: formData.salary.bankDetails.accountName.trim() || undefined,
            accountNumber: formData.salary.bankDetails.accountNumber.trim() || undefined,
            branchCode: formData.salary.bankDetails.branchCode.trim() || undefined
          }
        },
        qualifications: formData.qualifications,
        certifications: formData.certifications,
        subjects: formData.subjects,
        skills: formData.skills,
        emergencyContact: {
          name: formData.emergencyContact.name.trim() || undefined,
          relationship: formData.emergencyContact.relationship.trim() || undefined,
          phone: formData.emergencyContact.phone.trim() || undefined,
          alternativePhone: formData.emergencyContact.alternativePhone.trim() || undefined,
          email: formData.emergencyContact.email.trim() || undefined,
          address: formData.emergencyContact.address.trim() || undefined
        },
        address: {
          street: formData.address.street.trim() || undefined,
          city: formData.address.city.trim() || undefined,
          state: formData.address.state.trim() || undefined,
          postalCode: formData.address.postalCode.trim() || undefined,
          country: formData.address.country
        },
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        maritalStatus: formData.maritalStatus || undefined,
        nationality: formData.nationality,
        identification: {
          type: formData.identification.type || undefined,
          number: formData.identification.number.trim() || undefined,
          issuedDate: formData.identification.issuedDate || undefined,
          expiryDate: formData.identification.expiryDate || undefined,
          document: formData.identification.document || undefined
        },
        workSchedule: formData.workSchedule,
        leaveBalance: formData.leaveBalance,
        status: formData.status,
        notes: formData.notes.trim() || undefined
      }

      console.log('Submitting staff data:', staffData)

      if (editingStaff) {
        await staffService.updateStaff(editingStaff._id, staffData)
        alert('Staff updated successfully!')
      } else {
        await staffService.createStaff(staffData)
        alert('Staff created successfully!')
      }

      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error('❌ Error saving staff:', error)
      setError(error.response?.data?.error || 'Failed to save staff')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (staffMember) => {
    setEditingStaff(staffMember)
    
    // Populate form with staff data
    setFormData({
      firstName: staffMember.firstName || '',
      lastName: staffMember.lastName || '',
      email: staffMember.email || '',
      phone: staffMember.phone || '',
      alternativePhone: staffMember.alternativePhone || '',
      employeeId: staffMember.employeeId || '',
      position: staffMember.position || '',
      jobTitle: staffMember.jobTitle || '',
      department: staffMember.department?._id || staffMember.department || '',
      employmentType: staffMember.employmentType || 'Full-time',
      hireDate: staffMember.hireDate ? staffMember.hireDate.split('T')[0] : new Date().toISOString().split('T')[0],
      contractEndDate: staffMember.contractEndDate ? staffMember.contractEndDate.split('T')[0] : '',
      salary: {
        amount: staffMember.salary?.amount || '',
        currency: staffMember.salary?.currency || 'KES',
        paymentFrequency: staffMember.salary?.paymentFrequency || 'Monthly',
        bankDetails: {
          bankName: staffMember.salary?.bankDetails?.bankName || '',
          accountName: staffMember.salary?.bankDetails?.accountName || '',
          accountNumber: staffMember.salary?.bankDetails?.accountNumber || '',
          branchCode: staffMember.salary?.bankDetails?.branchCode || ''
        }
      },
      qualifications: staffMember.qualifications || [],
      certifications: staffMember.certifications || [],
      subjects: staffMember.subjects?.map(s => s._id || s) || [],
      skills: staffMember.skills || [],
      emergencyContact: {
        name: staffMember.emergencyContact?.name || '',
        relationship: staffMember.emergencyContact?.relationship || '',
        phone: staffMember.emergencyContact?.phone || '',
        alternativePhone: staffMember.emergencyContact?.alternativePhone || '',
        email: staffMember.emergencyContact?.email || '',
        address: staffMember.emergencyContact?.address || ''
      },
      address: {
        street: staffMember.address?.street || '',
        city: staffMember.address?.city || '',
        state: staffMember.address?.state || '',
        postalCode: staffMember.address?.postalCode || '',
        country: staffMember.address?.country || 'Kenya'
      },
      dateOfBirth: staffMember.dateOfBirth ? staffMember.dateOfBirth.split('T')[0] : '',
      gender: staffMember.gender || '',
      maritalStatus: staffMember.maritalStatus || '',
      nationality: staffMember.nationality || 'Kenyan',
      identification: {
        type: staffMember.identification?.type || '',
        number: staffMember.identification?.number || '',
        issuedDate: staffMember.identification?.issuedDate ? staffMember.identification.issuedDate.split('T')[0] : '',
        expiryDate: staffMember.identification?.expiryDate ? staffMember.identification.expiryDate.split('T')[0] : '',
        document: staffMember.identification?.document || ''
      },
      workSchedule: staffMember.workSchedule || {
        monday: { start: '09:00', end: '17:00', isWorking: true },
        tuesday: { start: '09:00', end: '17:00', isWorking: true },
        wednesday: { start: '09:00', end: '17:00', isWorking: true },
        thursday: { start: '09:00', end: '17:00', isWorking: true },
        friday: { start: '09:00', end: '17:00', isWorking: true },
        saturday: { start: '', end: '', isWorking: false },
        sunday: { start: '', end: '', isWorking: false }
      },
      leaveBalance: staffMember.leaveBalance || {
        annual: 21,
        sick: 12,
        personal: 5,
        unpaid: 0
      },
      status: staffMember.status || 'Active',
      notes: staffMember.notes || '',
      profilePicture: staffMember.profilePicture || null
    })
    
    setIsModalOpen(true)
  }

  const handleView = (staffMember) => {
    setSelectedStaff(staffMember)
    setViewModalOpen(true)
  }

  const handleDelete = async (staffId) => {
    if (!window.confirm('Are you sure you want to delete this staff member? This action cannot be undone.')) {
      return
    }

    try {
      await staffService.deleteStaff(staffId)
      alert('Staff deleted successfully!')
      fetchAllData()
    } catch (error) {
      console.error('❌ Error deleting staff:', error)
      alert(error.response?.data?.error || 'Failed to delete staff')
    }
  }

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      alternativePhone: '',
      employeeId: '',
      position: '',
      jobTitle: '',
      department: '',
      employmentType: 'Full-time',
      hireDate: new Date().toISOString().split('T')[0],
      contractEndDate: '',
      salary: {
        amount: '',
        currency: 'KES',
        paymentFrequency: 'Monthly',
        bankDetails: {
          bankName: '',
          accountName: '',
          accountNumber: '',
          branchCode: ''
        }
      },
      qualifications: [],
      certifications: [],
      subjects: [],
      skills: [],
      emergencyContact: {
        name: '',
        relationship: '',
        phone: '',
        alternativePhone: '',
        email: '',
        address: ''
      },
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Kenya'
      },
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      nationality: 'Kenyan',
      identification: {
        type: '',
        number: '',
        issuedDate: '',
        expiryDate: '',
        document: ''
      },
      workSchedule: {
        monday: { start: '09:00', end: '17:00', isWorking: true },
        tuesday: { start: '09:00', end: '17:00', isWorking: true },
        wednesday: { start: '09:00', end: '17:00', isWorking: true },
        thursday: { start: '09:00', end: '17:00', isWorking: true },
        friday: { start: '09:00', end: '17:00', isWorking: true },
        saturday: { start: '', end: '', isWorking: false },
        sunday: { start: '', end: '', isWorking: false }
      },
      leaveBalance: {
        annual: 21,
        sick: 12,
        personal: 5,
        unpaid: 0
      },
      status: 'Active',
      notes: '',
      profilePicture: null
    })
    setEditingStaff(null)
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
      case 'On Leave': return 'warning'
      case 'Terminated': return 'error'
      case 'Resigned': return 'warning'
      case 'Retired': return 'info'
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

  const calculateYearsOfService = (hireDate) => {
    if (!hireDate) return 'N/A'
    const today = new Date()
    const hire = new Date(hireDate)
    const years = (today - hire) / (365.25 * 24 * 60 * 60 * 1000)
    return years.toFixed(1)
  }

  // Stats
  const stats = {
    total: staff.length,
    active: staff.filter(s => s.status === 'Active').length,
    onLeave: staff.filter(s => s.status === 'On Leave').length,
    teaching: staff.filter(s => s.position?.toLowerCase().includes('teacher')).length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
          <p className="text-gray-600">
            {searchTerm ? (
              `Found ${filteredStaff.length} of ${staff.length} staff members`
            ) : (
              'Manage school staff and personnel'
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
            Add Staff
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
              <Briefcase className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total Staff</p>
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
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">On Leave</p>
              <p className="text-2xl font-bold">{stats.onLeave}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Teaching Staff</p>
              <p className="text-2xl font-bold">{stats.teaching}</p>
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
                placeholder="Search by name, employee ID, position, email..."
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

      {/* Staff Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading staff...</p>
          </div>
        ) : filteredStaff.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Briefcase className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? 'No staff members found' : 'No staff yet'}
            </p>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search.`
                : 'Get started by adding your first staff member'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Staff
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((member) => (
              <div key={member._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      {member.profilePicture ? (
                        <img src={member.profilePicture} alt="" className="w-10 h-10 rounded-full" />
                      ) : (
                        <User className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {member.firstName} {member.lastName}
                      </h3>
                      <p className="text-xs text-gray-500">ID: {member.employeeId}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleView(member)} 
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(member)} 
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(member._id)} 
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Staff details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span><strong>Position:</strong> {member.position}</span>
                  </div>

                  {member.department && (
                    <div className="flex items-center gap-2">
                      <Building className="w-4 h-4 text-gray-400" />
                      <span><strong>Dept:</strong> {member.department.name || member.department}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{member.email}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{member.phone}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Hired: {formatDate(member.hireDate)}</span>
                  </div>

                  {member.salary?.amount && (
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span>{formatCurrency(member.salary.amount, member.salary.currency)}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant={getStatusBadgeVariant(member.status)}>
                      {member.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      Service: {calculateYearsOfService(member.hireDate)} yrs
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingStaff ? 'Edit Staff Member' : 'Add New Staff Member'}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          {/* Personal Information */}
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
                    label="Email"
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="staff@example.com"
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

                <Input
                  label="Alternative Phone"
                  name="alternativePhone"
                  value={formData.alternativePhone}
                  onChange={handleInputChange}
                  placeholder="Alternative phone number"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Date of Birth"
                    name="dateOfBirth"
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Gender</option>
                      {GENDER_OPTIONS.map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
                    <select
                      name="maritalStatus"
                      value={formData.maritalStatus}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Status</option>
                      {MARITAL_STATUS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <select
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {NATIONALITY.map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Professional Information */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('professional')}
            >
              <h3 className="font-semibold text-gray-900">Professional Information</h3>
              {expandedSections.professional ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.professional && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Employee ID"
                    name="employeeId"
                    required
                    value={formData.employeeId}
                    onChange={handleInputChange}
                    placeholder="e.g., EMP001"
                  />
                  <Input
                    label="Position"
                    name="position"
                    required
                    value={formData.position}
                    onChange={handleInputChange}
                    placeholder="e.g., Teacher, Accountant"
                  />
                </div>

                <Input
                  label="Job Title"
                  name="jobTitle"
                  value={formData.jobTitle}
                  onChange={handleInputChange}
                  placeholder="e.g., Senior Mathematics Teacher"
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <select
                    name="department"
                    required
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="">Select Department</option>
                    {departments.map(dept => (
                      <option key={dept._id} value={dept._id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Employment Details */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('employment')}
            >
              <h3 className="font-semibold text-gray-900">Employment Details</h3>
              {expandedSections.employment ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.employment && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Employment Type</label>
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {EMPLOYMENT_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                  <Input
                    label="Hire Date"
                    name="hireDate"
                    type="date"
                    required
                    value={formData.hireDate}
                    onChange={handleInputChange}
                  />
                </div>

                <Input
                  label="Contract End Date (if applicable)"
                  name="contractEndDate"
                  type="date"
                  value={formData.contractEndDate}
                  onChange={handleInputChange}
                />

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
            )}
          </div>

          {/* Compensation */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('compensation')}
            >
              <h3 className="font-semibold text-gray-900">Compensation</h3>
              {expandedSections.compensation ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.compensation && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Salary Amount"
                    name="salary.amount"
                    type="number"
                    value={formData.salary.amount}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      name="salary.currency"
                      value={formData.salary.currency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Frequency</label>
                    <select
                      name="salary.paymentFrequency"
                      value={formData.salary.paymentFrequency}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {PAYMENT_FREQUENCIES.map(freq => (
                        <option key={freq} value={freq}>{freq}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Bank Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <Input
                      label="Bank Name"
                      name="bankName"
                      value={formData.salary.bankDetails.bankName}
                      onChange={handleBankDetailsChange}
                      placeholder="e.g., Equity Bank"
                    />
                    <Input
                      label="Account Name"
                      name="accountName"
                      value={formData.salary.bankDetails.accountName}
                      onChange={handleBankDetailsChange}
                      placeholder="Account holder name"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <Input
                      label="Account Number"
                      name="accountNumber"
                      value={formData.salary.bankDetails.accountNumber}
                      onChange={handleBankDetailsChange}
                      placeholder="Account number"
                    />
                    <Input
                      label="Branch Code"
                      name="branchCode"
                      value={formData.salary.bankDetails.branchCode}
                      onChange={handleBankDetailsChange}
                      placeholder="Branch code"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Qualifications */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('qualifications')}
            >
              <h3 className="font-semibold text-gray-900">Qualifications & Skills</h3>
              {expandedSections.qualifications ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.qualifications && (
              <div className="p-4 space-y-4">
                {/* Qualifications */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Academic Qualifications</h4>
                  <div className="space-y-3">
                    {formData.qualifications.map((qual, index) => (
                      <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                        <div>
                          <p className="font-medium">{qual.degree}</p>
                          <p className="text-sm text-gray-600">{qual.institution} {qual.yearCompleted && `(${qual.yearCompleted})`}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeQualification(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        placeholder="Degree (e.g., BSc Computer Science)"
                        value={qualificationInput.degree}
                        onChange={(e) => setQualificationInput({...qualificationInput, degree: e.target.value})}
                      />
                      <Input
                        placeholder="Institution"
                        value={qualificationInput.institution}
                        onChange={(e) => setQualificationInput({...qualificationInput, institution: e.target.value})}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        placeholder="Year Completed"
                        value={qualificationInput.yearCompleted}
                        onChange={(e) => setQualificationInput({...qualificationInput, yearCompleted: e.target.value})}
                      />
                      <Input
                        placeholder="Grade/Class"
                        value={qualificationInput.grade}
                        onChange={(e) => setQualificationInput({...qualificationInput, grade: e.target.value})}
                      />
                    </div>
                    <Button type="button" variant="secondary" onClick={addQualification} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Qualification
                    </Button>
                  </div>
                </div>

                {/* Skills */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">Skills</h4>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {formData.skills.map((skill, index) => (
                      <Badge key={index} variant="info" className="flex items-center gap-1">
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add a skill"
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" variant="secondary" onClick={addSkill}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('emergency')}
            >
              <h3 className="font-semibold text-gray-900">Emergency Contact</h3>
              {expandedSections.emergency ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.emergency && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Contact Name"
                    name="name"
                    value={formData.emergencyContact.name}
                    onChange={handleEmergencyContactChange}
                    placeholder="Full name"
                  />
                  <Input
                    label="Relationship"
                    name="relationship"
                    value={formData.emergencyContact.relationship}
                    onChange={handleEmergencyContactChange}
                    placeholder="e.g., Spouse, Parent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone"
                    name="phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleEmergencyContactChange}
                    placeholder="Phone number"
                  />
                  <Input
                    label="Alternative Phone"
                    name="alternativePhone"
                    value={formData.emergencyContact.alternativePhone}
                    onChange={handleEmergencyContactChange}
                    placeholder="Alternative phone"
                  />
                </div>
                <Input
                  label="Email"
                  name="email"
                  type="email"
                  value={formData.emergencyContact.email}
                  onChange={handleEmergencyContactChange}
                  placeholder="Email address"
                />
                <Input
                  label="Address"
                  name="address"
                  value={formData.emergencyContact.address}
                  onChange={handleEmergencyContactChange}
                  placeholder="Contact address"
                />
              </div>
            )}
          </div>

          {/* Address */}
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      name="country"
                      value={formData.address.country}
                      onChange={handleAddressChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {NATIONALITY.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Work Schedule */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('schedule')}
            >
              <h3 className="font-semibold text-gray-900">Work Schedule</h3>
              {expandedSections.schedule ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.schedule && (
              <div className="p-4 space-y-4">
                {DAYS_OF_WEEK.map(day => (
                  <div key={day.key} className="flex items-center gap-4 p-2 bg-gray-50 rounded">
                    <div className="w-24 font-medium">{day.label}</div>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.workSchedule[day.key].isWorking}
                        onChange={(e) => handleWorkScheduleChange(day.key, 'isWorking', e.target.checked)}
                        className="h-4 w-4 text-blue-600 rounded"
                      />
                      <span className="text-sm">Working Day</span>
                    </label>
                    {formData.workSchedule[day.key].isWorking && (
                      <>
                        <Input
                          type="time"
                          value={formData.workSchedule[day.key].start}
                          onChange={(e) => handleWorkScheduleChange(day.key, 'start', e.target.value)}
                          className="w-32"
                        />
                        <span>to</span>
                        <Input
                          type="time"
                          value={formData.workSchedule[day.key].end}
                          onChange={(e) => handleWorkScheduleChange(day.key, 'end', e.target.value)}
                          className="w-32"
                        />
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Leave Balance */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('leave')}
            >
              <h3 className="font-semibold text-gray-900">Leave Balance</h3>
              {expandedSections.leave ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.leave && (
              <div className="p-4 grid grid-cols-2 gap-4">
                <Input
                  label="Annual Leave (days)"
                  type="number"
                  value={formData.leaveBalance.annual}
                  onChange={(e) => handleLeaveBalanceChange('annual', e.target.value)}
                />
                <Input
                  label="Sick Leave (days)"
                  type="number"
                  value={formData.leaveBalance.sick}
                  onChange={(e) => handleLeaveBalanceChange('sick', e.target.value)}
                />
                <Input
                  label="Personal Leave (days)"
                  type="number"
                  value={formData.leaveBalance.personal}
                  onChange={(e) => handleLeaveBalanceChange('personal', e.target.value)}
                />
                <Input
                  label="Unpaid Leave (days)"
                  type="number"
                  value={formData.leaveBalance.unpaid}
                  onChange={(e) => handleLeaveBalanceChange('unpaid', e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Identification */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('identification')}
            >
              <h3 className="font-semibold text-gray-900">Identification</h3>
              {expandedSections.identification ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.identification && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Type</label>
                    <select
                      name="type"
                      value={formData.identification.type}
                      onChange={handleIdentificationChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select ID Type</option>
                      {ID_TYPES.map(type => (
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
                <div className="grid grid-cols-2 gap-4">
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
            )}
          </div>

          {/* Notes */}
          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Any additional information about the staff member..."
            />
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
              {submitting ? 'Saving...' : (editingStaff ? 'Update Staff' : 'Create Staff')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Staff Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Staff Details"
        size="xl"
      >
        {selectedStaff && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                {selectedStaff.profilePicture ? (
                  <img src={selectedStaff.profilePicture} alt="" className="w-16 h-16 rounded-full" />
                ) : (
                  <User className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedStaff.firstName} {selectedStaff.lastName}
                </h3>
                <p className="text-gray-600">Employee ID: {selectedStaff.employeeId}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={getStatusBadgeVariant(selectedStaff.status)}>
                    {selectedStaff.status}
                  </Badge>
                  <Badge variant="info">{selectedStaff.position}</Badge>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Personal Information</h4>
                  <div className="space-y-2">
                    <p><strong>Full Name:</strong> {selectedStaff.firstName} {selectedStaff.lastName}</p>
                    <p><strong>Email:</strong> {selectedStaff.email}</p>
                    <p><strong>Phone:</strong> {selectedStaff.phone} {selectedStaff.alternativePhone && `/ ${selectedStaff.alternativePhone}`}</p>
                    {selectedStaff.dateOfBirth && (
                      <p><strong>Age:</strong> {calculateAge(selectedStaff.dateOfBirth)} ({formatDate(selectedStaff.dateOfBirth)})</p>
                    )}
                    {selectedStaff.gender && <p><strong>Gender:</strong> {selectedStaff.gender}</p>}
                    {selectedStaff.maritalStatus && <p><strong>Marital Status:</strong> {selectedStaff.maritalStatus}</p>}
                    <p><strong>Nationality:</strong> {selectedStaff.nationality}</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Professional Information</h4>
                  <div className="space-y-2">
                    <p><strong>Employee ID:</strong> {selectedStaff.employeeId}</p>
                    <p><strong>Position:</strong> {selectedStaff.position}</p>
                    {selectedStaff.jobTitle && <p><strong>Job Title:</strong> {selectedStaff.jobTitle}</p>}
                    <p><strong>Department:</strong> {selectedStaff.department?.name || 'N/A'}</p>
                    <p><strong>Employment Type:</strong> {selectedStaff.employmentType}</p>
                    <p><strong>Hire Date:</strong> {formatDate(selectedStaff.hireDate)}</p>
                    <p><strong>Years of Service:</strong> {calculateYearsOfService(selectedStaff.hireDate)} years</p>
                    {selectedStaff.contractEndDate && (
                      <p><strong>Contract End:</strong> {formatDate(selectedStaff.contractEndDate)}</p>
                    )}
                  </div>
                </div>

                {selectedStaff.address && (selectedStaff.address.street || selectedStaff.address.city) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                    <div className="space-y-1">
                      {selectedStaff.address.street && <p>{selectedStaff.address.street}</p>}
                      {(selectedStaff.address.city || selectedStaff.address.state) && (
                        <p>
                          {selectedStaff.address.city}
                          {selectedStaff.address.state && `, ${selectedStaff.address.state}`}
                          {selectedStaff.address.postalCode && ` ${selectedStaff.address.postalCode}`}
                        </p>
                      )}
                      {selectedStaff.address.country && <p>{selectedStaff.address.country}</p>}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Compensation</h4>
                  <div className="space-y-2">
                    {selectedStaff.salary?.amount ? (
                      <>
                        <p><strong>Salary:</strong> {formatCurrency(selectedStaff.salary.amount, selectedStaff.salary.currency)}</p>
                        <p><strong>Payment Frequency:</strong> {selectedStaff.salary.paymentFrequency}</p>
                        {selectedStaff.salary.bankDetails?.bankName && (
                          <div className="mt-2 p-2 bg-gray-50 rounded">
                            <p className="font-medium">Bank Details</p>
                            <p className="text-sm">Bank: {selectedStaff.salary.bankDetails.bankName}</p>
                            <p className="text-sm">Account: {selectedStaff.salary.bankDetails.accountName}</p>
                            <p className="text-sm">Number: {selectedStaff.salary.bankDetails.accountNumber}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-400">No salary information</p>
                    )}
                  </div>
                </div>

                {selectedStaff.qualifications?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Qualifications</h4>
                    <div className="space-y-2">
                      {selectedStaff.qualifications.map((qual, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <p className="font-medium">{qual.degree}</p>
                          <p className="text-sm text-gray-600">{qual.institution}</p>
                          {qual.yearCompleted && (
                            <p className="text-xs text-gray-500">Completed: {qual.yearCompleted}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStaff.skills?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStaff.skills.map((skill, idx) => (
                        <Badge key={idx} variant="info">{skill}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedStaff.emergencyContact?.name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Emergency Contact</h4>
                    <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                      <p><strong>Name:</strong> {selectedStaff.emergencyContact.name}</p>
                      <p><strong>Relationship:</strong> {selectedStaff.emergencyContact.relationship}</p>
                      <p><strong>Phone:</strong> {selectedStaff.emergencyContact.phone}</p>
                      {selectedStaff.emergencyContact.email && (
                        <p><strong>Email:</strong> {selectedStaff.emergencyContact.email}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedStaff.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {selectedStaff.notes}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  <p>Created: {formatDate(selectedStaff.createdAt)}</p>
                  <p>Last Updated: {formatDate(selectedStaff.updatedAt)}</p>
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
                handleEdit(selectedStaff)
              }}>
                Edit Staff
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Staff