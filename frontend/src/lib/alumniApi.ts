import { api } from './api';

// --- Alumni Registration & Login ---
export const registerAlumni = async (data: {
  college_id: string;
  name: string;
  email: string;
  password: string;
  passout_year?: number;
  current_company?: string;
  current_job_role?: string;
  linkedin_url?: string;
}) => {
  const response = await api.post('/api/alumni/register', data);
  return response.data;
};

export const loginAlumni = async (data: { email: string; password: string }) => {
  const response = await api.post('/api/alumni/login', data);
  return response.data;
};

export const getAlumniProfile = async (auth_id: string) => {
  const response = await api.get(`/api/alumni/me/${auth_id}`);
  return response.data;
};

export const getAlumniDirectory = async (college_id: string) => {
  const response = await api.get(`/api/alumni/directory/${college_id}`);
  return response.data.alumni;
};

// --- Opportunities ---
export const createOpportunity = async (data: {
  alumni_id: string;
  title: string;
  description?: string;
  type: string;
}) => {
  const response = await api.post('/api/alumni/opportunities', data);
  return response.data;
};

export const browseOpportunities = async () => {
  const response = await api.get('/api/alumni/opportunities/browse');
  return response.data.opportunities;
};

export const getMyOpportunities = async (alumni_id: string) => {
  const response = await api.get(`/api/alumni/opportunities/mine/${alumni_id}`);
  return response.data.opportunities;
};

export const deactivateOpportunity = async (opportunity_id: string) => {
  const response = await api.patch(`/api/alumni/opportunities/${opportunity_id}/deactivate`);
  return response.data;
};

// --- Student Interest ---
export const expressInterest = async (opportunity_id: string, student_id: string) => {
  const response = await api.post('/api/alumni/opportunities/interest', { opportunity_id, student_id });
  return response.data;
};

export const getInterestedStudents = async (opportunity_id: string) => {
  const response = await api.get(`/api/alumni/opportunities/${opportunity_id}/interested-students`);
  return response.data.interested_students;
};

// --- Student-facing: same-college Job/Open Source board ---
export const getOpportunitiesForStudent = async (student_id: string) => {
  const response = await api.get(`/api/alumni/opportunities/for-student/${student_id}`);
  return response.data.opportunities;
};