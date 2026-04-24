import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { getFloorPlans, getAIHistory, analyzeFloorPlan, optimizeLayout, estimateCosts } from '../services/api';
import {
  Brain, Upload, Loader2, History, FileImage, Clock,
  Cpu, Sparkles, BarChart3, Maximize, Calculator, FlaskConical
} from 'lucide-react';
import AIResponseDisplay from '../components/AIResponseDisplay';
import { useToast } from '../components/Toast';

const sampleResults = {
  full: `## Room Identification

| Room | Type | Approx. Dimensions | Features |
|------|------|-------------------|----------|
| Living Room | living | 18ft x 22ft (396 sq ft) | 3 windows, fireplace |
| Kitchen | kitchen | 14ft x 16ft (224 sq ft) | Island, pantry |
| Master Bedroom | bedroom | 16ft x 18ft (288 sq ft) | Walk-in closet, en-suite |
| Bedroom 2 | bedroom | 12ft x 14ft (168 sq ft) | 2 windows |
| Bathroom | bathroom | 8ft x 10ft (80 sq ft) | Tub/shower combo |
| Dining Room | dining | 12ft x 14ft (168 sq ft) | Adjacent to kitchen |

## Layout Analysis

The floor plan features a semi-open concept design with excellent traffic flow between the main living areas. The kitchen connects directly to both the dining room and living room, creating a natural entertaining space. Bedrooms are positioned in a separate wing for privacy, with the master suite at the far end.

**Traffic Flow**: Primary circulation follows an L-shaped path from the entry through the living room to the kitchen/dining area. Secondary paths branch to the bedroom wing and bathroom.

## Space Utilization

**Efficiency Rating: 8/10**

The space is well-utilized with minimal wasted area. The open kitchen-dining connection maximizes the functional space. The hallway to the bedrooms is efficiently sized at 42 inches wide. Storage is adequate with the walk-in closet and pantry.

## Natural Light Assessment

Window placement is excellent on the south and east-facing walls, providing morning light to the kitchen and afternoon light to the living room. The master bedroom benefits from dual-aspect windows. Consider adding a skylight in the hallway to brighten the transition zone.

## Renovation Potential

- **Kitchen Island Upgrade**: Adding a waterfall countertop would modernize the space - High impact
- **Master Bath Addition**: Converting part of the walk-in closet to expand the en-suite - Medium impact
- **Open Up Dining Wall**: Removing the partial wall between dining and living would create a more spacious feel - High impact
- **Smart Home Integration**: Pre-wiring for smart lighting and automated blinds - Medium impact
- **Flooring Continuity**: Replacing mixed flooring with continuous hardwood throughout - High impact`,
  dimensions: `## Room Dimensions

| Room | Type | Width (ft) | Length (ft) | Area (sq ft) | Features |
|------|------|------------|-------------|--------------|----------|
| Living Room | living | 18.0 | 22.0 | 396 | 3 windows, fireplace |
| Kitchen | kitchen | 14.0 | 16.0 | 224 | Island, pantry |
| Master Bedroom | bedroom | 16.0 | 18.0 | 288 | Walk-in closet |
| Bedroom 2 | bedroom | 12.0 | 14.0 | 168 | 2 windows |
| Bathroom | bathroom | 8.0 | 10.0 | 80 | Tub/shower combo |
| Dining Room | dining | 12.0 | 14.0 | 168 | Adjacent to kitchen |
| Hallway | hallway | 3.5 | 18.0 | 63 | Connects bedrooms |
| Entry | foyer | 6.0 | 8.0 | 48 | Coat closet |

**Total Living Area: 1,435 sq ft**

The floor plan is well-proportioned with generous room sizes. The living room is the largest space, suitable for a family gathering area. The master bedroom provides ample space for a king bed and seating area.`,
  suggestions: `## High Priority Recommendations

### 1. Open-Concept Kitchen Renovation
- **Description**: Remove the wall between kitchen and dining to create a flowing open-concept layout with a breakfast bar
- **Category**: Kitchen
- **Estimated Cost**: $8,000 - $15,000
- **Difficulty**: Moderate
- **Timeline**: 3-4 weeks

### 2. Master Bathroom Expansion
- **Description**: Expand the en-suite bathroom by reconfiguring the walk-in closet, adding a walk-in shower and double vanity
- **Category**: Bathroom
- **Estimated Cost**: $12,000 - $20,000
- **Difficulty**: Complex
- **Timeline**: 4-6 weeks

### 3. Smart Lighting System
- **Description**: Install dimmable LED recessed lighting throughout with smart switches and automated scenes
- **Category**: Lighting
- **Estimated Cost**: $2,500 - $5,000
- **Difficulty**: Easy
- **Timeline**: 1-2 weeks

### 4. Built-in Storage Solutions
- **Description**: Add custom built-in shelving in the living room and mudroom storage bench near the entry
- **Category**: Storage
- **Estimated Cost**: $3,000 - $6,000
- **Difficulty**: Moderate
- **Timeline**: 2-3 weeks

### 5. Window Replacement
- **Description**: Replace all single-pane windows with energy-efficient double-pane Low-E windows
- **Category**: Windows
- **Estimated Cost**: $6,000 - $12,000
- **Difficulty**: Moderate
- **Timeline**: 2-3 weeks

## Quick Wins (Low Cost, High Impact)
- Fresh paint in neutral tones ($500-800)
- Modern cabinet hardware ($200-400)
- New light fixtures in entry and hallway ($300-600)
- Weatherstripping on all exterior doors ($100-200)

## Budget Summary
| Priority | Suggestion | Cost Range |
|----------|------------|------------|
| High | Kitchen Renovation | $8,000 - $15,000 |
| High | Bathroom Expansion | $12,000 - $20,000 |
| Medium | Smart Lighting | $2,500 - $5,000 |
| Medium | Built-in Storage | $3,000 - $6,000 |
| Medium | Window Replacement | $6,000 - $12,000 |`,
  materials: `## Flooring Recommendations

| Room Type | Material | Brand/Style | Price/sq ft | Durability |
|-----------|----------|-------------|-------------|------------|
| Living Room | Engineered Hardwood | Shaw Repel Oak | $6-9 | Excellent |
| Kitchen | Luxury Vinyl Plank | COREtec Plus | $4-7 | Excellent |
| Bedrooms | Carpet | Mohawk SmartStrand | $3-5 | Good |
| Bathroom | Porcelain Tile | Daltile Emerson | $5-8 | Excellent |

## Countertops & Surfaces
- **Kitchen**: Quartz (Caesarstone or Cambria) - $65-85/sq ft - Durable, low maintenance
- **Bathroom**: Marble-look porcelain - $15-25/sq ft - Water resistant, elegant look

## Cabinets & Storage
- **Style**: Shaker-style in white or soft gray
- **Material**: Maple with soft-close hinges
- **Price Range**: $150-350 per linear foot installed

## Paint & Wall Treatments
- **Living Areas**: Benjamin Moore "Simply White" OC-117 (#F4F0E4) with "Revere Pewter" HC-172 (#C2B9A7) accent walls
- **Bedrooms**: Sherwin-Williams "Agreeable Gray" SW 7029 (#D1CBC1)
- **Kitchen/Bath**: Benjamin Moore Aura Bath & Spa "Silver Satin" OC-26

## Fixtures & Hardware
- **Lighting**: Kichler Barrington collection (brushed nickel) - $150-400/fixture
- **Cabinet Hardware**: Amerock Candler pulls (satin nickel) - $5-8/piece
- **Plumbing**: Delta Trinsic collection (matte black) - $200-500/fixture

## Budget Summary
| Category | Budget Option | Mid-Range | Premium |
|----------|--------------|-----------|---------|
| Flooring | $3/sqft | $6/sqft | $12/sqft |
| Countertops | $30/sqft | $65/sqft | $120/sqft |
| Cabinets | $150/lf | $250/lf | $500/lf |
| Paint | $30/gallon | $55/gallon | $80/gallon |`,
  optimize: `## Traffic Flow Analysis

The current layout provides **good circulation** between main living spaces. The primary pathway from the front entry flows naturally through the living room to the kitchen and dining area.

**Main Circulation Paths:**
- Entry to Living Room: Clear 48" pathway - Excellent
- Living to Kitchen: 36" opening - Adequate, consider widening
- Hallway to Bedrooms: 42" wide - Good

**Bottlenecks:**
- Kitchen to Dining transition is slightly narrow at 32"
- Bathroom door opens into hallway traffic path

## Space Efficiency Score

| Metric | Score (1-10) | Notes |
|--------|--------------|-------|
| Overall Efficiency | 8 | Well-planned layout |
| Room Proportions | 7 | Kitchen could be larger |
| Storage Adequacy | 6 | Needs more closet space |
| Functional Zones | 8 | Good separation of public/private |

**Overall Score: 7.5/10**

## Natural Light Optimization
- South-facing living room receives excellent afternoon light
- Kitchen benefits from east-facing window for morning light
- Hallway is the darkest area - consider adding a skylight or solar tube
- Master bedroom has dual-aspect windows for cross-ventilation

## Privacy Considerations

| Zone | Privacy Level | Adjacent To | Recommendations |
|------|--------------|-------------|-----------------|
| Bedrooms | High | Hallway buffer | Good sound isolation |
| Bathrooms | High | Between bedrooms | Consider pocket door |
| Kitchen | Low | Open to dining | Appropriate for social space |

## Layout Modification Options

### Option 1: Minor Adjustments
- Reverse bathroom door swing to open inward
- Add pocket door between kitchen and hallway
- Impact: Improved traffic flow, minimal cost

### Option 2: Moderate Renovation
- Widen kitchen-dining opening to 6 feet
- Add a butler's pantry between kitchen and dining
- Impact: Better entertaining flow, $5,000-10,000

### Option 3: Major Transformation
- Remove dining room wall for full open concept
- Create kitchen island with seating
- Add sliding barn door to master suite
- Impact: Complete modernization, $15,000-25,000`,
  estimate: `## Cost Summary

| Category | Amount |
|----------|--------|
| Labor | $52,000 |
| Materials | $78,000 |
| Permits & Fees | $4,500 |
| Design & Planning | $6,000 |
| Contingency (15%) | $21,075 |
| **Total** | **$161,575** |

## Labor Cost Breakdown

| Trade | Estimated Cost | Days |
|-------|---------------|------|
| General Contractor | $15,000 | 45 |
| Plumbing | $8,000 | 8 |
| Electrical | $7,000 | 6 |
| Carpentry/Framing | $10,000 | 12 |
| Painting | $4,500 | 5 |
| Flooring Installation | $5,000 | 4 |
| Tile Work | $2,500 | 3 |

## Material Cost Breakdown

| Category | Cost | Notes |
|----------|------|-------|
| Flooring | $12,000 | Hardwood & tile for 1,400 sq ft |
| Cabinets | $18,000 | Kitchen & bathroom |
| Countertops | $8,500 | Quartz throughout |
| Fixtures | $6,000 | Kitchen, bath, lighting |
| Appliances | $12,000 | Full kitchen suite |
| Windows | $10,000 | Energy-efficient upgrade |
| Paint & Finishes | $3,500 | Interior walls and trim |
| Hardware | $2,000 | Doors, cabinet pulls |
| Miscellaneous | $6,000 | Drywall, lumber, supplies |

## Timeline
- **Total Duration**: 45 days
- **Phase 1**: Demo & Prep (5 days) - Remove existing fixtures, protect surfaces
- **Phase 2**: Rough Work (15 days) - Framing, plumbing, electrical
- **Phase 3**: Installation (15 days) - Cabinets, flooring, tile
- **Phase 4**: Finishing (10 days) - Paint, fixtures, final touches

## Cost-Saving Tips
1. **Bundle window orders** - Ordering all windows at once saves 10-15% vs individual purchases
2. **Off-season scheduling** - Book contractors in winter months for potential 5-10% discount
3. **DIY painting** - Save $4,500 in labor by painting rooms yourself
4. **Remnant countertops** - Check for quartz remnants at local fabricators for 30-50% savings`
};

const analysisTypes = [
  { id: 'full', name: 'Full Analysis', icon: Brain, description: 'Comprehensive floor plan analysis', color: 'indigo' },
  { id: 'dimensions', name: 'Dimensions', icon: BarChart3, description: 'Extract room dimensions', color: 'green' },
  { id: 'suggestions', name: 'Suggestions', icon: Sparkles, description: 'Renovation recommendations', color: 'yellow' },
  { id: 'materials', name: 'Materials', icon: FileImage, description: 'Material recommendations', color: 'orange' },
  { id: 'optimize', name: 'Optimize Layout', icon: Maximize, description: 'Space optimization analysis', color: 'purple' },
  { id: 'estimate', name: 'Cost Estimate', icon: Calculator, description: 'Project cost estimation', color: 'pink' },
];

export default function AIAnalysis() {
  const [floorPlans, setFloorPlans] = useState([]);
  const [history, setHistory] = useState([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState('');
  const [selectedType, setSelectedType] = useState('full');
  const [imageData, setImageData] = useState('');
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const toast = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [floorPlansRes, historyRes] = await Promise.all([
        getFloorPlans(),
        getAIHistory()
      ]);
      setFloorPlans(floorPlansRes.data);
      setHistory(historyRes.data);
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
        // Try to resize via canvas for AI vision API compatibility
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
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            setImageData(canvas.toDataURL('image/png'));
          } catch {
            setImageData(dataUrl);
          }
        };
        img.onerror = () => {
          // Browser can't decode this format - use original and let server handle conversion
          setImageData(dataUrl);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif'] },
    maxFiles: 1
  });

  const handleAnalyze = async () => {
    if (!selectedFloorPlan && !imageData) {
      toast.warning('Please select a floor plan or upload an image');
      return;
    }

    setAnalyzing(true);
    setAiResult(null);

    try {
      let response;
      const typeInfo = analysisTypes.find(t => t.id === selectedType);

      if (selectedType === 'optimize' && selectedFloorPlan) {
        response = await optimizeLayout(selectedFloorPlan);
        setAiResult({
          type: typeInfo.name,
          content: response.data.optimization,
          model: response.data.model,
          processingTime: response.data.processingTimeMs
        });
        toast.success('Layout optimization completed!');
      } else if (selectedType === 'estimate' && selectedFloorPlan) {
        response = await estimateCosts(selectedFloorPlan);
        setAiResult({
          type: typeInfo.name,
          content: response.data.estimate,
          model: response.data.model,
          processingTime: response.data.processingTimeMs
        });
        toast.success('Cost estimation completed!');
      } else {
        const selectedFp = floorPlans.find(fp => fp.id == selectedFloorPlan);
        response = await analyzeFloorPlan({
          floor_plan_id: selectedFloorPlan || undefined,
          analysis_type: selectedType,
          image_data: imageData || selectedFp?.image_data
        });

        if (response.data.success) {
          setAiResult({
            type: typeInfo.name,
            content: response.data.analysis,
            model: response.data.model,
            processingTime: response.data.processingTimeMs
          });
          toast.success('Analysis completed successfully!');
        } else {
          setAiResult({
            type: 'Error',
            content: response.data.error || 'Analysis failed',
            error: true
          });
          toast.error(response.data.error || 'Analysis failed');
        }
      }

      // Refresh history
      const historyRes = await getAIHistory();
      setHistory(historyRes.data);
    } catch (error) {
      setAiResult({
        type: 'Error',
        content: error.response?.data?.error || 'An error occurred during analysis',
        error: true
      });
      toast.error(error.response?.data?.error || 'An error occurred during analysis');
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">AI Analysis</h1>
        <p className="text-gray-500 mt-1">Analyze floor plans using AI-powered insights</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Panel */}
        <div className="lg:col-span-2 space-y-6">
          {/* Floor Plan Selection or Upload */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Select or Upload Floor Plan</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Choose Existing</label>
                <select
                  value={selectedFloorPlan}
                  onChange={(e) => {
                    setSelectedFloorPlan(e.target.value);
                    if (e.target.value) setImageData('');
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a floor plan</option>
                  {floorPlans.map(fp => (
                    <option key={fp.id} value={fp.id}>{fp.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Or Upload New</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  {imageData ? (
                    <div className="flex items-center justify-center gap-2">
                      <FileImage className="h-5 w-5 text-green-500" />
                      <span className="text-green-600">Image uploaded</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <Upload className="h-5 w-5" />
                      <span>Drop image or click</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {imageData && (
              <div className="mt-4">
                <img src={imageData} alt="Uploaded" className="max-h-48 mx-auto rounded-lg" />
              </div>
            )}
          </div>

          {/* Analysis Type Selection */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Analysis Type</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {analysisTypes.map((type) => {
                const Icon = type.icon;
                const isSelected = selectedType === type.id;
                const colorClasses = {
                  indigo: isSelected ? 'bg-indigo-100 border-indigo-500 text-indigo-700' : 'bg-white hover:bg-indigo-50',
                  green: isSelected ? 'bg-green-100 border-green-500 text-green-700' : 'bg-white hover:bg-green-50',
                  yellow: isSelected ? 'bg-yellow-100 border-yellow-500 text-yellow-700' : 'bg-white hover:bg-yellow-50',
                  orange: isSelected ? 'bg-orange-100 border-orange-500 text-orange-700' : 'bg-white hover:bg-orange-50',
                  purple: isSelected ? 'bg-purple-100 border-purple-500 text-purple-700' : 'bg-white hover:bg-purple-50',
                  pink: isSelected ? 'bg-pink-100 border-pink-500 text-pink-700' : 'bg-white hover:bg-pink-50',
                };
                return (
                  <button
                    key={type.id}
                    onClick={() => setSelectedType(type.id)}
                    className={`p-4 rounded-lg border-2 transition-all ${colorClasses[type.color]} ${
                      isSelected ? '' : 'border-gray-200'
                    }`}
                  >
                    <Icon className={`h-6 w-6 mx-auto mb-2 ${isSelected ? '' : 'text-gray-400'}`} />
                    <p className={`text-sm font-medium ${isSelected ? '' : 'text-gray-700'}`}>{type.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Analyze Button */}
          <div className="flex gap-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || (!selectedFloorPlan && !imageData)}
            className="flex-1 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {analyzing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Brain className="h-5 w-5" />
                Run AI Analysis
              </>
            )}
          </button>
          <button
            onClick={() => {
              // Generate a sample floor plan as PNG (SVG is not supported by vision AI models)
              const canvas = document.createElement('canvas');
              canvas.width = 800;
              canvas.height = 600;
              const ctx = canvas.getContext('2d');

              // Background
              ctx.fillStyle = '#f8f9fa';
              ctx.fillRect(0, 0, 800, 600);
              ctx.strokeStyle = '#333';
              ctx.lineWidth = 4;
              ctx.strokeRect(0, 0, 800, 600);

              // Title
              ctx.fillStyle = '#333';
              ctx.font = 'bold 18px Arial';
              ctx.textAlign = 'center';
              ctx.fillText('Sample Floor Plan - 3 Bedroom House', 400, 30);

              const drawRoom = (x, y, w, h, color, name, size) => {
                ctx.fillStyle = color;
                ctx.fillRect(x, y, w, h);
                ctx.strokeStyle = '#333';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, w, h);
                ctx.fillStyle = '#333';
                ctx.font = '16px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(name, x + w/2, y + h/2);
                ctx.font = '12px Arial';
                ctx.fillStyle = '#666';
                ctx.fillText(size, x + w/2, y + h/2 + 20);
              };

              drawRoom(20, 50, 350, 250, '#e8f4fd', 'Living Room', '18ft x 22ft');
              drawRoom(370, 50, 200, 180, '#fff3e0', 'Kitchen', '14ft x 16ft');
              drawRoom(570, 50, 210, 180, '#fce4ec', 'Dining Room', '12ft x 14ft');
              drawRoom(20, 320, 280, 260, '#e8eaf6', 'Master Bedroom', '16ft x 18ft');
              drawRoom(320, 320, 220, 260, '#e0f2f1', 'Bedroom 2', '12ft x 14ft');
              drawRoom(560, 320, 220, 130, '#f3e5f5', 'Bathroom', '8ft x 10ft');
              drawRoom(370, 230, 410, 90, '#f5f5f5', 'Hallway', '');
              drawRoom(560, 450, 220, 130, '#e0f2f1', 'Bedroom 3', '10ft x 12ft');

              // Door indicators (brown)
              ctx.fillStyle = '#8B4513';
              [[170,295,40,8],[400,295,40,8],[640,295,40,8],[640,445,40,8]].forEach(([dx,dy,dw,dh]) => ctx.fillRect(dx,dy,dw,dh));

              // Window indicators (blue)
              ctx.fillStyle = '#4FC3F7';
              [[60,46,60,8],[250,46,60,8],[60,576,60,8],[350,576,60,8]].forEach(([wx,wy,ww,wh]) => ctx.fillRect(wx,wy,ww,wh));

              const pngDataUrl = canvas.toDataURL('image/png');
              setImageData(pngDataUrl);
              toast.info('Sample floor plan loaded - click Run AI Analysis to analyze');
            }}
            className="py-4 px-6 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all flex items-center justify-center gap-2"
          >
            <FlaskConical className="h-5 w-5" />
            Load Sample
          </button>
          </div>

          {/* AI Result */}
          {analyzing && (
            <div className="bg-white rounded-xl shadow-sm p-8 border border-gray-200">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="relative">
                  <div className="absolute inset-0 animate-ping rounded-full bg-indigo-400 opacity-25"></div>
                  <Loader2 className="h-16 w-16 text-indigo-600 animate-spin relative" />
                </div>
                <p className="text-gray-600 font-medium">AI is analyzing your floor plan...</p>
                <p className="text-sm text-gray-400">This may take a moment</p>
              </div>
            </div>
          )}

          {aiResult && !analyzing && <AIResponseDisplay result={aiResult} />}
        </div>

        {/* History Panel */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-800">Recent Analyses</h2>
            </div>
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center py-8">No analysis history yet</p>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{item.floor_plan_name}</p>
                        <p className="text-sm text-gray-500 capitalize">{item.analysis_type} Analysis</p>
                      </div>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${
                          item.analysis_type === 'full'
                            ? 'bg-indigo-100 text-indigo-700'
                            : item.analysis_type === 'dimensions'
                            ? 'bg-green-100 text-green-700'
                            : item.analysis_type === 'suggestions'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {item.analysis_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      {item.processing_time_ms && (
                        <span className="flex items-center gap-1">
                          <Cpu className="h-3 w-3" />
                          {(item.processing_time_ms / 1000).toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
            <h3 className="font-semibold text-gray-800 mb-3">Analysis Tips</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                Upload high-resolution floor plans for better results
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                Use "Full Analysis" for comprehensive insights
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                "Optimize Layout" works best with existing floor plans
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-500">•</span>
                Cost estimates require floor plan room data
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
