// frontend/src/pages/MaintenanceRecords.jsx
import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, RefreshCw, Edit, Trash2, Eye, CheckCircle,
  Wrench, Calendar, DollarSign, Car, Building, Phone, Mail,
  AlertCircle, ChevronDown, ChevronUp, Package, Clock
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { maintenanceService, vehicleService } from '../services/apiService'

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

const MAINTENANCE_TYPES = [
  { value: 'routine_service', label: 'Routine Service' },
  { value: 'oil_change', label: 'Oil Change' },
  { value: 'tire_replacement', label: 'Tire Replacement' },
  { value: 'brake_repair', label: 'Brake Repair' },
  { value: 'engine_repair', label: 'Engine Repair' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'body_work', label: 'Body Work' },
  { value: 'accident_repair', label: 'Accident Repair' },
  { value: 'battery_replacement', label: 'Battery Replacement' },
  { value: 'air_conditioning', label: 'Air Conditioning' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'other', label: 'Other' }
]

const STATUS_OPTIONS = [
  { value: 'scheduled', label: 'Scheduled', variant: 'info' },
  { value: 'in_progress', label: 'In Progress', variant: 'warning' },
  { value: 'completed', label: 'Completed', variant: 'success' },
  { value: 'cancelled', label: 'Cancelled', variant: 'error' }
]

const MaintenanceRecords = () => {
  const [records, setRecords] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)

  const [formData, setFormData] = useState({
    vehicle: '',
    date: new Date().toISOString().split('T')[0],
    type: 'routine_service',
    description: '',
    cost: '',
    garage: { name: '', contact: { phone: '', email: '', person: '' }, address: '' },
    receiptNumber: '',
    odometerReading: '',
    partsReplaced: [],
    nextServiceDate: '',
    nextServiceOdometer: '',
    serviceInterval: 5000,
    status: 'scheduled',
    warranty: { hasWarranty: false, warrantyPeriod: '', warrantyExpiryDate: '', warrantyDetails: '' },
    notes: ''
  })

  const [partInput, setPartInput] = useState({ name: '', partNumber: '', quantity: 1, unitCost: '' })

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [recordsRes, vehiclesRes] = await Promise.all([
        maintenanceService.getMaintenanceRecords({ limit: 100 }),
        vehicleService.getVehicles({ limit: 100 })
      ])
      setRecords(recordsRes.data?.data?.maintenanceRecords || recordsRes.data?.maintenanceRecords || [])
      setVehicles(vehiclesRes.data?.data?.vehicles || vehiclesRes.data?.vehicles || [])
      setError('')
    } catch (error) {
      console.error('Fetch error:', error)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const filteredRecords = useMemo(() => {
    if (!Array.isArray(records)) return []
    return records.filter(record => {
      const vehicleMatch = record.vehicle?.plateNumber || ''
      const matchesSearch = !searchTerm || 
        vehicleMatch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.garage?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter
      const matchesType = typeFilter === 'all' || record.type === typeFilter
      return matchesSearch && matchesStatus && matchesType
    })
  }, [records, searchTerm, statusFilter, typeFilter])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    if (name.includes('.')) {
      const parts = name.split('.')
      if (parts[0] === 'garage') {
        if (parts[1] === 'contact') {
          setFormData(prev => ({
            ...prev,
            garage: {
              ...prev.garage,
              contact: { ...prev.garage.contact, [parts[2]]: value }
            }
          }))
        } else {
          setFormData(prev => ({
            ...prev,
            garage: { ...prev.garage, [parts[1]]: value }
          }))
        }
      } else if (parts[0] === 'warranty') {
        setFormData(prev => ({
          ...prev,
          warranty: { ...prev.warranty, [parts[1]]: value }
        }))
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const addPart = () => {
    if (partInput.name && partInput.unitCost) {
      const totalCost = partInput.quantity * parseFloat(partInput.unitCost)
      setFormData(prev => ({
        ...prev,
        partsReplaced: [...prev.partsReplaced, { ...partInput, unitCost: parseFloat(partInput.unitCost), totalCost }]
      }))
      setPartInput({ name: '', partNumber: '', quantity: 1, unitCost: '' })
    }
  }

  const removePart = (index) => {
    setFormData(prev => ({
      ...prev,
      partsReplaced: prev.partsReplaced.filter((_, i) => i !== index)
    }))
  }

  const calculateTotalPartsCost = () => {
    return formData.partsReplaced.reduce((sum, part) => sum + (part.totalCost || 0), 0)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const recordData = {
        vehicle: formData.vehicle,
        date: formData.date,
        type: formData.type,
        description: formData.description.trim(),
        cost: parseFloat(formData.cost),
        garage: {
          name: formData.garage.name,
          contact: {
            phone: formData.garage.contact.phone || undefined,
            email: formData.garage.contact.email || undefined,
            person: formData.garage.contact.person || undefined
          },
          address: formData.garage.address || undefined
        },
        receiptNumber: formData.receiptNumber || undefined,
        odometerReading: parseInt(formData.odometerReading),
        partsReplaced: formData.partsReplaced,
        nextServiceDate: formData.nextServiceDate || undefined,
        nextServiceOdometer: formData.nextServiceOdometer ? parseInt(formData.nextServiceOdometer) : undefined,
        serviceInterval: parseInt(formData.serviceInterval),
        status: formData.status,
        warranty: {
          hasWarranty: formData.warranty.hasWarranty,
          warrantyPeriod: formData.warranty.warrantyPeriod ? parseInt(formData.warranty.warrantyPeriod) : undefined,
          warrantyExpiryDate: formData.warranty.warrantyExpiryDate || undefined,
          warrantyDetails: formData.warranty.warrantyDetails || undefined
        },
        notes: formData.notes || undefined
      }

      if (editingRecord) {
        await maintenanceService.updateMaintenanceRecord(editingRecord._id, recordData)
        alert('Maintenance record updated!')
      } else {
        await maintenanceService.createMaintenanceRecord(recordData)
        alert('Maintenance record created!')
      }
      await fetchAllData()
      resetForm()
      setIsModalOpen(false)
    } catch (error) {
      alert(error.response?.data?.error || 'Failed to save record')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    setFormData({
      vehicle: record.vehicle?._id || record.vehicle || '',
      date: record.date?.split('T')[0] || new Date().toISOString().split('T')[0],
      type: record.type || 'routine_service',
      description: record.description || '',
      cost: record.cost || '',
      garage: {
        name: record.garage?.name || '',
        contact: {
          phone: record.garage?.contact?.phone || '',
          email: record.garage?.contact?.email || '',
          person: record.garage?.contact?.person || ''
        },
        address: record.garage?.address || ''
      },
      receiptNumber: record.receiptNumber || '',
      odometerReading: record.odometerReading || '',
      partsReplaced: record.partsReplaced || [],
      nextServiceDate: record.nextServiceDate?.split('T')[0] || '',
      nextServiceOdometer: record.nextServiceOdometer || '',
      serviceInterval: record.serviceInterval || 5000,
      status: record.status || 'scheduled',
      warranty: {
        hasWarranty: record.warranty?.hasWarranty || false,
        warrantyPeriod: record.warranty?.warrantyPeriod || '',
        warrantyExpiryDate: record.warranty?.warrantyExpiryDate?.split('T')[0] || '',
        warrantyDetails: record.warranty?.warrantyDetails || ''
      },
      notes: record.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleView = (record) => {
    setSelectedRecord(record)
    setViewModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this maintenance record?')) {
      try {
        await maintenanceService.deleteMaintenanceRecord(id)
        alert('Record deleted!')
        fetchAllData()
      } catch (error) {
        alert(error.response?.data?.error || 'Delete failed')
      }
    }
  }

  const handleVerify = async (id) => {
    if (window.confirm('Verify this maintenance record?')) {
      try {
        await maintenanceService.verifyMaintenanceRecord(id)
        alert('Record verified!')
        fetchAllData()
      } catch (error) {
        alert(error.response?.data?.error || 'Verification failed')
      }
    }
  }

  const resetForm = () => {
    setFormData({
      vehicle: '',
      date: new Date().toISOString().split('T')[0],
      type: 'routine_service',
      description: '',
      cost: '',
      garage: { name: '', contact: { phone: '', email: '', person: '' }, address: '' },
      receiptNumber: '',
      odometerReading: '',
      partsReplaced: [],
      nextServiceDate: '',
      nextServiceOdometer: '',
      serviceInterval: 5000,
      status: 'scheduled',
      warranty: { hasWarranty: false, warrantyPeriod: '', warrantyExpiryDate: '', warrantyDetails: '' },
      notes: ''
    })
    setPartInput({ name: '', partNumber: '', quantity: 1, unitCost: '' })
    setEditingRecord(null)
  }

  const getStatusBadge = (status) => {
    const found = STATUS_OPTIONS.find(s => s.value === status)
    return found?.variant || 'default'
  }

  const getTypeLabel = (type) => {
    const found = MAINTENANCE_TYPES.find(t => t.value === type)
    return found?.label || type
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
  const formatCurrency = (amount) => amount ? `KES ${amount.toLocaleString()}` : 'KES 0'

  const stats = {
    total: records.length,
    scheduled: records.filter(r => r.status === 'scheduled').length,
    inProgress: records.filter(r => r.status === 'in_progress').length,
    completed: records.filter(r => r.status === 'completed').length,
    totalCost: records.reduce((sum, r) => sum + (r.cost || 0), 0)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance Records</h1>
          <p className="text-gray-600">Track vehicle maintenance and service history</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={fetchAllData}>
            <RefreshCw className="w-4 h-4 mr-2" />Refresh
          </Button>
          <Button onClick={() => { resetForm(); setIsModalOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />Add Record
          </Button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
        <AlertCircle className="w-5 h-5" /><span>{error}</span>
      </div>}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4"><div className="flex items-center"><div className="bg-blue-500 rounded-lg p-3"><Wrench className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Records</p><p className="text-2xl font-bold">{stats.total}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-yellow-500 rounded-lg p-3"><Clock className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Scheduled</p><p className="text-2xl font-bold">{stats.scheduled}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-orange-500 rounded-lg p-3"><Wrench className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">In Progress</p><p className="text-2xl font-bold">{stats.inProgress}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-green-500 rounded-lg p-3"><CheckCircle className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Completed</p><p className="text-2xl font-bold">{stats.completed}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-purple-500 rounded-lg p-3"><DollarSign className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Cost</p><p className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</p></div></div></Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by vehicle, garage, maintenance type..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
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
              {MAINTENANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="mt-4">Loading...</p></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No maintenance records found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map(record => (
              <div key={record._id} className="border rounded-lg p-4 hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Wrench className="w-5 h-5 text-blue-600" /></div>
                    <div><h3 className="font-semibold">{record.vehicle?.plateNumber || 'Unknown Vehicle'}</h3><p className="text-xs text-gray-500">{getTypeLabel(record.type)}</p></div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => handleView(record)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(record)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(record._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />{formatDate(record.date)}</div>
                  <div className="flex items-center gap-2"><Building className="w-4 h-4 text-gray-400" />{record.garage?.name || 'Unknown Garage'}</div>
                  <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" />{formatCurrency(record.cost)}</div>
                  <div className="flex items-center gap-2"><Car className="w-4 h-4 text-gray-400" />Odometer: {record.odometerReading?.toLocaleString()} km</div>
                  <div className="flex items-center gap-2"><Package className="w-4 h-4 text-gray-400" />Parts: {record.partsReplaced?.length || 0}</div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant={getStatusBadge(record.status)}>{record.status?.replace('_', ' ')}</Badge>
                    {record.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record'} size="xl">
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Maintenance Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Vehicle *</label><select name="vehicle" required value={formData.vehicle} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Select Vehicle</option>{vehicles.map(v => <option key={v._id} value={v._id}>{v.plateNumber} - {v.make} {v.model}</option>)}</select></div>
              <Input label="Date" name="date" type="date" required value={formData.date} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><label className="block text-sm font-medium mb-1">Type *</label><select name="type" required value={formData.type} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{MAINTENANCE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Status</label><select name="status" value={formData.status} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            </div>
            <div className="mt-4"><label className="block text-sm font-medium mb-1">Description *</label><textarea name="description" required value={formData.description} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border rounded-lg" placeholder="Describe the maintenance work performed..." /></div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Total Cost (KES)" name="cost" type="number" required value={formData.cost} onChange={handleInputChange} placeholder="0.00" />
              <Input label="Odometer Reading (km)" name="odometerReading" type="number" required value={formData.odometerReading} onChange={handleInputChange} placeholder="Current mileage" />
            </div>
            <div className="mt-4"><Input label="Receipt/Invoice Number" name="receiptNumber" value={formData.receiptNumber} onChange={handleInputChange} placeholder="Optional" /></div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Garage / Service Provider</h3>
            <Input label="Garage Name" value={formData.garage.name} onChange={(e) => setFormData(prev => ({ ...prev, garage: { ...prev.garage, name: e.target.value } }))} placeholder="e.g., Toyota Service Center" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Contact Person" value={formData.garage.contact.person} onChange={(e) => setFormData(prev => ({ ...prev, garage: { ...prev.garage, contact: { ...prev.garage.contact, person: e.target.value } } }))} />
              <Input label="Phone" value={formData.garage.contact.phone} onChange={(e) => setFormData(prev => ({ ...prev, garage: { ...prev.garage, contact: { ...prev.garage.contact, phone: e.target.value } } }))} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Email" value={formData.garage.contact.email} onChange={(e) => setFormData(prev => ({ ...prev, garage: { ...prev.garage, contact: { ...prev.garage.contact, email: e.target.value } } }))} />
              <Input label="Address" value={formData.garage.address} onChange={(e) => setFormData(prev => ({ ...prev, garage: { ...prev.garage, address: e.target.value } }))} />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Parts Replaced</h3>
            {formData.partsReplaced.map((part, index) => (
              <div key={index} className="bg-gray-50 p-3 rounded mb-2 flex justify-between items-center">
                <div><p className="font-medium">{part.name}</p><p className="text-sm">Qty: {part.quantity} x {formatCurrency(part.unitCost)} = {formatCurrency(part.totalCost)}</p></div>
                <button type="button" onClick={() => removePart(index)} className="text-red-500"><Trash2 className="w-4 h-4" /></button>
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <Input placeholder="Part name" value={partInput.name} onChange={(e) => setPartInput({...partInput, name: e.target.value})} />
              <Input placeholder="Part number" value={partInput.partNumber} onChange={(e) => setPartInput({...partInput, partNumber: e.target.value})} />
              <Input type="number" placeholder="Qty" value={partInput.quantity} onChange={(e) => setPartInput({...partInput, quantity: parseInt(e.target.value) || 1})} />
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Input type="number" placeholder="Unit Cost (KES)" value={partInput.unitCost} onChange={(e) => setPartInput({...partInput, unitCost: e.target.value})} />
              <Button type="button" variant="secondary" onClick={addPart}><Plus className="w-4 h-4 mr-2" />Add Part</Button>
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Next Service</h3>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Service Interval (km)" type="number" name="serviceInterval" value={formData.serviceInterval} onChange={handleInputChange} />
              <Input label="Next Service Odometer" type="number" name="nextServiceOdometer" value={formData.nextServiceOdometer} onChange={handleInputChange} />
            </div>
            <div className="mt-4"><Input label="Next Service Date" type="date" name="nextServiceDate" value={formData.nextServiceDate} onChange={handleInputChange} /></div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Warranty</h3>
            <label className="flex items-center gap-2"><input type="checkbox" checked={formData.warranty.hasWarranty} onChange={(e) => setFormData(prev => ({ ...prev, warranty: { ...prev.warranty, hasWarranty: e.target.checked } }))} className="rounded" /> Has Warranty</label>
            {formData.warranty.hasWarranty && (
              <div className="grid grid-cols-2 gap-4 mt-4">
                <Input label="Warranty Period (months)" type="number" name="warrantyPeriod" value={formData.warranty.warrantyPeriod} onChange={handleInputChange} />
                <Input label="Expiry Date" type="date" name="warrantyExpiryDate" value={formData.warranty.warrantyExpiryDate} onChange={handleInputChange} />
                <div className="col-span-2"><Input label="Warranty Details" name="warrantyDetails" value={formData.warranty.warrantyDetails} onChange={handleInputChange} /></div>
              </div>
            )}
          </div>

          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium mb-1">Additional Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border rounded-lg" />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{submitting ? 'Saving...' : (editingRecord ? 'Update' : 'Create')}</Button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Maintenance Record Details" size="lg">
        {selectedRecord && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"><Wrench className="w-8 h-8 text-blue-600" /></div>
              <div><h3 className="text-xl font-bold">{selectedRecord.vehicle?.plateNumber} - {getTypeLabel(selectedRecord.type)}</h3><p className="text-gray-600">{formatDate(selectedRecord.date)}</p>
                <div className="flex gap-2 mt-2"><Badge variant={getStatusBadge(selectedRecord.status)}>{selectedRecord.status?.replace('_', ' ')}</Badge>{selectedRecord.verified && <Badge variant="success">Verified</Badge>}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><h4 className="font-medium text-gray-500 mb-2">Details</h4><p><strong>Description:</strong> {selectedRecord.description}</p><p><strong>Cost:</strong> {formatCurrency(selectedRecord.cost)}</p><p><strong>Odometer:</strong> {selectedRecord.odometerReading?.toLocaleString()} km</p><p><strong>Receipt:</strong> {selectedRecord.receiptNumber || 'N/A'}</p></div>
              <div><h4 className="font-medium text-gray-500 mb-2">Garage</h4><p><strong>Name:</strong> {selectedRecord.garage?.name}</p><p><strong>Contact:</strong> {selectedRecord.garage?.contact?.person}</p><p><strong>Phone:</strong> {selectedRecord.garage?.contact?.phone}</p></div>
            </div>
            {selectedRecord.partsReplaced?.length > 0 && (<div><h4 className="font-medium text-gray-500 mb-2">Parts Replaced</h4>{selectedRecord.partsReplaced.map((part, idx) => (<div key={idx} className="bg-gray-50 p-2 rounded mb-2"><p className="font-medium">{part.name}</p><p className="text-sm">Qty: {part.quantity} x {formatCurrency(part.unitCost)} = {formatCurrency(part.totalCost)}</p></div>))}</div>)}
            <div className="pt-4 border-t flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setViewModalOpen(false)}>Close</Button>
              {!selectedRecord.verified && <Button variant="success" onClick={() => { handleVerify(selectedRecord._id); setViewModalOpen(false); }}><CheckCircle className="w-4 h-4 mr-2" />Verify</Button>}
              <Button onClick={() => { setViewModalOpen(false); handleEdit(selectedRecord) }}>Edit</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default MaintenanceRecords