import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getFloorPlan, analyzeFloorPlan, optimizeLayout, estimateCosts } from '../services/api';
import {
  ArrowLeft, Brain, Loader2, Square, Lightbulb,
  Calculator, Maximize, RefreshCw
} from 'lucide-react';
import AIResponseDisplay from '../components/AIResponseDisplay';

export default function FloorPlanDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [floorPlan, setFloorPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisType, setAnalysisType] = useState('full');
  const [aiResult, setAiResult] = useState(null);

  useEffect(() => {
    fetchFloorPlan();
  }, [id]);

  const fetchFloorPlan = async () => {
    try {
      const response = await getFloorPlan(id);
      setFloorPlan(response.data);
    } catch (error) {
      console.error('Error fetching floor plan:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async (type) => {
    setAnalyzing(true);
    setAnalysisType(type);
    setAiResult(null);

    try {
      let response;
      if (type === 'optimize') {
        response = await optimizeLayout(id);
        setAiResult({
          type: 'Layout Optimization',
          content: response.data.optimization,
          model: response.data.model,
          processingTime: response.data.processingTimeMs
        });
      } else if (type === 'estimate') {
        response = await estimateCosts(id);
        setAiResult({
          type: 'Cost Estimate',
          content: response.data.estimate,
          model: response.data.model,
          processingTime: response.data.processingTimeMs
        });
      } else {
        response = await analyzeFloorPlan({
          floor_plan_id: id,
          analysis_type: type,
          image_data: floorPlan.image_data
        });
        setAiResult({
          type: type === 'full' ? 'Full Analysis' :
                type === 'dimensions' ? 'Dimension Extraction' :
                type === 'suggestions' ? 'Renovation Suggestions' :
                type === 'materials' ? 'Material Recommendations' : 'Analysis',
          content: response.data.analysis,
          model: response.data.model,
          processingTime: response.data.processingTimeMs
        });
      }
      fetchFloorPlan(); // Refresh to get updated status
    } catch (error) {
      console.error('Error analyzing floor plan:', error);
      setAiResult({
        type: 'Error',
        content: error.response?.data?.error || 'An error occurred during analysis',
        error: true
      });
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!floorPlan) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Floor plan not found</p>
        <button onClick={() => navigate('/floor-plans')} className="btn-primary mt-4">
          Back to Floor Plans
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/floor-plans')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-800">{floorPlan.name}</h1>
          <p className="text-gray-500">{floorPlan.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Floor Plan Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Image */}
          {floorPlan.image_data && (
            <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-200">
              <img
                src={floorPlan.image_data}
                alt={floorPlan.name}
                className="w-full rounded-lg"
              />
            </div>
          )}

          {/* AI Analysis Buttons */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis Options</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <button
                onClick={() => handleAnalyze('full')}
                disabled={analyzing}
                className="flex flex-col items-center gap-2 p-4 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Brain className="h-6 w-6 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">Full Analysis</span>
              </button>
              <button
                onClick={() => handleAnalyze('dimensions')}
                disabled={analyzing}
                className="flex flex-col items-center gap-2 p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Square className="h-6 w-6 text-green-600" />
                <span className="text-sm font-medium text-green-700">Dimensions</span>
              </button>
              <button
                onClick={() => handleAnalyze('suggestions')}
                disabled={analyzing}
                className="flex flex-col items-center gap-2 p-4 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Lightbulb className="h-6 w-6 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-700">Suggestions</span>
              </button>
              <button
                onClick={() => handleAnalyze('materials')}
                disabled={analyzing}
                className="flex flex-col items-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className="h-6 w-6 text-orange-600" />
                <span className="text-sm font-medium text-orange-700">Materials</span>
              </button>
              <button
                onClick={() => handleAnalyze('optimize')}
                disabled={analyzing}
                className="flex flex-col items-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Maximize className="h-6 w-6 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">Optimize</span>
              </button>
              <button
                onClick={() => handleAnalyze('estimate')}
                disabled={analyzing}
                className="flex flex-col items-center gap-2 p-4 bg-pink-50 hover:bg-pink-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <Calculator className="h-6 w-6 text-pink-600" />
                <span className="text-sm font-medium text-pink-700">Cost Estimate</span>
              </button>
            </div>
          </div>

          {/* AI Result */}
          {analyzing && (
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                <p className="text-gray-600 font-medium">Analyzing your floor plan...</p>
                <p className="text-sm text-gray-400">This may take a moment</p>
              </div>
            </div>
          )}

          {aiResult && !analyzing && (
            <AIResponseDisplay result={aiResult} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Details */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Details</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span
                  className={`inline-block mt-1 px-3 py-1 text-sm font-medium rounded-full ${
                    floorPlan.status === 'analyzed'
                      ? 'bg-green-100 text-green-700'
                      : floorPlan.status === 'in_progress'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {floorPlan.status}
                </span>
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Area</p>
                <p className="font-medium">{floorPlan.total_area || '-'} {floorPlan.unit}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">{new Date(floorPlan.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Rooms ({floorPlan.rooms?.length || 0})
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {floorPlan.rooms?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No rooms added</p>
              ) : (
                floorPlan.rooms?.map((room) => (
                  <div key={room.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-800">{room.name}</p>
                    <p className="text-sm text-gray-500">
                      {room.width} x {room.length} ft ({room.area} sqft)
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Suggestions ({floorPlan.suggestions?.length || 0})
            </h2>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {floorPlan.suggestions?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No suggestions yet</p>
              ) : (
                floorPlan.suggestions?.map((s) => (
                  <div key={s.id} className="p-3 bg-gray-50 rounded-lg">
                    <p className="font-medium text-gray-800">{s.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{s.category}</span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          s.priority === 'high'
                            ? 'bg-red-100 text-red-700'
                            : s.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {s.priority}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
