import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

export async function fetchDashboardStats() {
  try {
    const res = await apiClient.get('/v1/dashboard/stats');
    return res.data.data;
  } catch (error) {
    console.warn('Backend API unavailable, returning fallback dashboard stats:', error);
    return {
      activeWorkflows: 14,
      totalExecutions: 1420,
      successRate: '99.4%',
      failedJobs: 8,
      recentWorkflows: [
        { id: 'wf_101', name: 'Gmail Attachment → Google Drive → Google Sheets → Slack Alert', status: 'Active', trigger: 'Gmail', action: 'Slack', lastRun: '2 mins ago' },
        { id: 'wf_102', name: 'Stripe Payment Succeeded → Notion DB Page → WhatsApp Contact', status: 'Active', trigger: 'Stripe', action: 'WhatsApp', lastRun: '15 mins ago' },
        { id: 'wf_103', name: 'WhatsApp Lead → AI Summarizer Node → Google Sheets Row', status: 'Active', trigger: 'WhatsApp', action: 'Google Sheets', lastRun: '1 hour ago' },
      ],
    };
  }
}
