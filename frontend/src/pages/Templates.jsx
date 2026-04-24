import { useState, useEffect, useRef } from 'react';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate, bulkDelete } from '../services/api';
import { Plus, Edit2, Trash2, Search, Palette, Loader2, CheckSquare, Square, ArrowUpDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportButton from '../components/ExportButton';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

const styles = ['minimalist', 'industrial', 'coastal', 'scandinavian', 'farmhouse', 'mid-century', 'bohemian', 'luxury', 'traditional', 'japanese', 'art-deco', 'rustic', 'urban', 'french', 'tropical', 'mediterranean'];
const roomTypes = ['living', 'bedroom', 'kitchen', 'bathroom', 'dining', 'office', 'entry', 'outdoor'];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'style', label: 'Style' },
  { value: 'room_type', label: 'Room Type' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'created_at', label: 'Date Created' },
];

export default function Templates() {
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterStyle, setFilterStyle] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showBulkConfirm, setShowBulkConfirm] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    style: 'minimalist',
    description: '',
    room_type: 'living',
    features: '',
    color_palette: ''
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
    }, 300);
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchTerm]);

  // Fetch templates when query params change
  useEffect(() => {
    fetchTemplates();
  }, [debouncedSearch, filterStyle, sortBy, sortOrder, currentPage]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 12,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterStyle) params.style = filterStyle;

      const res = await getTemplates(params);
      setTemplates(res.data.data);
      setPagination(res.data.pagination);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const submitData = {
        ...formData,
        features: formData.features ? formData.features.split(',').map(f => f.trim()) : [],
        color_palette: formData.color_palette ? formData.color_palette.split(',').map(c => c.trim()) : []
      };
      if (editingItem) {
        await updateTemplate(editingItem.id, submitData);
        toast.success('Template updated successfully!');
      } else {
        await createTemplate(submitData);
        toast.success('Template created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    const features = Array.isArray(item.features) ? item.features : JSON.parse(item.features || '[]');
    const colors = Array.isArray(item.color_palette) ? item.color_palette : JSON.parse(item.color_palette || '[]');
    setFormData({
      name: item.name,
      style: item.style || 'minimalist',
      description: item.description || '',
      room_type: item.room_type || 'living',
      features: features.join(', '),
      color_palette: colors.join(', ')
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteTemplate(showConfirm.id);
      setShowConfirm(null);
      fetchTemplates();
      toast.success('Template deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete template');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      style: 'minimalist',
      description: '',
      room_type: 'living',
      features: '',
      color_palette: ''
    });
  };

  const parseColors = (colorPalette) => {
    if (!colorPalette) return [];
    if (Array.isArray(colorPalette)) return colorPalette;
    try {
      return JSON.parse(colorPalette);
    } catch {
      return [];
    }
  };

  const parseFeatures = (features) => {
    if (!features) return [];
    if (Array.isArray(features)) return features;
    try {
      return JSON.parse(features);
    } catch {
      return [];
    }
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
    if (selectedIds.size === templates.length && templates.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(templates.map((t) => t.id)));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    setBulkActionLoading(true);
    try {
      await bulkDelete('templates', Array.from(selectedIds));
      toast.success(`${selectedIds.size} template(s) deleted successfully!`);
      setSelectedIds(new Set());
      setShowBulkConfirm(null);
      fetchTemplates();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete templates');
    } finally {
      setBulkActionLoading(false);
    }
  };

  // Reset to page 1 when style filter changes
  const handleStyleChange = (value) => {
    setFilterStyle(value);
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

  const allSelected = templates.length > 0 && selectedIds.size === templates.length;

  if (loading && templates.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800">Design Templates</h1>
          <p className="text-gray-500 mt-1">Browse design style templates for inspiration</p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={templates} filename="templates" />
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Template
          </button>
        </div>
      </div>

      {/* Search, Filter, and Sort Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterStyle}
          onChange={(e) => handleStyleChange(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Styles</option>
          {styles.map(s => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>
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
      {loading && templates.length > 0 && (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
          <span className="ml-2 text-sm text-gray-500">Loading...</span>
        </div>
      )}

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.length === 0 && !loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No templates found
          </div>
        ) : (
          templates.map((template) => {
            const colors = parseColors(template.color_palette);
            const features = parseFeatures(template.features);
            return (
              <div
                key={template.id}
                onClick={() => setShowDetail(template)}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden cursor-pointer card-hover transition-colors ${
                  selectedIds.has(template.id) ? 'border-indigo-400 ring-2 ring-indigo-100' : 'border-gray-200'
                }`}
              >
                {/* Color palette preview */}
                <div className="h-24 flex">
                  {colors.slice(0, 4).map((color, i) => (
                    <div
                      key={i}
                      className="flex-1"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelect(template.id);
                        }}
                        className="flex-shrink-0 text-gray-400 hover:text-indigo-600 transition-colors"
                      >
                        {selectedIds.has(template.id) ? (
                          <CheckSquare className="h-5 w-5 text-indigo-600" />
                        ) : (
                          <Square className="h-5 w-5" />
                        )}
                      </button>
                      <div>
                        <h3 className="font-semibold text-gray-800">{template.name}</h3>
                        <div className="flex gap-2 mt-1">
                          <span className="px-2 py-0.5 text-xs bg-pink-100 text-pink-700 rounded capitalize">
                            {template.style?.replace('-', ' ')}
                          </span>
                          <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded capitalize">
                            {template.room_type}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Palette className="h-5 w-5 text-pink-500" />
                  </div>

                  <p className="text-sm text-gray-500 mb-3 line-clamp-2">{template.description}</p>

                  <div className="flex flex-wrap gap-1">
                    {features.slice(0, 3).map((f, i) => (
                      <span key={i} className="px-2 py-0.5 text-xs bg-gray-50 text-gray-600 rounded">
                        {f}
                      </span>
                    ))}
                    {features.length > 3 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-50 text-gray-600 rounded">
                        +{features.length - 3}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowConfirm(template)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
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
        title={editingItem ? 'Edit Template' : 'New Template'}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Style</label>
              <select
                value={formData.style}
                onChange={(e) => setFormData({ ...formData, style: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {styles.map(s => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('-', ' ')}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room Type</label>
              <select
                value={formData.room_type}
                onChange={(e) => setFormData({ ...formData, room_type: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {roomTypes.map(r => (
                  <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                ))}
              </select>
            </div>
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Features (comma-separated)</label>
            <input
              type="text"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder="e.g., open space, minimal furniture, neutral palette"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Color Palette (hex codes, comma-separated)</label>
            <input
              type="text"
              value={formData.color_palette}
              onChange={(e) => setFormData({ ...formData, color_palette: e.target.value })}
              placeholder="e.g., #FFFFFF, #F5F5F5, #333333"
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
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Template Details" size="lg">
        {showDetail && (() => {
          const colors = parseColors(showDetail.color_palette);
          const features = parseFeatures(showDetail.features);
          return (
            <div className="space-y-6">
              {/* Color preview */}
              <div className="h-32 flex rounded-lg overflow-hidden">
                {colors.map((color, i) => (
                  <div
                    key={i}
                    className="flex-1 relative group"
                    style={{ backgroundColor: color }}
                  >
                    <span className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                      {color}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-xl font-semibold text-gray-800">{showDetail.name}</h3>
                <div className="flex gap-2 mt-2">
                  <span className="px-3 py-1 text-sm bg-pink-100 text-pink-700 rounded-full capitalize">
                    {showDetail.style?.replace('-', ' ')}
                  </span>
                  <span className="px-3 py-1 text-sm bg-gray-100 text-gray-600 rounded-full capitalize">
                    {showDetail.room_type}
                  </span>
                </div>
              </div>

              <p className="text-gray-600">{showDetail.description}</p>

              <div>
                <h4 className="font-medium text-gray-800 mb-2">Features</h4>
                <div className="flex flex-wrap gap-2">
                  {features.map((f, i) => (
                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-sm">
                      {f}
                    </span>
                  ))}
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
          );
        })()}
      </Modal>

      {/* Single Delete Confirm */}
      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Template"
        message={`Are you sure you want to delete "${showConfirm?.name}"?`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={showBulkConfirm === 'delete'}
        onClose={() => setShowBulkConfirm(null)}
        onConfirm={handleBulkDelete}
        title="Delete Templates"
        message={`Are you sure you want to delete ${selectedIds.size} selected template(s)? This action cannot be undone.`}
      />
    </div>
  );
}
