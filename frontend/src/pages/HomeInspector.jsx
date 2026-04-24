import { useState, useEffect } from 'react';
import { getFloorPlans, inspectHome, getHomeInspections, deleteHomeInspection } from '../services/api';
import { ClipboardCheck, Trash2, Plus, Loader2, Eye, AlertTriangle, CheckCircle, DollarSign, Shield, FlaskConical } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../components/Toast';
import ReactMarkdown from 'react-markdown';

const inspectionTypes = [
  { value: 'general', label: 'General Inspection' },
  { value: 'pre-purchase', label: 'Pre-Purchase Inspection' },
  { value: 'pre-listing', label: 'Pre-Listing Inspection' },
  { value: 'new-construction', label: 'New Construction' },
  { value: 'historic', label: 'Historic Property' },
  { value: 'luxury', label: 'Luxury Property' },
  { value: 'commercial-to-residential', label: 'Commercial to Residential' },
  { value: 'green-certification', label: 'Green/Energy Certification' },
];

export default function HomeInspector() {
  const [inspections, setInspections] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showConfirm, setShowConfirm] = useState(null);
  const [formData, setFormData] = useState({
    floor_plan_id: '',
    inspection_type: 'general'
  });
  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [inspectionsRes, floorPlansRes] = await Promise.all([
        getHomeInspections(),
        getFloorPlans()
      ]);
      setInspections(inspectionsRes.data);
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
      const response = await inspectHome(formData);

      if (response.data.success) {
        toast.success('Home inspection completed!');
        setShowModal(false);
        setFormData({ floor_plan_id: '', inspection_type: 'general' });
        fetchData();
      } else {
        toast.error(response.data.error || 'Inspection failed');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to complete inspection');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteHomeInspection(showConfirm.id);
      setShowConfirm(null);
      fetchData();
      toast.success('Inspection deleted!');
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

  const getConditionColor = (condition) => {
    const colors = {
      'excellent': 'bg-green-100 text-green-700',
      'good': 'bg-blue-100 text-blue-700',
      'fair': 'bg-yellow-100 text-yellow-700',
      'poor': 'bg-red-100 text-red-700'
    };
    return colors[condition?.toLowerCase()] || 'bg-gray-100 text-gray-700';
  };

  const getConditionIcon = (condition) => {
    if (condition?.toLowerCase() === 'excellent' || condition?.toLowerCase() === 'good') {
      return <CheckCircle className="h-5 w-5" />;
    }
    return <AlertTriangle className="h-5 w-5" />;
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
          <h1 className="text-3xl font-bold text-gray-800">AI Home Inspection Reporter</h1>
          <p className="text-gray-500 mt-1">Generate comprehensive home inspection reports with AI</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setShowDetail({
                id: 'sample',
                floor_plan_name: 'Sample Family Home',
                inspection_type: 'general',
                overall_condition: 'Good',
                critical_issues: 1,
                estimated_repair_cost: 8500,
                model_used: 'Sample Data',
                created_at: new Date().toISOString(),
                full_result: `## Executive Summary\n\n**Overall Condition:** Good\n**Recommended Action:** Minor Repairs Needed\n\n### Key Findings\n- 1 critical issue\n- 3 major issues\n- 5 minor issues\n\n## Detailed Inspection Report\n\n### Structural Elements\n\n#### Foundation\n| Component | Condition | Notes |\n|-----------|-----------|-------|\n| Foundation walls | Good | Minor hairline cracks (cosmetic) |\n| Slab | Good | No signs of heaving or settlement |\n| Crawl space | Fair | Some moisture present, needs vapor barrier |\n\n#### Framing\n| Component | Condition | Notes |\n|-----------|-----------|-------|\n| Floor joists | Good | Solid, no sagging |\n| Wall framing | Good | Plumb and straight |\n| Roof trusses | Good | No signs of stress |\n\n### Exterior\n\n#### Roof\n- Type: Asphalt shingle\n- Estimated age: 12 years\n- Condition: Fair\n- Remaining lifespan: 8-13 years\n- Notes: Some curling on south-facing slope\n\n#### Siding & Trim\n| Component | Condition | Notes |\n|-----------|-----------|-------|\n| Vinyl siding | Good | Minor fading on south side |\n| Trim/fascia | Fair | Paint peeling in 2 areas |\n| Soffit | Good | Vents clear and functional |\n\n### Interior Systems\n\n#### Plumbing\n| Component | Condition | Notes |\n|-----------|-----------|-------|\n| Water heater | Fair | 10 years old - approaching end of life |\n| Supply lines | Good | Copper, no leaks |\n| Drain lines | Good | Flowing properly |\n| Water pressure | Good | 55 PSI (normal range) |\n\n#### Electrical\n| Component | Condition | Notes |\n|-----------|-----------|-------|\n| Panel | Good | 200 amp, properly labeled |\n| Wiring | Good | Copper throughout |\n| GFCI outlets | Fair | Kitchen outlets missing GFCI protection |\n| Smoke detectors | Poor | 2 of 5 non-functional - CRITICAL |\n\n#### HVAC\n| Component | Condition | Age | Notes |\n|-----------|-----------|-----|-------|\n| Furnace | Good | 8 years | Clean, well-maintained |\n| AC condenser | Good | 8 years | Operating normally |\n| Ductwork | Fair | Original | Some gaps at connections |\n| Thermostat | Good | 2 years | Programmable |\n\n## Issues Summary\n\n### Critical (Immediate Action Required)\n| # | Issue | Location | Est. Repair Cost |\n|---|-------|----------|------------------|\n| 1 | Non-functional smoke detectors | Hallway, Bedroom 2 | $50 |\n\n### Major (Address Within 6 Months)\n| # | Issue | Location | Est. Repair Cost |\n|---|-------|----------|------------------|\n| 1 | Missing GFCI protection | Kitchen outlets | $300 |\n| 2 | Water heater near end of life | Utility room | $1,800 |\n| 3 | Crawl space moisture | Below house | $2,500 |\n\n### Minor (Routine Maintenance)\n| # | Issue | Location | Est. Repair Cost |\n|---|-------|----------|------------------|\n| 1 | Peeling paint on trim | South exterior | $400 |\n| 2 | Curling roof shingles | South slope | $800 |\n| 3 | Duct gaps | Throughout | $350 |\n| 4 | Foundation hairline cracks | Basement wall | $200 |\n| 5 | Caulk deterioration | Windows | $100 |\n\n## Cost Summary\n| Priority | Count | Total Est. Cost |\n|----------|-------|-----------------|\n| Critical | 1 | $50 |\n| Major | 3 | $4,600 |\n| Minor | 5 | $1,850 |\n| **Total** | **9** | **$6,500** |\n\n## Recommendations\n1. **Immediately** replace non-functional smoke detectors\n2. **Within 30 days**: Install GFCI outlets in kitchen\n3. **Within 6 months**: Address crawl space moisture with vapor barrier\n4. **Within 1 year**: Plan for water heater replacement\n5. **Monitor**: Roof condition, plan replacement in 8-10 years`
              });
            }}
            className="btn-secondary flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
          >
            <FlaskConical className="h-5 w-5" />
            Load Sample
          </button>
          <button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="h-5 w-5" />
            New Inspection
          </button>
        </div>
      </div>

      {inspections.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <ClipboardCheck className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No Home Inspections Yet</h3>
          <p className="text-gray-500 mb-4">Generate AI-powered home inspection reports</p>
          <button onClick={() => setShowModal(true)} className="btn-primary">Start Inspection</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inspections.map((item) => (
            <div
              key={item.id}
              onClick={() => setShowDetail(item)}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer card-hover"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="h-6 w-6 text-indigo-600" />
                </div>
                <span className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${getConditionColor(item.overall_condition)}`}>
                  {getConditionIcon(item.overall_condition)}
                  {item.overall_condition}
                </span>
              </div>

              <h3 className="font-semibold text-gray-800 mb-1">{item.floor_plan_name}</h3>
              <p className="text-sm text-indigo-600 mb-3 capitalize">{item.inspection_type?.replace(/-/g, ' ')}</p>

              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div className="p-2 bg-gray-50 rounded flex items-center gap-2">
                  <AlertTriangle className={`h-4 w-4 ${item.critical_issues > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                  <span>{item.critical_issues || 0} critical</span>
                </div>
                <div className="p-2 bg-gray-50 rounded flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-orange-500" />
                  <span>{formatCurrency(item.estimated_repair_cost)}</span>
                </div>
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

      {/* New Inspection Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Home Inspection">
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Inspection Type</label>
            <select
              value={formData.inspection_type}
              onChange={(e) => setFormData({ ...formData, inspection_type: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              {inspectionTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAnalyze} disabled={analyzing || !formData.floor_plan_id} className="btn-primary flex items-center gap-2">
              {analyzing && <Loader2 className="h-4 w-4 animate-spin" />}
              {analyzing ? 'Inspecting...' : 'Run Inspection'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Home Inspection Report" size="lg">
        {showDetail && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                    <Shield className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{showDetail.floor_plan_name}</h3>
                    <p className="text-sm text-indigo-600 capitalize">{showDetail.inspection_type?.replace(/-/g, ' ')} Inspection</p>
                  </div>
                </div>
                <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${getConditionColor(showDetail.overall_condition)}`}>
                  {getConditionIcon(showDetail.overall_condition)}
                  <span className="font-semibold">{showDetail.overall_condition}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 bg-red-50 rounded-lg text-center">
                <AlertTriangle className={`h-6 w-6 mx-auto mb-1 ${showDetail.critical_issues > 0 ? 'text-red-500' : 'text-gray-400'}`} />
                <p className="text-2xl font-bold text-red-600">{showDetail.critical_issues || 0}</p>
                <p className="text-sm text-gray-500">Critical Issues</p>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg text-center">
                <DollarSign className="h-6 w-6 text-orange-500 mx-auto mb-1" />
                <p className="text-xl font-bold text-orange-600">{formatCurrency(showDetail.estimated_repair_cost)}</p>
                <p className="text-sm text-gray-500">Est. Repair Cost</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg text-center">
                <ClipboardCheck className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                <p className="text-sm font-medium">{new Date(showDetail.created_at).toLocaleDateString()}</p>
                <p className="text-sm text-gray-500">Inspection Date</p>
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
        title="Delete Inspection"
        message="Are you sure you want to delete this home inspection?"
      />
    </div>
  );
}
