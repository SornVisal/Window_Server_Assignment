import { Navigate } from 'react-router-dom';
import { sessionManager } from '../utils/sessionManager';

/**
 * ProtectedRoute component - Wraps routes that require authentication
 * @param {Object} props
 * @param {React.ReactNode} props.children - The component to render if authorized
 * @param {string[]} props.allowedRoles - Array of roles that can access this route (optional)
 */
export default function ProtectedRoute({ children, allowedRoles = [] }) {
  // Check if user is authenticated
  const token = localStorage.getItem('accessToken');
  const currentUserStr = localStorage.getItem('currentUser');

  // No token or user data - redirect to login
  if (!token || !currentUserStr) {
    sessionManager.clearSession();
    return <Navigate to="/" replace />;
  }

  // Check if session is still valid (within 5 minute window)
  if (!sessionManager.isSessionValid()) {
    sessionManager.clearSession();
    return <Navigate to="/" replace />;
  }

  // If roles are specified, check if user has required role
  if (allowedRoles.length > 0) {
    let currentUser;
    try {
      currentUser = JSON.parse(currentUserStr);
    } catch {
      // Invalid user data - clear session and redirect
      sessionManager.clearSession();
      return <Navigate to="/" replace />;
    }

    if (!allowedRoles.includes(currentUser.role)) {
      // User doesn't have permission - redirect to their team page
      return <Navigate to="/group" replace />;
    }
  }

  // User is authenticated and authorized - render the protected component
  return children;
}
