import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getFullAnalyses, deleteFullAnalysis, analyzeFloorPlan, getFloorPlans } from '../services/api';
import { Brain, Sparkles, Eye, Trash2, Upload, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import ExportButton from '../components/ExportButton';
import AIResponseDisplay from '../components/AIResponseDisplay';
import { useToast } from '../components/Toast';

export default function FullAnalysis() {
  const [analyses, setAnalyses] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFloorPlan, setSelectedFloorPlan] = useState('');
  const [imageData, setImageData] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [res, fpRes] = await Promise.all([getFullAnalyses(), getFloorPlans()]);
      setAnalyses(res.data);
      setFloorPlans(fpRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () => {
          try {
            const MAX_DIM = 1500;
            let { width, height } = img;
            if (width > MAX_DIM || height > MAX_DIM) {
              const scale = MAX_DIM / Math.max(width, height);
              width = Math.round(width * scale);
              height = Math.round(height * scale);
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            canvas.getContext('2d').drawImage(img, 0, 0, width, height);
            setImageData(canvas.toDataURL('image/png'));
          } catch { setImageData(dataUrl); }
        };
        img.onerror = () => setImageData(dataUrl);
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] }, maxFiles: 1
  });

  const handleAnalyze = async () => {
    if (!selectedFloorPlan && !imageData) {
      toast.warning('Please select a floor plan or upload an image');
      return;
    }
    setAnalyzing(true);
    setAiResult(null);
    try {
      const selectedFp = floorPlans.find(fp => fp.id == selectedFloorPlan);
      const response = await analyzeFloorPlan({
        floor_plan_id: selectedFloorPlan || undefined,
        analysis_type: 'full',
        image_data: imageData || selectedFp?.image_data
      });
      if (response.data.success) {
        setAiResult({
          type: 'Full Analysis',
          content: response.data.analysis,
          model: response.data.model,
          processingTime: response.data.processingTimeMs
        });
        toast.success('Full analysis completed!');
        setImageData('');
        setSelectedFloorPlan('');
        fetchData();
      } else {
        setAiResult({ type: 'Error', content: response.data.error || 'Analysis failed', error: true });
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      setAiResult({ type: 'Error', content: error.response?.data?.error || 'Analysis failed', error: true });
      toast.error('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const filteredAnalyses = analyses.filter(a =>
    a.floor_plan_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this analysis?')) return;
    try {
      await deleteFullAnalysis(id);
      toast.success('Analysis deleted');
      fetchData();
    } catch { toast.error('Failed to delete'); }
  };

  if (loading) {
    return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Full Analysis</h1>
          <p className="text-gray-500 mt-1">Comprehensive AI-powered floor plan analyses</p>
        </div>
        <ExportButton data={filteredAnalyses} filename="full-analyses" />
      </div>

      {/* Upload & Analyze */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose Existing</label>
            <select value={selectedFloorPlan} onChange={(e) => { setSelectedFloorPlan(e.target.value); if (e.target.value) setImageData(''); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">Select a floor plan</option>
              {floorPlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload Image</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'}`}>
              <input {...getInputProps()} />
              {imageData ? (
                <div className="flex items-center justify-center gap-2"><span className="text-green-600 text-sm">Image uploaded</span></div>
              ) : (
                <div className="flex items-center justify-center gap-2 text-gray-500"><Upload className="h-4 w-4" /><span className="text-sm">Drop image or click</span></div>
              )}
            </div>
          </div>
          <button onClick={handleAnalyze} disabled={analyzing || (!selectedFloorPlan && !imageData)}
            className="py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</> : <><Brain className="h-4 w-4" />Run Full Analysis</>}
          </button>
        </div>
      </div>

      {/* AI Response Display */}
      {analyzing && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-25"></div>
              <Loader2 className="h-16 w-16 text-indigo-600 animate-spin relative" />
            </div>
            <p className="text-gray-600 font-medium">AI is performing full analysis...</p>
            <p className="text-sm text-gray-400">This may take a moment</p>
          </div>
        </div>
      )}

      {aiResult && !analyzing && <AIResponseDisplay result={aiResult} />}

      {/* Search */}
      <div className="relative">
        <input type="text" placeholder="Search analyses..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
      </div>

      {/* Analyses Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Floor Plan</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Model</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAnalyses.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No analyses yet</p>
                    <p className="text-sm mt-1">Upload an image above and run analysis</p>
                  </td>
                </tr>
              ) : (
                filteredAnalyses.map((analysis) => (
                  <tr key={analysis.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                          <Brain className="h-5 w-5 text-indigo-600" />
                        </div>
                        <span className="font-medium text-gray-800">{analysis.floor_plan_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">{analysis.model_used || 'AI'}</span>
                    </td>
                    <td className="px-6 py-4 text-gray-500 text-sm">{new Date(analysis.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => setShowDetail(analysis)} className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg" title="View"><Eye className="h-5 w-5" /></button>
                        <button onClick={() => handleDelete(analysis.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg" title="Delete"><Trash2 className="h-5 w-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Full Analysis Details" size="lg">
        {showDetail && (
          <AIResponseDisplay result={{ type: 'Full Analysis', content: showDetail.full_result || showDetail.layout_analysis || 'No data', model: showDetail.model_used }} />
        )}
      </Modal>
    </div>
  );
}
