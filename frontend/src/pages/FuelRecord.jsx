import React, { useState, useEffect, useMemo } from 'react'
import { 
  Search, Plus, RefreshCw, Edit, Trash2, Eye, CheckCircle,
  Fuel, Calendar, DollarSign, Car, Building, Phone, FileText,
  AlertCircle, ChevronDown, ChevronUp, TrendingUp, TrendingDown,
  Receipt, MapPin, CreditCard, Users
} from 'lucide-react'
import Modal from '../components/Modal'
import Button from '../components/Button'
import Input from '../components/Input'
import { fuelRecordService, vehicleService } from '../services/apiService'

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

const FUEL_TYPES = [
  { value: 'petrol', label: 'Petrol' },
  { value: 'diesel', label: 'Diesel' },
  { value: 'premium', label: 'Premium' },
  { value: 'other', label: 'Other' }
]

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'fleet_card', label: 'Fleet Card' },
  { value: 'credit', label: 'Credit' },
  { value: 'other', label: 'Other' }
]

const FuelRecords = () => {
  const [records, setRecords] = useState([])
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [fuelTypeFilter, setFuelTypeFilter] = useState('all')
  const [verifiedFilter, setVerifiedFilter] = useState('all')
  const [error, setError] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [viewModalOpen, setViewModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [selectedRecord, setSelectedRecord] = useState(null)

  const [formData, setFormData] = useState({
    vehicle: '',
    date: new Date().toISOString().split('T')[0],
    liters: '',
    costPerLiter: '',
    totalCost: '',
    odometerReading: '',
    station: { name: '', location: '', contact: '' },
    receiptNumber: '',
    fuelType: 'diesel',
    paymentMethod: 'cash',
    notes: ''
  })

  useEffect(() => { fetchAllData() }, [])

  const fetchAllData = async () => {
    setLoading(true)
    try {
      const [recordsRes, vehiclesRes] = await Promise.all([
        fuelRecordService.getFuelRecords({ limit: 100 }),
        vehicleService.getVehicles({ limit: 100 })
      ])
      setRecords(recordsRes.data?.data?.fuelRecords || recordsRes.data?.fuelRecords || [])
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
      const stationMatch = record.station?.name || ''
      const matchesSearch = !searchTerm || 
        vehicleMatch.toLowerCase().includes(searchTerm.toLowerCase()) ||
        stationMatch.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesFuelType = fuelTypeFilter === 'all' || record.fuelType === fuelTypeFilter
      const matchesVerified = verifiedFilter === 'all' || 
        (verifiedFilter === 'verified' && record.verified) ||
        (verifiedFilter === 'unverified' && !record.verified)
      return matchesSearch && matchesFuelType && matchesVerified
    })
  }, [records, searchTerm, fuelTypeFilter, verifiedFilter])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value }
      }))
    } else if (name === 'liters' || name === 'costPerLiter') {
      const liters = name === 'liters' ? parseFloat(value) || 0 : parseFloat(formData.liters) || 0
      const costPerLiter = name === 'costPerLiter' ? parseFloat(value) || 0 : parseFloat(formData.costPerLiter) || 0
      const totalCost = liters * costPerLiter
      setFormData(prev => ({
        ...prev,
        [name]: value,
        totalCost: totalCost.toFixed(2)
      }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const recordData = {
        vehicle: formData.vehicle,
        date: formData.date,
        liters: parseFloat(formData.liters),
        costPerLiter: parseFloat(formData.costPerLiter),
        totalCost: parseFloat(formData.totalCost),
        odometerReading: parseInt(formData.odometerReading),
        station: {
          name: formData.station.name,
          location: formData.station.location || undefined,
          contact: formData.station.contact || undefined
        },
        receiptNumber: formData.receiptNumber || undefined,
        fuelType: formData.fuelType,
        paymentMethod: formData.paymentMethod,
        notes: formData.notes || undefined
      }

      if (editingRecord) {
        await fuelRecordService.updateFuelRecord(editingRecord._id, recordData)
        alert('Fuel record updated!')
      } else {
        await fuelRecordService.createFuelRecord(recordData)
        alert('Fuel record created!')
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
      liters: record.liters || '',
      costPerLiter: record.costPerLiter || '',
      totalCost: record.totalCost || '',
      odometerReading: record.odometerReading || '',
      station: {
        name: record.station?.name || '',
        location: record.station?.location || '',
        contact: record.station?.contact || ''
      },
      receiptNumber: record.receiptNumber || '',
      fuelType: record.fuelType || 'diesel',
      paymentMethod: record.paymentMethod || 'cash',
      notes: record.notes || ''
    })
    setIsModalOpen(true)
  }

  const handleView = (record) => {
    setSelectedRecord(record)
    setViewModalOpen(true)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Delete this fuel record?')) {
      try {
        await fuelRecordService.deleteFuelRecord(id)
        alert('Record deleted!')
        fetchAllData()
      } catch (error) {
        alert(error.response?.data?.error || 'Delete failed')
      }
    }
  }

  const handleVerify = async (id) => {
    if (window.confirm('Verify this fuel record?')) {
      try {
        await fuelRecordService.verifyFuelRecord(id)
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
      liters: '',
      costPerLiter: '',
      totalCost: '',
      odometerReading: '',
      station: { name: '', location: '', contact: '' },
      receiptNumber: '',
      fuelType: 'diesel',
      paymentMethod: 'cash',
      notes: ''
    })
    setEditingRecord(null)
  }

  const formatDate = (date) => date ? new Date(date).toLocaleDateString() : 'N/A'
  const formatCurrency = (amount) => amount ? `KES ${amount.toLocaleString()}` : 'KES 0'
  const formatNumber = (num) => num ? num.toLocaleString() : '0'

  const stats = {
    total: records.length,
    totalCost: records.reduce((sum, r) => sum + (r.totalCost || 0), 0),
    totalLiters: records.reduce((sum, r) => sum + (r.liters || 0), 0),
    verified: records.filter(r => r.verified).length,
    unverified: records.filter(r => !r.verified).length,
    avgCostPerLiter: records.length > 0 
      ? records.reduce((sum, r) => sum + (r.costPerLiter || 0), 0) / records.length 
      : 0
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fuel Records</h1>
          <p className="text-gray-600">Track vehicle fuel consumption and expenses</p>
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="p-4"><div className="flex items-center"><div className="bg-blue-500 rounded-lg p-3"><Fuel className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Records</p><p className="text-2xl font-bold">{stats.total}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-green-500 rounded-lg p-3"><DollarSign className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Cost</p><p className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-purple-500 rounded-lg p-3"><TrendingUp className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Total Liters</p><p className="text-2xl font-bold">{formatNumber(stats.totalLiters)} L</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-yellow-500 rounded-lg p-3"><CheckCircle className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Verified</p><p className="text-2xl font-bold">{stats.verified}</p></div></div></Card>
        <Card className="p-4"><div className="flex items-center"><div className="bg-orange-500 rounded-lg p-3"><AlertCircle className="h-6 w-6 text-white" /></div><div className="ml-4"><p className="text-sm text-gray-600">Unverified</p><p className="text-2xl font-bold">{stats.unverified}</p></div></div></Card>
      </div>

      {/* Search and Filters */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by vehicle or station..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border rounded-lg" />
          </div>
          <div className="w-full md:w-48">
            <select value={fuelTypeFilter} onChange={(e) => setFuelTypeFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="all">All Fuel Types</option>
              {FUEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="w-full md:w-48">
            <select value={verifiedFilter} onChange={(e) => setVerifiedFilter(e.target.value)} className="w-full border rounded-lg px-3 py-2">
              <option value="all">All Status</option>
              <option value="verified">Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Records Grid */}
      <Card className="p-6">
        {loading ? (
          <div className="py-12 text-center"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div><p className="mt-4">Loading...</p></div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-12 text-center text-gray-500">No fuel records found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRecords.map(record => (
              <div key={record._id} className="border rounded-lg p-4 hover:shadow-md">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Fuel className="w-5 h-5 text-blue-600" /></div>
                    <div><h3 className="font-semibold">{record.vehicle?.plateNumber || 'Unknown Vehicle'}</h3><p className="text-xs text-gray-500">{record.station?.name}</p></div>
                  </div>
                  <div className="flex space-x-1">
                    <button onClick={() => handleView(record)} className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => handleEdit(record)} className="p-1 text-green-600 hover:bg-green-50 rounded"><Edit className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(record._id)} className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2"><Calendar className="w-4 h-4 text-gray-400" />{formatDate(record.date)}</div>
                  <div className="flex items-center gap-2"><Fuel className="w-4 h-4 text-gray-400" />{record.liters} L @ {formatCurrency(record.costPerLiter)}/L</div>
                  <div className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-gray-400" />Total: {formatCurrency(record.totalCost)}</div>
                  <div className="flex items-center gap-2"><TrendingUp className="w-4 h-4 text-gray-400" />Odometer: {formatNumber(record.odometerReading)} km</div>
                  <div className="flex items-center gap-2"><CreditCard className="w-4 h-4 text-gray-400" />{PAYMENT_METHODS.find(p => p.value === record.paymentMethod)?.label || record.paymentMethod}</div>
                  <div className="flex items-center justify-between mt-3 pt-3 border-t">
                    <Badge variant="info">{FUEL_TYPES.find(f => f.value === record.fuelType)?.label || record.fuelType}</Badge>
                    {record.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending</Badge>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm() }} title={editingRecord ? 'Edit Fuel Record' : 'Add Fuel Record'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Transaction Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium mb-1">Vehicle *</label><select name="vehicle" required value={formData.vehicle} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg"><option value="">Select Vehicle</option>{vehicles.map(v => <option key={v._id} value={v._id}>{v.plateNumber} - {v.make} {v.model}</option>)}</select></div>
              <Input label="Date" name="date" type="date" required value={formData.date} onChange={handleInputChange} />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Liters *" name="liters" type="number" step="0.01" required value={formData.liters} onChange={handleInputChange} placeholder="0.00" />
              <Input label="Cost per Liter (KES) *" name="costPerLiter" type="number" step="0.01" required value={formData.costPerLiter} onChange={handleInputChange} placeholder="0.00" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Total Cost (KES)" name="totalCost" type="number" step="0.01" value={formData.totalCost} disabled className="bg-gray-100" placeholder="Auto-calculated" />
              <Input label="Odometer Reading (km) *" name="odometerReading" type="number" required value={formData.odometerReading} onChange={handleInputChange} placeholder="Current mileage" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div><label className="block text-sm font-medium mb-1">Fuel Type *</label><select name="fuelType" required value={formData.fuelType} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{FUEL_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
              <div><label className="block text-sm font-medium mb-1">Payment Method</label><select name="paymentMethod" value={formData.paymentMethod} onChange={handleInputChange} className="w-full px-3 py-2 border rounded-lg">{PAYMENT_METHODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></div>
            </div>
            <div className="mt-4"><Input label="Receipt Number" name="receiptNumber" value={formData.receiptNumber} onChange={handleInputChange} placeholder="Optional" /></div>
          </div>

          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-4">Fuel Station</h3>
            <Input label="Station Name *" name="station.name" required value={formData.station.name} onChange={handleInputChange} placeholder="e.g., TotalEnergies, Shell" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Location" name="station.location" value={formData.station.location} onChange={handleInputChange} placeholder="Area/Street" />
              <Input label="Contact" name="station.contact" value={formData.station.contact} onChange={handleInputChange} placeholder="Phone number" />
            </div>
          </div>

          <div className="border rounded-lg p-4">
            <label className="block text-sm font-medium mb-1">Additional Notes</label>
            <textarea name="notes" value={formData.notes} onChange={handleInputChange} rows="3" className="w-full px-3 py-2 border rounded-lg" placeholder="Any additional information..." />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="secondary" onClick={() => { setIsModalOpen(false); resetForm() }}>Cancel</Button>
            <Button type="submit" loading={submitting}>{submitting ? 'Saving...' : (editingRecord ? 'Update' : 'Create')}</Button>
          </div>
        </form>
      </Modal>

      {/* View Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title="Fuel Record Details" size="lg">
        {selectedRecord && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto px-1">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center"><Fuel className="w-8 h-8 text-blue-600" /></div>
              <div><h3 className="text-xl font-bold">{selectedRecord.vehicle?.plateNumber}</h3><p className="text-gray-600">{formatDate(selectedRecord.date)}</p>
                <div className="flex gap-2 mt-2"><Badge variant="info">{FUEL_TYPES.find(f => f.value === selectedRecord.fuelType)?.label || selectedRecord.fuelType}</Badge>{selectedRecord.verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Pending Verification</Badge>}</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <div><h4 className="font-medium text-gray-500 mb-2">Transaction Details</h4><p><strong>Liters:</strong> {selectedRecord.liters} L</p><p><strong>Cost per Liter:</strong> {formatCurrency(selectedRecord.costPerLiter)}</p><p><strong>Total Cost:</strong> {formatCurrency(selectedRecord.totalCost)}</p><p><strong>Odometer:</strong> {formatNumber(selectedRecord.odometerReading)} km</p><p><strong>Payment:</strong> {PAYMENT_METHODS.find(p => p.value === selectedRecord.paymentMethod)?.label || selectedRecord.paymentMethod}</p><p><strong>Receipt:</strong> {selectedRecord.receiptNumber || 'N/A'}</p></div>
              <div><h4 className="font-medium text-gray-500 mb-2">Station Information</h4><p><strong>Name:</strong> {selectedRecord.station?.name}</p><p><strong>Location:</strong> {selectedRecord.station?.location || 'N/A'}</p><p><strong>Contact:</strong> {selectedRecord.station?.contact || 'N/A'}</p></div>
            </div>
            {selectedRecord.fuelEfficiency && (
              <div className="bg-blue-50 p-4 rounded-lg"><h4 className="font-medium text-blue-800 mb-2">Fuel Efficiency</h4><div className="grid grid-cols-3 gap-4 text-center"><div><p className="text-2xl font-bold text-blue-600">{selectedRecord.fuelEfficiency.kmPerLiter}</p><p className="text-xs text-blue-600">km/L</p></div><div><p className="text-2xl font-bold text-blue-600">{selectedRecord.fuelEfficiency.litersPer100km}</p><p className="text-xs text-blue-600">L/100km</p></div><div><p className="text-2xl font-bold text-blue-600">{selectedRecord.fuelEfficiency.costPerKm}</p><p className="text-xs text-blue-600">KES/km</p></div></div><p className="text-xs text-blue-600 text-center mt-2">Distance: {selectedRecord.fuelEfficiency.distance.toLocaleString()} km</p></div>
            )}
            {selectedRecord.notes && (<div><h4 className="font-medium text-gray-500 mb-2">Notes</h4><p className="bg-gray-50 p-3 rounded">{selectedRecord.notes}</p></div>)}
            <div className="text-sm text-gray-500"><p>Created: {formatDate(selectedRecord.createdAt)}</p><p>Last Updated: {formatDate(selectedRecord.updatedAt)}</p>{selectedRecord.verified && <p>Verified by: {selectedRecord.verifiedBy?.name} on {formatDate(selectedRecord.verificationDate)}</p>}</div>
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

export default FuelRecords