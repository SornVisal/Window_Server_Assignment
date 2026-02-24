import Login from './components/Login'
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from 'react';
import Group_page from './components/Group/Group_page'
import AdminDashboard from './components/AdminDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import { sessionManager } from './utils/sessionManager'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Check authentication status
    const checkAuth = () => {
      const token = localStorage.getItem('accessToken');
      const currentUser = localStorage.getItem('currentUser');

      if (!token || !currentUser) {
        setIsAuthenticated(false);
        return;
      }

      if (sessionManager.isSessionValid()) {
        setIsAuthenticated(true);
      } else {
        sessionManager.clearSession();
        setIsAuthenticated(false);
      }
    };

    checkAuth();

    // Check session every 30 seconds
    const interval = setInterval(checkAuth, 30000);

    const handleAuthChange = () => {
      checkAuth();
    };

    window.addEventListener('authchange', handleAuthChange);
    window.addEventListener('storage', handleAuthChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('authchange', handleAuthChange);
      window.removeEventListener('storage', handleAuthChange);
    };
  }, []);

  // Show loading while checking authentication
  if (isAuthenticated === null) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* Login route - redirect to /group if already authenticated */}
        <Route 
          path="/" 
          element={isAuthenticated ? <Navigate to="/group" replace /> : <Login />} 
        />
        
        {/* Protected routes - require authentication */}
        <Route 
          path='/group' 
          element={
            <ProtectedRoute>
              <Group_page />
            </ProtectedRoute>
          } 
        />
        
        {/* Admin route - require authentication + admin/owner role */}
        <Route 
          path='/admin' 
          element={
            <ProtectedRoute allowedRoles={['admin', 'owner']}>
              <AdminDashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch all other routes - redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
