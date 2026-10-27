import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001/api' });
api.interceptors.request.use(config => {
  const token = localStorage.getItem('flexi_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401 && !['/auth/login', '/auth/register'].some(p => error.config?.url?.includes(p))) {
      localStorage.removeItem('flexi_token');
      localStorage.removeItem('flexi_user');
      window.dispatchEvent(new Event('flexi:logout'));
    }
    return Promise.reject(error);
  }
);
export const apiError = error => error.response?.data?.message || (
  error.response
    ? 'The API returned an unexpected response.'
    : 'Cannot reach the FLEXI API. Check that the backend is running on port 5001 and can connect to MongoDB.'
);
export default api;
