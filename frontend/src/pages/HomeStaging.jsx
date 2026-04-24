import { useState, useEffect } from 'react';
import { getFloorPlans, getRooms, getHomeStagingAdvice, getHomeStagingList, deleteHomeStaging } from '../services/api';
import { Home, Trash2, Plus, Loader2, Eye, DollarSign, Target, Sparkles, FlaskConical } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';

const targetBuyers = [
  { value: 'general', label: 'General Buyers' },
  { value: 'young professionals', label: 'Young Professionals' },
  { value: 'families with children', label: 'Families with Children' },
  { value: 'luxury seekers', label: 'Luxury Seekers' },
  { value: 'first-time buyers', label: 'First-Time Buyers' },
  { value: 'retirees', label: 'Retirees' },
  { value: 'investors', label: 'Investors' },
];

export default function HomeStaging() {
  const [stagingList, setStagingList] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [formData, setFormData] = useState({
    floor_plan_id: '',
    room_id: '',
    target_buyer: 'general'
  });
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (formData.floor_plan_id) {
      fetchRooms(formData.floor_plan_id);
    }
  }, [formData.floor_plan_id]);

  const fetchData = async () => {
    try {
      const [stagingRes, floorPlansRes] = await Promise.all([
        getHomeStagingList(),
        getFloorPlans()
      ]);
      setStagingList(stagingRes.data);
      setFloorPlans(floorPlansRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRooms = async (floorPlanId) => {
    try {
      const response = await getRooms(floorPlanId);
      setRooms(response.data);
    } catch (error) {
      console.error('Error fetching rooms:', error);
    }
  };

  const handleAnalyze = async () => {
    if (!formData.floor_plan_id) {
      toast.error('Please select a floor plan');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await getHomeStagingAdvice(formData);

      if (response.data.success) {
        toast.success('Staging advice generated!');
        setShowModal(false);
        setFormData({ floor_plan_id: '', room_id: '', target_buyer: 'general' });
        fetchData();
      } else {
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate advice');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteHomeStaging(showConfirm.id);
      setShowConfirm(null);
      fetchData();
      toast.success('Staging advice deleted!');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value || 0);
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
          <h1 className="text-3xl font-bold text-gray-800">AI Home Staging Advisor</h1>
          <p className="text-gray-500 mt-1">Get professional staging recommendations to maximize property appeal</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowDetail({
                id: 'sample',
                floor_plan_name: 'Sample Modern Apartment',
                room_name: 'Living Room',
                staging_style: 'Modern Transitional',
                target_buyer: 'Young Professionals',
                estimated_value_increase: 18500,
                model_used: 'Sample Data',
                created_at: new Date().toISOString(),
                full_result: `## Staging Strategy\n\n### Overall Theme\n**Modern Transitional** - Clean lines with warm accents to appeal to young professionals seeking a move-in ready space.\n\n### Furniture Recommendations\n\n| Item | Style | Placement | Purpose |\n|------|-------|-----------|----------|\n| Sectional Sofa | Low-profile, light gray | Against main wall | Anchor piece |\n| Coffee Table | Walnut with glass top | Center of seating area | Focal point |\n| Accent Chairs | Mid-century, navy blue | Flanking fireplace | Conversation nook |\n| Console Table | Modern brass/marble | Behind sofa | Display surface |\n| Floor Lamp | Arc style, brass | Corner by sofa | Ambient lighting |\n\n### Color Palette\n- **Walls**: Benjamin Moore "Simply White" OC-117 (#F4F0E4)\n- **Accents**: Navy blue (#2C3E6B) and warm brass (#C5963A)\n- **Textiles**: Soft gray, cream, and dusty blue\n\n### Decluttering Checklist\n- [ ] Remove all personal photos and memorabilia\n- [ ] Clear kitchen countertops (leave only 1-2 decorative items)\n- [ ] Remove excess furniture to open up floor space\n- [ ] Add fresh white towels in bathrooms\n- [ ] Place fresh flowers on dining table and entry console\n\n### Lighting Improvements\n- Replace all bulbs with 3000K warm white LED\n- Add table lamps to create layers of light\n- Install dimmer switches in living room and master bedroom\n- Ensure all fixtures are clean and matching\n\n### Estimated Value Increase\n- Staging investment: $3,500\n- Potential value increase: $15,000 - $22,000\n- ROI: 430-630%\n\n### Quick Wins (Under $100)\n1. Fresh flowers in entry and living room ($30)\n2. New white towel set for bathrooms ($45)\n3. Scented candles in living areas ($25)\n4. New doormat and entry arrangement ($35)`
              });
            }}
            className="btn-secondary flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <FlaskConical className="h-5 w-5" />
            Load Sample
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Staging Advice
          </button>
        </div>
      </div>

      {stagingList.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Home className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Staging Advice Yet</h3>
          <p className="text-gray-500 mb-4">Get AI-powered staging recommendations for your properties</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Get Staging Advice</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stagingList.map((item) => (
            <div
              key={item.id}
              onClick={() => setShowDetail(item)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center">
                  <Home className="h-6 w-6 text-pink-600" />
                </div>
                <span className="px-3 py-1 text-sm font-medium bg-pink-100 text-pink-700 rounded-full capitalize">
                  {item.staging_style}
                </span>
              </div>

              <h3 className="font-semibold text-gray-800 mb-1">{item.floor_plan_name}</h3>
              {item.room_name && <p className="text-sm text-indigo-600 mb-2">{item.room_name}</p>}

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                <Target className="h-4 w-4" />
                <span className="capitalize">{item.target_buyer}</span>
              </div>

              {item.estimated_value_increase && (
                <div className="flex items-center gap-2 text-sm text-green-600 font-medium mb-3">
                  <DollarSign className="h-4 w-4" />
                  <span>+{formatCurrency(item.estimated_value_increase)} value increase</span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm pt-3 border-t border-gray-100">
                <span className="text-gray-500">{new Date(item.created_at).toLocaleDateString()}</span>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => setShowDetail(item)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                    <Eye className="h-4 w-4" />
                  </button>
                  <button onClick={() => setShowConfirm(item)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Staging Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Get Staging Advice">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan *</label>
            <select
              value={formData.floor_plan_id}
              onChange={(e) => setFormData({ ...formData, floor_plan_id: e.target.value, room_id: '' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a floor plan...</option>
              {floorPlans.map(fp => (
                <option key={fp.id} value={fp.id}>{fp.name}</option>
              ))}
            </select>
          </div>

          {formData.floor_plan_id && rooms.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Room (Optional)</label>
              <select
                value={formData.room_id}
                onChange={(e) => setFormData({ ...formData, room_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All rooms / General</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name} ({room.room_type})</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Buyer</label>
            <select
              value={formData.target_buyer}
              onChange={(e) => setFormData({ ...formData, target_buyer: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {targetBuyers.map(buyer => (
                <option key={buyer.value} value={buyer.value}>{buyer.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAnalyze} disabled={analyzing || !formData.floor_plan_id} className="btn-primary flex items-center gap-2">
              {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              {analyzing ? 'Generating...' : 'Get Advice'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Staging Recommendations" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-pink-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{showDetail.floor_plan_name}</h3>
                    {showDetail.room_name && <p className="text-sm text-pink-600">{showDetail.room_name}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Est. Value Increase</p>
                  <p className="text-xl font-bold text-green-600">{formatCurrency(showDetail.estimated_value_increase)}</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Staging Style</p>
                <p className="font-semibold capitalize">{showDetail.staging_style}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Target Buyer</p>
                <p className="font-semibold capitalize">{showDetail.target_buyer}</p>
              </div>
            </div>

            {showDetail.full_result && (
              <div className="border rounded-lg p-4 max-h-96 overflow-y-auto">
                <div className="ai-response prose prose-sm max-w-none">
                  <ReactMarkdown>{showDetail.full_result?.replace(/```[\w]*\n?[\s\S]*?```/g, '').trim()}</ReactMarkdown>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={() => setShowDetail(null)} className="btn-secondary">Close</button>
              <button onClick={() => { setShowConfirm(showDetail); setShowDetail(null); }} className="btn-danger flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!showConfirm}
        onClose={() => setShowConfirm(null)}
        onConfirm={handleDelete}
        title="Delete Staging Advice"
        message="Are you sure you want to delete this staging advice?"
      />
    </div>
  );
}
