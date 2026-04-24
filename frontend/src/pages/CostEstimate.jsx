import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getEstimates, deleteEstimate, analyzeFloorPlan, getFloorPlans } from '../services/api';
import { Calculator, DollarSign, Eye, Trash2, Upload, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import ExportButton from '../components/ExportButton';
import { useToast } from '../components/Toast';
import AIResponseDisplay from '../components/AIResponseDisplay';

export default function CostEstimate() {
  const [estimates, setEstimates] = useState([]);
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
      const [res, fpRes] = await Promise.all([getEstimates(), getFloorPlans()]);
      setEstimates(res.data.filter(e => e.ai_generated));
      setFloorPlans(fpRes.data);
    } catch (error) { console.error('Error fetching data:', error); }
    finally { setLoading(false); }
  };

  const onDrop = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result;
        const img = new Image();
        img.onload = () => { try { const M=1500; let {width:w,height:h}=img; if(w>M||h>M){const s=M/Math.max(w,h);w=Math.round(w*s);h=Math.round(h*s);} const c=document.createElement('canvas');c.width=w;c.height=h;c.getContext('2d').drawImage(img,0,0,w,h);setImageData(c.toDataURL('image/png')); } catch{setImageData(dataUrl);} };
        img.onerror = () => setImageData(dataUrl);
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: { 'image/*': ['.png','.jpg','.jpeg','.gif','.webp'] }, maxFiles: 1 });

  const handleAnalyze = async () => {
    if (!selectedFloorPlan && !imageData) { toast.warning('Please select a floor plan or upload an image'); return; }
    setAnalyzing(true);
    setAiResult(null);
    try {
      const selectedFp = floorPlans.find(fp => fp.id == selectedFloorPlan);
      const response = await analyzeFloorPlan({ floor_plan_id: selectedFloorPlan || undefined, analysis_type: 'cost', image_data: imageData || selectedFp?.image_data });
      if (response.data.success) {
        setAiResult({ type: 'Cost Estimate', content: response.data.analysis, model: response.data.model, processingTime: response.data.processingTimeMs });
        toast.success('Cost estimate completed!'); setImageData(''); setSelectedFloorPlan(''); fetchData();
      } else {
        setAiResult({ type: 'Error', content: response.data.error || 'Analysis failed', error: true });
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      setAiResult({ type: 'Error', content: error.response?.data?.error || 'Analysis failed', error: true });
      toast.error('Analysis failed');
    } finally { setAnalyzing(false); }
  };

  const filteredEstimates = estimates.filter(e =>
    e.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.floor_plan_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const totalBudget = filteredEstimates.reduce((sum, e) => sum + (parseFloat(e.total_cost) || 0), 0);

  const handleDelete = async (id) => {
    if (!confirm('Delete this estimate?')) return;
    try { await deleteEstimate(id); toast.success('Deleted'); fetchData(); } catch { toast.error('Failed to delete'); }
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600"></div></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">AI Cost Estimates</h1>
          <p className="text-gray-500 mt-1">AI-generated renovation cost estimates</p>
        </div>
        <ExportButton data={filteredEstimates} filename="ai-cost-estimates" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose Existing</label>
            <select value={selectedFloorPlan} onChange={(e) => { setSelectedFloorPlan(e.target.value); if (e.target.value) setImageData(''); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500">
              <option value="">Select a floor plan</option>
              {floorPlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload Image</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${isDragActive ? 'border-pink-500 bg-pink-50' : 'border-gray-300 hover:border-pink-400'}`}>
              <input {...getInputProps()} />
              {imageData ? <span className="text-green-600 text-sm">Image uploaded</span> : <div className="flex items-center justify-center gap-2 text-gray-500"><Upload className="h-4 w-4" /><span className="text-sm">Drop image or click</span></div>}
            </div>
          </div>
          <button onClick={handleAnalyze} disabled={analyzing || (!selectedFloorPlan && !imageData)}
            className="py-3 bg-pink-600 text-white font-medium rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" />Estimating...</> : <><Calculator className="h-4 w-4" />Estimate Costs</>}
          </button>
        </div>
      </div>

      {analyzing && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-pink-400 opacity-25"></div>
              <Loader2 className="h-16 w-16 text-pink-600 animate-spin relative" />
            </div>
            <p className="text-gray-600 font-medium">AI is estimating costs...</p>
            <p className="text-sm text-gray-400">This may take a moment</p>
          </div>
        </div>
      )}

      {aiResult && !analyzing && <AIResponseDisplay result={aiResult} />}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center"><DollarSign className="h-6 w-6 text-green-600" /></div>
            <div><p className="text-sm text-gray-500">Total Estimated</p><p className="text-2xl font-bold text-gray-800">${totalBudget.toLocaleString()}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center"><Calculator className="h-6 w-6 text-blue-600" /></div>
            <div><p className="text-sm text-gray-500">Total Estimates</p><p className="text-2xl font-bold text-gray-800">{filteredEstimates.length}</p></div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-pink-100 rounded-lg flex items-center justify-center"><DollarSign className="h-6 w-6 text-pink-600" /></div>
            <div><p className="text-sm text-gray-500">Average Cost</p><p className="text-2xl font-bold text-gray-800">${filteredEstimates.length ? Math.round(totalBudget / filteredEstimates.length).toLocaleString() : 0}</p></div>
          </div>
        </div>
      </div>

      <div className="relative">
        <input type="text" placeholder="Search estimates..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Project</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Labor</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Materials</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Timeline</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredEstimates.length === 0 ? (
                <tr><td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                  <Calculator className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No cost estimates yet</p><p className="text-sm mt-1">Upload an image above and estimate costs</p>
                </td></tr>
              ) : filteredEstimates.map((est) => (
                <tr key={est.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center"><Calculator className="h-5 w-5 text-pink-600" /></div><div><p className="font-medium text-gray-800">{est.name}</p><p className="text-sm text-gray-500">{est.floor_plan_name}</p></div></div></td>
                  <td className="px-6 py-4 text-gray-600">${Number(est.labor_cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600">${Number(est.material_cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 font-semibold text-gray-800">${Number(est.total_cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-gray-600">{est.timeline_days ? `${est.timeline_days} days` : '-'}</td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{new Date(est.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">
                    <button onClick={() => setShowDetail(est)} className="p-2 text-gray-500 hover:text-pink-600 hover:bg-pink-50 rounded-lg"><Eye className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(est.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-5 w-5" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Estimate Details" size="lg">
        {showDetail && (
          <div className="space-y-6">
            <div><h3 className="text-xl font-semibold text-gray-800">{showDetail.name}</h3><p className="text-gray-500">{showDetail.floor_plan_name}</p></div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg"><p className="text-sm text-blue-600">Labor Cost</p><p className="text-xl font-bold text-blue-700">${Number(showDetail.labor_cost || 0).toLocaleString()}</p></div>
              <div className="p-4 bg-orange-50 rounded-lg"><p className="text-sm text-orange-600">Material Cost</p><p className="text-xl font-bold text-orange-700">${Number(showDetail.material_cost || 0).toLocaleString()}</p></div>
              <div className="p-4 bg-green-50 rounded-lg"><p className="text-sm text-green-600">Total Cost</p><p className="text-xl font-bold text-green-700">${Number(showDetail.total_cost || 0).toLocaleString()}</p></div>
              <div className="p-4 bg-purple-50 rounded-lg"><p className="text-sm text-purple-600">Timeline</p><p className="text-xl font-bold text-purple-700">{showDetail.timeline_days ? `${showDetail.timeline_days} days` : '-'}</p></div>
            </div>
            {showDetail.description && <AIResponseDisplay result={{ type: 'Cost Estimate', content: showDetail.description, model: 'AI Generated' }} />}
          </div>
        )}
      </Modal>
    </div>
  );
}
