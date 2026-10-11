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
  return response.data;
};

export const updateApplicationStatus = async (auth_id: string, app_id: string, status: string) => {
  const response = await api.put(`/api/company/applications/${auth_id}/${app_id}/status?status=${status}`);
  return response.data;
};

export const getApplicationMessages = async (app_id: string) => {
  const response = await api.get(`/api/company/applications/${app_id}/messages`);
  return response.data;
};

export const sendApplicationMessage = async (app_id: string, payload: any) => {
  const response = await api.post(`/api/company/applications/${app_id}/messages`, payload);
  return response.data;
};

export const getApplicationAssessment = async (app_id: string) => {
  const response = await api.get(`/api/company/applications/${app_id}/assessment`);
  return response.data;
};

export const assignApplicationAssessment = async (app_id: string, payload: any) => {
  const response = await api.post(`/api/company/applications/${app_id}/assessment`, payload);
  return response.data;
};

export const updateAssessmentStudentStatus = async (app_id: string, status: string) => {
  const response = await api.put(`/api/company/applications/${app_id}/assessment/student`, { student_status: status });
  return response.data;
};

export const updateAssessmentCompanyResult = async (app_id: string, result: string) => {
  const response = await api.put(`/api/company/applications/${app_id}/assessment/result`, { company_result: result });
  return response.data;
};

export const autoShortlistJob = async (auth_id: string, job_id: string) => {
  const response = await api.post(`/api/company/jobs/${auth_id}/${job_id}/auto-shortlist`);
  return response.data;
};

// --- Student Job Board ---
export const getAllJobs = async (student_id?: string) => {
  const url = student_id ? `/api/company/student/jobs/all?student_id=${student_id}` : '/api/company/student/jobs/all';
  const response = await api.get(url);
  return response.data.jobs;
};

export const getAppliedJobs = async (student_id: string) => {
  const response = await api.get(`/api/company/student/jobs/applied/${student_id}`);
  return response.data.applications;
};

export const getEligibleJobs = async (student_id: string) => {
  const response = await api.get(`/api/company/student/jobs/eligible/${student_id}`);
  return response.data.jobs;
};

export const applyToJob = async (job_id: string, payload: any) => {
  const response = await api.post(`/api/company/student/jobs/${job_id}/apply`, payload);
  return response.data;
};
export const deleteApplicationMessage = async (message_id: string) => {
  const response = await api.delete(`/api/company/messages/${message_id}`);
  return response.data;
};

export const getStudentRecruiterProfile = async (student_id: string) => {
  const response = await api.get(`/api/company/students/${student_id}/profile`);
  return response.data;
};
