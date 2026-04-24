import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getFloorPlans, getSuggestions } from '../services/api';
import {
  FileImage, Square, Lightbulb, Calculator, Brain,
  TrendingUp, ArrowRight, Package, Users, Palette,
  ScanSearch, Home, Sofa, Wrench, Zap, ClipboardCheck
} from 'lucide-react';

const dashboardCards = [
  {
    title: 'Floor Plans',
    icon: FileImage,
    color: 'bg-blue-500',
    path: '/floor-plans',
    statKey: 'floorPlans',
    description: 'Manage your floor plan uploads'
  },
  {
    title: 'Rooms',
    icon: Square,
    color: 'bg-green-500',
    path: '/rooms',
    statKey: 'rooms',
    description: 'View and edit room dimensions'
  },
  {
    title: 'Suggestions',
    icon: Lightbulb,
    color: 'bg-yellow-500',
    path: '/suggestions',
    statKey: 'suggestions',
    description: 'AI-powered renovation ideas'
  },
  {
    title: 'Estimates',
    icon: Calculator,
    color: 'bg-purple-500',
    path: '/estimates',
    statKey: 'totalEstimate',
    description: 'Project cost estimates',
    format: 'currency'
  },
  {
    title: 'AI Analyses',
    icon: Brain,
    color: 'bg-indigo-500',
    path: '/ai-analysis',
    statKey: 'aiAnalyses',
    description: 'View AI analysis history'
  },
  {
    title: 'Materials',
    icon: Package,
    color: 'bg-orange-500',
    path: '/materials',
    statKey: null,
    description: 'Browse material options'
  },
  {
    title: 'Templates',
    icon: Palette,
    color: 'bg-pink-500',
    path: '/templates',
    statKey: null,
    description: 'Design style templates'
  },
  {
    title: 'Contractors',
    icon: Users,
    color: 'bg-teal-500',
    path: '/contractors',
    statKey: null,
    description: 'Find local contractors'
  },
];

const aiFeatureCards = [
  {
    title: 'Room Detector',
    icon: ScanSearch,
    color: 'bg-purple-600',
    path: '/room-detector',
    description: 'AI-powered room detection from floor plans'
  },
  {
    title: 'Home Staging',
    icon: Home,
    color: 'bg-pink-600',
    path: '/home-staging',
    description: 'Get professional staging recommendations'
  },
  {
    title: 'Furniture Placer',
    icon: Sofa,
    color: 'bg-amber-600',
    path: '/furniture-placer',
    description: 'Optimize furniture layout and placement'
  },
  {
    title: 'Maintenance',
    icon: Wrench,
    color: 'bg-blue-600',
    path: '/maintenance-predictor',
    description: 'Predict home maintenance needs'
  },
  {
    title: 'Energy Auditor',
    icon: Zap,
    color: 'bg-green-600',
    path: '/energy-auditor',
    description: 'Analyze energy efficiency and savings'
  },
  {
    title: 'Home Inspector',
    icon: ClipboardCheck,
    color: 'bg-indigo-600',
    path: '/home-inspector',
    description: 'Generate inspection reports'
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState({});
  const [recentFloorPlans, setRecentFloorPlans] = useState([]);
  const [recentSuggestions, setRecentSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, floorPlansRes, suggestionsRes] = await Promise.all([
        getDashboardStats(),
        getFloorPlans(),
        getSuggestions()
      ]);
      setStats(statsRes.data);
      setRecentFloorPlans(floorPlansRes.data.slice(0, 5));
      setRecentSuggestions(suggestionsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatValue = (value, format) => {
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0
      }).format(value || 0);
    }
    return value || 0;
  };

  const handleCardClick = (path) => {
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome to AI Floor Plan Analyzer</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {dashboardCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.path}
              onClick={() => handleCardClick(card.path)}
              className="bg-white rounded-xl shadow-sm p-6 cursor-pointer card-hover border border-gray-100"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-800">{card.title}</h3>
              {card.statKey && (
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {formatValue(stats[card.statKey], card.format)}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-1">{card.description}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Floor Plans */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Floor Plans</h2>
            <button
              onClick={() => navigate('/floor-plans')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentFloorPlans.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No floor plans yet</p>
            ) : (
              recentFloorPlans.map((fp) => (
                <div
                  key={fp.id}
                  onClick={() => navigate(`/floor-plans/${fp.id}`)}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{fp.name}</p>
                    <p className="text-sm text-gray-500">{fp.total_area} sqft</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
                      fp.status === 'analyzed'
                        ? 'bg-green-100 text-green-700'
                        : fp.status === 'in_progress'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {fp.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Suggestions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">Recent Suggestions</h2>
            <button
              onClick={() => navigate('/suggestions')}
              className="text-indigo-600 hover:text-indigo-800 text-sm font-medium"
            >
              View all
            </button>
          </div>
          <div className="space-y-3">
            {recentSuggestions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No suggestions yet</p>
            ) : (
              recentSuggestions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => navigate('/suggestions')}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-medium text-gray-800">{s.title}</p>
                    <p className="text-sm text-gray-500">{s.category}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs rounded-full ${
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
              ))
            )}
          </div>
        </div>
      </div>

      {/* AI Real Estate Features */}
      <div>
        <h2 className="text-xl font-semibold text-gray-800 mb-4">AI Real Estate Features</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {aiFeatureCards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.path}
                onClick={() => handleCardClick(card.path)}
                className="bg-white rounded-xl shadow-sm p-4 cursor-pointer card-hover border border-gray-100"
              >
                <div className={`${card.color} p-3 rounded-lg w-fit mb-3`}>
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-gray-800 text-sm">{card.title}</h3>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <h2 className="text-xl font-semibold mb-2">Quick Actions</h2>
        <p className="text-indigo-100 mb-4">Get started with AI-powered floor plan analysis</p>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/floor-plans')}
            className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition-colors"
          >
            Upload Floor Plan
          </button>
          <button
            onClick={() => navigate('/ai-analysis')}
            className="px-4 py-2 bg-indigo-400 text-white rounded-lg font-medium hover:bg-indigo-300 transition-colors"
          >
            Run AI Analysis
          </button>
          <button
            onClick={() => navigate('/room-detector')}
            className="px-4 py-2 bg-indigo-400 text-white rounded-lg font-medium hover:bg-indigo-300 transition-colors"
          >
            Detect Rooms
          </button>
          <button
            onClick={() => navigate('/energy-auditor')}
            className="px-4 py-2 bg-indigo-400 text-white rounded-lg font-medium hover:bg-indigo-300 transition-colors"
          >
            Energy Audit
          </button>
        </div>
      </div>
    </div>
  );
}
