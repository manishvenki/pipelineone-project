import api from './api';

export const getProjects = async () => {
  const res = await api.get('/api/projects');
  return res.data;
};

export const getProjectById = async (id) => {
  const res = await api.get(`/api/projects/${id}`);
  return res.data;
};

export const deleteProject = async (id) => {
  const res = await api.delete(`/api/projects/${id}`);
  return res.data;
};

export const uploadProjectZip = async (formData, onProgress) => {
  const res = await api.post('/api/projects/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });
  return res.data;
};

export const selectRepository = async (repoPayload) => {
  const res = await api.post('/api/projects/select-repository', repoPayload);
  return res.data;
};

export const getUserActivity = async (limit = 20) => {
  const res = await api.get('/api/auth/activity', { params: { limit } });
  return res.data;
};

export const getSystemHealth = async () => {
  const res = await api.get('/api/health');
  return res.data;
};

export default {
  getProjects,
  getProjectById,
  deleteProject,
  uploadProjectZip,
  selectRepository,
  getUserActivity,
  getSystemHealth,
};

