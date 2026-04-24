import { useState, useEffect, useCallback, useRef } from 'react';
import { getMaterials, createMaterial, updateMaterial, deleteMaterial, bulkDelete, bulkUpdate } from '../services/api';
import { Plus, Edit2, Trash2, Search, Package, Loader2, Check, X, CheckSquare, Square, ArrowUpDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportButton from '../components/ExportButton';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

const categories = ['flooring', 'countertop', 'tile', 'cabinet', 'paint', 'lighting', 'appliance', 'bathroom', 'door', 'trim', 'smart home', 'plumbing', 'other'];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'category', label: 'Category' },
  { value: 'unit_price', label: 'Unit Price' },
  { value: 'supplier', label: 'Supplier' },
  { value: 'created_at', label: 'Date Created' },
];

export default function Materials() {
  const [materials, setMaterials] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'flooring',
    description: '',
    unit_price: '',
    unit: 'sqft',
    supplier: '',
    in_stock: true
  });

  const toast = useToast();
  const debounceTimer = useRef(null);

  // Debounce search input
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
      setCurrentPage(1);
    }, 400);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  // Fetch materials when query params change
  useEffect(() => {
    fetchMaterials();
  }, [debouncedSearch, filterCategory, sortBy, sortOrder, currentPage]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterCategory) params.category = filterCategory;

      const response = await getMaterials(params);
      setMaterials(response.data.data);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error fetching materials:', error);
      toast.error('Failed to load materials');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await updateMaterial(editingItem.id, formData);
        toast.success('Material updated successfully!');
      } else {
        await createMaterial(formData);
        toast.success('Material created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save material');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'flooring',
      description: item.description || '',
      unit_price: item.unit_price || '',
      unit: item.unit || 'sqft',
      supplier: item.supplier || '',
      in_stock: item.in_stock ?? true
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteMaterial(showConfirm.id);
      setShowConfirm(null);
      fetchMaterials();
      toast.success('Material deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete material');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'flooring',
      description: '',
      unit_price: '',
      unit: 'sqft',
      supplier: '',
      in_stock: true
    });
  };

  // Selection handlers
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === materials.length && materials.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(materials.map((m) => m.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk actions
  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      await bulkDelete('materials', Array.from(selectedIds));
      toast.success(`${selectedIds.size} material(s) deleted successfully!`);
      setSelectedIds(new Set());
      setShowBulkConfirm(null);
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete materials');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdateStock = async (inStock) => {
    setBulkActionLoading(true);
    try {
      await bulkUpdate('materials', Array.from(selectedIds), { in_stock: inStock });
      toast.success(`${selectedIds.size} material(s) marked as ${inStock ? 'In Stock' : 'Out of Stock'}!`);
      setSelectedIds(new Set());
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update materials');
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkUpdateCategory = async (category) => {
    if (!category) return;
    setBulkActionLoading(true);
    try {
      await bulkUpdate('materials', Array.from(selectedIds), { category });
      toast.success(`${selectedIds.size} material(s) moved to "${category}"!`);
      setSelectedIds(new Set());
      fetchMaterials();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update materials');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Reset to page 1 when category filter changes
  const handleCategoryChange = (value) => {
    setFilterCategory(value);
    setCurrentPage(1);
  };

  // Reset to page 1 when sort changes
  const handleSortChange = (value) => {
    setSortBy(value);
    setCurrentPage(1);
  };

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    setCurrentPage(1);
  };

  const allSelected = materials.length > 0 && selectedIds.size === materials.length;

  if (loading && materials.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800">Materials</h1>
          <p className="text-gray-500 mt-1">Browse and manage renovation materials</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={materials} filename="materials" />
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Material
          </button>
        </div>
      </div>

      {/* Search, Filter, and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search materials..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Categories</option>
          {categories.map(c => (
            <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {sortOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={handleSortOrderToggle}
            className="p-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            <ArrowUpDown className={`h-5 w-5 text-gray-600 transition-transform ${sortOrder === 'asc' ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-indigo-600 transition-colors"
          >
            {allSelected ? (
              <CheckSquare className="h-5 w-5 text-indigo-600" />
            ) : (
              <Square className="h-5 w-5" />
            )}
            {allSelected ? 'Deselect All' : 'Select All'}
          </button>
          {selectedIds.size > 0 && (
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleBulkUpdateStock(true)}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
            >
              Mark In Stock
            </button>
            <button
              onClick={() => handleBulkUpdateStock(false)}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 text-sm bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-lg hover:bg-yellow-100 transition-colors disabled:opacity-50"
            >
              Mark Out of Stock
            </button>
            <select
              defaultValue=""
              onChange={(e) => {
                handleBulkUpdateCategory(e.target.value);
                e.target.value = '';
              }}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="" disabled>Change Category...</option>
              {categories.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
            <button
              onClick={() => setShowBulkConfirm('delete')}
              disabled={bulkActionLoading}
              className="px-3 py-1.5 text-sm bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete ({selectedIds.size})
            </button>
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Loading overlay for subsequent fetches */}
      {loading && materials.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      )}

      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.length === 0 && !loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No materials found
          </div>
        ) : (
          materials.map((material) => (
            <div
              key={material.id}
              onClick={() => setShowDetail(material)}
              className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer card-hover transition-colors ${
                selectedIds.has(material.id) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelect(material.id);
                    }}
                    className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors"
                  >
                    {selectedIds.has(material.id) ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <span
                  className={`flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${
                    material.in_stock
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {material.in_stock ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {material.in_stock ? 'In Stock' : 'Out of Stock'}
                </span>
              </div>

              <h3 className="font-semibold text-gray-800 mb-1">{material.name}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{material.description}</p>

              <div className="flex items-center justify-between text-sm">
                <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded capitalize">
                  {material.category}
                </span>
                <span className="font-semibold text-indigo-600">
                  ${material.unit_price}/{material.unit}
                </span>
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                <span className="text-sm text-gray-500">{material.supplier}</span>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleEdit(material)}
                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setShowConfirm(material)}
                    className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <Pagination pagination={pagination} onPageChange={setCurrentPage} />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
        }}
        title={editingItem ? 'Edit Material' : 'New Material'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

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
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={formData.unit_price}
                onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
              <input
                type="text"
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="sqft, unit, linear ft, etc."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
            <input
              type="text"
              value={formData.supplier}
              onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="in_stock"
              checked={formData.in_stock}
              onChange={(e) => setFormData({ ...formData, in_stock: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="in_stock" className="text-sm font-medium text-gray-700">In Stock</label>
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
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Material Details">
        {showDetail && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-800">{showDetail.name}</h3>
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded capitalize">
                  {showDetail.category}
                </span>
              </div>
            </div>

            <p className="text-gray-600">{showDetail.description}</p>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Price</p>
                <p className="text-xl font-semibold text-indigo-600">${showDetail.unit_price}/{showDetail.unit}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Supplier</p>
                <p className="font-medium">{showDetail.supplier || '-'}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-flex items-center gap-1 mt-1 px-2 py-1 text-xs font-medium rounded-full ${
                    showDetail.in_stock ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {showDetail.in_stock ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                  {showDetail.in_stock ? 'In Stock' : 'Out of Stock'}
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

      {/* Single Delete Confirm */}
      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Material"
        message={`Are you sure you want to delete "${showConfirm?.name}"?`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={showBulkConfirm === 'delete'}
        onClose={() => setShowBulkConfirm(null)}
        onConfirm={handleBulkDelete}
        title="Delete Materials"
        message={`Are you sure you want to delete ${selectedIds.size} selected material(s)? This action cannot be undone.`}
      />
    </div>
  );
}
