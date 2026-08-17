import { api } from './api';

// --- Company Registration ---
export const registerCompany = async (data: {
  name: string;
  website?: string;
  industry?: string;
}) => {
  const response = await api.post('/api/company/register', data);
  return response.data;
};

export const searchCompanies = async (query: string) => {
  const response = await api.get(`/api/company/search?q=${query}`);
  return response.data.results;
};

// --- Recruiter Registration & Login ---
export const registerRecruiter = async (data: {
  company_id: string;
  name: string;
  email: string;
  password: string;
  role_title?: string;
}) => {
  const response = await api.post('/api/company/recruiter/register', data);
  return response.data;
};

export const loginRecruiter = async (data: { email: string; password: string }) => {
  const response = await api.post('/api/company/recruiter/login', data);
  return response.data;
};

export const getRecruiterProfile = async (auth_id: string) => {
  const response = await api.get(`/api/company/recruiter/me/${auth_id}`);
  return response.data;
};

// --- Job Posting ---
export const createJob = async (data: {
  recruiter_id: string;
  title: string;
  description?: string;
  required_skills: string[];
  location?: string;
  ctc?: string;
  deadline?: string;
}) => {
  const response = await api.post('/api/company/jobs', data);
  return response.data;
};

export const getMyJobs = async (recruiter_id: string) => {
  const response = await api.get(`/api/company/jobs/mine/${recruiter_id}`);
  return response.data.jobs;
};

export const deactivateJob = async (job_id: string) => {
  const response = await api.patch(`/api/company/jobs/${job_id}/deactivate`);
  return response.data;
};

// --- Applicants ---
export const getApplicants = async (job_id: string) => {
  const response = await api.get(`/api/company/jobs/${job_id}/applicants`);
  return response.data.applicants;
};

export const updateApplicationStatus = async (application_id: string, status: string) => {
  const response = await api.patch(`/api/company/applications/${application_id}/status`, { status });
  return response.data;
};