import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getAISuggestions, deleteAISuggestion, analyzeFloorPlan, getFloorPlans } from '../services/api';
import { Lightbulb, Trash2, Eye, Upload, Loader2 } from 'lucide-react';
import Modal from '../components/Modal';
import ExportButton from '../components/ExportButton';
import { useToast } from '../components/Toast';
import AIResponseDisplay from '../components/AIResponseDisplay';

export default function AISuggestions() {
  const [suggestions, setSuggestions] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetail, setShowDetail] = useState(null);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState('');
  const [imageData, setImageData] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const toast = useToast();

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [res, fpRes] = await Promise.all([getAISuggestions(), getFloorPlans()]);
      setSuggestions(res.data);
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
      const response = await analyzeFloorPlan({ floor_plan_id: selectedFloorPlan || undefined, analysis_type: 'suggestions', image_data: imageData || selectedFp?.image_data });
      if (response.data.success) {
        setAiResult({ type: 'Renovation Suggestions', content: response.data.analysis, model: response.data.model, processingTime: response.data.processingTimeMs });
        toast.success('Suggestions generated!'); setImageData(''); setSelectedFloorPlan(''); fetchData();
      } else {
        setAiResult({ type: 'Error', content: response.data.error || 'Analysis failed', error: true });
        toast.error(response.data.error || 'Analysis failed');
      }
    } catch (error) {
      setAiResult({ type: 'Error', content: error.response?.data?.error || 'Analysis failed', error: true });
      toast.error('Analysis failed');
    } finally { setAnalyzing(false); }
  };

  const filteredSuggestions = suggestions.filter(s => s.floor_plan_name?.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleDelete = async (id) => {
    if (!confirm('Delete this analysis?')) return;
    try { await deleteAISuggestion(id); toast.success('Deleted'); fetchData(); } catch { toast.error('Failed to delete'); }
  };

  if (loading) return (<div className="flex items-center justify-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-600"></div></div>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">AI Suggestions</h1>
          <p className="text-gray-500 mt-1">AI-generated renovation suggestions</p>
        </div>
        <ExportButton data={filteredSuggestions} filename="ai-suggestions" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Choose Existing</label>
            <select value={selectedFloorPlan} onChange={(e) => { setSelectedFloorPlan(e.target.value); if (e.target.value) setImageData(''); }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500">
              <option value="">Select a floor plan</option>
              {floorPlans.map(fp => <option key={fp.id} value={fp.id}>{fp.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload Image</label>
            <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-colors ${isDragActive ? 'border-yellow-500 bg-yellow-50' : 'border-gray-300 hover:border-yellow-400'}`}>
              <input {...getInputProps()} />
              {imageData ? <span className="text-green-600 text-sm">Image uploaded</span> : <div className="flex items-center justify-center gap-2 text-gray-500"><Upload className="h-4 w-4" /><span className="text-sm">Drop image or click</span></div>}
            </div>
          </div>
          <button onClick={handleAnalyze} disabled={analyzing || (!selectedFloorPlan && !imageData)}
            className="py-3 bg-yellow-600 text-white font-medium rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
            {analyzing ? <><Loader2 className="h-4 w-4 animate-spin" />Analyzing...</> : <><Lightbulb className="h-4 w-4" />Get Suggestions</>}
          </button>
        </div>
      </div>

      {analyzing && (
        <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-yellow-400 opacity-25"></div>
              <Loader2 className="h-16 w-16 text-yellow-600 animate-spin relative" />
            </div>
            <p className="text-gray-600 font-medium">AI is generating renovation suggestions...</p>
            <p className="text-sm text-gray-400">This may take a moment</p>
          </div>
        </div>
      )}

      {aiResult && !analyzing && <AIResponseDisplay result={aiResult} />}

      <div className="relative">
        <input type="text" placeholder="Search by floor plan..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500" />
      </div>

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
              {filteredSuggestions.length === 0 ? (
                <tr><td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                  <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" /><p>No suggestions yet</p><p className="text-sm mt-1">Upload an image above and get AI suggestions</p>
                </td></tr>
              ) : filteredSuggestions.map((sug) => (
                <tr key={sug.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center"><Lightbulb className="h-5 w-5 text-yellow-600" /></div><span className="font-medium text-gray-800">{sug.floor_plan_name}</span></div></td>
                  <td className="px-6 py-4"><span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-700 rounded">{sug.model_used || 'AI'}</span></td>
                  <td className="px-6 py-4 text-gray-500 text-sm">{new Date(sug.created_at).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-right"><div className="flex items-center justify-end gap-2">
                    <button onClick={() => setShowDetail(sug)} className="p-2 text-gray-500 hover:text-yellow-600 hover:bg-yellow-50 rounded-lg"><Eye className="h-5 w-5" /></button>
                    <button onClick={() => handleDelete(sug.id)} className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="h-5 w-5" /></button>
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={!!showDetail} onClose={() => setShowDetail(null)} title="Renovation Suggestions" size="lg">
        {showDetail && <AIResponseDisplay result={{ type: 'Renovation Suggestions', content: showDetail.full_result || 'No data', model: showDetail.model_used }} />}
      </Modal>
    </div>
  );
}
