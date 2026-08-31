import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/roadmaps',
});

export const roadmapsApi = {
  getAll: async () => {
    const res = await api.get('/');
    return res.data;
  },

  getRoadmap: async (role_name: string, ecosystem: string) => {
    try {
      const res = await api.get('/', { params: { role_name, ecosystem } });
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404) {
        return null; // Return null to trigger generation
      }
      throw err;
    }
  },

  generateRoadmap: async (roleName: string, ecosystem: string, studentId: string | null = null, requestId: string | null = null, weeklyHours: number = 20) => {
    const res = await api.post('/generate', {
      role_name: roleName,
      ecosystem: ecosystem,
      student_id: studentId,
      request_id: requestId,
      weekly_hours: weeklyHours
    });
    return res.data;
  },

  getGenerateStatus: async (requestId: string) => {
    const res = await api.get(`/generate_status/${requestId}`);
    return res.data;
  },

  getMyRoadmaps: async (student_id: string) => {
    try {
      const res = await api.get(`/my-roadmaps/${student_id}`);
      return res.data.roadmaps.map((r: any) => r.career_paths).filter(Boolean);
    } catch (err) {
      throw err;
    }
  },

  deleteMyRoadmap: async (student_id: string, roadmap_id: string) => {
    try {
      const res = await api.delete(`/my-roadmaps/${student_id}/${roadmap_id}`);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  getAllRoadmapsAdmin: async () => {
    try {
      const res = await api.get('/all/admin');
      return res.data.roadmaps;
    } catch (err) {
      throw err;
    }
  },

  getRawJdsAdmin: async () => {
    try {
      const res = await api.get('/raw-jds/admin');
      return res.data.raw_jds;
    } catch (err) {
      throw err;
    }
  },

  getMarketStatsAdmin: async (role?: string) => {
    try {
      const url = role ? `/market-stats/admin?role=${encodeURIComponent(role)}` : '/market-stats/admin';
      const res = await api.get(url);
      return res.data;
    } catch (err) {
      throw err;
    }
  },

  chatWithRoadmap: async (roadmap_id: string, messages: any[]) => {
    try {
      const res = await api.post('/chat', { roadmap_id, messages });
      return res.data;
    } catch (err) {
      throw err;
    }
  }
};
