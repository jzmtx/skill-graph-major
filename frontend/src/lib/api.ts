import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const searchColleges = async (query: string) => {
  const response = await api.get(`/api/colleges/search?q=${query}`);
  return response.data.results;
};

export const registerStudent = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/auth/register', data);
  return response.data;
};

export const loginStudent = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/auth/login', data);
  return response.data;
};

export const devLoginStudent = async () => {
  const response = await api.post('/api/auth/dev-login');
  return response.data;
};

export const forceResetPassword = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/auth/force-reset-password', data);
  return response.data;
};

export const extractGithubSkills = async (student_id: string, github_url: string) => {
  const response = await api.post('/api/skills/extract', { student_id, github_url });
  return response.data;
};

export const getMySkills = async (student_id: string) => {
  const response = await api.get(`/api/skills/mine/${student_id}`);
  return response.data;
};

export const addSkill = async (data: { student_id: string; skill_name: string }) => {
  const response = await api.post('/api/skills/add', data);
  return response.data;
};

export const getHireabilityScore = async (student_id: string) => {
  const response = await api.get(`/api/skills/hireability/${student_id}`);
  return response.data;
};

export const getStudentProfile = async (student_id: string) => {
  const response = await api.get(`/api/auth/me/${student_id}`);
  return response.data;
};

// --- Assessment APIs ---
export const prewarmAssessment = async (data: { skill_name: string; student_id?: string | null }) => {
  try {
    const response = await api.post('/api/assessment/prewarm', data);
    return response.data;
  } catch {
    // Non-blocking background prewarming
    return null;
  }
};

export const getAdaptiveQuestion = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/assessment/get-question', data);
  return response.data;
};

export const getExplanation = async (data: { skill_name: string, question_text: string, options: string[], correct_answer: string }) => {
  const response = await api.post('/api/assessment/explain', data);
  return response.data;
};

export const submitAnswer = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/assessment/submit-answer', data);
  return response.data;
};

export const completeAssessment = async (data: {
  student_id: string | null;
  skill_name: string;
  score_percentage: number;
  history: {topic: string, is_correct: boolean, difficulty: number}[];
  violations?: number;
  violation_details?: any[];
  tab_switch_strikes?: number;
  webcam_strikes?: number;
  voice_strikes?: number;
  node_id?: string;
  roadmap_id?: string;
}) => {
  const response = await api.post('/api/assessment/complete', data);
  return response.data;
};

export const getCodingQuestion = async (data: {
  skill_name: string;
  difficulty_type: string;
  student_id?: string | null;
}) => {
  const response = await api.post('/api/assessment/get-coding-question', data);
  return response.data;
};

export const evaluateCode = async (data: {
  skill_name: string;
  question_text: string;
  student_code: string;
}) => {
  const response = await api.post('/api/assessment/evaluate-code', data);
  return response.data;
};

export const simulateCode = async (data: any) => {
  const response = await api.post('/api/assessment/simulate-code', data);
  return response.data;
};

export const reportQuestion = async (data: { question_id: string, student_id: string | null, reason: string }) => {
  const response = await api.post('/api/assessment/report-question', data);
  return response.data;
};

// --- Project Verification APIs ---
export const scheduleProjectInterview = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/project/schedule-interview', data);
  return response.data;
};

export const getInterviewStatus = async (interview_id: string) => {
  const response = await api.get(`/api/project/interview-status/${interview_id}`);
  return response.data;
};

export const verifyProjectRepo = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/project/verify-repo', data);
  return response.data;
};

export const submitProjectInterview = async (data: Record<string, unknown>) => {
  const response = await api.post('/api/project/submit-interview', data);
  return response.data;
};

export const getProjectIdea = async (data: { skill_name: string }) => {
  const response = await api.post('/api/assessment/project-idea', data);
  return response.data;
};

// --- Resources & Workspace APIs ---
export const getWorkspaceResources = async (skill_id: string, role_name: string = "Software Engineering") => {
  const response = await api.get(`/api/resources/skills/${encodeURIComponent(skill_id)}/workspace?role_name=${encodeURIComponent(role_name)}`);
  return response.data;
};

export const getStudentInvitations = async (student_id: string) => {
  const response = await api.get(`/api/auth/me/${student_id}/invitations`);
  return response.data.invitations;
};

export const acceptStudentInvitation = async (student_id: string, link_id: string) => {
  const response = await api.post(`/api/auth/me/${student_id}/invitations/${link_id}/accept`);
  return response.data;
};
