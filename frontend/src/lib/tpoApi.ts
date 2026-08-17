import { api } from './api';

// --- TPO Registration & Login ---
export const registerTPO = async (data: {
  college_id: string;
  name: string;
  email: string;
  password: string;
  designation?: string;
}) => {
  const response = await api.post('/api/tpo/register', data);
  return response.data;
};

export const loginTPO = async (data: { email: string; password: string }) => {
  const response = await api.post('/api/tpo/login', data);
  return response.data;
};

export const getTPOProfile = async (auth_id: string) => {
  const response = await api.get(`/api/tpo/me/${auth_id}`);
  return response.data;
};

// --- Student Cluster & Analytics ---
export const getCollegeStudents = async (auth_id: string) => {
  const response = await api.get(`/api/tpo/students/${auth_id}`);
  return response.data.students;
};

export const getCollegeAnalytics = async (auth_id: string) => {
  const response = await api.get(`/api/tpo/analytics/${auth_id}`);
  return response.data;
};