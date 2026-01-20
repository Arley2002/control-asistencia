import axios from 'axios';

const baseURL = import.meta.env.VITE_API_BASE || 'http://localhost:3000/api';

const api = axios.create({
  baseURL
});

let refreshPromise = null;

const refreshToken = async () => {
  if (!refreshPromise) {
    const refresh = localStorage.getItem('refresh');
    if (!refresh) throw new Error('No refresh token');
    refreshPromise = axios.post(`${baseURL}/auth/refresh`, { refresh });
    refreshPromise.finally(() => { refreshPromise = null; });
  }
  return refreshPromise;
};

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const { response, config } = err;
    if (response?.status === 401 && !config.__isRetryRequest) {
      try {
        const { data } = await refreshToken();
        localStorage.setItem('token', data.token);
        localStorage.setItem('refresh', data.refresh);
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        config.__isRetryRequest = true;
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${data.token}`;
        return api(config);
      } catch (_refreshError) {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
