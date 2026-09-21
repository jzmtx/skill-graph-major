import { api } from './api';

// --- Company Registration & Login ---
export const registerCompany = async (data: any) => {
  const response = await api.post('/api/company/register', data);
  return response.data;
};

export const loginCompany = async (data: any) => {
  const response = await api.post('/api/company/login', data);
  return response.data;
};

export const getCompanyDashboard = async (auth_id: string) => {
  const response = await api.get(`/api/company/dashboard/${auth_id}`);
  return response.data;
};

// --- Company ATS (Job Management) ---
export const postJob = async (auth_id: string, data: any) => {
  const response = await api.post(`/api/company/jobs/${auth_id}`, data);
  return response.data;
};

export const getCompanyJobs = async (auth_id: string) => {
  const response = await api.get(`/api/company/jobs/${auth_id}`);
  return response.data.jobs;
};

export const getJobApplicants = async (auth_id: string, job_id: string) => {
  const response = await api.get(`/api/company/jobs/${auth_id}/${job_id}/applicants`);
  return response.data.applicants;
};

export const updateApplicationStatus = async (auth_id: string, app_id: string, status: string) => {
  const response = await api.put(`/api/company/applications/${auth_id}/${app_id}/status?status=${status}`);
  return response.data;
};

// --- Student Job Board ---
export const getAllJobs = async () => {
  const response = await api.get('/api/company/student/jobs/all');
  return response.data.jobs;
};

export const getEligibleJobs = async (student_id: string) => {
  const response = await api.get(`/api/company/student/jobs/eligible/${student_id}`);
  return response.data.jobs;
};

export const applyToJob = async (job_id: string, payload: any) => {
  const response = await api.post(`/api/company/student/jobs/${job_id}/apply`, payload);
  return response.data;
};