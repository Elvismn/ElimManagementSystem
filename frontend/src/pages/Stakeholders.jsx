import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, Users, Mail, Phone, Building, Handshake, Edit, Trash2, 
  RefreshCw, TrendingUp, TrendingDown, Globe, MapPin, Calendar, 
  FileText, Award, Briefcase, Link, Clock, AlertCircle, Eye,
  ChevronDown, ChevronUp, User, DollarSign, Tag, Heart
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { stakeholderService, staffService } from '../services/apiService'

// Badge component
const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    warning: 'bg-yellow-100 text-yellow-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800',
    pink: 'bg-pink-100 text-pink-800',
    indigo: 'bg-indigo-100 text-indigo-800'
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
const STAKEHOLDER_TYPES = [
  "Distributor", "Collaborator", "Wellwisher", "Sponsor", "Partner",
  "Investor", "Contractor", "Consultant", "Regulatory Body", "NGO",
  "Alumni", "Parent Association", "Other"
]

const CONTRIBUTION_TYPES = ["Financial", "Material", "Service", "Technical", "Advocacy", "Mixed"]
const FREQUENCY_TYPES = ["One-time", "Monthly", "Quarterly", "Annually", "Ongoing"]
const ENGAGEMENT_TYPES = ["Meeting", "Call", "Email", "Event", "Visit", "Other"]
const ORGANIZATION_SIZES = ["Small", "Medium", "Large", "Enterprise", "Individual"]
const STATUS_OPTIONS = ["Active", "Inactive", "Pending", "Under Negotiation", "Completed", "Dormant"]
const PRIORITY_OPTIONS = ["High", "Medium", "Low"]
const DOCUMENT_TYPES = ["Agreement", "MoU", "Invoice", "Report", "Certificate", "Other"]

const Stakeholders = () => {
  const [stakeholders, setStakeholders] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [error, setError] = useState('')

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingStakeholder, setEditingStakeholder] = useState(null)
  const [selectedStakeholder, setSelectedStakeholder] = useState(null)

  // Section expansion state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    contact: true,
    organization: true,
    address: true,
    contribution: true,
    partnership: true,
    engagement: true,
    documents: true,
    social: true
  })

  // Temporary input states for arrays
  const [engagementInput, setEngagementInput] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'Meeting',
    description: '',
    outcome: '',
    nextSteps: '',
    attendedBy: '',
    followUpDate: ''
  })

  const [documentInput, setDocumentInput] = useState({
    name: '',
    type: 'Agreement',
    url: '',
    description: ''
  })

  const [projectInput, setProjectInput] = useState({
    projectId: '',
    projectName: '',
    role: '',
    contribution: ''
  })

  const [tagInput, setTagInput] = useState('')
  const [itemInput, setItemInput] = useState('')

  // Form data matching backend schema
  const [formData, setFormData] = useState({
    // Basic Information
    name: '',
    type: 'Partner',
    subType: '',
    
    // Contact Person
    contactPerson: {
      name: '',
      title: '',
      phone: '',
      email: '',
      alternativePhone: ''
    },
    
    // Organization Details
    organization: {
      name: '',
      registrationNumber: '',
      website: '',
      industry: '',
      size: '',
      yearEstablished: ''
    },
    
    // Contact Details
    primaryPhone: '',
    secondaryPhone: '',
    email: '',
    
    // Address
    address: {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Kenya'
    },
    
    // Social Media
    socialMedia: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: ''
    },
    
    // Contribution Details
    contribution: '',
    contributionType: '',
    contributionValue: {
      amount: '',
      currency: 'KES',
      frequency: ''
    },
    inKindContribution: {
      description: '',
      estimatedValue: '',
      items: []
    },
    
    // Partnership Timeline
    relationshipStart: new Date().toISOString().split('T')[0],
    relationshipEnd: '',
    isOngoing: true,
    renewalDate: '',
    
    // Agreement
    agreement: {
      documentUrl: '',
      signedDate: '',
      expiryDate: '',
      terms: '',
      signedBy: ''
    },
    
    // Arrays
    engagementHistory: [],
    supportedProjects: [],
    documents: [],
    tags: [],
    
    // Status
    status: 'Active',
    priority: 'Medium',
    
    // Notes
    notes: '',
    
    // Internal
    assignedTo: ''
  })

  // Fetch all data on component mount
  useEffect(() => {
    fetchAllData()
  }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [stakeholderRes, staffRes] = await Promise.all([
        stakeholderService.getStakeholders({ limit: 100 }),
        staffService.getStaff({ limit: 100 })
      ])

      const stakeholdersData = stakeholderRes.data?.data?.stakeholders || stakeholderRes.data?.stakeholders || []
      const staffData = staffRes.data?.data?.staff || staffRes.data?.staff || []

      setStakeholders(stakeholdersData)
      setStaff(staffData)
      setError('')
    } catch (error) {
      console.error('❌ Error fetching data:', error)
      setError('Failed to load data. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  // Filter stakeholders based on search and filters
  const filteredStakeholders = useMemo(() => {
    if (!Array.isArray(stakeholders)) return []
    
    return stakeholders.filter(stakeholder => {
      // Search filter
      const matchesSearch = !searchTerm || (
        (stakeholder.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stakeholder.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stakeholder.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stakeholder.contactPerson?.name?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stakeholder.contribution?.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (stakeholder.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())))
      )
      
      // Type filter
      const matchesType = typeFilter === 'all' || stakeholder.type === typeFilter
      
      // Status filter
      const matchesStatus = statusFilter === 'all' || stakeholder.status === statusFilter
      
      // Priority filter
      const matchesPriority = priorityFilter === 'all' || stakeholder.priority === priorityFilter
      
      return matchesSearch && matchesType && matchesStatus && matchesPriority
    })
  }, [stakeholders, searchTerm, typeFilter, statusFilter, priorityFilter])

  // Form handlers
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
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

  const handleContactPersonChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      contactPerson: {
        ...prev.contactPerson,
        [name]: value
      }
    }))
  }

  const handleOrganizationChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      organization: {
        ...prev.organization,
        [name]: value
      }
    }))
  }

  const handleSocialMediaChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [name]: value
      }
    }))
  }

  const handleContributionValueChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      contributionValue: {
        ...prev.contributionValue,
        [name]: value
      }
    }))
  }

  const handleInKindChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      inKindContribution: {
        ...prev.inKindContribution,
        [name]: value
      }
    }))
  }

  const handleAgreementChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      agreement: {
        ...prev.agreement,
        [name]: value
      }
    }))
  }

  // Array handlers
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }))
  }

  const addInKindItem = () => {
    if (itemInput.trim()) {
      setFormData(prev => ({
        ...prev,
        inKindContribution: {
          ...prev.inKindContribution,
          items: [...(prev.inKindContribution.items || []), itemInput.trim()]
        }
      }))
      setItemInput('')
    }
  }

  const removeInKindItem = (index) => {
    setFormData(prev => ({
      ...prev,
      inKindContribution: {
        ...prev.inKindContribution,
        items: prev.inKindContribution.items.filter((_, i) => i !== index)
      }
    }))
  }

  const addEngagement = () => {
    if (engagementInput.description) {
      setFormData(prev => ({
        ...prev,
        engagementHistory: [...prev.engagementHistory, { ...engagementInput }]
      }))
      setEngagementInput({
        date: new Date().toISOString().split('T')[0],
        type: 'Meeting',
        description: '',
        outcome: '',
        nextSteps: '',
        attendedBy: '',
        followUpDate: ''
      })
    }
  }

  const removeEngagement = (index) => {
    setFormData(prev => ({
      ...prev,
      engagementHistory: prev.engagementHistory.filter((_, i) => i !== index)
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
        type: 'Agreement',
        url: '',
        description: ''
      })
    }
  }

  const removeDocument = (index) => {
    setFormData(prev => ({
      ...prev,
      documents: prev.documents.filter((_, i) => i !== index)
    }))
  }

  const addProject = () => {
    if (projectInput.projectName) {
      setFormData(prev => ({
        ...prev,
        supportedProjects: [...prev.supportedProjects, { ...projectInput }]
      }))
      setProjectInput({
        projectId: '',
        projectName: '',
        role: '',
        contribution: ''
      })
    }
  }

  const removeProject = (index) => {
    setFormData(prev => ({
      ...prev,
      supportedProjects: prev.supportedProjects.filter((_, i) => i !== index)
    }))
  }

  // CRUD Operations
  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      // Prepare data matching backend schema
      const stakeholderData = {
        name: formData.name.trim(),
        type: formData.type,
        subType: formData.subType.trim() || undefined,
        contactPerson: {
          name: formData.contactPerson.name.trim() || undefined,
          title: formData.contactPerson.title.trim() || undefined,
          phone: formData.contactPerson.phone.trim() || undefined,
          email: formData.contactPerson.email.trim() || undefined,
          alternativePhone: formData.contactPerson.alternativePhone.trim() || undefined
        },
        organization: {
          name: formData.organization.name.trim() || undefined,
          registrationNumber: formData.organization.registrationNumber.trim() || undefined,
          website: formData.organization.website.trim() || undefined,
          industry: formData.organization.industry.trim() || undefined,
          size: formData.organization.size || undefined,
          yearEstablished: formData.organization.yearEstablished ? parseInt(formData.organization.yearEstablished) : undefined
        },
        primaryPhone: formData.primaryPhone.trim() || undefined,
        secondaryPhone: formData.secondaryPhone.trim() || undefined,
        email: formData.email.trim() || undefined,
        address: {
          street: formData.address.street.trim() || undefined,
          city: formData.address.city.trim() || undefined,
          state: formData.address.state.trim() || undefined,
          postalCode: formData.address.postalCode.trim() || undefined,
          country: formData.address.country
        },
        socialMedia: {
          facebook: formData.socialMedia.facebook.trim() || undefined,
          twitter: formData.socialMedia.twitter.trim() || undefined,
          linkedin: formData.socialMedia.linkedin.trim() || undefined,
          instagram: formData.socialMedia.instagram.trim() || undefined
        },
        contribution: formData.contribution.trim() || undefined,
        contributionType: formData.contributionType || undefined,
        contributionValue: {
          amount: formData.contributionValue.amount ? parseFloat(formData.contributionValue.amount) : undefined,
          currency: formData.contributionValue.currency,
          frequency: formData.contributionValue.frequency || undefined
        },
        inKindContribution: {
          description: formData.inKindContribution.description.trim() || undefined,
          estimatedValue: formData.inKindContribution.estimatedValue ? parseFloat(formData.inKindContribution.estimatedValue) : undefined,
          items: formData.inKindContribution.items
        },
        relationshipStart: formData.relationshipStart || new Date(),
        relationshipEnd: formData.relationshipEnd || undefined,
        isOngoing: formData.isOngoing,
        renewalDate: formData.renewalDate || undefined,
        agreement: {
          documentUrl: formData.agreement.documentUrl.trim() || undefined,
          signedDate: formData.agreement.signedDate || undefined,
          expiryDate: formData.agreement.expiryDate || undefined,
          terms: formData.agreement.terms.trim() || undefined,
          signedBy: formData.agreement.signedBy.trim() || undefined
        },
        engagementHistory: formData.engagementHistory,
        supportedProjects: formData.supportedProjects,
        documents: formData.documents,
        tags: formData.tags,
        status: formData.status,
        priority: formData.priority,
        notes: formData.notes.trim() || undefined,
        assignedTo: formData.assignedTo || undefined
      }

      console.log('Submitting stakeholder data:', stakeholderData)

      if (editingStakeholder) {
        await stakeholderService.updateStakeholder(editingStakeholder._id, stakeholderData)
        alert('Stakeholder updated successfully!')
      } else {
        await stakeholderService.createStakeholder(stakeholderData)
        alert('Stakeholder created successfully!')
      }

      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      console.error('❌ Error saving stakeholder:', error)
      setError(error.response?.data?.error || 'Failed to save stakeholder')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (stakeholder) => {
    setEditingStakeholder(stakeholder)
    
    // Populate form with stakeholder data
    setFormData({
      name: stakeholder.name || '',
      type: stakeholder.type || 'Partner',
      subType: stakeholder.subType || '',
      contactPerson: {
        name: stakeholder.contactPerson?.name || '',
        title: stakeholder.contactPerson?.title || '',
        phone: stakeholder.contactPerson?.phone || '',
        email: stakeholder.contactPerson?.email || '',
        alternativePhone: stakeholder.contactPerson?.alternativePhone || ''
      },
      organization: {
        name: stakeholder.organization?.name || '',
        registrationNumber: stakeholder.organization?.registrationNumber || '',
        website: stakeholder.organization?.website || '',
        industry: stakeholder.organization?.industry || '',
        size: stakeholder.organization?.size || '',
        yearEstablished: stakeholder.organization?.yearEstablished?.toString() || ''
      },
      primaryPhone: stakeholder.primaryPhone || '',
      secondaryPhone: stakeholder.secondaryPhone || '',
      email: stakeholder.email || '',
      address: {
        street: stakeholder.address?.street || '',
        city: stakeholder.address?.city || '',
        state: stakeholder.address?.state || '',
        postalCode: stakeholder.address?.postalCode || '',
        country: stakeholder.address?.country || 'Kenya'
      },
      socialMedia: {
        facebook: stakeholder.socialMedia?.facebook || '',
        twitter: stakeholder.socialMedia?.twitter || '',
        linkedin: stakeholder.socialMedia?.linkedin || '',
        instagram: stakeholder.socialMedia?.instagram || ''
      },
      contribution: stakeholder.contribution || '',
      contributionType: stakeholder.contributionType || '',
      contributionValue: {
        amount: stakeholder.contributionValue?.amount?.toString() || '',
        currency: stakeholder.contributionValue?.currency || 'KES',
        frequency: stakeholder.contributionValue?.frequency || ''
      },
      inKindContribution: {
        description: stakeholder.inKindContribution?.description || '',
        estimatedValue: stakeholder.inKindContribution?.estimatedValue?.toString() || '',
        items: stakeholder.inKindContribution?.items || []
      },
      relationshipStart: stakeholder.relationshipStart ? stakeholder.relationshipStart.split('T')[0] : new Date().toISOString().split('T')[0],
      relationshipEnd: stakeholder.relationshipEnd ? stakeholder.relationshipEnd.split('T')[0] : '',
      isOngoing: stakeholder.isOngoing ?? true,
      renewalDate: stakeholder.renewalDate ? stakeholder.renewalDate.split('T')[0] : '',
      agreement: {
        documentUrl: stakeholder.agreement?.documentUrl || '',
        signedDate: stakeholder.agreement?.signedDate ? stakeholder.agreement.signedDate.split('T')[0] : '',
        expiryDate: stakeholder.agreement?.expiryDate ? stakeholder.agreement.expiryDate.split('T')[0] : '',
        terms: stakeholder.agreement?.terms || '',
        signedBy: stakeholder.agreement?.signedBy || ''
      },
      engagementHistory: stakeholder.engagementHistory || [],
      supportedProjects: stakeholder.supportedProjects || [],
      documents: stakeholder.documents || [],
      tags: stakeholder.tags || [],
      status: stakeholder.status || 'Active',
      priority: stakeholder.priority || 'Medium',
      notes: stakeholder.notes || '',
      assignedTo: stakeholder.assignedTo?._id || stakeholder.assignedTo || ''
    })
    
    setIsModalOpen(true)
  }

  const handleView = (stakeholder) => {
    setSelectedStakeholder(stakeholder)
    setViewModalOpen(true)
  }

  const handleDelete = async (stakeholderId) => {
    if (!window.confirm('Are you sure you want to delete this stakeholder? This action cannot be undone.')) {
      return
    }

    try {
      await stakeholderService.deleteStakeholder(stakeholderId)
      alert('Stakeholder deleted successfully!')
      fetchAllData()
    } catch (error) {
      console.error('❌ Error deleting stakeholder:', error)
      alert(error.response?.data?.error || 'Failed to delete stakeholder')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'Partner',
      subType: '',
      contactPerson: {
        name: '',
        title: '',
        phone: '',
        email: '',
        alternativePhone: ''
      },
      organization: {
        name: '',
        registrationNumber: '',
        website: '',
        industry: '',
        size: '',
        yearEstablished: ''
      },
      primaryPhone: '',
      secondaryPhone: '',
      email: '',
      address: {
        street: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Kenya'
      },
      socialMedia: {
        facebook: '',
        twitter: '',
        linkedin: '',
        instagram: ''
      },
      contribution: '',
      contributionType: '',
      contributionValue: {
        amount: '',
        currency: 'KES',
        frequency: ''
      },
      inKindContribution: {
        description: '',
        estimatedValue: '',
        items: []
      },
      relationshipStart: new Date().toISOString().split('T')[0],
      relationshipEnd: '',
      isOngoing: true,
      renewalDate: '',
      agreement: {
        documentUrl: '',
        signedDate: '',
        expiryDate: '',
        terms: '',
        signedBy: ''
      },
      engagementHistory: [],
      supportedProjects: [],
      documents: [],
      tags: [],
      status: 'Active',
      priority: 'Medium',
      notes: '',
      assignedTo: ''
    })
    setEditingStakeholder(null)
  }

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  // Helper functions
  const getTypeColor = (type) => {
    const colors = {
      'Sponsor': 'purple',
      'Partner': 'blue',
      'Distributor': 'green',
      'Collaborator': 'yellow',
      'Wellwisher': 'pink',
      'Investor': 'indigo',
      'Contractor': 'orange',
      'Consultant': 'teal',
      'Regulatory Body': 'red',
      'NGO': 'emerald',
      'Alumni': 'violet',
      'Parent Association': 'cyan'
    }
    return colors[type] || 'gray'
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active': return <TrendingUp className="w-3 h-3 text-green-500" />
      case 'Inactive': return <TrendingDown className="w-3 h-3 text-red-500" />
      case 'Pending': return <Clock className="w-3 h-3 text-yellow-500" />
      case 'Under Negotiation': return <Handshake className="w-3 h-3 text-blue-500" />
      case 'Completed': return <Award className="w-3 h-3 text-green-500" />
      case 'Dormant': return <AlertCircle className="w-3 h-3 text-gray-500" />
      default: return null
    }
  }

  const getStatusBadgeVariant = (status) => {
    switch (status) {
      case 'Active': return 'success'
      case 'Inactive': return 'error'
      case 'Pending': return 'warning'
      case 'Under Negotiation': return 'info'
      case 'Completed': return 'purple'
      case 'Dormant': return 'default'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'High': return 'bg-red-100 text-red-800'
      case 'Medium': return 'bg-yellow-100 text-yellow-800'
      case 'Low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
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

  // Stats
  const stats = {
    total: stakeholders.length,
    active: stakeholders.filter(s => s.status === 'Active').length,
    partners: stakeholders.filter(s => s.type === 'Partner').length,
    sponsors: stakeholders.filter(s => s.type === 'Sponsor').length,
    highPriority: stakeholders.filter(s => s.priority === 'High').length
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Stakeholders</h1>
          <p className="text-gray-600">
            {searchTerm ? (
              `Found ${filteredStakeholders.length} of ${stakeholders.length} stakeholders`
            ) : (
              'Manage school partners, sponsors, and collaborators'
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
            Add Stakeholder
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-blue-500 rounded-lg p-3">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold">{stats.total}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-green-500 rounded-lg p-3">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-2xl font-bold">{stats.active}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-purple-500 rounded-lg p-3">
              <Handshake className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Partners</p>
              <p className="text-2xl font-bold">{stats.partners}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-yellow-500 rounded-lg p-3">
              <Award className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">Sponsors</p>
              <p className="text-2xl font-bold">{stats.sponsors}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center">
            <div className="bg-red-500 rounded-lg p-3">
              <AlertCircle className="h-6 w-6 text-white" />
            </div>
            <div className="ml-4">
              <p className="text-sm text-gray-600">High Priority</p>
              <p className="text-2xl font-bold">{stats.highPriority}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search stakeholders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              {STAKEHOLDER_TYPES.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
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
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Priority</option>
              {PRIORITY_OPTIONS.map(priority => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      {/* Stakeholders Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading stakeholders...</p>
          </div>
        ) : filteredStakeholders.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Handshake className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-500 text-lg mb-2">
              {searchTerm ? 'No stakeholders found' : 'No stakeholders yet'}
            </p>
            <p className="text-gray-400 mb-6">
              {searchTerm 
                ? `No results for "${searchTerm}". Try a different search.`
                : 'Get started by adding your first stakeholder'
              }
            </p>
            {!searchTerm && (
              <Button onClick={() => {
                resetForm()
                setIsModalOpen(true)
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add First Stakeholder
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStakeholders.map((stakeholder) => (
              <div key={stakeholder._id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Header with actions */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full bg-${getTypeColor(stakeholder.type)}-100 flex items-center justify-center`}>
                      <Handshake className={`w-5 h-5 text-${getTypeColor(stakeholder.type)}-600`} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{stakeholder.name}</h3>
                      <p className="text-xs text-gray-500">{stakeholder.organization?.name || 'Individual'}</p>
                    </div>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => handleView(stakeholder)} 
                      className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                      title="View"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleEdit(stakeholder)} 
                      className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(stakeholder._id)} 
                      className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Stakeholder details */}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Badge variant={getTypeColor(stakeholder.type)} className="uppercase">
                      {stakeholder.type}
                    </Badge>
                    <Badge variant={getStatusBadgeVariant(stakeholder.status)}>
                      {stakeholder.status}
                    </Badge>
                  </div>

                  {stakeholder.contactPerson?.name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span><strong>Contact:</strong> {stakeholder.contactPerson.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span className="truncate">{stakeholder.email || stakeholder.contactPerson?.email || 'No email'}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <span>{stakeholder.primaryPhone || stakeholder.contactPerson?.phone || 'No phone'}</span>
                  </div>

                  {stakeholder.contribution && (
                    <div className="flex items-start gap-2">
                      <Heart className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="line-clamp-2">{stakeholder.contribution}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>Since {formatDate(stakeholder.relationshipStart)}</span>
                  </div>

                  {stakeholder.tags && stakeholder.tags.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Tag className="w-4 h-4 text-gray-400" />
                      <div className="flex flex-wrap gap-1">
                        {stakeholder.tags.slice(0, 3).map((tag, idx) => (
                          <Badge key={idx} variant="default" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {stakeholder.tags.length > 3 && (
                          <Badge variant="default">+{stakeholder.tags.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${getPriorityColor(stakeholder.priority)}`}>
                      {stakeholder.priority} Priority
                    </span>
                    <span className="text-xs text-gray-500">
                      Updated: {formatDate(stakeholder.updatedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Stakeholder Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          resetForm()
        }}
        title={editingStakeholder ? 'Edit Stakeholder' : 'Add New Stakeholder'}
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
                    label="Name *"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g., John Doe or Company Name"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {STAKEHOLDER_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <Input
                  label="Sub Type (Optional)"
                  name="subType"
                  value={formData.subType}
                  onChange={handleInputChange}
                  placeholder="e.g., Gold Partner, Silver Sponsor"
                />

                <div className="grid grid-cols-2 gap-4">
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
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      {PRIORITY_OPTIONS.map(priority => (
                        <option key={priority} value={priority}>{priority}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Contact Information */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('contact')}
            >
              <h3 className="font-semibold text-gray-900">Contact Information</h3>
              {expandedSections.contact ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.contact && (
              <div className="p-4 space-y-4">
                <h4 className="text-sm font-medium text-gray-700">Primary Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Contact Person Name"
                    name="name"
                    value={formData.contactPerson.name}
                    onChange={handleContactPersonChange}
                    placeholder="Full name"
                  />
                  <Input
                    label="Title/Position"
                    name="title"
                    value={formData.contactPerson.title}
                    onChange={handleContactPersonChange}
                    placeholder="e.g., CEO, Manager"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Contact Email"
                    name="email"
                    type="email"
                    value={formData.contactPerson.email}
                    onChange={handleContactPersonChange}
                    placeholder="contact@example.com"
                  />
                  <Input
                    label="Contact Phone"
                    name="phone"
                    value={formData.contactPerson.phone}
                    onChange={handleContactPersonChange}
                    placeholder="Phone number"
                  />
                </div>
                <Input
                  label="Alternative Phone"
                  name="alternativePhone"
                  value={formData.contactPerson.alternativePhone}
                  onChange={handleContactPersonChange}
                  placeholder="Alternative contact number"
                />

                <h4 className="text-sm font-medium text-gray-700 mt-4">General Contact</h4>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Primary Phone"
                    name="primaryPhone"
                    value={formData.primaryPhone}
                    onChange={handleInputChange}
                    placeholder="Main phone number"
                  />
                  <Input
                    label="Secondary Phone"
                    name="secondaryPhone"
                    value={formData.secondaryPhone}
                    onChange={handleInputChange}
                    placeholder="Secondary phone"
                  />
                </div>
                <Input
                  label="General Email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="general@example.com"
                />
              </div>
            )}
          </div>

          {/* Organization Details */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('organization')}
            >
              <h3 className="font-semibold text-gray-900">Organization Details</h3>
              {expandedSections.organization ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.organization && (
              <div className="p-4 space-y-4">
                <Input
                  label="Organization Name"
                  name="name"
                  value={formData.organization.name}
                  onChange={handleOrganizationChange}
                  placeholder="Company/Organization name"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Registration Number"
                    name="registrationNumber"
                    value={formData.organization.registrationNumber}
                    onChange={handleOrganizationChange}
                    placeholder="Business registration #"
                  />
                  <Input
                    label="Website"
                    name="website"
                    value={formData.organization.website}
                    onChange={handleOrganizationChange}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Industry"
                    name="industry"
                    value={formData.organization.industry}
                    onChange={handleOrganizationChange}
                    placeholder="e.g., Education, Technology"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Organization Size</label>
                    <select
                      name="size"
                      value={formData.organization.size}
                      onChange={handleOrganizationChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Size</option>
                      {ORGANIZATION_SIZES.map(size => (
                        <option key={size} value={size}>{size}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <Input
                  label="Year Established"
                  name="yearEstablished"
                  type="number"
                  value={formData.organization.yearEstablished}
                  onChange={handleOrganizationChange}
                  placeholder="e.g., 2010"
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
                      <option value="Kenya">Kenya</option>
                      <option value="Uganda">Uganda</option>
                      <option value="Tanzania">Tanzania</option>
                      <option value="Rwanda">Rwanda</option>
                      <option value="Burundi">Burundi</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Social Media */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('social')}
            >
              <h3 className="font-semibold text-gray-900">Social Media</h3>
              {expandedSections.social ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.social && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Facebook"
                    name="facebook"
                    value={formData.socialMedia.facebook}
                    onChange={handleSocialMediaChange}
                    placeholder="Facebook URL"
                  />
                  <Input
                    label="Twitter"
                    name="twitter"
                    value={formData.socialMedia.twitter}
                    onChange={handleSocialMediaChange}
                    placeholder="Twitter URL"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="LinkedIn"
                    name="linkedin"
                    value={formData.socialMedia.linkedin}
                    onChange={handleSocialMediaChange}
                    placeholder="LinkedIn URL"
                  />
                  <Input
                    label="Instagram"
                    name="instagram"
                    value={formData.socialMedia.instagram}
                    onChange={handleSocialMediaChange}
                    placeholder="Instagram URL"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Contribution Details */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('contribution')}
            >
              <h3 className="font-semibold text-gray-900">Contribution Details</h3>
              {expandedSections.contribution ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.contribution && (
              <div className="p-4 space-y-4">
                <textarea
                  name="contribution"
                  value={formData.contribution}
                  onChange={handleInputChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Describe the stakeholder's contribution..."
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Contribution Type</label>
                    <select
                      name="contributionType"
                      value={formData.contributionType}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Type</option>
                      {CONTRIBUTION_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-gray-700">Financial Contribution</h4>
                <div className="grid grid-cols-3 gap-4">
                  <Input
                    label="Amount"
                    name="amount"
                    type="number"
                    value={formData.contributionValue.amount}
                    onChange={handleContributionValueChange}
                    placeholder="0.00"
                  />
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                    <select
                      name="currency"
                      value={formData.contributionValue.currency}
                      onChange={handleContributionValueChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="KES">KES</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
                    <select
                      name="frequency"
                      value={formData.contributionValue.frequency}
                      onChange={handleContributionValueChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    >
                      <option value="">Select Frequency</option>
                      {FREQUENCY_TYPES.map(freq => (
                        <option key={freq} value={freq}>{freq}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <h4 className="text-sm font-medium text-gray-700">In-Kind Contribution</h4>
                <Input
                  label="Description"
                  name="description"
                  value={formData.inKindContribution.description}
                  onChange={handleInKindChange}
                  placeholder="Describe in-kind contribution"
                />
                <Input
                  label="Estimated Value"
                  name="estimatedValue"
                  type="number"
                  value={formData.inKindContribution.estimatedValue}
                  onChange={handleInKindChange}
                  placeholder="Estimated value"
                />
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Items</label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      placeholder="Add item"
                      value={itemInput}
                      onChange={(e) => setItemInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInKindItem())}
                    />
                    <Button type="button" variant="secondary" onClick={addInKindItem}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.inKindContribution.items.map((item, index) => (
                      <Badge key={index} variant="info" className="flex items-center gap-1">
                        {item}
                        <button
                          type="button"
                          onClick={() => removeInKindItem(index)}
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

          {/* Partnership Timeline */}
          <div className="border rounded-lg overflow-hidden">
            <div 
              className="flex items-center justify-between p-4 bg-gray-50 cursor-pointer"
              onClick={() => toggleSection('partnership')}
            >
              <h3 className="font-semibold text-gray-900">Partnership Timeline</h3>
              {expandedSections.partnership ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            
            {expandedSections.partnership && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Relationship Start"
                    name="relationshipStart"
                    type="date"
                    value={formData.relationshipStart}
                    onChange={handleInputChange}
                  />
                  <Input
                    label="Relationship End"
                    name="relationshipEnd"
                    type="date"
                    value={formData.relationshipEnd}
                    onChange={handleInputChange}
                    disabled={formData.isOngoing}
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isOngoing"
                    checked={formData.isOngoing}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Ongoing relationship</span>
                </label>

                <Input
                  label="Renewal Date"
                  name="renewalDate"
                  type="date"
                  value={formData.renewalDate}
                  onChange={handleInputChange}
                />

                <h4 className="text-sm font-medium text-gray-700">Agreement/Contract</h4>
                <Input
                  label="Document URL"
                  name="documentUrl"
                  value={formData.agreement.documentUrl}
                  onChange={handleAgreementChange}
                  placeholder="URL to agreement document"
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Signed Date"
                    name="signedDate"
                    type="date"
                    value={formData.agreement.signedDate}
                    onChange={handleAgreementChange}
                  />
                  <Input
                    label="Expiry Date"
                    name="expiryDate"
                    type="date"
                    value={formData.agreement.expiryDate}
                    onChange={handleAgreementChange}
                  />
                </div>
                <Input
                  label="Signed By"
                  name="signedBy"
                  value={formData.agreement.signedBy}
                  onChange={handleAgreementChange}
                  placeholder="Name of signatory"
                />
                <textarea
                  name="terms"
                  value={formData.agreement.terms}
                  onChange={handleAgreementChange}
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  placeholder="Terms and conditions summary"
                />
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Tags</h3>
            <div className="flex gap-2 mb-2">
              <Input
                placeholder="Add tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" variant="secondary" onClick={addTag}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, index) => (
                <Badge key={index} variant="info" className="flex items-center gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(index)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Notes</h3>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Additional notes about this stakeholder..."
            />
          </div>

          {/* Assignment */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Assignment</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <select
                name="assignedTo"
                value={formData.assignedTo}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="">Select Staff Member</option>
                {staff.map(member => (
                  <option key={member._id} value={member._id}>
                    {member.firstName} {member.lastName} - {member.position}
                  </option>
                ))}
              </select>
            </div>
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
              {submitting ? 'Saving...' : (editingStakeholder ? 'Update Stakeholder' : 'Create Stakeholder')}
            </Button>
          </div>
        </form>
      </Modal>

      {/* View Stakeholder Modal */}
      <Modal
        isOpen={viewModalOpen}
        onClose={() => setViewModalOpen(false)}
        title="Stakeholder Details"
        size="xl"
      >
        {selectedStakeholder && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            {/* Header */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className={`w-16 h-16 rounded-full bg-${getTypeColor(selectedStakeholder.type)}-100 flex items-center justify-center`}>
                <Handshake className={`w-8 h-8 text-${getTypeColor(selectedStakeholder.type)}-600`} />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-gray-900">{selectedStakeholder.name}</h3>
                <p className="text-gray-600">{selectedStakeholder.organization?.name || 'Individual'}</p>
                <div className="flex gap-2 mt-2">
                  <Badge variant={getTypeColor(selectedStakeholder.type)}>
                    {selectedStakeholder.type}
                  </Badge>
                  <Badge variant={getStatusBadgeVariant(selectedStakeholder.status)}>
                    {selectedStakeholder.status}
                  </Badge>
                  <Badge variant={selectedStakeholder.priority === 'High' ? 'error' : selectedStakeholder.priority === 'Medium' ? 'warning' : 'success'}>
                    {selectedStakeholder.priority} Priority
                  </Badge>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                {/* Contact Information */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    {selectedStakeholder.contactPerson?.name && (
                      <p><strong>Contact Person:</strong> {selectedStakeholder.contactPerson.name}</p>
                    )}
                    {selectedStakeholder.contactPerson?.title && (
                      <p><strong>Title:</strong> {selectedStakeholder.contactPerson.title}</p>
                    )}
                    <p><strong>Email:</strong> {selectedStakeholder.email || selectedStakeholder.contactPerson?.email || 'N/A'}</p>
                    <p><strong>Phone:</strong> {selectedStakeholder.primaryPhone || selectedStakeholder.contactPerson?.phone || 'N/A'}</p>
                    {selectedStakeholder.secondaryPhone && (
                      <p><strong>Alt Phone:</strong> {selectedStakeholder.secondaryPhone}</p>
                    )}
                  </div>
                </div>

                {/* Organization Details */}
                {selectedStakeholder.organization?.name && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Organization</h4>
                    <div className="space-y-2">
                      <p><strong>Name:</strong> {selectedStakeholder.organization.name}</p>
                      {selectedStakeholder.organization.registrationNumber && (
                        <p><strong>Reg No:</strong> {selectedStakeholder.organization.registrationNumber}</p>
                      )}
                      {selectedStakeholder.organization.website && (
                        <p><strong>Website:</strong> 
                          <a href={selectedStakeholder.organization.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                            {selectedStakeholder.organization.website}
                          </a>
                        </p>
                      )}
                      {selectedStakeholder.organization.industry && (
                        <p><strong>Industry:</strong> {selectedStakeholder.organization.industry}</p>
                      )}
                      {selectedStakeholder.organization.size && (
                        <p><strong>Size:</strong> {selectedStakeholder.organization.size}</p>
                      )}
                      {selectedStakeholder.organization.yearEstablished && (
                        <p><strong>Established:</strong> {selectedStakeholder.organization.yearEstablished}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Address */}
                {selectedStakeholder.address && (selectedStakeholder.address.street || selectedStakeholder.address.city) && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Address</h4>
                    <div className="space-y-1">
                      {selectedStakeholder.address.street && <p>{selectedStakeholder.address.street}</p>}
                      {(selectedStakeholder.address.city || selectedStakeholder.address.state) && (
                        <p>
                          {selectedStakeholder.address.city}
                          {selectedStakeholder.address.state && `, ${selectedStakeholder.address.state}`}
                          {selectedStakeholder.address.postalCode && ` ${selectedStakeholder.address.postalCode}`}
                        </p>
                      )}
                      {selectedStakeholder.address.country && <p>{selectedStakeholder.address.country}</p>}
                    </div>
                  </div>
                )}

                {/* Tags */}
                {selectedStakeholder.tags?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Tags</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedStakeholder.tags.map((tag, idx) => (
                        <Badge key={idx} variant="info">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Contribution */}
                {selectedStakeholder.contribution && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Contribution</h4>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {selectedStakeholder.contribution}
                      </p>
                      {selectedStakeholder.contributionType && (
                        <p><strong>Type:</strong> {selectedStakeholder.contributionType}</p>
                      )}
                      {selectedStakeholder.contributionValue?.amount && (
                        <p><strong>Value:</strong> {formatCurrency(selectedStakeholder.contributionValue.amount, selectedStakeholder.contributionValue.currency)}</p>
                      )}
                      {selectedStakeholder.contributionValue?.frequency && (
                        <p><strong>Frequency:</strong> {selectedStakeholder.contributionValue.frequency}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Partnership Timeline */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-2">Partnership</h4>
                  <div className="space-y-2">
                    <p><strong>Started:</strong> {formatDate(selectedStakeholder.relationshipStart)}</p>
                    {!selectedStakeholder.isOngoing && selectedStakeholder.relationshipEnd && (
                      <p><strong>Ended:</strong> {formatDate(selectedStakeholder.relationshipEnd)}</p>
                    )}
                    {selectedStakeholder.renewalDate && (
                      <p><strong>Renewal:</strong> {formatDate(selectedStakeholder.renewalDate)}</p>
                    )}
                    <p><strong>Status:</strong> {selectedStakeholder.isOngoing ? 'Ongoing' : 'Ended'}</p>
                  </div>
                </div>

                {/* Agreement */}
                {selectedStakeholder.agreement?.documentUrl && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Agreement</h4>
                    <div className="space-y-2">
                      <p><strong>Document:</strong> 
                        <a href={selectedStakeholder.agreement.documentUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline ml-1">
                          View Document
                        </a>
                      </p>
                      {selectedStakeholder.agreement.signedDate && (
                        <p><strong>Signed:</strong> {formatDate(selectedStakeholder.agreement.signedDate)}</p>
                      )}
                      {selectedStakeholder.agreement.expiryDate && (
                        <p><strong>Expires:</strong> {formatDate(selectedStakeholder.agreement.expiryDate)}</p>
                      )}
                      {selectedStakeholder.agreement.signedBy && (
                        <p><strong>Signed By:</strong> {selectedStakeholder.agreement.signedBy}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Engagements */}
                {selectedStakeholder.engagementHistory?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Recent Engagements</h4>
                    <div className="space-y-2">
                      {selectedStakeholder.engagementHistory.slice(0, 3).map((engagement, idx) => (
                        <div key={idx} className="p-2 bg-gray-50 rounded">
                          <p className="font-medium text-sm">{engagement.type} - {formatDate(engagement.date)}</p>
                          <p className="text-xs text-gray-600">{engagement.description}</p>
                          {engagement.outcome && (
                            <p className="text-xs text-gray-500 mt-1">Outcome: {engagement.outcome}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedStakeholder.notes && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Notes</h4>
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded">
                      {selectedStakeholder.notes}
                    </p>
                  </div>
                )}

                {/* Assigned To */}
                {selectedStakeholder.assignedTo && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Assigned To</h4>
                    <p className="text-sm text-gray-700">
                      {typeof selectedStakeholder.assignedTo === 'object' 
                        ? `${selectedStakeholder.assignedTo.firstName} ${selectedStakeholder.assignedTo.lastName}`
                        : 'Staff Member'}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-500">
                  <p>Created: {formatDate(selectedStakeholder.createdAt)}</p>
                  <p>Last Updated: {formatDate(selectedStakeholder.updatedAt)}</p>
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
                handleEdit(selectedStakeholder)
              }}>
                Edit Stakeholder
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Stakeholders