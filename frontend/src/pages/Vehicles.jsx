import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, RefreshCw, Edit, Trash2, Eye, Car, Truck,
  Calendar, DollarSign, Fuel, Users, MapPin, AlertCircle,
  ChevronDown, ChevronUp, Building, Phone, FileText, CheckCircle,
  XCircle, Wrench, TrendingUp, Gauge, CreditCard, UserCheck
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { vehicleService, staffService } from '../services/apiService'

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

const VEHICLE_TYPES = [
  { value: 'bus', label: 'Bus' },
  { value: 'van', label: 'Van' },
  { value: 'sedan', label: 'Sedan' },
  { value: 'truck', label: 'Truck' },
  { value: 'minibus', label: 'Minibus' },
  { value: 'other', label: 'Other' }
]

const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'electric', label: 'Electric' },
  { value: 'hybrid', label: 'Hybrid' },
  { value: 'cng', label: 'CNG' }
]

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active', variant: 'success' },
  { value: 'maintenance', label: 'Maintenance', variant: 'warning' },
  { value: 'accident', label: 'Accident', variant: 'error' },
  { value: 'retired', label: 'Retired', variant: 'default' },
  { value: 'sold', label: 'Sold', variant: 'default' },
  { value: 'reserved', label: 'Reserved', variant: 'info' }
]

const PURPOSE_OPTIONS = [
  { value: 'student_transport', label: 'Student Transport' },
  { value: 'staff_transport', label: 'Staff Transport' },
  { value: 'goods_transport', label: 'Goods Transport' },
  { value: 'multi_purpose', label: 'Multi-Purpose' },
  { value: 'emergency', label: 'Emergency' }
]

const Vehicles = () => {
  const [vehicles, setVehicles] = useState([])
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingVehicle, setEditingVehicle] = useState(null)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  const [expandedSections, setExpandedSections] = useState({
    basic: true, financial: true, insurance: true, registration: true, documents: true
  })

  const [formData, setFormData] = useState({
    plateNumber: '',
    make: '',
    model: '',
    year: new Date().getFullYear(),
    vehicleType: 'bus',
    color: '',
    capacity: '',
    fuelType: 'diesel',
    fuelTankCapacity: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    purchasePrice: '',
    currentValue: '',
    insurance: {
      provider: '',
      policyNumber: '',
      startDate: '',
      expiryDate: '',
      coverage: '',
      premium: ''
    },
    registration: {
      number: '',
      expiryDate: '',
      issuingAuthority: ''
    },
    status: 'active',
    currentOdometer: 0,
    nextServiceOdometer: 5000,
    nextServiceDate: '',
    purpose: 'student_transport',
    assignedDriver: '',
    assignedRoute: '',
    notes: ''
  })

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [vehiclesRes, staffRes] = await Promise.all([
        vehicleService.getVehicles({ limit: 100 }),
        staffService.getStaff({ limit: 100 })
      ])
      setVehicles(vehiclesRes.data?.data?.vehicles || vehiclesRes.data?.vehicles || [])
      setStaff(staffRes.data?.data?.staff || staffRes.data?.staff || [])
      setError('')
    } catch (error) {
      console.error('Fetch error:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredVehicles = useMemo(() => {
    if (!Array.isArray(vehicles)) return []
    return vehicles.filter(vehicle => {
      const matchesSearch = !searchTerm || 
        vehicle.plateNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || vehicle.status === statusFilter
      const matchesType = typeFilter === 'all' || vehicle.vehicleType === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [vehicles, searchTerm, statusFilter, typeFilter])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const calculateCurrentValue = () => {
    if (formData.purchasePrice && formData.year) {
      const currentYear = new Date().getFullYear()
      const age = currentYear - parseInt(formData.year)
      const depreciationRate = 0.15
      let value = formData.purchasePrice * Math.pow(1 - depreciationRate, age)
      value = Math.max(value, formData.purchasePrice * 0.1)
      setFormData(prev => ({ ...prev, currentValue: Math.round(value) }))
    }
  }

  useEffect(() => {
    calculateCurrentValue()
  }, [formData.purchasePrice, formData.year])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const vehicleData = {
        plateNumber: formData.plateNumber.toUpperCase(),
        make: formData.make,
        model: formData.model,
        year: parseInt(formData.year),
        vehicleType: formData.vehicleType,
        color: formData.color || undefined,
        capacity: parseInt(formData.capacity),
        fuelType: formData.fuelType,
        fuelTankCapacity: parseFloat(formData.fuelTankCapacity),
        purchaseDate: formData.purchaseDate,
        purchasePrice: parseFloat(formData.purchasePrice),
        currentValue: parseFloat(formData.currentValue),
        insurance: {
          provider: formData.insurance.provider || undefined,
          policyNumber: formData.insurance.policyNumber || undefined,
          startDate: formData.insurance.startDate || undefined,
          expiryDate: formData.insurance.expiryDate || undefined,
          coverage: formData.insurance.coverage || undefined,
          premium: formData.insurance.premium ? parseFloat(formData.insurance.premium) : undefined
        },
        registration: {
          number: formData.registration.number || undefined,
          expiryDate: formData.registration.expiryDate || undefined,
          issuingAuthority: formData.registration.issuingAuthority || undefined
        },
        status: formData.status,
        currentOdometer: parseInt(formData.currentOdometer) || 0,
        nextServiceOdometer: parseInt(formData.nextServiceOdometer) || 5000,
        nextServiceDate: formData.nextServiceDate || undefined,
        purpose: formData.purpose,
        assignedDriver: formData.assignedDriver || undefined,
        assignedRoute: formData.assignedRoute || undefined,
        notes: formData.notes || undefined
      }

      if (editingVehicle) {
        await vehicleService.updateVehicle(editingVehicle._id, vehicleData)
        alert('Vehicle updated!')
      } else {
        await vehicleService.createVehicle(vehicleData)
        alert('Vehicle created!')
      }
      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save vehicle')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (vehicle) => {
    setEditingVehicle(vehicle)
    setFormData({
      plateNumber: vehicle.plateNumber || '',
      make: vehicle.make || '',
      model: vehicle.model || '',
      year: vehicle.year || new Date().getFullYear(),
      vehicleType: vehicle.vehicleType || 'bus',
      color: vehicle.color || '',
      capacity: vehicle.capacity || '',
      fuelType: vehicle.fuelType || 'diesel',
      fuelTankCapacity: vehicle.fuelTankCapacity || '',
      purchaseDate: vehicle.purchaseDate?.split('T')[0] || '',
      purchasePrice: vehicle.purchasePrice || '',
      currentValue: vehicle.currentValue || '',
      insurance: {
        provider: vehicle.insurance?.provider || '',
        policyNumber: vehicle.insurance?.policyNumber || '',
        startDate: vehicle.insurance?.startDate?.split('T')[0] || '',
        expiryDate: vehicle.insurance?.expiryDate?.split('T')[0] || '',
        coverage: vehicle.insurance?.coverage || '',
        premium: vehicle.insurance?.premium || ''
      },
      registration: {
        number: vehicle.registration?.number || '',
        expiryDate: vehicle.registration?.expiryDate?.split('T')[0] || '',
        issuingAuthority: vehicle.registration?.issuingAuthority || ''
      },
      status: vehicle.status || 'active',
      currentOdometer: vehicle.currentOdometer || 0,
      nextServiceOdometer: vehicle.nextServiceOdometer || 5000,
      nextServiceDate: vehicle.nextServiceDate?.split('T')[0] || '',
      purpose: vehicle.purpose || 'student_transport',
      assignedDriver: vehicle.assignedDriver?._id || vehicle.assignedDriver || '',
      assignedRoute: vehicle.assignedRoute || '',
      notes: vehicle.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleView = (vehicle) => {
    setSelectedVehicle(vehicle)
    setViewModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Mark this vehicle as retired?')) {
      try {
        await vehicleService.deleteVehicle(id)
        alert('Vehicle marked as retired!')
        fetchAllData()
      } catch (error) {
        alert(error.response?.data?.error || 'Operation failed')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      plateNumber: '',
      make: '',
      model: '',
      year: new Date().getFullYear(),
      vehicleType: 'bus',
      color: '',
      capacity: '',
      fuelType: 'diesel',
      fuelTankCapacity: '',
      purchaseDate: new Date().toISOString().split('T')[0],
      purchasePrice: '',
      currentValue: '',
      insurance: {
        provider: '',
        policyNumber: '',
        startDate: '',
        expiryDate: '',
        coverage: '',
        premium: ''
      },
      registration: {
        number: '',
        expiryDate: '',
        issuingAuthority: ''
      },
      status: 'active',
      currentOdometer: 0,
      nextServiceOdometer: 5000,
      nextServiceDate: '',
      purpose: 'student_transport',
      assignedDriver: '',
      assignedRoute: '',
      notes: ''
    })
    setEditingVehicle(null)
  }

  const toggleSection = (section) => setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }))

  const getStatusBadge = (status) => {
    const found = STATUS_OPTIONS.find(s => s.value === status)
    return found?.variant || 'default'
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
  const formatCurrency = (amount) => amount ? `KES ${amount.toLocaleString()}` : 'KES 0'
  const formatNumber = (num) => num ? num.toLocaleString() : '0'

  const stats = {
    total: vehicles.length,
    active: vehicles.filter(v => v.status === 'active').length,
    maintenance: vehicles.filter(v => v.status === 'maintenance').length,
    totalValue: vehicles.reduce((sum, v) => sum + (v.currentValue || 0), 0),
    needingService: vehicles.filter(v => v.currentOdometer >= (v.nextServiceOdometer || 0)).length
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Management</h1>
          <p className="text-gray-600">Manage school vehicles and fleet operations</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />Add Vehicle
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /><span>{error}</span>
      </div>}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4"><div className="flex items-center"><div className="bg-blue-500 rounded-lg p-3"><Car className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Vehicles</p><p className="text-2xl font-bold">{stats.total}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-green-500 rounded-lg p-3"><CheckCircle className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Active</p><p className="text-2xl font-bold">{stats.active}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-yellow-500 rounded-lg p-3"><Wrench className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Maintenance</p><p className="text-2xl font-bold">{stats.maintenance}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-purple-500 rounded-lg p-3"><DollarSign className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Value</p><p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-red-500 rounded-lg p-3"><AlertCircle className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Service Due</p><p className="text-2xl font-bold">{stats.needingService}</p></div></div></Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by plate number, make, model..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
          <div className="w-full md:w-48">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="all">All Status</option>
              {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="w-full md:w-48">
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="all">All Types</option>
              {VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      {/* Vehicles Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="mt-4">Loading...</p></div>
        ) : filteredVehicles.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No vehicles found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map(vehicle => (
              <div key={vehicle._id} className="border rounded-lg p-4 hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      {vehicle.vehicleType === 'bus' ? <Truck className="w-5 h-5 text-blue-600" /> : <Car className="w-5 h-5 text-blue-600" />}
                    </div>
                    <div><h3 className="font-semibold">{vehicle.plateNumber}</h3><p className="text-xs text-gray-500">{vehicle.make} {vehicle.model} ({vehicle.year})</p></div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => handleView(vehicle)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(vehicle)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(vehicle._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Fuel className="w-4 h-4 text-gray-400" />{VEHICLE_TYPES.find(t => t.value === vehicle.vehicleType)?.label} | {FUEL_TYPES.find(f => f.value === vehicle.fuelType)?.label}</div>
                  <div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" />Capacity: {vehicle.capacity} passengers</div>
                  <div className="flex items-center gap-2"><Gauge className="w-4 h-4 text-gray-400" />Odometer: {formatNumber(vehicle.currentOdometer)} km</div>
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />Next Service: {formatNumber(vehicle.nextServiceOdometer)} km</div>
                  {vehicle.assignedDriver && (<div className="flex items-center gap-2"><UserCheck className="w-4 h-4 text-gray-400" />Driver: {vehicle.assignedDriver.firstName} {vehicle.assignedDriver.lastName}</div>)}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant={getStatusBadge(vehicle.status)}>{STATUS_OPTIONS.find(s => s.value === vehicle.status)?.label}</Badge>
                    {vehicle.currentOdometer >= (vehicle.nextServiceOdometer || 0) && <Badge variant="warning">Service Due</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('basic')}>
              <h3 className="font-semibold">Basic Information</h3>
              {expandedSections.basic ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.basic && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Plate Number *" name="plateNumber" required value={formData.plateNumber} onChange={handleInputChange} placeholder="KDD 123A" />
                  <Input label="Make *" name="make" required value={formData.make} onChange={handleInputChange} placeholder="e.g., Toyota" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Model *" name="model" required value={formData.model} onChange={handleInputChange} placeholder="e.g., Hiace" />
                  <Input label="Year *" name="year" type="number" required value={formData.year} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Vehicle Type *</label><select name="vehicleType" required value={formData.vehicleType} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{VEHICLE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
                  <Input label="Color" name="color" value={formData.color} onChange={handleInputChange} placeholder="e.g., White" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Capacity (passengers) *" name="capacity" type="number" required value={formData.capacity} onChange={handleInputChange} />
                  <div><label className="block text-sm font-medium mb-1">Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Fuel Type *</label><select name="fuelType" required value={formData.fuelType} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{FUEL_TYPES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}</select></div>
                  <Input label="Fuel Tank Capacity (L) *" name="fuelTankCapacity" type="number" required value={formData.fuelTankCapacity} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-sm font-medium mb-1">Purpose</label><select name="purpose" value={formData.purpose} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{PURPOSE_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
                  <div><label className="block text-sm font-medium mb-1">Assigned Driver</label><select name="assignedDriver" value={formData.assignedDriver} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Select Driver</option>{staff.map(s => <option key={s._id} value={s._id}>{s.firstName} {s.lastName} - {s.position}</option>)}</select></div>
                </div>
                <Input label="Assigned Route" name="assignedRoute" value={formData.assignedRoute} onChange={handleInputChange} placeholder="e.g., Route A - Ngong Road" />
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('financial')}>
              <h3 className="font-semibold">Financial Information</h3>
              {expandedSections.financial ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.financial && (
              <div className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Purchase Date *" name="purchaseDate" type="date" required value={formData.purchaseDate} onChange={handleInputChange} />
                  <Input label="Purchase Price (KES) *" name="purchasePrice" type="number" required value={formData.purchasePrice} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Current Value (KES)" name="currentValue" type="number" value={formData.currentValue} onChange={handleInputChange} />
                </div>
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('insurance')}>
              <h3 className="font-semibold">Insurance Details</h3>
              {expandedSections.insurance ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.insurance && (
              <div className="p-4 space-y-4">
                <Input label="Provider" name="insurance.provider" value={formData.insurance.provider} onChange={handleInputChange} />
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Policy Number" name="insurance.policyNumber" value={formData.insurance.policyNumber} onChange={handleInputChange} />
                  <Input label="Premium (KES)" name="insurance.premium" type="number" value={formData.insurance.premium} onChange={handleInputChange} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Start Date" name="insurance.startDate" type="date" value={formData.insurance.startDate} onChange={handleInputChange} />
                  <Input label="Expiry Date" name="insurance.expiryDate" type="date" value={formData.insurance.expiryDate} onChange={handleInputChange} />
                </div>
                <Input label="Coverage Details" name="insurance.coverage" value={formData.insurance.coverage} onChange={handleInputChange} />
              </div>
            )}
          </div>

          <div className="border rounded-lg">
            <div className="flex justify-between p-4 bg-gray-50 cursor-pointer" onClick={() => toggleSection('registration')}>
              <h3 className="font-semibold">Registration Details</h3>
              {expandedSections.registration ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
            {expandedSections.registration && (
              <div className="p-4 space-y-4">
                <Input label="Registration Number" name="registration.number" value={formData.registration.number} onChange={handleInputChange} />
                <Input label="Expiry Date" name="registration.expiryDate" type="date" value={formData.registration.expiryDate} onChange={handleInputChange} />
                <Input label="Issuing Authority" name="registration.issuingAuthority" value={formData.registration.issuingAuthority} onChange={handleInputChange} />
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Service & Maintenance</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Current Odometer (km)" name="currentOdometer" type="number" value={formData.currentOdometer} onChange={handleInputChange} />
              <Input label="Next Service Odometer (km)" name="nextServiceOdometer" type="number" value={formData.nextServiceOdometer} onChange={handleInputChange} />
            </div>
            <div className="mt-4"><Input label="Next Service Date" name="nextServiceDate" type="date" value={formData.nextServiceDate} onChange={handleInputChange} /></div>
          </div>

          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{submitting ? 'Saving...' : (editingVehicle ? 'Update' : 'Create')}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Vehicle Details" size="lg">
        {selectedVehicle && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center">
                {selectedVehicle.vehicleType === 'bus' ? <Truck className="w-8 h-8 text-blue-600" /> : <Car className="w-8 h-8 text-blue-600" />}
              </div>
              <div><h3 className="text-xl font-bold">{selectedVehicle.plateNumber}</h3><p className="text-gray-600">{selectedVehicle.make} {selectedVehicle.model} ({selectedVehicle.year})</p>
                <div className="flex gap-2 mt-2"><Badge variant={getStatusBadge(selectedVehicle.status)}>{STATUS_OPTIONS.find(s => s.value === selectedVehicle.status)?.label}</Badge></div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><h4 className="font-medium text-gray-500 mb-2">Specifications</h4><p><strong>Type:</strong> {VEHICLE_TYPES.find(t => t.value === selectedVehicle.vehicleType)?.label}</p><p><strong>Color:</strong> {selectedVehicle.color || 'N/A'}</p><p><strong>Capacity:</strong> {selectedVehicle.capacity} passengers</p><p><strong>Fuel Type:</strong> {FUEL_TYPES.find(f => f.value === selectedVehicle.fuelType)?.label}</p><p><strong>Fuel Tank:</strong> {selectedVehicle.fuelTankCapacity} L</p><p><strong>Odometer:</strong> {formatNumber(selectedVehicle.currentOdometer)} km</p></div>
              <div><h4 className="font-medium text-gray-500 mb-2">Financial</h4><p><strong>Purchase Date:</strong> {formatDate(selectedVehicle.purchaseDate)}</p><p><strong>Purchase Price:</strong> {formatCurrency(selectedVehicle.purchasePrice)}</p><p><strong>Current Value:</strong> {formatCurrency(selectedVehicle.currentValue)}</p><p><strong>Depreciation:</strong> {selectedVehicle.depreciationPercentage}%</p></div>
            </div>
            {(selectedVehicle.insurance?.provider || selectedVehicle.registration?.number) && (
              <div className="grid grid-cols-2 gap-6">
                <div><h4 className="font-medium text-gray-500 mb-2">Insurance</h4><p><strong>Provider:</strong> {selectedVehicle.insurance?.provider || 'N/A'}</p><p><strong>Policy:</strong> {selectedVehicle.insurance?.policyNumber || 'N/A'}</p><p><strong>Expiry:</strong> {formatDate(selectedVehicle.insurance?.expiryDate)}</p><p><strong>Status:</strong> <Badge variant={selectedVehicle.insuranceStatus === 'valid' ? 'success' : selectedVehicle.insuranceStatus === 'expiring_soon' ? 'warning' : 'error'}>{selectedVehicle.insuranceStatus}</Badge></p></div>
                <div><h4 className="font-medium text-gray-500 mb-2">Registration</h4><p><strong>Number:</strong> {selectedVehicle.registration?.number || 'N/A'}</p><p><strong>Expiry:</strong> {formatDate(selectedVehicle.registration?.expiryDate)}</p><p><strong>Status:</strong> <Badge variant={selectedVehicle.registrationStatus === 'valid' ? 'success' : selectedVehicle.registrationStatus === 'expiring_soon' ? 'warning' : 'error'}>{selectedVehicle.registrationStatus}</Badge></p></div>
              </div>
            )}
            {selectedVehicle.assignedDriver && (<div><h4 className="font-medium text-gray-500 mb-2">Assignment</h4><p><strong>Driver:</strong> {selectedVehicle.assignedDriver.firstName} {selectedVehicle.assignedDriver.lastName}</p><p><strong>Route:</strong> {selectedVehicle.assignedRoute || 'N/A'}</p><p><strong>Purpose:</strong> {PURPOSE_OPTIONS.find(p => p.value === selectedVehicle.purpose)?.label}</p></div>)}
            {selectedVehicle.notes && (<div><h4 className="font-medium text-gray-500 mb-2">Notes</h4><p className="bg-gray-50 p-3 rounded">{selectedVehicle.notes}</p></div>)}
            <div className="text-sm text-gray-500"><p>Created: {formatDate(selectedVehicle.createdAt)}</p><p>Last Updated: {formatDate(selectedVehicle.updatedAt)}</p></div>
            <div className="pt-4 border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>Close</Button>
              <Button onClick={() => { setViewModalOpen(false); handleEdit(selectedVehicle) }}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default Vehicles