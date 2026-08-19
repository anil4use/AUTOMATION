import axios from 'axios';
import { getCookie, deleteCookie } from '@/context/UserRoleContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach real JWT token from localStorage or Cookies on every request
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token') || getCookie('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-clean session on expired 401 responses
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user_email');
      localStorage.removeItem('user_name');
      localStorage.removeItem('user_id');
      localStorage.removeItem('organization_id');
      localStorage.removeItem('autoflow_user_role');

      deleteCookie('token');
      deleteCookie('user_email');
      deleteCookie('user_name');
      deleteCookie('user_id');
      deleteCookie('organization_id');
      deleteCookie('autoflow_user_role');

      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

/** Fetch real dashboard stats from the authenticated backend */
export async function fetchDashboardStats() {
  const res = await apiClient.get('/v1/dashboard/stats');
  return res.data.data;
}
