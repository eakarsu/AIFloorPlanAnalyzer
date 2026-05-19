import SpaceUtilizationHeatmap from '../components/SpaceUtilizationHeatmap';
import RoomAreaCostChart from '../components/RoomAreaCostChart';
import FloorPlanAnalysisPDF from '../components/FloorPlanAnalysisPDF';
import SpaceRulesEditor from '../components/SpaceRulesEditor';

export default function CustomViewsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Floor Views</h1>
        <p className="text-gray-600 mt-1">Custom floor-plan analysis views: heatmaps, cost charts, PDF reports, and space rules.</p>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <SpaceUtilizationHeatmap />
        <RoomAreaCostChart />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <FloorPlanAnalysisPDF />
        <SpaceRulesEditor />
      </div>
    </div>
  );
}
