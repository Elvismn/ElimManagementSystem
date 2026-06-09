import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, RefreshCw, Edit, Trash2, Eye, CheckCircle, XCircle,
  FileText, Calendar, DollarSign, Car, Building, Phone, Mail,
  AlertCircle, ChevronDown, ChevronUp, Download, Clock, Tag,
  Shield, FileCheck, FileWarning, FileX, TrendingUp, UserCheck
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { vehicleDocumentService, vehicleService } from '../services/apiService'

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-100 text-gray-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
    purple: 'bg-purple-100 text-purple-800'
  }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>{children}</span>
}

const Card = ({ children, className = '' }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>{children}</div>
)

const DOCUMENT_TYPES = [
  { value: 'insurance', label: 'Insurance', icon: <Shield className="w-4 h-4" /> },
  { value: 'inspection_certificate', label: 'Inspection Certificate', icon: <FileCheck className="w-4 h-4" /> },
  { value: 'registration', label: 'Registration', icon: <FileText className="w-4 h-4" /> },
  { value: 'fitness_certificate', label: 'Fitness Certificate', icon: <FileCheck className="w-4 h-4" /> },
  { value: 'road_license', label: 'Road License', icon: <FileText className="w-4 h-4" /> },
  { value: 'emission_test', label: 'Emission Test', icon: <FileCheck className="w-4 h-4" /> },
  { value: 'purchase_documents', label: 'Purchase Documents', icon: <FileText className="w-4 h-4" /> },
  { value: 'warranty', label: 'Warranty', icon: <Shield className="w-4 h-4" /> },
  { value: 'service_manual', label: 'Service Manual', icon: <FileText className="w-4 h-4" /> },
  { value: 'other', label: 'Other', icon: <FileText className="w-4 h-4" /> }
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', variant: 'success' },
  { value: 'expired', label: 'Expired', variant: 'error' },
  { value: 'renewed', label: 'Renewed', variant: 'info' },
  { value: 'cancelled', label: 'Cancelled', variant: 'default' },
  { value: 'pending', label: 'Pending', variant: 'warning' }
]

const VehicleDocuments = () => {
  const [documents, setDocuments] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [expiryFilter, setExpiryFilter] = useState('all')
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState(null)
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    basic: true, provider: true, renewal: true, tags: true
  })

  const [formData, setFormData] = useState({
    vehicle: '',
    documentType: 'insurance',
    title: '',
    documentNumber: '',
    issueDate: new Date().toISOString().split('T')[0],
    expiryDate: '',
    provider: { name: '', contact: { phone: '', email: '', person: '' }, address: '' },
    fileUrl: '',
    premium: '',
    coverage: '',
    currency: 'KES',
    status: 'active',
    renewalReminder: true,
    reminderDays: 30,
    notes: '',
    tags: []
  })

  const [tagInput, setTagInput] = useState('')

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [docsRes, vehiclesRes] = await Promise.all([
        vehicleDocumentService.getDocuments({ limit: 100 }),
        vehicleService.getVehicles({ limit: 100 })
      ])
      setDocuments(docsRes.data?.data?.documents || docsRes.data?.documents || [])
      setVehicles(vehiclesRes.data?.data?.vehicles || vehiclesRes.data?.vehicles || [])
      setError('')
    } catch (error) {
      console.error('Fetch error:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredDocuments = useMemo(() => {
    if (!Array.isArray(documents)) return []
    return documents.filter(doc => {
      const vehicleMatch = doc.vehicle?.plateNumber || ''
      const matchesSearch = !searchTerm || 
        vehicleMatch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.documentNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesType = typeFilter === 'all' || doc.documentType === typeFilter
      
      let matchesExpiry = true
      if (expiryFilter !== 'all') {
        const days = doc.daysUntilExpiry
        if (expiryFilter === 'expired') matchesExpiry = days < 0
        else if (expiryFilter === 'critical') matchesExpiry = days >= 0 && days <= 7
        else if (expiryFilter === 'warning') matchesExpiry = days > 7 && days <= 30
        else if (expiryFilter === 'valid') matchesExpiry = days > 30
      }
      
      return matchesSearch && matchesType && matchesExpiry
    })
  }, [documents, searchTerm, typeFilter, expiryFilter])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const parts = name.split('.')
      if (parts[0] === 'provider') {
        if (parts[1] === 'contact') {
          setFormData(prev => ({
            ...prev,
            provider: {
              ...prev.provider,
              contact: { ...prev.provider.contact, [parts[2]]: value }
            }
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            provider: { ...prev.provider, [parts[1]]: value }
          }))
        }
      } else {
        setFormData(prev => ({ ...prev, [parts[0]]: { ...prev[parts[0]], [parts[1]]: value } }))
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }))
      setTagInput('')
    }
  }

  const removeTag = (index) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter((_, i) => i !== index) }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const docData = {
        vehicle: formData.vehicle,
        documentType: formData.documentType,
        title: formData.title,
        documentNumber: formData.documentNumber,
        issueDate: formData.issueDate,
        expiryDate: formData.expiryDate,
        provider: {
          name: formData.provider.name,
          contact: {
            phone: formData.provider.contact.phone || undefined,
            email: formData.provider.contact.email || undefined,
            person: formData.provider.contact.person || undefined
          },
          address: formData.provider.address || undefined
        },
        fileUrl: formData.fileUrl || undefined,
        premium: formData.premium ? parseFloat(formData.premium) : undefined,
        coverage: formData.coverage || undefined,
        currency: formData.currency,
        status: formData.status,
        renewalReminder: formData.renewalReminder,
        reminderDays: parseInt(formData.reminderDays),
        notes: formData.notes || undefined,
        tags: formData.tags
      }

      if (editingDoc) {
        await vehicleDocumentService.updateDocument(editingDoc._id, docData)
        alert('Document updated!')
      } else {
        await vehicleDocumentService.createDocument(docData)
        alert('Document created!')
      }
      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save document')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (doc) => {
    setEditingDoc(doc)
    setFormData({
      vehicle: doc.vehicle?._id || doc.vehicle || '',
      documentType: doc.documentType || 'insurance',
      title: doc.title || '',
      documentNumber: doc.documentNumber || '',
      issueDate: doc.issueDate?.split('T')[0] || '',
      expiryDate: doc.expiryDate?.split('T')[0] || '',
      provider: {
        name: doc.provider?.name || '',
        contact: {
          phone: doc.provider?.contact?.phone || '',
          email: doc.provider?.contact?.email || '',
          person: doc.provider?.contact?.person || ''
        },
        address: doc.provider?.address || ''
      },
      fileUrl: doc.fileUrl || '',
      premium: doc.premium || '',
      coverage: doc.coverage || '',
      currency: doc.currency || 'KES',
      status: doc.status || 'active',
      renewalReminder: doc.renewalReminder !== undefined ? doc.renewalReminder : true,
      reminderDays: doc.reminderDays || 30,
      notes: doc.notes || '',
      tags: doc.tags || []
    })
    setIsModalOpen(true)
  }

  const handleView = (doc) => {
    setSelectedDoc(doc)
    setViewModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this document?')) {
      try {
        await vehicleDocumentService.deleteDocument(id)
        alert('Document deleted!')
        fetchAllData()
      } catch (error) {
        alert(error.response?.data?.error || 'Delete failed')
      }
    }
  }

  const handleVerify = async (id) => {
    if (window.confirm('Verify this document?')) {
      try {
        await vehicleDocumentService.verifyDocument(id)
        alert('Document verified!')
        fetchAllData()
      } catch (error) {
        alert(error.response?.data?.error || 'Verification failed')
      }
    }
  }

  const handleRenew = async (id) => {
    const newExpiryDate = prompt('Enter new expiry date (YYYY-MM-DD):')
    if (newExpiryDate) {
      try {
        await vehicleDocumentService.renewDocument(id, { newExpiryDate })
        alert('Document renewed!')
        fetchAllData()
      } catch (error) {
        alert(error.response?.data?.error || 'Renewal failed')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      vehicle: '',
      documentType: 'insurance',
      title: '',
      documentNumber: '',
      issueDate: new Date().toISOString().split('T')[0],
      expiryDate: '',
      provider: { name: '', contact: { phone: '', email: '', person: '' }, address: '' },
      fileUrl: '',
      premium: '',
      coverage: '',
      currency: 'KES',
      status: 'active',
      renewalReminder: true,
      reminderDays: 30,
      notes: '',
      tags: []
    })
    setTagInput('')
    setEditingDoc(null)
  }

  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))

  const getStatusBadge = (status) => {
    const found = STATUS_OPTIONS.find(s => s.value === status)
    return found?.variant || 'default'
  }

  const getExpiryBadge = (days) => {
    if (days === null || days === undefined) return { variant: 'default', label: 'Unknown' }
    if (days < 0) return { variant: 'error', label: 'Expired' }
    if (days <= 7) return { variant: 'error', label: 'Critical' }
    if (days <= 30) return { variant: 'warning', label: 'Expiring Soon' }
    return { variant: 'success', label: 'Valid' }
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
  const formatCurrency = (amount) => amount ? `KES ${amount.toLocaleString()}` : 'KES 0'

  const stats = {
    total: documents.length,
    active: documents.filter(d => d.status === 'active').length,
    expired: documents.filter(d => d.expiryDate && new Date(d.expiryDate) < new Date()).length,
    expiringSoon: documents.filter(d => {
      if (!d.expiryDate) return false
      const days = Math.ceil((new Date(d.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
      return days > 0 && days <= 30
    }).length,
    verified: documents.filter(d => d.verified).length,
    totalPremium: documents.reduce((sum, d) => sum + (d.premium || 0), 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vehicle Documents</h1>
          <p className="text-gray-600">Manage vehicle insurance, registration, and compliance documents</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />Add Document
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /><span>{error}</span>
      </div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="p-4"><div className="flex items-center"><div className="bg-blue-500 rounded-lg p-3"><FileText className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Docs</p><p className="text-2xl font-bold">{stats.total}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-green-500 rounded-lg p-3"><CheckCircle className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Active</p><p className="text-2xl font-bold">{stats.active}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-red-500 rounded-lg p-3"><FileX className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Expired</p><p className="text-2xl font-bold">{stats.expired}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-yellow-500 rounded-lg p-3"><FileWarning className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Expiring Soon</p><p className="text-2xl font-bold">{stats.expiringSoon}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-purple-500 rounded-lg p-3"><UserCheck className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Verified</p><p className="text-2xl font-bold">{stats.verified}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-indigo-500 rounded-lg p-3"><DollarSign className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Premium</p><p className="text-2xl font-bold">{formatCurrency(stats.totalPremium)}</p></div></div></Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by vehicle, title, document number..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
          <div className="w-full md:w-48">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="all">All Types</option>
              {DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="w-full md:w-48">
            <select value={expiryFilter} onChange={(e) => setExpiryFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="all">All Status</option>
              <option value="expired">Expired</option>
              <option value="critical">Critical (≤7 days)</option>
              <option value="warning">Warning (≤30 days)</option>
              <option value="valid">Valid (&gt;30 days)</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Documents Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="mt-4">Loading...</p></div>
        ) : filteredDocuments.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No documents found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map(doc => {
              const expiryBadge = getExpiryBadge(doc.daysUntilExpiry)
              const docType = DOCUMENT_TYPES.find(t => t.value === doc.documentType)
              return (
                <div key={doc._id} className="border rounded-lg p-4 hover:shadow-md">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                        {docType?.icon || <FileText className="w-5 h-5 text-blue-600" />}
                      </div>
                      <div><h3 className="font-semibold">{doc.title}</h3><p className="text-xs text-gray-500">{doc.vehicle?.plateNumber}</p></div>
                    </div>
                    <div className="flex space-x-1">
                      <button onClick={() => handleView(doc)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => handleEdit(doc)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(doc._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2"><FileText className="w-4 h-4 text-gray-400" />#{doc.documentNumber}</div>
                    <div className="flex items-center gap-2"><Building className="w-4 h-4 text-gray-400" />{doc.provider?.name || 'Unknown Provider'}</div>
                    <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />Expires: {formatDate(doc.expiryDate)}</div>
                    <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-gray-400" />{doc.daysUntilExpiry !== null && `${Math.abs(doc.daysUntilExpiry)} days ${doc.daysUntilExpiry < 0 ? 'ago' : 'left'}`}</div>
                    {doc.premium > 0 && <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" />Premium: {formatCurrency(doc.premium)}</div>}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t">
                      <Badge variant={getStatusBadge(doc.status)}>{doc.status}</Badge>
                      <Badge variant={expiryBadge.variant}>{expiryBadge.label}</Badge>
                      {doc.verified && <Badge variant="success">Verified</Badge>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingDoc ? 'Edit Document' : 'Add Document'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('basic')}>
              <h3 className="font-semibold">Document Information</h3>
              {expandedSections.basic ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.basic && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Vehicle *</label><select name="vehicle" required value={formData.vehicle} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Select Vehicle</option>{vehicles.map(v => <option key={v._id} value={v._id}>{v.plateNumber} - {v.make} {v.model}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Document Type *</label><select name="documentType" required value={formData.documentType} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{DOCUMENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                </div>
                <Input label="Document Title *" name="title" required value={formData.title} onChange={handleInputChange} placeholder="e.g., Comprehensive Insurance 2024" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Document Number *" name="documentNumber" required value={formData.documentNumber} onChange={handleInputChange} placeholder="Policy/Reference number" />
                  <div><label className="block text-sm font-medium mb-1">Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Issue Date *" name="issueDate" type="date" required value={formData.issueDate} onChange={handleInputChange} />
                  <Input label="Expiry Date *" name="expiryDate" type="date" required value={formData.expiryDate} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Premium Amount" name="premium" type="number" value={formData.premium} onChange={handleInputChange} placeholder="0.00" />
                  <div><label className="block text-sm font-medium mb-1">Currency</label><select name="currency" value={formData.currency} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg"><option>KES</option><option>USD</option><option>EUR</option><option>GBP</option></select></div>
                </div>
                <Input label="Coverage Details" name="coverage" value={formData.coverage} onChange={handleInputChange} placeholder="What does this document cover?" />
                <Input label="File URL" name="fileUrl" value={formData.fileUrl} onChange={handleInputChange} placeholder="Link to document file" />
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('provider')}>
              <h3 className="font-semibold">Provider Information</h3>
              {expandedSections.provider ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.provider && (
              <div className="p-4 space-y-4">
                <Input label="Provider Name *" name="provider.name" required value={formData.provider.name} onChange={handleInputChange} placeholder="e.g., Jubilee Insurance" />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Contact Person" name="provider.contact.person" value={formData.provider.contact.person} onChange={handleInputChange} />
                  <Input label="Phone" name="provider.contact.phone" value={formData.provider.contact.phone} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Email" name="provider.contact.email" type="email" value={formData.provider.contact.email} onChange={handleInputChange} />
                  <Input label="Address" name="provider.address" value={formData.provider.address} onChange={handleInputChange} />
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('renewal')}>
              <h3 className="font-semibold">Renewal Settings</h3>
              {expandedSections.renewal ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.renewal && (
              <div className="p-4 space-y-4">
                <label className="flex items-center gap-2"><input type="checkbox" checked={formData.renewalReminder} onChange={(e) => setFormData(prev => ({ ...prev, renewalReminder: e.target.checked }))} className="rounded" /> Enable Renewal Reminders</label>
                {formData.renewalReminder && (
                  <div className="grid grid-cols-2 gap-4">
                    <Input label="Reminder Days Before Expiry" name="reminderDays" type="number" value={formData.reminderDays} onChange={handleInputChange} min="1" max="365" />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('tags')}>
              <h3 className="font-semibold">Tags & Notes</h3>
              {expandedSections.tags ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.tags && (
              <div className="p-4 space-y-4">
                <div><label className="block text-sm font-medium mb-1">Tags</label><div className="flex flex-wrap gap-2 mb-2">{formData.tags.map((tag, idx) => (<Badge key={idx} variant="info" className="flex items-center gap-1">{tag}<button type="button" onClick={() => removeTag(idx)} className="text-blue-600 hover:text-blue-800">×</button></Badge>))}</div><div className="flex gap-2"><Input placeholder="Add tag" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())} /><Button type="button" variant="secondary" onClick={addTag}><Plus className="w-4 h-4" /></Button></div></div>
                <div><label className="block text-sm font-medium mb-1">Notes</label><textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border rounded-lg" placeholder="Additional information..." /></div>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{submitting ? 'Saving...' : (editingDoc ? 'Update' : 'Create')}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Document Details" size="lg">
        {selectedDoc && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                {DOCUMENT_TYPES.find(t => t.value === selectedDoc.documentType)?.icon || <FileText className="w-8 h-8 text-blue-600" />}
              </div>
              <div><h3 className="text-xl font-bold">{selectedDoc.title}</h3><p className="text-gray-600">{selectedDoc.vehicle?.plateNumber} - {selectedDoc.documentNumber}</p>
                <div className="flex gap-2 mt-2"><Badge variant={getStatusBadge(selectedDoc.status)}>{selectedDoc.status}</Badge>{selectedDoc.verified && <Badge variant="success">Verified</Badge>}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><h4 className="font-medium text-gray-500 mb-2">Document Details</h4><p><strong>Type:</strong> {DOCUMENT_TYPES.find(t => t.value === selectedDoc.documentType)?.label}</p><p><strong>Issue Date:</strong> {formatDate(selectedDoc.issueDate)}</p><p><strong>Expiry Date:</strong> {formatDate(selectedDoc.expiryDate)}</p><p><strong>Days Until Expiry:</strong> {selectedDoc.daysUntilExpiry !== null && `${selectedDoc.daysUntilExpiry} days`}</p>{selectedDoc.premium > 0 && <p><strong>Premium:</strong> {formatCurrency(selectedDoc.premium)}</p>}{selectedDoc.coverage && <p><strong>Coverage:</strong> {selectedDoc.coverage}</p>}</div>
              <div><h4 className="font-medium text-gray-500 mb-2">Provider</h4><p><strong>Name:</strong> {selectedDoc.provider?.name}</p><p><strong>Contact:</strong> {selectedDoc.provider?.contact?.person}</p><p><strong>Phone:</strong> {selectedDoc.provider?.contact?.phone}</p><p><strong>Email:</strong> {selectedDoc.provider?.contact?.email}</p><p><strong>Address:</strong> {selectedDoc.provider?.address}</p></div>
            </div>
            {selectedDoc.tags?.length > 0 && (<div><h4 className="font-medium text-gray-500 mb-2">Tags</h4><div className="flex flex-wrap gap-2">{selectedDoc.tags.map((tag, idx) => (<Badge key={idx} variant="info">{tag}</Badge>))}</div></div>)}
            {selectedDoc.notes && (<div><h4 className="font-medium text-gray-500 mb-2">Notes</h4><p className="bg-gray-50 p-3 rounded">{selectedDoc.notes}</p></div>)}
            <div className="text-sm text-gray-500"><p>Created: {formatDate(selectedDoc.createdAt)}</p><p>Last Updated: {formatDate(selectedDoc.updatedAt)}</p>{selectedDoc.verified && <p>Verified by: {selectedDoc.verifiedBy?.name} on {formatDate(selectedDoc.verificationDate)}</p>}</div>
            <div className="pt-4 border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>Close</Button>
              {!selectedDoc.verified && <Button variant="success" onClick={() => { handleVerify(selectedDoc._id); setViewModalOpen(false); }}><CheckCircle className="w-4 h-4 mr-2" />Verify</Button>}
              {selectedDoc.expiryDate && new Date(selectedDoc.expiryDate) < new Date() && <Button variant="warning" onClick={() => { handleRenew(selectedDoc._id); setViewModalOpen(false); }}><RefreshCw className="w-4 h-4 mr-2" />Renew</Button>}
              <Button onClick={() => { setViewModalOpen(false); handleEdit(selectedDoc) }}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default VehicleDocuments