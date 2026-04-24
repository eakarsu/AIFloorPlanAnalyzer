import { useState, useEffect, useCallback, useRef } from 'react';
import { getEstimates, createEstimate, updateEstimate, deleteEstimate, getFloorPlans, bulkDelete, bulkUpdate } from '../services/api';
import { Plus, Edit2, Trash2, Search, Calculator, Loader2, DollarSign, Clock, TrendingUp, ArrowUpDown, CheckSquare, Square } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportButton from '../components/ExportButton';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

const statuses = ['draft', 'pending', 'approved', 'in_progress', 'completed'];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'labor_cost', label: 'Labor Cost' },
  { value: 'material_cost', label: 'Material Cost' },
  { value: 'total_cost', label: 'Total Cost' },
  { value: 'timeline_days', label: 'Timeline' },
  { value: 'status', label: 'Status' },
  { value: 'created_at', label: 'Date Created' },
];

const statusLabel = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ') : '';

const statusBadgeClass = (status) => {
  switch (status) {
    case 'approved': return 'bg-green-100 text-green-700';
    case 'completed': return 'bg-blue-100 text-blue-700';
    case 'in_progress': return 'bg-yellow-100 text-yellow-700';
    case 'pending': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

export default function Estimates() {
  const [estimates, setEstimates] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    floor_plan_id: '',
    name: '',
    description: '',
    labor_cost: '',
    material_cost: '',
    timeline_days: '',
    status: 'draft'
  });

  // Search, sort, pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });

  // Bulk selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(null); // 'delete' | null
  const [bulkStatusValue, setBulkStatusValue] = useState('');

  const debounceRef = useRef(null);
  const toast = useToast();

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Fetch estimates whenever search/sort/page changes
  useEffect(() => {
    fetchEstimates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, sortBy, sortOrder, pagination.page]);

  // Fetch floor plans once
  useEffect(() => {
    fetchFloorPlans();
  }, []);

  const fetchEstimates = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      const res = await getEstimates(params);
      setEstimates(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching estimates:', error);
      toast.error('Failed to load estimates');
    } finally {
      setLoading(false);
    }
  };

  const fetchFloorPlans = async () => {
    try {
      const fpRes = await getFloorPlans({ limit: 100 });
      setFloorPlans(fpRes.data.data);
    } catch (error) {
      console.error('Error fetching floor plans:', error);
    }
  };

  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    setSelectedIds(new Set());
  }, []);

  // Sort column toggle
  const handleSortColumn = (column) => {
    if (sortBy === column) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // Selection helpers
  const allOnPageSelected = estimates.length > 0 && estimates.every(e => selectedIds.has(e.id));

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(estimates.map(e => e.id)));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkDelete('estimates', ids);
      toast.success(`${ids.length} estimate(s) deleted successfully!`);
      setSelectedIds(new Set());
      setShowBulkConfirm(null);
      fetchEstimates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete selected estimates');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Bulk update status
  const handleBulkUpdateStatus = async (status) => {
    if (!status) return;
    setBulkActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await bulkUpdate('estimates', ids, { status });
      toast.success(`${ids.length} estimate(s) updated to "${statusLabel(status)}"!`);
      setSelectedIds(new Set());
      setBulkStatusValue('');
      fetchEstimates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update selected estimates');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Create / Edit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await updateEstimate(editingItem.id, formData);
        toast.success('Estimate updated successfully!');
      } else {
        await createEstimate(formData);
        toast.success('Estimate created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchEstimates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save estimate');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      floor_plan_id: item.floor_plan_id,
      name: item.name,
      description: item.description || '',
      labor_cost: item.labor_cost || '',
      material_cost: item.material_cost || '',
      timeline_days: item.timeline_days || '',
      status: item.status || 'draft'
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteEstimate(showConfirm.id);
      setShowConfirm(null);
      fetchEstimates();
      toast.success('Estimate deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete estimate');
    }
  };

  const resetForm = () => {
    setFormData({
      floor_plan_id: floorPlans[0]?.id || '',
      name: '',
      description: '',
      labor_cost: '',
      material_cost: '',
      timeline_days: '',
      status: 'draft'
    });
  };

  const totalBudget = estimates.reduce((acc, e) => acc + (Number(e.total_cost) || 0), 0);

  // Sort indicator
  const SortHeader = ({ column, children }) => (
    <th
      className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase cursor-pointer select-none hover:text-indigo-600 transition-colors"
      onClick={() => handleSortColumn(column)}
    >
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3.5 w-3.5 ${sortBy === column ? 'text-indigo-600' : 'text-gray-400'}`} />
        {sortBy === column && (
          <span className="text-indigo-600 text-[10px] font-bold ml-0.5">
            {sortOrder === 'asc' ? 'A' : 'D'}
          </span>
        )}
      </div>
    </th>
  );

  if (loading && estimates.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Project Estimates</h1>
          <p className="text-gray-500 mt-1">Track renovation costs and timelines</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={estimates} filename="estimates" />
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
            New Estimate
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Page Budget</p>
              <p className="text-2xl font-bold text-gray-800">${totalBudget.toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calculator className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Estimates</p>
              <p className="text-2xl font-bold text-gray-800">{pagination.total || estimates.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Approved</p>
              <p className="text-2xl font-bold text-gray-800">
                {estimates.filter(e => e.status === 'approved').length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search estimates..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination(prev => ({ ...prev, page: 1 }));
            }}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={`${sortBy}:${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split(':');
            setSortBy(field);
            setSortOrder(order);
            setPagination(prev => ({ ...prev, page: 1 }));
          }}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          {sortOptions.map(opt => (
            <optgroup key={opt.value} label={opt.label}>
              <option value={`${opt.value}:asc`}>{opt.label} (A-Z / Low-High)</option>
              <option value={`${opt.value}:desc`}>{opt.label} (Z-A / High-Low)</option>
            </optgroup>
          ))}
        </select>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-sm font-medium text-indigo-800">
            {selectedIds.size} estimate{selectedIds.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            {/* Bulk status update */}
            <div className="flex items-center gap-2">
              <select
                value={bulkStatusValue}
                onChange={(e) => setBulkStatusValue(e.target.value)}
                className="px-3 py-2 text-sm border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">Update Status...</option>
                {statuses.map(s => (
                  <option key={s} value={s}>{statusLabel(s)}</option>
                ))}
              </select>
              <button
                onClick={() => handleBulkUpdateStatus(bulkStatusValue)}
                disabled={!bulkStatusValue || bulkActionLoading}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {bulkActionLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Apply
              </button>
            </div>

            {/* Bulk delete */}
            <button
              onClick={() => setShowBulkConfirm('delete')}
              disabled={bulkActionLoading}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete Selected
            </button>

            {/* Clear selection */}
            <button
              onClick={() => setSelectedIds(new Set())}
              className="px-4 py-2 text-sm text-indigo-600 hover:text-indigo-800 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading && (
          <div className="h-1 bg-indigo-100 overflow-hidden">
            <div className="h-full bg-indigo-500 animate-pulse w-full"></div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                {/* Select all checkbox */}
                <th className="px-4 py-4 w-12">
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleSelectAll(); }}
                    className="text-gray-500 hover:text-indigo-600 transition-colors"
                    title={allOnPageSelected ? 'Deselect all' : 'Select all'}
                  >
                    {allOnPageSelected ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                </th>
                <SortHeader column="name">Project</SortHeader>
                <SortHeader column="labor_cost">Labor</SortHeader>
                <SortHeader column="material_cost">Materials</SortHeader>
                <SortHeader column="total_cost">Total</SortHeader>
                <SortHeader column="timeline_days">Timeline</SortHeader>
                <SortHeader column="status">Status</SortHeader>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {estimates.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-gray-500">
                    {loading ? 'Loading estimates...' : 'No estimates found'}
                  </td>
                </tr>
              ) : (
                estimates.map((est) => {
                  const isSelected = selectedIds.has(est.id);
                  return (
                    <tr
                      key={est.id}
                      onClick={() => setShowDetail(est)}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50' : ''}`}
                    >
                      {/* Row checkbox */}
                      <td className="px-4 py-4 w-12" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => toggleSelect(est.id)}
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
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Calculator className="h-5 w-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-800">{est.name}</p>
                            <p className="text-sm text-gray-500">{est.floor_plan_name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        ${Number(est.labor_cost || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        ${Number(est.material_cost || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-semibold text-gray-800">
                        ${Number(est.total_cost || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {est.timeline_days ? `${est.timeline_days} days` : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${statusBadgeClass(est.status)}`}>
                          {statusLabel(est.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEdit(est)}
                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => setShowConfirm(est)}
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
        <div className="px-6 pb-4">
          <Pagination pagination={pagination} onPageChange={handlePageChange} />
        </div>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
        }}
        title={editingItem ? 'Edit Estimate' : 'New Estimate'}
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
              <option value="">Select floor plan</option>
              {floorPlans.map(fp => (
                <option key={fp.id} value={fp.id}>{fp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Project Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Labor Cost ($)</label>
              <input
                type="number"
                value={formData.labor_cost}
                onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material Cost ($)</label>
              <input
                type="number"
                value={formData.material_cost}
                onChange={(e) => setFormData({ ...formData, material_cost: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Timeline (days)</label>
              <input
                type="number"
                value={formData.timeline_days}
                onChange={(e) => setFormData({ ...formData, timeline_days: e.target.value })}
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
                  <option key={s} value={s}>{statusLabel(s)}</option>
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
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Estimate Details" size="lg">
        {showDetail && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-gray-800">{showDetail.name}</h3>
              <p className="text-gray-500">{showDetail.floor_plan_name}</p>
            </div>

            <p className="text-gray-600">{showDetail.description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-600">Labor Cost</p>
                <p className="text-xl font-bold text-blue-700">
                  ${Number(showDetail.labor_cost || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-600">Material Cost</p>
                <p className="text-xl font-bold text-orange-700">
                  ${Number(showDetail.material_cost || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-green-600">Total Cost</p>
                <p className="text-xl font-bold text-green-700">
                  ${Number(showDetail.total_cost || 0).toLocaleString()}
                </p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="flex items-center gap-1 text-sm text-purple-600">
                  <Clock className="h-4 w-4" /> Timeline
                </div>
                <p className="text-xl font-bold text-purple-700">
                  {showDetail.timeline_days ? `${showDetail.timeline_days} days` : '-'}
                </p>
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

      {/* Single delete confirm */}
      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Estimate"
        message={`Are you sure you want to delete "${showConfirm?.name}"?`}
      />

      {/* Bulk delete confirm */}
      <ConfirmDialog
        isOpen={showBulkConfirm === 'delete'}
        onClose={() => setShowBulkConfirm(null)}
        onConfirm={handleBulkDelete}
        title="Delete Selected Estimates"
        message={`Are you sure you want to delete ${selectedIds.size} selected estimate${selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.`}
      />
    </div>
  );
}
