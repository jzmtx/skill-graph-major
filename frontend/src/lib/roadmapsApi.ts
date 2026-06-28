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

  generateRoadmap: async (role_name: string, ecosystem: string, student_id: string | null = null) => {
    try {
      const payload = student_id ? { role_name, ecosystem, student_id } : { role_name, ecosystem };
      const res = await api.post('/generate', payload);
      return res.data;
    } catch (err) {
      throw err;
    }
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

  chatWithRoadmap: async (roadmap_id: string, messages: any[]) => {
    try {
      const res = await api.post('/chat', { roadmap_id, messages });
      return res.data;
    } catch (err) {
      throw err;
    }
  }
};
