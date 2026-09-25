/**
 * auth.js - Client-Side Authentication & Credentials Management for Admin Panel
 * 
 * Supports dynamic username and password modification stored in browser localStorage,
 * with fallback to configurable default credentials.
 */

const DEFAULT_ADMIN_USERNAME = "admin";
const DEFAULT_ADMIN_PASSWORD = "admin123";

(function (window) {
  'use strict';

  const AUTH_SESSION_KEY = 'python_practicals_admin_auth';
  const AUTH_CREDENTIALS_KEY = 'python_practicals_admin_credentials_v1';

  /**
   * Retrieve active admin credentials from localStorage or defaults
   */
  function getCredentials() {
    try {
      const stored = localStorage.getItem(AUTH_CREDENTIALS_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.username && parsed.password) {
          return {
            username: String(parsed.username).trim(),
            password: String(parsed.password).trim(),
            isCustom: true
          };
        }
      }
    } catch (e) {
      console.warn('Failed to read admin credentials from localStorage:', e);
    }
    return {
      username: DEFAULT_ADMIN_USERNAME,
      password: DEFAULT_ADMIN_PASSWORD,
      isCustom: false
    };
  }

  /**
   * Check if admin is currently authenticated in this browser session
   */
  function isAuthenticated() {
    try {
      const session = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (!session) return false;
      const data = JSON.parse(session);
      const creds = getCredentials();
      return data && data.authenticated === true && data.username === creds.username;
    } catch (e) {
      return false;
    }
  }

  /**
   * Attempt admin login with provided credentials
   */
  function login(username, password) {
    const cleanUser = (username || '').trim();
    const cleanPass = (password || '').trim();

    if (!cleanUser || !cleanPass) {
      return {
        success: false,
        message: 'Please enter both username and password.'
      };
    }

    const creds = getCredentials();
    if (cleanUser === creds.username && cleanPass === creds.password) {
      const authData = {
        authenticated: true,
        username: cleanUser,
        loginTime: new Date().toISOString()
      };
      sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(authData));
      return {
        success: true,
        message: 'Login successful. Redirecting to Admin Dashboard...'
      };
    } else {
      return {
        success: false,
        message: 'Incorrect username or password. Please try again.'
      };
    }
  }

  /**
   * Update admin username and/or password
   */
  function updateCredentials(currentPassword, newUsername, newPassword) {
    const creds = getCredentials();
    const cleanCurrent = (currentPassword || '').trim();
    const cleanUser = (newUsername || '').trim();
    const cleanPass = (newPassword || '').trim();

    if (!cleanCurrent || !cleanUser || !cleanPass) {
      return {
        success: false,
        message: 'All fields are required.'
      };
    }

    if (cleanCurrent !== creds.password) {
      return {
        success: false,
        message: 'Current password does not match.'
      };
    }

    if (cleanUser.length < 3) {
      return {
        success: false,
        message: 'New username must be at least 3 characters long.'
      };
    }

    if (cleanPass.length < 4) {
      return {
        success: false,
        message: 'New password must be at least 4 characters long.'
      };
    }

    const payload = {
      username: cleanUser,
      password: cleanPass,
      updatedAt: new Date().toISOString()
    };

    try {
      localStorage.setItem(AUTH_CREDENTIALS_KEY, JSON.stringify(payload));

      // Update current session username
      const session = sessionStorage.getItem(AUTH_SESSION_KEY);
      if (session) {
        const data = JSON.parse(session);
        data.username = cleanUser;
        sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(data));
      }

      return {
        success: true,
        message: `Admin credentials successfully updated! Username: "${cleanUser}".`
      };
    } catch (e) {
      return {
        success: false,
        message: 'Failed to save credentials in localStorage.'
      };
    }
  }

  /**
   * Reset credentials back to default admin / admin123
   */
  function resetCredentialsToDefault() {
    try {
      localStorage.removeItem(AUTH_CREDENTIALS_KEY);
      return {
        success: true,
        message: 'Credentials reset to default (admin / admin123).'
      };
    } catch (e) {
      return {
        success: false,
        message: 'Failed to reset credentials.'
      };
    }
  }

  /**
   * Log out admin by clearing session
   */
  function logout() {
    try {
      sessionStorage.removeItem(AUTH_SESSION_KEY);
    } catch (e) {
      console.warn('Logout error:', e);
    }
    return true;
  }

  /**
   * Get current authenticated user info
   */
  function getCurrentUser() {
    if (!isAuthenticated()) return null;
    try {
      const data = JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY));
      return data ? data.username : null;
    } catch (e) {
      return null;
    }
  }

  // Export to global window.PracticalsAuth
  window.PracticalsAuth = {
    get ADMIN_USERNAME() { return getCredentials().username; },
    get ADMIN_PASSWORD() { return getCredentials().password; },
    getCredentials,
    isAuthenticated,
    login,
    logout,
    getCurrentUser,
    updateCredentials,
    resetCredentialsToDefault
  };

})(window);
