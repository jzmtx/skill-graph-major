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
export const getCollegeStudents = async (auth_id: string, branch?: string) => {
  let url = `/api/tpo/students/${auth_id}`;
  if (branch) url += `?branch=${encodeURIComponent(branch)}`;
  const response = await api.get(url);
  return response.data.students;
};

export const getCollegeAnalytics = async (auth_id: string) => {
  const response = await api.get(`/api/tpo/analytics/${auth_id}`);
  return response.data;
};

// --- Connection Management ---
export const inviteStudent = async (auth_id: string, student_email: string) => {
  const response = await api.post(`/api/tpo/invite/${auth_id}`, { student_email });
  return response.data;
};

export const getPendingRequests = async (auth_id: string) => {
  const response = await api.get(`/api/tpo/requests/${auth_id}`);
  return response.data.requests;
};

export const approveRequest = async (auth_id: string, link_id: string) => {
  const response = await api.post(`/api/tpo/requests/approve/${auth_id}/${link_id}`);
  return response.data;
};

// --- Student Monitor ---
export const getStudentMonitor = async (auth_id: string, student_id: string) => {
  const response = await api.get(`/api/tpo/student/${auth_id}/${student_id}`);
  return response.data;
};

export const getStudentActivity = async (auth_id: string, student_id: string) => {
  const response = await api.get(`/api/tpo/student/${auth_id}/${student_id}/activity`);
  return response.data;
};