import axios from 'axios';

const api = axios.create({
  baseURL: 'https://bookleaf-portal-yq95.onrender.com/api',
});

// Automatically inject JWT token into authorization headers
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
