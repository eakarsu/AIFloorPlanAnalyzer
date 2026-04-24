import axios from 'axios';

const API_URL = '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const register = (email, password, name) => api.post('/auth/register', { email, password, name });
export const getMe = () => api.get('/auth/me');
export const updateProfile = (data) => api.put('/auth/profile', data);
export const changePassword = (currentPassword, newPassword) =>
  api.put('/auth/password', { currentPassword, newPassword });
export const logout = () => api.post('/auth/logout');
export const requestPasswordReset = (email) => api.post('/auth/password-reset/request', { email });
export const confirmPasswordReset = (token, newPassword) => api.post('/auth/password-reset/confirm', { token, newPassword });
export const verifyEmail = (token) => api.post('/auth/verify-email', { token });
export const resendVerification = () => api.post('/auth/resend-verification');

// Floor Plans
export const getFloorPlans = (params) => api.get('/floor-plans', { params });
export const getFloorPlan = (id) => api.get(`/floor-plans/${id}`);
export const createFloorPlan = (data) => api.post('/floor-plans', data);
export const updateFloorPlan = (id, data) => api.put(`/floor-plans/${id}`, data);
export const deleteFloorPlan = (id) => api.delete(`/floor-plans/${id}`);

// Rooms
export const getRooms = (params) => api.get('/rooms', { params });
export const getRoom = (id) => api.get(`/rooms/${id}`);
export const createRoom = (data) => api.post('/rooms', data);
export const updateRoom = (id, data) => api.put(`/rooms/${id}`, data);
export const deleteRoom = (id) => api.delete(`/rooms/${id}`);

// Suggestions
export const getSuggestions = (params) => api.get('/suggestions', { params });
export const getSuggestion = (id) => api.get(`/suggestions/${id}`);
export const createSuggestion = (data) => api.post('/suggestions', data);
export const updateSuggestion = (id, data) => api.put(`/suggestions/${id}`, data);
export const deleteSuggestion = (id) => api.delete(`/suggestions/${id}`);

// Materials
export const getMaterials = (params) => api.get('/materials', { params });
export const getMaterial = (id) => api.get(`/materials/${id}`);
export const createMaterial = (data) => api.post('/materials', data);
export const updateMaterial = (id, data) => api.put(`/materials/${id}`, data);
export const deleteMaterial = (id) => api.delete(`/materials/${id}`);

// Estimates
export const getEstimates = (params) => api.get('/estimates', { params });
export const getEstimate = (id) => api.get(`/estimates/${id}`);
export const createEstimate = (data) => api.post('/estimates', data);
export const updateEstimate = (id, data) => api.put(`/estimates/${id}`, data);
export const deleteEstimate = (id) => api.delete(`/estimates/${id}`);

// Templates
export const getTemplates = (params) => api.get('/templates', { params });
export const getTemplate = (id) => api.get(`/templates/${id}`);
export const createTemplate = (data) => api.post('/templates', data);
export const updateTemplate = (id, data) => api.put(`/templates/${id}`, data);
export const deleteTemplate = (id) => api.delete(`/templates/${id}`);

// Contractors
export const getContractors = (params) => api.get('/contractors', { params });
export const getContractor = (id) => api.get(`/contractors/${id}`);
export const createContractor = (data) => api.post('/contractors', data);
export const updateContractor = (id, data) => api.put(`/contractors/${id}`, data);
export const deleteContractor = (id) => api.delete(`/contractors/${id}`);

// AI Analysis
export const analyzeFloorPlan = (data) => api.post('/ai/analyze', data);
export const generateSuggestions = (roomId) => api.post('/ai/suggestions', { room_id: roomId });
export const estimateCosts = (floorPlanId) => api.post('/ai/estimate', { floor_plan_id: floorPlanId });
export const recommendMaterials = (roomId, style) => api.post('/ai/materials', { room_id: roomId, style });
export const optimizeLayout = (floorPlanId) => api.post('/ai/optimize', { floor_plan_id: floorPlanId });
export const getAIHistory = (floorPlanId) => api.get('/ai/history', { params: { floor_plan_id: floorPlanId } });

// AI Results Tables
export const getFullAnalyses = () => api.get('/full-analyses');
export const deleteFullAnalysis = (id) => api.delete(`/full-analyses/${id}`);
export const getRoomDimensions = () => api.get('/room-dimensions');
export const deleteRoomDimension = (id) => api.delete(`/room-dimensions/${id}`);
export const getLayoutOptimizations = () => api.get('/layout-optimizations');
export const deleteLayoutOptimization = (id) => api.delete(`/layout-optimizations/${id}`);
export const getAISuggestions = () => api.get('/ai-suggestions');
export const deleteAISuggestion = (id) => api.delete(`/ai-suggestions/${id}`);
export const getAIMaterials = () => api.get('/ai-materials');
export const deleteAIMaterial = (id) => api.delete(`/ai-materials/${id}`);

// Dashboard
export const getDashboardStats = () => api.get('/dashboard/stats');

// AI Room Detector
export const detectRooms = (data) => api.post('/ai/detect-rooms', data);
export const getRoomDetections = () => api.get('/room-detections');
export const deleteRoomDetection = (id) => api.delete(`/room-detections/${id}`);

// AI Home Staging
export const getHomeStagingAdvice = (data) => api.post('/ai/home-staging', data);
export const getHomeStagingList = () => api.get('/home-staging');
export const deleteHomeStaging = (id) => api.delete(`/home-staging/${id}`);

// AI Furniture Placer
export const placeFurniture = (data) => api.post('/ai/furniture-placement', data);
export const getFurniturePlacements = () => api.get('/furniture-placements');
export const deleteFurniturePlacement = (id) => api.delete(`/furniture-placements/${id}`);

// AI Maintenance Predictor
export const predictMaintenance = (data) => api.post('/ai/maintenance-prediction', data);
export const getMaintenancePredictions = () => api.get('/maintenance-predictions');
export const deleteMaintenancePrediction = (id) => api.delete(`/maintenance-predictions/${id}`);

// AI Energy Auditor
export const auditEnergy = (data) => api.post('/ai/energy-audit', data);
export const getEnergyAudits = () => api.get('/energy-audits');
export const deleteEnergyAudit = (id) => api.delete(`/energy-audits/${id}`);

// AI Home Inspector
export const inspectHome = (data) => api.post('/ai/home-inspection', data);
export const getHomeInspections = () => api.get('/home-inspections');
export const deleteHomeInspection = (id) => api.delete(`/home-inspections/${id}`);

// Bulk Operations
export const bulkDelete = (resource, ids) => api.post('/bulk/delete', { resource, ids });
export const bulkUpdate = (resource, ids, updates) => api.post('/bulk/update', { resource, ids, updates });

// Admin
export const getAdminUsers = (params) => api.get('/admin/users', { params });
export const updateUserRole = (id, role) => api.put(`/admin/users/${id}/role`, { role });

export default api;
