import { useState, useEffect, useCallback, useRef } from 'react';
import { getContractors, createContractor, updateContractor, deleteContractor, bulkDelete, bulkUpdate } from '../services/api';
import { Plus, Edit2, Trash2, Search, Users, Loader2, Star, Phone, Mail, MapPin, Check, CheckSquare, Square, ArrowUpDown, ChevronDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import ExportButton from '../components/ExportButton';
import Pagination from '../components/Pagination';
import { useToast } from '../components/Toast';

const specialties = ['general', 'plumbing', 'electrical', 'flooring', 'painting', 'kitchen', 'bathroom', 'hvac', 'roofing', 'windows', 'tile', 'carpentry', 'interior design', 'masonry', 'landscaping', 'smart home'];
const availabilities = ['available', 'busy', 'unavailable'];

const sortOptions = [
  { value: 'name', label: 'Name' },
  { value: 'company', label: 'Company' },
  { value: 'specialty', label: 'Specialty' },
  { value: 'rating', label: 'Rating' },
  { value: 'hourly_rate', label: 'Hourly Rate' },
  { value: 'availability', label: 'Availability' },
  { value: 'created_at', label: 'Date Created' },
];

export default function Contractors() {
  const [contractors, setContractors] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showBulkConfirm, setShowBulkConfirm] = useState(null);
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterSpecialty, setFilterSpecialty] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkActionsOpen, setBulkActionsOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    specialty: 'general',
    email: '',
    phone: '',
    rating: '',
    hourly_rate: '',
    availability: 'available',
    location: '',
    verified: false,
  });

  const toast = useToast();
  const debounceRef = useRef(null);
  const bulkMenuRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchTerm]);

  // Close bulk actions dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (bulkMenuRef.current && !bulkMenuRef.current.contains(e.target)) {
        setBulkActionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch whenever query params change; reset to page 1 on filter/sort/search change
  useEffect(() => {
    fetchContractors(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterSpecialty, sortBy, sortOrder]);

  // Fetch on page change only (separate effect to avoid double-fetch)
  const fetchPage = useCallback((page) => {
    fetchContractors(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterSpecialty, sortBy, sortOrder]);

  const fetchContractors = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 12,
        sort_by: sortBy,
        sort_order: sortOrder,
      };
      if (debouncedSearch) params.search = debouncedSearch;
      if (filterSpecialty) params.specialty = filterSpecialty;

      const res = await getContractors(params);
      setContractors(res.data.data);
      setPagination(res.data.pagination);
      // Clear selections that are no longer visible
      setSelectedIds(new Set());
    } catch (error) {
      console.error('Error fetching contractors:', error);
      toast.error('Failed to load contractors');
    } finally {
      setLoading(false);
    }
  };

  // ---- CRUD ----
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingItem) {
        await updateContractor(editingItem.id, formData);
        toast.success('Contractor updated successfully!');
      } else {
        await createContractor(formData);
        toast.success('Contractor created successfully!');
      }
      setShowModal(false);
      setEditingItem(null);
      resetForm();
      fetchContractors(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save contractor');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      company: item.company || '',
      specialty: item.specialty || 'general',
      email: item.email || '',
      phone: item.phone || '',
      rating: item.rating || '',
      hourly_rate: item.hourly_rate || '',
      availability: item.availability || 'available',
      location: item.location || '',
      verified: item.verified ?? false,
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    try {
      await deleteContractor(showConfirm.id);
      setShowConfirm(null);
      fetchContractors(pagination.page);
      toast.success('Contractor deleted successfully!');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete contractor');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      specialty: 'general',
      email: '',
      phone: '',
      rating: '',
      hourly_rate: '',
      availability: 'available',
      location: '',
      verified: false,
    });
  };

  // ---- Selection ----
  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === contractors.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contractors.map((c) => c.id)));
    }
  };

  const allSelected = contractors.length > 0 && selectedIds.size === contractors.length;
  const someSelected = selectedIds.size > 0;

  // ---- Bulk Actions ----
  const handleBulkDelete = async () => {
    setBulkLoading(true);
    try {
      await bulkDelete('contractors', Array.from(selectedIds));
      toast.success(`${selectedIds.size} contractor(s) deleted successfully!`);
      setSelectedIds(new Set());
      setShowBulkConfirm(null);
      fetchContractors(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to delete contractors');
    } finally {
      setBulkLoading(false);
    }
  };

  const handleBulkUpdate = async (updates) => {
    setBulkLoading(true);
    try {
      await bulkUpdate('contractors', Array.from(selectedIds), updates);
      const label = Object.keys(updates).join(', ');
      toast.success(`${selectedIds.size} contractor(s) updated (${label})!`);
      setSelectedIds(new Set());
      setBulkActionsOpen(false);
      fetchContractors(pagination.page);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to update contractors');
    } finally {
      setBulkLoading(false);
    }
  };

  // ---- Sort toggle ----
  const handleSortChange = (field) => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // ---- Stars ----
  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />);
      } else if (i === fullStars && hasHalf) {
        stars.push(<Star key={i} className="h-4 w-4 fill-yellow-400/50 text-yellow-400" />);
      } else {
        stars.push(<Star key={i} className="h-4 w-4 text-gray-300" />);
      }
    }
    return stars;
  };

  // ---- Render ----
  if (loading && contractors.length === 0) {
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
          <h1 className="text-3xl font-bold text-gray-800">Contractors</h1>
          <p className="text-gray-500 mt-1">
            Find and manage local contractors
            {pagination.total > 0 && (
              <span className="ml-2 text-sm text-gray-400">({pagination.total} total)</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ExportButton data={contractors} filename="contractors" />
          <button
            onClick={() => {
              setEditingItem(null);
              resetForm();
              setShowModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            New Contractor
          </button>
        </div>
      </div>

      {/* Filters Row: Search + Specialty + Sort */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search contractors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={filterSpecialty}
          onChange={(e) => setFilterSpecialty(e.target.value)}
          className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Specialties</option>
          {specialties.map((s) => (
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-gray-400 shrink-0" />
          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
            className="px-3 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium text-gray-600 transition-colors"
            title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
          >
            {sortOrder === 'asc' ? 'ASC' : 'DESC'}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex items-center gap-4">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {allSelected ? (
            <CheckSquare className="h-5 w-5 text-indigo-600" />
          ) : (
            <Square className="h-5 w-5 text-gray-400" />
          )}
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>

        {someSelected && (
          <>
            <span className="text-sm text-gray-500">
              {selectedIds.size} selected
            </span>

            {/* Bulk Actions Dropdown */}
            <div className="relative" ref={bulkMenuRef}>
              <button
                onClick={() => setBulkActionsOpen(!bulkActionsOpen)}
                disabled={bulkLoading}
                className="flex items-center gap-2 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {bulkLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                Bulk Actions
              </button>

              {bulkActionsOpen && (
                <div className="absolute left-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <button
                    onClick={() => {
                      setBulkActionsOpen(false);
                      setShowBulkConfirm({
                        title: 'Delete Selected Contractors',
                        message: `Are you sure you want to delete ${selectedIds.size} contractor(s)? This cannot be undone.`,
                      });
                    }}
                    className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-t-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4 inline mr-2" />
                    Delete Selected ({selectedIds.size})
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => handleBulkUpdate({ availability: 'available' })}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Set Available
                  </button>
                  <button
                    onClick={() => handleBulkUpdate({ availability: 'busy' })}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Set Busy
                  </button>
                  <div className="border-t border-gray-100" />
                  <button
                    onClick={() => handleBulkUpdate({ verified: true })}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Mark Verified
                  </button>
                  <button
                    onClick={() => handleBulkUpdate({ verified: false })}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg transition-colors"
                  >
                    Mark Unverified
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {loading && contractors.length > 0 && (
          <Loader2 className="h-5 w-5 text-indigo-500 animate-spin ml-auto" />
        )}
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {contractors.length === 0 && !loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">
            No contractors found
          </div>
        ) : (
          contractors.map((contractor) => {
            const isSelected = selectedIds.has(contractor.id);
            return (
              <div
                key={contractor.id}
                onClick={() => setShowDetail(contractor)}
                className={`bg-white rounded-xl shadow-sm border p-6 cursor-pointer card-hover transition-colors ${
                  isSelected ? 'border-indigo-400 ring-2 ring-indigo-200' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    {/* Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(contractor.id);
                      }}
                      className="shrink-0"
                    >
                      {isSelected ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                      )}
                    </button>
                    <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                      <Users className="h-6 w-6 text-teal-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-800">{contractor.name}</h3>
                        {contractor.verified && (
                          <span className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                            <Check className="h-3 w-3 text-white" />
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{contractor.company}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 mb-3">
                  {renderStars(contractor.rating || 0)}
                  <span className="ml-1 text-sm text-gray-600">({contractor.rating || 0})</span>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-1 bg-teal-100 text-teal-700 rounded capitalize">{contractor.specialty}</span>
                    <span
                      className={`px-2 py-1 rounded ${
                        contractor.availability === 'available'
                          ? 'bg-green-100 text-green-700'
                          : contractor.availability === 'busy'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {contractor.availability}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-gray-400" />
                    <span>{contractor.location || '-'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className="text-lg font-semibold text-indigo-600">
                    ${contractor.hourly_rate}/hr
                  </span>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleEdit(contractor)}
                      className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setShowConfirm(contractor)}
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
      <Pagination pagination={pagination} onPageChange={fetchPage} />

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingItem(null);
          resetForm();
        }}
        title={editingItem ? 'Edit Contractor' : 'New Contractor'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
              <input
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Specialty</label>
              <select
                value={formData.specialty}
                onChange={(e) => setFormData({ ...formData, specialty: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {specialties.map((s) => (
                  <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Availability</label>
              <select
                value={formData.availability}
                onChange={(e) => setFormData({ ...formData, availability: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                {availabilities.map((a) => (
                  <option key={a} value={a}>{a.charAt(0).toUpperCase() + a.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rating (1-5)</label>
              <input
                type="number"
                step="0.1"
                min="1"
                max="5"
                value={formData.rating}
                onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hourly Rate ($)</label>
              <input
                type="number"
                value={formData.hourly_rate}
                onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="verified"
              checked={formData.verified}
              onChange={(e) => setFormData({ ...formData, verified: e.target.checked })}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="verified" className="text-sm font-medium text-gray-700">Verified Contractor</label>
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
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Contractor Details" size="lg">
        {showDetail && (
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                <Users className="h-8 w-8 text-teal-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-semibold text-gray-800">{showDetail.name}</h3>
                  {showDetail.verified && (
                    <span className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </span>
                  )}
                </div>
                <p className="text-gray-500">{showDetail.company}</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {renderStars(showDetail.rating || 0)}
              <span className="ml-2 text-gray-600">{showDetail.rating || 0} rating</span>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Specialty</p>
                <p className="font-medium capitalize">{showDetail.specialty}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Hourly Rate</p>
                <p className="font-medium text-indigo-600">${showDetail.hourly_rate}/hr</p>
              </div>
            </div>

            <div className="space-y-3">
              {showDetail.email && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Mail className="h-5 w-5 text-gray-400" />
                  <span>{showDetail.email}</span>
                </div>
              )}
              {showDetail.phone && (
                <div className="flex items-center gap-3 text-gray-600">
                  <Phone className="h-5 w-5 text-gray-400" />
                  <span>{showDetail.phone}</span>
                </div>
              )}
              {showDetail.location && (
                <div className="flex items-center gap-3 text-gray-600">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span>{showDetail.location}</span>
                </div>
              )}
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
        title="Delete Contractor"
        message={`Are you sure you want to delete "${showConfirm?.name}"?`}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmDialog
        isOpen={!!showBulkConfirm}
        onClose={() => setShowBulkConfirm(null)}
        onConfirm={handleBulkDelete}
        title={showBulkConfirm?.title || 'Confirm Bulk Delete'}
        message={showBulkConfirm?.message || ''}
      />
    </div>
  );
}
