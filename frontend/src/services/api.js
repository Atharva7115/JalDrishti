import axios from 'axios';

export const USE_MOCK_DATA = (import.meta.env.VITE_USE_MOCK_DATA ?? 'true') === 'true';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 12000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('jaldrishti-session');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, (error) => Promise.reject(new Error(error.response?.data?.message || 'The data service is temporarily unavailable.')));

export const simulateNetwork = (data, delay = 250) => new Promise((resolve) => window.setTimeout(() => resolve(structuredClone(data)), delay));
