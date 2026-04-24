import { useState, useEffect } from 'react';
import { getFloorPlans, getRooms, placeFurniture, getFurniturePlacements, deleteFurniturePlacement } from '../services/api';
import { Sofa, Trash2, Plus, Loader2, Eye, Star, ArrowRight, FlaskConical } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';

const furnitureStyles = [
  { value: 'modern', label: 'Modern' },
  { value: 'contemporary', label: 'Contemporary' },
  { value: 'traditional', label: 'Traditional' },
  { value: 'minimalist', label: 'Minimalist' },
  { value: 'scandinavian', label: 'Scandinavian' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'bohemian', label: 'Bohemian' },
  { value: 'mid-century', label: 'Mid-Century Modern' },
];

export default function FurniturePlacer() {
  const [placements, setPlacements] = useState([]);
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
    style: 'modern'
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
      const [placementsRes, floorPlansRes] = await Promise.all([
        getFurniturePlacements(),
        getFloorPlans()
      ]);
      setPlacements(placementsRes.data);
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
      const response = await placeFurniture(formData);

      if (response.data.success) {
        toast.success('Furniture placement generated!');
        setShowModal(false);
        setFormData({ floor_plan_id: '', room_id: '', style: 'modern' });
        fetchData();
      } else {
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate placement');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteFurniturePlacement(showConfirm.id);
      setShowConfirm(null);
      fetchData();
      toast.success('Placement deleted!');
    } catch (error) {
      toast.error('Failed to delete');
    }
  };

  const getFlowColor = (rating) => {
    const colors = {
      'excellent': 'bg-green-100 text-green-700',
      'good': 'bg-blue-100 text-blue-700',
      'fair': 'bg-yellow-100 text-yellow-700',
      'poor': 'bg-red-100 text-red-700'
    };
    return colors[rating?.toLowerCase()] || 'bg-gray-100 text-gray-700';
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
          <h1 className="text-3xl font-bold text-gray-800">AI Furniture Placer</h1>
          <p className="text-gray-500 mt-1">Optimize furniture layout for better flow and aesthetics</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowDetail({
                id: 'sample',
                floor_plan_name: 'Sample Living Room',
                room_name: 'Living Room (18x22 ft)',
                layout_score: 8.5,
                traffic_flow_rating: 'excellent',
                model_used: 'Sample Data',
                created_at: new Date().toISOString(),
                full_result: `## Furniture Layout Plan\n\n### Primary Furniture\n\n| Item | Size (WxD) | Position | Orientation | Distance from Wall |\n|------|------------|----------|-------------|-------------------|\n| L-Shaped Sectional | 10'x7' | South wall | Facing north | 18" from wall |\n| Coffee Table | 48"x24" | Center of seating | Parallel to sofa | 18" from sofa |\n| TV Console | 60"x18" | North wall | Facing sofa | Flush to wall |\n| Accent Chair | 32"x34" | East side | Angled 30 degrees | 12" from wall |\n| Side Table | 22"x22" | Next to accent chair | - | Adjacent |\n| Floor Lamp | 12" dia | Behind accent chair | - | Corner placement |\n| Bookshelf | 36"x12" | West wall | Flat against wall | Flush |\n\n### Traffic Flow Analysis\n- **Main pathway**: Entry to kitchen (42" wide) - Excellent clearance\n- **Seating access**: 36" clearance around all seating - Meets standards\n- **TV viewing**: 8-10 feet from primary seating - Optimal distance\n- **No bottlenecks** identified in current layout\n\n### Conversation Areas\n- **Primary**: L-shaped sectional + accent chair creates intimate conversation zone\n- **Secondary**: Reading nook with accent chair + floor lamp + side table\n- **Focal Points**: Fireplace (primary), TV console (secondary)\n\n### Space Efficiency Score: 8.5/10\n\nThe layout maximizes seating capacity while maintaining excellent traffic flow. The L-shaped sectional efficiently uses the corner space, and the angled accent chair creates visual interest.\n\n### Alternative Layouts\n\n#### Option A: Floating Furniture\n- Move sofa away from wall (24" clearance behind)\n- Create a gallery wall behind the sofa\n- More intimate feel, slightly reduced pathway\n\n#### Option B: Symmetrical\n- Two matching sofas facing each other\n- Coffee table centered between them\n- More formal, great for entertaining\n\n### Shopping List\n\n| Priority | Item | Recommended Size | Est. Cost |\n|----------|------|-----------------|----------|\n| 1 | L-Shaped Sectional | 120"x84" | $1,500-3,000 |\n| 2 | Coffee Table | 48"x24" | $300-800 |\n| 3 | TV Console | 60"x18" | $400-900 |\n| 4 | Accent Chair | 32"x34" | $500-1,200 |\n| 5 | Side Table | 22"x22" | $150-350 |\n| 6 | Floor Lamp | Arc style | $150-400 |\n| 7 | Bookshelf | 36"x72" | $200-600 |`
              });
            }}
            className="btn-secondary flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <FlaskConical className="h-5 w-5" />
            Load Sample
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Placement
          </button>
        </div>
      </div>

      {placements.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Sofa className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Furniture Placements Yet</h3>
          <p className="text-gray-500 mb-4">Get AI-optimized furniture arrangement suggestions</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Create Placement</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {placements.map((item) => (
            <div
              key={item.id}
              onClick={() => setShowDetail(item)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
                  <Sofa className="h-6 w-6 text-amber-600" />
                </div>
                <span className={`px-3 py-1 text-sm font-medium rounded-full capitalize ${getFlowColor(item.traffic_flow_rating)}`}>
                  {item.traffic_flow_rating} flow
                </span>
              </div>

              <h3 className="font-semibold text-gray-800 mb-1">{item.floor_plan_name}</h3>
              {item.room_name && <p className="text-sm text-indigo-600 mb-2">{item.room_name}</p>}

              {item.layout_score && (
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{item.layout_score}/10</span>
                  <span className="text-sm text-gray-500">layout score</span>
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

      {/* New Placement Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Furniture Placement">
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
                <option value="">All rooms</option>
                {rooms.map(room => (
                  <option key={room.id} value={room.id}>{room.name} ({room.area} sq ft)</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Furniture Style</label>
            <select
              value={formData.style}
              onChange={(e) => setFormData({ ...formData, style: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {furnitureStyles.map(style => (
                <option key={style.value} value={style.value}>{style.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAnalyze} disabled={analyzing || !formData.floor_plan_id} className="btn-primary flex items-center gap-2">
              {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              {analyzing ? 'Generating...' : 'Generate Layout'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Furniture Placement Plan" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                    <Sofa className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{showDetail.floor_plan_name}</h3>
                    {showDetail.room_name && <p className="text-sm text-amber-600">{showDetail.room_name}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1">
                    <Star className="h-5 w-5 text-yellow-500" />
                    <p className="text-2xl font-bold text-amber-600">{showDetail.layout_score}</p>
                    <span className="text-gray-500">/10</span>
                  </div>
                  <p className="text-sm text-gray-500">layout score</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Traffic Flow</p>
                <p className="font-semibold capitalize">{showDetail.traffic_flow_rating}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-500">Generated</p>
                <p className="font-medium">{new Date(showDetail.created_at).toLocaleString()}</p>
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
        title="Delete Placement"
        message="Are you sure you want to delete this furniture placement?"
      />
    </div>
  );
}
