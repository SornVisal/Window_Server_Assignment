/**
 * Session Manager Utility
 * Handles session validation and token management
 * Session timeout is set to 5 minutes
 */

const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

export const sessionManager = {
  /**
   * Check if session is still valid
   * @returns {boolean} true if session is valid, false otherwise
   */
  isSessionValid: () => {
    const token = localStorage.getItem('accessToken');
    const loginTimestamp = localStorage.getItem('loginTimestamp');

    // If no token or timestamp, session is invalid
    if (!token || !loginTimestamp) {
      return false;
    }

    // Check if 5 minutes have passed since login
    const currentTime = Date.now();
    const elapsedTime = currentTime - parseInt(loginTimestamp);

    return elapsedTime < SESSION_TIMEOUT;
  },

  /**
   * Set login session when user logs in
   */
  setLoginSession: () => {
    localStorage.setItem('loginTimestamp', Date.now().toString());
    window.dispatchEvent(new Event('authchange'));
  },

  /**
   * Clear all session data
   */
  clearSession: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginTimestamp');
    window.dispatchEvent(new Event('authchange'));
  },

  /**
   * Get time remaining in session (in seconds)
   * @returns {number} seconds remaining, or 0 if expired
   */
  getTimeRemaining: () => {
    const loginTimestamp = localStorage.getItem('loginTimestamp');
    if (!loginTimestamp) return 0;

    const currentTime = Date.now();
    const elapsedTime = currentTime - parseInt(loginTimestamp);
    const remaining = SESSION_TIMEOUT - elapsedTime;

    return Math.max(0, Math.ceil(remaining / 1000));
  },
};
