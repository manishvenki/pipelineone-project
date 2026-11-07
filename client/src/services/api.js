import axios from 'axios';

const api = axios.create({
  baseURL: '',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to inject JWT from localStorage if present
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pipeline_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor to handle unauthenticated 401s
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Don't auto-redirect on check-auth or login failures
      const url = error.config?.url || '';
      if (!url.includes('/api/auth/login') && !url.includes('/api/auth/register')) {
        // Clear token
        localStorage.removeItem('pipeline_token');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
