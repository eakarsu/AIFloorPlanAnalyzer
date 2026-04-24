import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import { getFloorPlans, createFloorPlan, updateFloorPlan, deleteFloorPlan, bulkDelete, bulkUpdate } from '../services/api';
import {
  Plus, Edit2, Trash2, Eye, Upload, FileImage, Loader2,
  Search, ArrowUpDown, CheckSquare, Square as SquareIcon
} from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportButton from '../components/ExportButton';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

export default function FloorPlans() {
  const [floorPlans, setFloorPlans] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('DESC');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '', description: '', total_area: '', unit: 'sqft', image_data: ''
  });
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchFloorPlans();
  }, [currentPage, sortBy, sortOrder]);

  useEffect(() => {
    const timer = setTimeout(() => { setCurrentPage(1); fetchFloorPlans(); }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const fetchFloorPlans = async () => {
    try {
      const response = await getFloorPlans({
        page: currentPage, limit: 20, search: searchTerm,
        sort_by: sortBy, sort_order: sortOrder
      });
      setFloorPlans(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching floor plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setFormData(prev => ({ ...prev, image_data: reader.result }));
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] }, maxFiles: 1
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await updateFloorPlan(editingItem.id, formData);
        toast.success('Floor plan updated!');
      } else {
        await createFloorPlan(formData);
        toast.success('Floor plan created!');
      }
      setShowModal(false); setEditingItem(null); resetForm(); fetchFloorPlans();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({ name: item.name, description: item.description || '', total_area: item.total_area || '', unit: item.unit || 'sqft', image_data: item.image_data || '' });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteFloorPlan(showConfirm.id);
      setShowConfirm(null); fetchFloorPlans();
      toast.success('Floor plan deleted!');
    } catch (error) { toast.error(error.response?.data?.error || 'Failed to delete'); }
  };

  const handleBulkDelete = async () => {
    try {
      await bulkDelete('floor-plans', selectedIds);
      setSelectedIds([]); setShowBulkConfirm(false); fetchFloorPlans();
      toast.success(`Deleted ${selectedIds.length} floor plans!`);
    } catch (error) { toast.error('Bulk delete failed'); }
  };

  const handleBulkStatusUpdate = async (status) => {
    try {
      await bulkUpdate('floor-plans', selectedIds, { status });
      setSelectedIds([]); fetchFloorPlans();
      toast.success(`Updated ${selectedIds.length} floor plans!`);
    } catch (error) { toast.error('Bulk update failed'); }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.length === floorPlans.length ? [] : floorPlans.map(fp => fp.id));
  };

  const handleSort = (col) => {
    if (sortBy === col) setSortOrder(prev => prev === 'ASC' ? 'DESC' : 'ASC');
    else { setSortBy(col); setSortOrder('ASC'); }
  };

  const resetForm = () => setFormData({ name: '', description: '', total_area: '', unit: 'sqft', image_data: '' });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Floor Plans</h1>
          <p className="text-gray-500 mt-1">Manage your floor plan uploads</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={floorPlans} filename="floor-plans" />
          <button onClick={() => { setEditingItem(null); resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" /> New Floor Plan
          </button>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Search floor plans..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
        </div>
        <select value={`${sortBy}:${sortOrder}`} onChange={(e) => { const [col, ord] = e.target.value.split(':'); setSortBy(col); setSortOrder(ord); }}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
          <option value="created_at:DESC">Newest First</option>
          <option value="created_at:ASC">Oldest First</option>
          <option value="name:ASC">Name A-Z</option>
          <option value="name:DESC">Name Z-A</option>
          <option value="total_area:DESC">Largest Area</option>
          <option value="total_area:ASC">Smallest Area</option>
          <option value="status:ASC">Status</option>
        </select>
      </div>

      {/* Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-indigo-50 rounded-lg">
          <span className="text-sm font-medium text-indigo-700">{selectedIds.length} selected</span>
          <button onClick={() => setShowBulkConfirm(true)} className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">Delete Selected</button>
          <button onClick={() => handleBulkStatusUpdate('analyzed')} className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Mark Analyzed</button>
          <button onClick={() => handleBulkStatusUpdate('pending')} className="px-3 py-1.5 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700">Mark Pending</button>
          <button onClick={() => setSelectedIds([])} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Clear</button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 w-10">
                  <button onClick={toggleSelectAll} className="text-gray-500 hover:text-indigo-600">
                    {selectedIds.length === floorPlans.length && floorPlans.length > 0 ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <SquareIcon className="h-5 w-5" />}
                  </button>
                </th>
                <th onClick={() => handleSort('name')} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-indigo-600">
                  <span className="flex items-center gap-1">Name <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th onClick={() => handleSort('total_area')} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-indigo-600">
                  <span className="flex items-center gap-1">Area <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Rooms</th>
                <th onClick={() => handleSort('status')} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-indigo-600">
                  <span className="flex items-center gap-1">Status <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th onClick={() => handleSort('created_at')} className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-indigo-600">
                  <span className="flex items-center gap-1">Created <ArrowUpDown className="h-3 w-3" /></span>
                </th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {floorPlans.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">No floor plans found</td></tr>
              ) : floorPlans.map((fp) => (
                <tr key={fp.id} onClick={() => setShowDetail(fp)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                  <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => toggleSelect(fp.id)} className="text-gray-500 hover:text-indigo-600">
                      {selectedIds.includes(fp.id) ? <CheckSquare className="h-5 w-5 text-indigo-600" /> : <SquareIcon className="h-5 w-5" />}
                    </button>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center"><FileImage className="h-5 w-5 text-indigo-600" /></div>
                      <div>
                        <p className="font-medium text-gray-800">{fp.name}</p>
                        <p className="text-sm text-gray-500 truncate max-w-xs">{fp.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{fp.total_area ? `${fp.total_area} ${fp.unit || 'sqft'}` : '-'}</td>
                  <td className="px-6 py-4 text-gray-600">{fp.room_count || 0}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 text-xs font-medium rounded-full ${fp.status === 'analyzed' ? 'bg-green-100 text-green-700' : fp.status === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{fp.status}</span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{new Date(fp.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => navigate(`/floor-plans/${fp.id}`)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View"><Eye className="h-5 w-5" /></button>
                      <button onClick={() => handleEdit(fp)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Edit"><Edit2 className="h-5 w-5" /></button>
                      <button onClick={() => setShowConfirm(fp)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="h-5 w-5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination pagination={pagination} onPageChange={setCurrentPage} />

      {/* Create/Edit Modal */}
      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditingItem(null); resetForm(); }} title={editingItem ? 'Edit Floor Plan' : 'New Floor Plan'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Area</label>
              <input type="number" value={formData.total_area} onChange={(e) => setFormData({ ...formData, total_area: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="sqft">Square Feet</option>
                <option value="sqm">Square Meters</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan Image</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}>
              <input {...getInputProps()} />
              {formData.image_data ? (
                <div className="space-y-2">
                  <img src={formData.image_data} alt="Preview" className="max-h-40 mx-auto rounded-lg" />
                  <p className="text-sm text-gray-500">Click or drag to replace</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="h-10 w-10 mx-auto text-gray-400" />
                  <p className="text-gray-600">Drag & drop an image here, or click to select</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => { setShowModal(false); setEditingItem(null); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Floor Plan Details">
        {showDetail && (
          <div className="space-y-4">
            {showDetail.image_data && <img src={showDetail.image_data} alt={showDetail.name} className="w-full rounded-lg" />}
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-sm text-gray-500">Name</p><p className="font-medium">{showDetail.name}</p></div>
              <div><p className="text-sm text-gray-500">Status</p><p className="font-medium capitalize">{showDetail.status}</p></div>
              <div><p className="text-sm text-gray-500">Total Area</p><p className="font-medium">{showDetail.total_area} {showDetail.unit}</p></div>
              <div><p className="text-sm text-gray-500">Rooms</p><p className="font-medium">{showDetail.room_count || 0}</p></div>
            </div>
            {showDetail.description && <div><p className="text-sm text-gray-500">Description</p><p className="font-medium">{showDetail.description}</p></div>}
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowDetail(null)} className="btn-secondary">Close</button>
              <button onClick={() => { handleEdit(showDetail); setShowDetail(null); }} className="btn-primary flex items-center gap-2"><Edit2 className="h-4 w-4" /> Edit</button>
              <button onClick={() => { setShowConfirm(showDetail); setShowDetail(null); }} className="btn-danger flex items-center gap-2"><Trash2 className="h-4 w-4" /> Delete</button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog isOpen={!!showConfirm} onClose={() => setShowConfirm(null)} onConfirm={handleDelete} title="Delete Floor Plan" message={`Are you sure you want to delete "${showConfirm?.name}"? This will also delete all associated rooms and suggestions.`} />
      <ConfirmDialog isOpen={showBulkConfirm} onClose={() => setShowBulkConfirm(false)} onConfirm={handleBulkDelete} title="Bulk Delete" message={`Are you sure you want to delete ${selectedIds.length} floor plans?`} />
    </div>
  );
}
