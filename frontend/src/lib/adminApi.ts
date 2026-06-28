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
};
