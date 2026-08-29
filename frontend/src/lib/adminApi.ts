import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/admin',
});

export const adminApi = {
  getUsers: async () => {
    const res = await api.get('/users');
    return res.data;
  },

  getQuestions: async () => {
    const res = await api.get('/questions');
    return res.data;
  },

  getMarketData: async () => {
    const res = await api.get('/market');
    return res.data;
  },

  updateMCQ: async (id: string, data: any) => {
    const res = await api.put(`/questions/${id}`, data);
    return res.data;
  },

  updateCodingQuestion: async (id: string, data: any) => {
    const res = await api.put(`/coding_questions/${id}`, data);
    return res.data;
  },

  getApiUsage: async () => {
    const res = await api.get('/api_usage');
    return res.data;
  },

  deleteRoadmapDeep: async (id: string) => {
    const res = await api.delete(`/roadmaps/${id}`);
    return res.data;
  },

  getResources: async () => {
    const res = await api.get('/resources');
    return res.data;
  },

  getApifyUsage: async () => {
    const res = await api.get('/apify_usage');
    return res.data;
  },

  getScraperDiagnostics: async () => {
    const res = await api.get('/scraper_diagnostics');
    return res.data;
  },

  clearScraperDiagnostics: async () => {
    const res = await api.delete('/scraper_diagnostics');
    return res.data;
  },

getPendingVerifications: async () => {
    const res = await api.get('/pending_verifications');
    return res.data;
  },

  verifyCompany: async (id: string) => {
    const res = await api.patch(`/verify/company/${id}`);
    return res.data;
  },

  verifyTPO: async (id: string) => {
    const res = await api.patch(`/verify/tpo/${id}`);
    return res.data;
  },

  verifyAlumni: async (id: string) => {
    const res = await api.patch(`/verify/alumni/${id}`);
    return res.data;
  },
  fetchExternalJobs: async (role: string, location: string, results_wanted: number) => {
    const res = await api.post('/fetch_external_jobs', { role, location, results_wanted });
    return res.data;
  },
    getPendingColleges: async () => {
    const res = await api.get('/colleges/pending');
    return res.data;
  },

  approveCollege: async (id: string) => {
    const res = await api.patch(`/colleges/approve/${id}`);
    return res.data;
  },

  addCollege: async (name: string, state: string, district?: string) => {
    const res = await api.post('/colleges/add', { name, state, district });
    return res.data;
  },
};

  
  