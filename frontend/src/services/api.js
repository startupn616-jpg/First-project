// Axios API service — all backend calls go through here
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
});

// Attach JWT token from localStorage to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ailand_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Delegate session expiry to AuthContext via event (avoids bypassing logout())
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.dispatchEvent(new CustomEvent('auth:logout'));
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const loginApi = (username, password) =>
  api.post('/login', { username, password });

// ── Location hierarchy (from Supabase) ───────────────────────
export const fetchDistricts = () => api.get('/districts');
export const fetchTaluks    = (districtId) => api.get(`/taluks?district_id=${districtId}`);
export const fetchVillages  = (talukId) => api.get(`/villages?taluk_id=${talukId}`);

// ── Tamil Nilam / TNGIS API (proxied through backend) ────────
export const fetchSurveyNumbers = (params) =>
  api.get('/tamilnilam/survey-numbers', { params });

export const fetchSubDivisions = (params) =>
  api.get('/tamilnilam/sub-divisions', { params });

export const fetchSurveyDetails = (params) =>
  api.get('/tamilnilam/details', { params });

export const fetchPattaDetails = (params) =>
  api.get('/tamilnilam/patta', { params });

// ── Admin: manual survey data management ─────────────────────
export const adminListLand     = (params) => api.get('/admin/land', { params });
export const adminCreateLand   = (data)   => api.post('/admin/land', data);
export const adminUpdateLand   = (id, d)  => api.put(`/admin/land/${id}`, d);
export const adminDeleteLand   = (id)     => api.delete(`/admin/land/${id}`);
export const adminAutoFetch    = (params) => api.get('/admin/land/auto-fetch', { params });

// ── Image upload & analysis ───────────────────────────────────
export const uploadImage = (formData, onProgress) =>
  api.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress && onProgress(Math.round((e.loaded * 100) / e.total)),
  });

export const fetchAnalyses = () => api.get('/upload/analyses');

// ── Drone session & position tracking ────────────────────────
export const startDroneSession  = (name) => api.post('/drone/start', { name });
export const updateDronePosition = (data) => api.post('/drone/position', data);
export const getActiveDrones    = () => api.get('/drone/active');
export const stopDroneSession   = (sessionId) => api.post('/drone/stop', { sessionId });
export const getDroneHistory    = (sessionId) => api.get(`/drone/positions/${sessionId}`);

export default api;
