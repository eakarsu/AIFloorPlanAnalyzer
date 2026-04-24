import { useState, useEffect } from 'react';
import { getFloorPlans, predictMaintenance, getMaintenancePredictions, deleteMaintenancePrediction } from '../services/api';
import { Wrench, Trash2, Plus, Loader2, Eye, Calendar, AlertTriangle, DollarSign, FlaskConical } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';

export default function MaintenancePredictor() {
  const [predictions, setPredictions] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [formData, setFormData] = useState({
    floor_plan_id: '',
    home_age: 10
  });
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [predictionsRes, floorPlansRes] = await Promise.all([
        getMaintenancePredictions(),
        getFloorPlans()
      ]);
      setPredictions(predictionsRes.data);
      setFloorPlans(floorPlansRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!formData.floor_plan_id) {
      toast.error('Please select a floor plan');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await predictMaintenance(formData);

      if (response.data.success) {
        toast.success('Maintenance prediction generated!');
        setShowModal(false);
        setFormData({ floor_plan_id: '', home_age: 10 });
        fetchData();
      } else {
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to generate prediction');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMaintenancePrediction(showConfirm.id);
      setShowConfirm(null);
      fetchData();
      toast.success('Prediction deleted!');
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

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Not scheduled';
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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
          <h1 className="text-3xl font-bold text-gray-800">AI Home Maintenance Predictor</h1>
          <p className="text-gray-500 mt-1">Predict and plan home maintenance needs before problems arise</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowDetail({
                id: 'sample',
                floor_plan_name: 'Sample Family Home',
                total_annual_cost: 4200,
                priority_items: 3,
                next_maintenance_date: '2026-03-15',
                model_used: 'Sample Data',
                created_at: new Date().toISOString(),
                full_result: `## Annual Maintenance Calendar\n\n### Q1 (Jan-Mar)\n| Task | Priority | Est. Cost | DIY? |\n|------|----------|-----------|------|\n| HVAC filter replacement | High | $30 | Yes |\n| Test smoke/CO detectors | High | $0 | Yes |\n| Check for ice dams | Medium | $0-200 | Depends |\n| Inspect attic insulation | Low | $0 | Yes |\n\n### Q2 (Apr-Jun)\n| Task | Priority | Est. Cost | DIY? |\n|------|----------|-----------|------|\n| HVAC spring tune-up | High | $150 | No |\n| Gutter cleaning | High | $200 | Yes |\n| Exterior paint touch-up | Medium | $100-300 | Yes |\n| Deck/patio inspection | Medium | $0-500 | Depends |\n| Lawn sprinkler system check | Low | $75 | No |\n\n### Q3 (Jul-Sep)\n| Task | Priority | Est. Cost | DIY? |\n|------|----------|-----------|------|\n| HVAC filter replacement | High | $30 | Yes |\n| Check caulking/weatherstripping | Medium | $50 | Yes |\n| Power wash exterior | Low | $150 | Yes |\n| Inspect roof for damage | Medium | $0-300 | No |\n\n### Q4 (Oct-Dec)\n| Task | Priority | Est. Cost | DIY? |\n|------|----------|-----------|------|\n| HVAC fall tune-up | High | $150 | No |\n| Gutter cleaning | High | $200 | Yes |\n| Winterize outdoor faucets | High | $0 | Yes |\n| Fireplace/chimney inspection | Medium | $250 | No |\n| Window seal inspection | Low | $0-100 | Yes |\n\n## Major System Predictions\n\n### HVAC System\n- Current estimated condition: **Good**\n- Expected lifespan remaining: 8 years\n- Recommended: Annual tune-ups, filter changes every 3 months\n- Budget for replacement: $6,000-12,000 in 8 years\n\n### Plumbing\n- Risk areas: Water heater (8 years old, replace within 2-4 years)\n- Preventive: Annual water heater flush, check supply lines\n- Budget: $1,500-2,500 for water heater replacement\n\n### Electrical\n- Capacity: 200 amp service - adequate for current needs\n- Recommendation: GFCI outlet testing quarterly\n- Upgrade consideration: Smart panel for energy monitoring\n\n### Roof & Exterior\n- Estimated roof age: 12 years (expected 20-25 year lifespan)\n- Remaining life: 8-13 years\n- Annual inspection recommended\n\n## 5-Year Cost Projection\n\n| Year | Routine | Major Repairs | Total |\n|------|---------|---------------|-------|\n| 2026 | $1,800 | $2,400 | $4,200 |\n| 2027 | $1,900 | $1,000 | $2,900 |\n| 2028 | $2,000 | $2,500 | $4,500 |\n| 2029 | $2,100 | $8,000 | $10,100 |\n| 2030 | $2,200 | $1,500 | $3,700 |\n\n## Priority Action Items\n1. **Schedule HVAC tune-up** - Overdue, affects efficiency and lifespan\n2. **Water heater inspection** - At 8 years, approaching end of typical lifespan\n3. **Gutter cleaning** - Prevents water damage to foundation`
              });
            }}
            className="btn-secondary flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <FlaskConical className="h-5 w-5" />
            Load Sample
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Prediction
          </button>
        </div>
      </div>

      {predictions.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Wrench className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Maintenance Predictions Yet</h3>
          <p className="text-gray-500 mb-4">Get AI-powered maintenance schedules and cost predictions</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Create Prediction</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {predictions.map((item) => (
            <div
              key={item.id}
              onClick={() => setShowDetail(item)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Wrench className="h-6 w-6 text-blue-600" />
                </div>
                {item.priority_items > 0 && (
                  <span className="flex items-center gap-1 px-3 py-1 text-sm font-medium bg-orange-100 text-orange-700 rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    {item.priority_items} priority
                  </span>
                )}
              </div>

              <h3 className="font-semibold text-gray-800 mb-1">{item.floor_plan_name}</h3>

              <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                <Calendar className="h-4 w-4" />
                <span>Next: {formatDate(item.next_maintenance_date)}</span>
              </div>

              <div className="flex items-center gap-2 text-lg font-semibold text-blue-600 mb-3">
                <DollarSign className="h-5 w-5" />
                <span>{formatCurrency(item.total_annual_cost)}/year</span>
              </div>

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

      {/* New Prediction Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Create Maintenance Prediction">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Floor Plan *</label>
            <select
              value={formData.floor_plan_id}
              onChange={(e) => setFormData({ ...formData, floor_plan_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select a floor plan...</option>
              {floorPlans.map(fp => (
                <option key={fp.id} value={fp.id}>{fp.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Home Age (years)</label>
            <input
              type="number"
              min="0"
              max="100"
              value={formData.home_age}
              onChange={(e) => setFormData({ ...formData, home_age: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            />
            <p className="text-sm text-gray-500 mt-1">Approximate age of the property</p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAnalyze} disabled={analyzing || !formData.floor_plan_id} className="btn-primary flex items-center gap-2">
              {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              {analyzing ? 'Analyzing...' : 'Generate Prediction'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Maintenance Prediction" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <Wrench className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{showDetail.floor_plan_name}</h3>
                    <p className="text-sm text-blue-600">Annual Maintenance Plan</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(showDetail.total_annual_cost)}</p>
                  <p className="text-sm text-gray-500">per year</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <AlertTriangle className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                <p className="text-2xl font-bold">{showDetail.priority_items}</p>
                <p className="text-sm text-gray-500">Priority Items</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <Calendar className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                <p className="text-sm font-medium">{formatDate(showDetail.next_maintenance_date)}</p>
                <p className="text-sm text-gray-500">Next Due</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <DollarSign className="h-6 w-6 text-green-500 mx-auto mb-1" />
                <p className="text-lg font-bold">{formatCurrency(showDetail.total_annual_cost / 12)}</p>
                <p className="text-sm text-gray-500">Monthly</p>
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
        title="Delete Prediction"
        message="Are you sure you want to delete this maintenance prediction?"
      />
    </div>
  );
}
