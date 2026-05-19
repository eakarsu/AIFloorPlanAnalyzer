import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect, createContext, useContext } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FloorPlans from './pages/FloorPlans';
import FloorPlanDetail from './pages/FloorPlanDetail';
import Rooms from './pages/Rooms';
import Suggestions from './pages/Suggestions';
import Materials from './pages/Materials';
import Estimates from './pages/Estimates';
import Templates from './pages/Templates';
import Contractors from './pages/Contractors';
import AIAnalysis from './pages/AIAnalysis';
import FullAnalysis from './pages/FullAnalysis';
import Dimensions from './pages/Dimensions';
import AISuggestions from './pages/AISuggestions';
import AIMaterials from './pages/AIMaterials';
import OptimizeLayout from './pages/OptimizeLayout';
import CostEstimate from './pages/CostEstimate';
import Profile from './pages/Profile';
import RoomDetector from './pages/RoomDetector';
import HomeStaging from './pages/HomeStaging';
import FurniturePlacer from './pages/FurniturePlacer';
import MaintenancePredictor from './pages/MaintenancePredictor';
import EnergyAuditor from './pages/EnergyAuditor';
import HomeInspector from './pages/HomeInspector';
import AccessibilityChecker from './pages/AccessibilityChecker';
import SustainabilityAnalyzer from './pages/SustainabilityAnalyzer';
import ContractorBidComparison from './pages/ContractorBidComparison';
import AdvancedAITools from './pages/AdvancedAITools';
import Layout from './components/Layout';
import { ToastProvider } from './components/Toast';
import ErrorBoundary from './components/ErrorBoundary';

import Batch03Features from './pages/Batch03Features';
import CustomViewsPage from './pages/CustomViewsPage';

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
    <AuthContext.Provider value={{ user, login, logout }}>
      <ToastProvider>
        <Router>
          <Routes>
          <Route path="/batch03" element={<Batch03Features />} />
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route
              path="/"
              element={user ? <Layout><Dashboard /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/floor-plans"
              element={user ? <Layout><FloorPlans /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/floor-plans/:id"
              element={user ? <Layout><FloorPlanDetail /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/rooms"
              element={user ? <Layout><Rooms /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/suggestions"
              element={user ? <Layout><Suggestions /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/materials"
              element={user ? <Layout><Materials /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/estimates"
              element={user ? <Layout><Estimates /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/templates"
              element={user ? <Layout><Templates /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/contractors"
              element={user ? <Layout><Contractors /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/ai-analysis"
              element={user ? <Layout><AIAnalysis /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/full-analysis"
              element={user ? <Layout><FullAnalysis /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/dimensions"
              element={user ? <Layout><Dimensions /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/ai-suggestions"
              element={user ? <Layout><AISuggestions /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/ai-materials"
              element={user ? <Layout><AIMaterials /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/optimize-layout"
              element={user ? <Layout><OptimizeLayout /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/cost-estimate"
              element={user ? <Layout><CostEstimate /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/profile"
              element={user ? <Layout><Profile /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/room-detector"
              element={user ? <Layout><RoomDetector /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/home-staging"
              element={user ? <Layout><HomeStaging /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/furniture-placer"
              element={user ? <Layout><FurniturePlacer /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/maintenance-predictor"
              element={user ? <Layout><MaintenancePredictor /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/energy-auditor"
              element={user ? <Layout><EnergyAuditor /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/home-inspector"
              element={user ? <Layout><HomeInspector /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/accessibility-checker"
              element={user ? <Layout><AccessibilityChecker /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/sustainability-analyzer"
              element={user ? <Layout><SustainabilityAnalyzer /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/contractor-bid-comparison"
              element={user ? <Layout><ContractorBidComparison /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/advanced-ai-tools"
              element={user ? <Layout><AdvancedAITools /></Layout> : <Navigate to="/login" />}
            />
            <Route
              path="/custom-views"
              element={user ? <Layout><CustomViewsPage /></Layout> : <Navigate to="/login" />}
            />
          </Routes>
        </Router>
      </ToastProvider>
    </AuthContext.Provider>
    </ErrorBoundary>
  );
}

export default App;
