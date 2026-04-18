import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';

import ErrorBoundary from './components/ErrorBoundary';
import Login        from './pages/Login';
import Dashboard    from './pages/Dashboard';
import MapView      from './pages/MapView';
import DroneAnalysis from './pages/DroneAnalysis';
import DataEntry    from './pages/DataEntry';

// Route guard: redirects unauthenticated users to /login
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-gov-700 border-t-transparent rounded-full spin mx-auto mb-3" />
          <p className="text-gov-700 font-medium">Loading AILAND...</p>
        </div>
      </div>
    );
  }

  return isAuthenticated
    ? <ErrorBoundary>{children}</ErrorBoundary>
    : <Navigate to="/login" replace />;
};

const AppRoutes = () => (
  <Routes>
    <Route path="/login"      element={<Login />} />
    <Route path="/"           element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
    <Route path="/drone"      element={<ProtectedRoute><DroneAnalysis /></ProtectedRoute>} />
    <Route path="/map"        element={<ProtectedRoute><MapView /></ProtectedRoute>} />
    <Route path="/data-entry" element={<ProtectedRoute><DataEntry /></ProtectedRoute>} />

    {/* Backward-compat redirects */}
    <Route path="/upload"     element={<Navigate to="/drone" replace />} />
    <Route path="/search"     element={<Navigate to="/" replace />} />

    <Route path="*"           element={<Navigate to="/" replace />} />
  </Routes>
);

export default function App() {
  return (
    <LanguageProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </LanguageProvider>
  );
}
