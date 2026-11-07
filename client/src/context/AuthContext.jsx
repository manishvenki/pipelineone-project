import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/api/auth/me');
      if (res.data.success && res.data.user) {
        setUser(res.data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  const login = async (email, password) => {
    setError(null);
    try {
      const res = await api.post('/api/auth/login', { email, password });
      if (res.data.token) {
        localStorage.setItem('pipeline_token', res.data.token);
      }
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const register = async (name, email, password) => {
    setError(null);
    try {
      const res = await api.post('/api/auth/register', { name, email, password });
      if (res.data.token) {
        localStorage.setItem('pipeline_token', res.data.token);
      }
      setUser(res.data.user);
      return { success: true, user: res.data.user };
    } catch (err) {
      const msg = err.response?.data?.error || 'Registration failed. Please try again.';
      setError(msg);
      return { success: false, error: msg };
    }
  };

  const logout = async () => {
    try {
      await api.post('/api/auth/logout');
    } catch {
      // Ignore
    } finally {
      localStorage.removeItem('pipeline_token');
      setUser(null);
    }
  };

  const updateSettings = async (settings) => {
    try {
      const res = await api.put('/api/auth/settings', settings);
      if (res.data.success) {
        setUser((prev) => (prev ? { ...prev, settings: res.data.settings } : prev));
        return { success: true };
      }
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to update settings' };
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isAuthenticated: Boolean(user),
        login,
        register,
        logout,
        updateSettings,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
