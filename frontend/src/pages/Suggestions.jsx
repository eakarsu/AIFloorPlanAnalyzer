import { useState, useEffect, useCallback } from 'react';
import { getSuggestions, createSuggestion, updateSuggestion, deleteSuggestion, getFloorPlans, getRooms, bulkDelete, bulkUpdate } from '../services/api';
import { Plus, Edit2, Trash2, Search, Lightbulb, Loader2, DollarSign, Clock, AlertCircle, ArrowUpDown, CheckSquare, Square } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportButton from '../components/ExportButton';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

const categories = ['structural', 'kitchen', 'bathroom', 'lighting', 'storage', 'technology', 'windows', 'trim', 'acoustic', 'furniture', 'outdoor', 'other'];
const priorities = ['high', 'medium', 'low'];
const difficulties = ['easy', 'moderate', 'complex'];
const statuses = ['pending', 'in_progress', 'completed'];

const sortOptions = [
  { value: 'title', label: 'Title' },
  { value: 'category', label: 'Category' },
  { value: 'priority', label: 'Priority' },
  { value: 'estimated_cost', label: 'Estimated Cost' },
  { value: 'difficulty', label: 'Difficulty' },
  { value: 'status', label: 'Status' },
  { value: 'created_at', label: 'Created At' },
];

export default function Suggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(false);
  const [filterFloorPlanId, setFilterFloorPlanId] = useState('');
  const [filterRoomId, setFilterRoomId] = useState('');

  const [formData, setFormData] = useState({
    floor_plan_id: '',
    room_id: '',
    title: '',
    description: '',
    category: 'structural',
    priority: 'medium',
    estimated_cost: '',
    difficulty: 'moderate',
    timeline: '',
    status: 'pending'
  });

  const toast = useToast();

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Reset to page 1 when search/sort/filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [debouncedSearch, sortBy, sortOrder, filterFloorPlanId, filterRoomId]);

  // Fetch suggestions whenever query params change
  useEffect(() => {
    fetchSuggestions();
  }, [pagination.page, debouncedSearch, sortBy, sortOrder, filterFloorPlanId, filterRoomId]);

  // Fetch dropdown data once on mount
  useEffect(() => {
    fetchDropdownData();
  }, []);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterFloorPlanId) params.floor_plan_id = filterFloorPlanId;
      if (filterRoomId) params.room_id = filterRoomId;

      const res = await getSuggestions(params);
      setSuggestions(res.data.data);
      setPagination(res.data.pagination);
      // Clear selections when data changes
      setSelectedIds([]);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      toast.error('Failed to load suggestions');
    } finally {
      setLoading(false);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const [fpRes, rRes] = await Promise.all([
        getFloorPlans({ limit: 100 }),
        getRooms({ limit: 100 }),
      ]);
      setFloorPlans(fpRes.data.data);
      setRooms(rRes.data.data);
    } catch (error) {
      console.error('Error fetching dropdown data:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await updateSuggestion(editingItem.id, formData);
        toast.success('Suggestion updated successfully!');
      } else {
        await createSuggestion(formData);
        toast.success('Suggestion created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchSuggestions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save suggestion');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      floor_plan_id: item.floor_plan_id,
      room_id: item.room_id || '',
      title: item.title,
      description: item.description || '',
      category: item.category || 'structural',
      priority: item.priority || 'medium',
      estimated_cost: item.estimated_cost || '',
      difficulty: item.difficulty || 'moderate',
      timeline: item.timeline || '',
      status: item.status || 'pending'
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteSuggestion(showConfirm.id);
      setShowConfirm(null);
      fetchSuggestions();
      toast.success('Suggestion deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete suggestion');
    }
  };

  const resetForm = () => {
    setFormData({
      floor_plan_id: floorPlans[0]?.id || '',
      room_id: '',
      title: '',
      description: '',
      category: 'structural',
      priority: 'medium',
      estimated_cost: '',
      difficulty: 'moderate',
      timeline: '',
      status: 'pending'
    });
  };

  // --- Pagination ---
  const handlePageChange = (newPage) => {
    setPagination((prev) => ({ ...prev, page: newPage }));
  };

  // --- Sorting ---
  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const SortableHeader = ({ column, children }) => (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer select-none hover:bg-gray-100 transition-colors"
      onClick={() => handleSort(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3.5 w-3.5 ${sortBy === column ? 'text-indigo-600' : 'text-gray-400'}`} />
        {sortBy === column && (
          <span className="text-indigo-600 text-[10px] font-bold">{sortOrder === 'asc' ? 'ASC' : 'DESC'}</span>
        )}
      </div>
    </th>
  );

  // --- Bulk Selection ---
  const allSelected = suggestions.length > 0 && suggestions.every((s) => selectedIds.includes(s.id));
  const someSelected = selectedIds.length > 0;

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(suggestions.map((s) => s.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // --- Bulk Actions ---
  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      await bulkDelete('suggestions', selectedIds);
      toast.success(`${selectedIds.length} suggestion(s) deleted successfully!`);
      setSelectedIds([]);
      setShowBulkConfirm(false);
      fetchSuggestions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Bulk delete failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkStatusUpdate = async (status) => {
    setBulkActionLoading(true);
    try {
      await bulkUpdate('suggestions', selectedIds, { status });
      toast.success(`${selectedIds.length} suggestion(s) updated to "${status.replace('_', ' ')}"!`);
      setSelectedIds([]);
      fetchSuggestions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Bulk status update failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkPriorityUpdate = async (priority) => {
    setBulkActionLoading(true);
    try {
      await bulkUpdate('suggestions', selectedIds, { priority });
      toast.success(`${selectedIds.length} suggestion(s) updated to "${priority}" priority!`);
      setSelectedIds([]);
      fetchSuggestions();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Bulk priority update failed');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const filteredRooms = rooms.filter((r) => r.floor_plan_id == formData.floor_plan_id);
  const filterRooms = rooms.filter((r) => r.floor_plan_id == filterFloorPlanId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Renovation Suggestions</h1>
          <p className="text-gray-500 mt-1">AI-powered and manual renovation ideas</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={suggestions} filename="suggestions" />
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
            New Suggestion
          </button>
        </div>
      </div>

      {/* Search + Filters Row */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search suggestions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filterFloorPlanId}
            onChange={(e) => {
              setFilterFloorPlanId(e.target.value);
              setFilterRoomId('');
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="">All Floor Plans</option>
            {floorPlans.map((fp) => (
              <option key={fp.id} value={fp.id}>{fp.name}</option>
            ))}
          </select>
          <select
            value={filterRoomId}
            onChange={(e) => setFilterRoomId(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
            disabled={!filterFloorPlanId}
          >
            <option value="">All Rooms</option>
            {filterRooms.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <select
            value={`${sortBy}:${sortOrder}`}
            onChange={(e) => {
              const [col, ord] = e.target.value.split(':');
              setSortBy(col);
              setSortOrder(ord);
            }}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            {sortOptions.map((opt) => (
              <optgroup key={opt.value} label={opt.label}>
                <option value={`${opt.value}:asc`}>{opt.label} (A-Z)</option>
                <option value={`${opt.value}:desc`}>{opt.label} (Z-A)</option>
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {someSelected && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-indigo-50 border border-indigo-200 rounded-xl">
          <span className="text-sm font-medium text-indigo-800">
            {selectedIds.length} selected
          </span>
          <div className="h-5 w-px bg-indigo-300" />

          {/* Bulk Delete */}
          <button
            onClick={() => setShowBulkConfirm(true)}
            disabled={bulkActionLoading}
            className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" />
            Delete Selected
          </button>

          <div className="h-5 w-px bg-indigo-300" />

          {/* Bulk Status Update */}
          <span className="text-xs text-indigo-600 font-medium">Set Status:</span>
          {statuses.map((s) => (
            <button
              key={s}
              onClick={() => handleBulkStatusUpdate(s)}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors capitalize"
            >
              {s.replace('_', ' ')}
            </button>
          ))}

          <div className="h-5 w-px bg-indigo-300" />

          {/* Bulk Priority Update */}
          <span className="text-xs text-indigo-600 font-medium">Set Priority:</span>
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => handleBulkPriorityUpdate(p)}
              disabled={bulkActionLoading}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors capitalize ${
                p === 'high'
                  ? 'text-red-700 bg-red-50 hover:bg-red-100 border border-red-200'
                  : p === 'medium'
                  ? 'text-yellow-700 bg-yellow-50 hover:bg-yellow-100 border border-yellow-200'
                  : 'text-green-700 bg-green-50 hover:bg-green-100 border border-green-200'
              }`}
            >
              {p}
            </button>
          ))}

          <div className="ml-auto">
            <button
              onClick={() => setSelectedIds([])}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {/* Select All Checkbox */}
                <th className="px-4 py-4 w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="text-gray-500 hover:text-indigo-600 transition-colors"
                    title={allSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allSelected && suggestions.length > 0 ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </th>
                <SortableHeader column="title">Suggestion</SortableHeader>
                <SortableHeader column="category">Category</SortableHeader>
                <SortableHeader column="priority">Priority</SortableHeader>
                <SortableHeader column="estimated_cost">Est. Cost</SortableHeader>
                <SortableHeader column="difficulty">Difficulty</SortableHeader>
                <SortableHeader column="status">Status</SortableHeader>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="ml-3 text-gray-500">Loading suggestions...</span>
                    </div>
                  </td>
                </tr>
              ) : suggestions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    No suggestions found
                  </td>
                </tr>
              ) : (
                suggestions.map((s) => {
                  const isSelected = selectedIds.includes(s.id);
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setShowDetail(s)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                    >
                      {/* Row Checkbox */}
                      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(s.id)}
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
                          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Lightbulb className="h-5 w-5 text-yellow-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{s.title}</p>
                            <p className="text-sm text-gray-500">{s.floor_plan_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full capitalize">
                          {s.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            s.priority === 'high'
                              ? 'bg-red-100 text-red-700'
                              : s.priority === 'medium'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {s.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {s.estimated_cost ? `$${Number(s.estimated_cost).toLocaleString()}` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full ${
                            s.difficulty === 'complex'
                              ? 'bg-red-100 text-red-700'
                              : s.difficulty === 'moderate'
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-green-100 text-green-700'
                          }`}
                        >
                          {s.difficulty}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 text-xs font-medium rounded-full capitalize ${
                            s.status === 'completed'
                              ? 'bg-green-100 text-green-700'
                              : s.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {(s.status || 'pending').replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(s)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setShowConfirm(s)}
                            className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

        {/* Pagination */}
        {!loading && (
          <div className="px-6 pb-4">
            <Pagination pagination={pagination} onPageChange={handlePageChange} />
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
        }}
        title={editingItem ? 'Edit Suggestion' : 'New Suggestion'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan *</label>
              <select
                value={formData.floor_plan_id}
                onChange={(e) => setFormData({ ...formData, floor_plan_id: e.target.value, room_id: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                required
              >
                <option value="">Select floor plan</option>
                {floorPlans.map(fp => (
                  <option key={fp.id} value={fp.id}>{fp.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room (Optional)</label>
              <select
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All rooms</option>
                {filteredRooms.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {priorities.map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
              <select
                value={formData.difficulty}
                onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {difficulties.map(d => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost ($)</label>
              <input
                type="number"
                value={formData.estimated_cost}
                onChange={(e) => setFormData({ ...formData, estimated_cost: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
              <input
                type="text"
                value={formData.timeline}
                onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                placeholder="e.g., 2-3 weeks"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {statuses.map(s => (
                  <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
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
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Suggestion Details" size="lg">
        {showDetail && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{showDetail.title}</h3>
              {showDetail.ai_generated && (
                <span className="inline-flex items-center gap-1 mt-2 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                  <AlertCircle className="h-3 w-3" /> AI Generated
                </span>
              )}
            </div>

            <p className="text-gray-600">{showDetail.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium capitalize">{showDetail.category}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Priority</p>
                <span
                  className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                    showDetail.priority === 'high'
                      ? 'bg-red-100 text-red-700'
                      : showDetail.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {showDetail.priority}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <DollarSign className="h-4 w-4" /> Est. Cost
                </div>
                <p className="font-medium">
                  {showDetail.estimated_cost ? `$${Number(showDetail.estimated_cost).toLocaleString()}` : '-'}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-1 text-sm text-gray-500">
                  <Clock className="h-4 w-4" /> Timeline
                </div>
                <p className="font-medium">{showDetail.timeline || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Difficulty</p>
                <span
                  className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    showDetail.difficulty === 'complex'
                      ? 'bg-red-100 text-red-700'
                      : showDetail.difficulty === 'moderate'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {showDetail.difficulty}
                </span>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block mt-1 px-2 py-1 text-xs font-medium rounded-full capitalize ${
                    showDetail.status === 'completed'
                      ? 'bg-green-100 text-green-700'
                      : showDetail.status === 'in_progress'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {(showDetail.status || 'pending').replace('_', ' ')}
                </span>
              </div>
            </div>

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

      {/* Single Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Suggestion"
        message={`Are you sure you want to delete "${showConfirm?.title}"?`}
      />

      {/* Bulk Delete Confirm Dialog */}
      <ConfirmDialog
        isOpen={showBulkConfirm}
        onClose={() => setShowBulkConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Suggestions"
        message={`Are you sure you want to delete ${selectedIds.length} selected suggestion(s)? This action cannot be undone.`}
      />
    </div>
  );
}
