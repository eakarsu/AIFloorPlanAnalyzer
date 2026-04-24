import { useState, useEffect, useCallback, useRef } from 'react';
import { getRooms, getRoom, createRoom, updateRoom, deleteRoom, getFloorPlans, generateSuggestions, bulkDelete } from '../services/api';
import { Plus, Edit2, Trash2, Eye, Search, Brain, Loader2, ArrowUpDown, CheckSquare, Square } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponseDisplay from '../components/AIResponseDisplay';
import ExportButton from '../components/ExportButton';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

const roomTypes = ['living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'office', 'entry', 'outdoor', 'storage', 'other'];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'room_type', label: 'Room Type' },
  { value: 'area', label: 'Area' },
  { value: 'width', label: 'Width' },
  { value: 'length', label: 'Length' },
  { value: 'created_at', label: 'Date Created' },
];

export default function Rooms() {
  const [rooms, setRooms] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [formData, setFormData] = useState({
    floor_plan_id: '',
    name: '',
    room_type: 'living',
    width: '',
    length: '',
    height: '9',
    notes: ''
  });

  const debounceRef = useRef(null);
  const toast = useToast();

  const fetchRooms = useCallback(async (page = 1) => {
    try {
      const params = {
        page,
        limit: 10,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (searchTerm.trim()) {
        params.search = searchTerm.trim();
      }
      const response = await getRooms(params);
      setRooms(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  }, [searchTerm, sortBy, sortOrder]);

  const fetchFloorPlans = async () => {
    try {
      const fpRes = await getFloorPlans({ limit: 100 });
      setFloorPlans(fpRes.data.data);
    } catch (error) {
      console.error('Error fetching floor plans:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchRooms(), fetchFloorPlans()]);
      setLoading(false);
    };
    init();
  }, []);

  // Refetch rooms when sort changes
  useEffect(() => {
    if (!loading) {
      setSelectedIds([]);
      fetchRooms(1);
    }
  }, [sortBy, sortOrder]);

  // Debounced search
  useEffect(() => {
    if (loading) return;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setSelectedIds([]);
      fetchRooms(1);
    }, 400);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  const handlePageChange = (page) => {
    setSelectedIds([]);
    fetchRooms(page);
  };

  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Bulk selection
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === rooms.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(rooms.map(r => r.id));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await bulkDelete('rooms', selectedIds);
      toast.success(`${selectedIds.length} room(s) deleted successfully!`);
      setSelectedIds([]);
      setShowBulkConfirm(false);
      fetchRooms(pagination?.page || 1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete rooms');
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await updateRoom(editingItem.id, formData);
        toast.success('Room updated successfully!');
      } else {
        await createRoom(formData);
        toast.success('Room created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchRooms(pagination?.page || 1);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save room');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      floor_plan_id: item.floor_plan_id,
      name: item.name,
      room_type: item.room_type || 'living',
      width: item.width || '',
      length: item.length || '',
      height: item.height || '9',
      notes: item.notes || ''
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteRoom(showConfirm.id);
      setShowConfirm(null);
      fetchRooms(pagination?.page || 1);
      toast.success('Room deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete room');
    }
  };

  const handleGenerateSuggestions = async (roomId) => {
    setAnalyzing(true);
    setAiResult(null);
    toast.info('Generating AI suggestions...');
    try {
      const response = await generateSuggestions(roomId);
      setAiResult({
        type: 'Renovation Suggestions',
        content: typeof response.data.suggestions === 'string'
          ? response.data.suggestions
          : JSON.stringify(response.data.suggestions, null, 2),
        model: response.data.model,
        processingTime: response.data.processingTimeMs
      });
      toast.success('AI suggestions generated!');
    } catch (error) {
      setAiResult({
        type: 'Error',
        content: error.response?.data?.error || 'Failed to generate suggestions',
        error: true
      });
      toast.error('Failed to generate suggestions');
    } finally {
      setAnalyzing(false);
    }
  };

  const resetForm = () => {
    setFormData({
      floor_plan_id: floorPlans[0]?.id || '',
      name: '',
      room_type: 'living',
      width: '',
      length: '',
      height: '9',
      notes: ''
    });
  };

  const renderSortHeader = (field, label) => {
    const isActive = sortBy === field;
    return (
      <th
        className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer hover:text-indigo-600 select-none"
        onClick={() => handleSortChange(field)}
      >
        <div className="flex items-center gap-1">
          {label}
          <ArrowUpDown className={`h-3.5 w-3.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
          {isActive && (
            <span className="text-indigo-600 text-[10px]">
              {sortOrder === 'asc' ? 'ASC' : 'DESC'}
            </span>
          )}
        </div>
      </th>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Rooms</h1>
          <p className="text-gray-500 mt-1">Manage room dimensions and details</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={rooms} filename="rooms" />
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
            disabled={floorPlans.length === 0}
          >
            <Plus className="h-5 w-5" />
            New Room
          </button>
        </div>
      </div>

      {floorPlans.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-700">
          Please create a floor plan first before adding rooms.
        </div>
      )}

      {/* Search and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search rooms..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600 whitespace-nowrap">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
            className="px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-4 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">
            {selectedIds.length} room{selectedIds.length !== 1 ? 's' : ''} selected
          </span>
          <button
            onClick={() => setShowBulkConfirm(true)}
            disabled={bulkDeleting}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
          >
            {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedIds([])}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-4 text-left w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-500 hover:text-indigo-600 transition-colors"
                  >
                    {rooms.length > 0 && selectedIds.length === rooms.length ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </th>
                {renderSortHeader('name', 'Room')}
                {renderSortHeader('room_type', 'Type')}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Dimensions</th>
                {renderSortHeader('area', 'Area')}
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase">Floor Plan</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {rooms.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                    No rooms found
                  </td>
                </tr>
              ) : (
                rooms.map((room) => {
                  const isSelected = selectedIds.includes(room.id);
                  return (
                    <tr
                      key={room.id}
                      onClick={() => setShowDetail(room)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                    >
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(room.id)}
                          className="text-gray-500 hover:text-indigo-600 transition-colors"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-5 w-5 text-indigo-600" />
                          ) : (
                            <Square className="h-5 w-5" />
                          )}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                            <Square className="h-5 w-5 text-green-600" />
                          </div>
                          <span className="font-medium text-gray-800">{room.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                          {room.room_type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {room.width} x {room.length} x {room.height} ft
                      </td>
                      <td className="px-6 py-4 text-gray-600">{room.area} sqft</td>
                      <td className="px-6 py-4 text-gray-600">{room.floor_plan_name}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleGenerateSuggestions(room.id)}
                            disabled={analyzing}
                            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="AI Suggestions"
                          >
                            <Brain className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleEdit(room)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setShowConfirm(room)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={handlePageChange} />

      {/* AI Result */}
      {analyzing && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
            <p className="text-gray-600 font-medium">Generating AI suggestions...</p>
          </div>
        </div>
      )}

      {aiResult && !analyzing && <AIResponseDisplay result={aiResult} />}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
        }}
        title={editingItem ? 'Edit Room' : 'New Room'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan *</label>
            <select
              value={formData.floor_plan_id}
              onChange={(e) => setFormData({ ...formData, floor_plan_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            >
              <option value="">Select a floor plan</option>
              {floorPlans.map(fp => (
                <option key={fp.id} value={fp.id}>{fp.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
              <select
                value={formData.room_type}
                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {roomTypes.map(type => (
                  <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Width (ft)</label>
              <input
                type="number"
                step="0.1"
                value={formData.width}
                onChange={(e) => setFormData({ ...formData, width: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Length (ft)</label>
              <input
                type="number"
                step="0.1"
                value={formData.length}
                onChange={(e) => setFormData({ ...formData, length: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Height (ft)</label>
              <input
                type="number"
                step="0.1"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingItem ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Room Details">
        {showDetail && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Name</p>
                <p className="font-medium">{showDetail.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Type</p>
                <p className="font-medium capitalize">{showDetail.room_type}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Dimensions</p>
                <p className="font-medium">{showDetail.width} x {showDetail.length} x {showDetail.height} ft</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Area</p>
                <p className="font-medium">{showDetail.area} sqft</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Floor Plan</p>
                <p className="font-medium">{showDetail.floor_plan_name}</p>
              </div>
            </div>
            {showDetail.notes && (
              <div>
                <p className="text-sm text-gray-500">Notes</p>
                <p className="font-medium">{showDetail.notes}</p>
              </div>
            )}
            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowDetail(null)} className="btn-secondary">Close</button>
              <button
                onClick={() => {
                  handleEdit(showDetail);
                  setShowDetail(null);
                }}
                className="btn-primary flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" /> Edit
              </button>
              <button
                onClick={() => {
                  setShowConfirm(showDetail);
                  setShowDetail(null);
                }}
                className="btn-danger flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Single Delete Confirm */}
      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Room"
        message={`Are you sure you want to delete "${showConfirm?.name}"?`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Rooms"
        message={`Are you sure you want to delete ${selectedIds.length} selected room${selectedIds.length !== 1 ? 's' : ''}? This action cannot be undone.`}
      />
    </div>
  );
}
