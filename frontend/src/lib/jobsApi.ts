import { api } from './api';

// --- Browse Jobs (student-facing) ---
export const browseJobs = async () => {
  const response = await api.get('/api/jobs/browse');
  return response.data.jobs;
};

export const getJobDetail = async (job_id: string) => {
  const response = await api.get(`/api/jobs/${job_id}`);
  return response.data;
};

// --- Eligibility Check ---
export const checkEligibility = async (job_id: string, student_id: string) => {
  const response = await api.get(`/api/jobs/${job_id}/eligibility/${student_id}`);
  return response.data;
};

// --- Apply to Job ---
export const applyToJob = async (job_id: string, student_id: string) => {
  const response = await api.post('/api/jobs/apply', { job_id, student_id });
  return response.data;
};

// --- My Applications ---
export const getMyApplications = async (student_id: string) => {
  const response = await api.get(`/api/jobs/applications/mine/${student_id}`);
  return response.data.applications;
};