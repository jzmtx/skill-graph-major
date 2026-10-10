import { api } from './api';

export interface OpenSourceProject {
  id: string;
  alumni_id: string;
  title: string;
  description?: string;
  repo_url?: string;
  tech_stack: string[];
  max_contributors: number;
  guidelines?: string;
  status: 'open' | 'in_progress' | 'completed' | 'closed';
  created_at: string;
  posted_by?: {
    id: string;
    name: string;
    current_company?: string;
    current_job_role?: string;
    college_id?: string;
  };
  applicant_count?: number;
  group_count?: number;
}

export interface ProjectApplicant {
  application_id: string;
  status: 'applied' | 'selected' | 'rejected' | 'referred' | 'shortlisted' | 'hired';
  pitch?: string;
  applied_at: string;
  student: {
    id: string;
    name: string;
    email: string;
    branch?: string;
    year?: number;
    phone?: string;
    usn?: string;
    github_url?: string;
    linkedin_url?: string;
  };
  college_name?: string;
  skills: {
    skill_name: string;
    verification_level: number;
    skill_score?: number;
  }[];
  hireability: {
    score: number;
  };
  assigned_group?: {
    id: string;
    name: string;
    role: string;
  } | null;
}

export interface OpenSourceGroup {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  created_at: string;
  members: {
    id: string;
    name: string;
    email: string;
    branch?: string;
    year?: number;
    github_url?: string;
    role: string;
    joined_at?: string;
    avg_performance?: number | null;
  }[];
}

export interface StudentPerformanceGraphData {
  student_id: string;
  project_id: string;
  overall_performance_score: number;
  metric_breakdown: {
    metric: string;
    score: number;
  }[];
  weekly_progress: {
    week: string;
    average_score: number;
  }[];
  logs: {
    id: string;
    metric_name: string;
    score: number;
    week_label: string;
    feedback?: string;
    created_at: string;
  }[];
}

export interface ProjectMessage {
  id: string;
  project_id: string;
  sender_type: 'alumni' | 'student';
  sender_id: string;
  sender_name: string;
  message: string;
  created_at: string;
}

// API functions
export const listOpenSourceProjects = async (alumniId?: string): Promise<OpenSourceProject[]> => {
  const url = alumniId ? `/api/opensource/projects?alumni_id=${alumniId}` : `/api/opensource/projects`;
  const res = await api.get(url);
  return res.data.projects || [];
};

export const getOpenSourceProjectDetails = async (projectId: string) => {
  const res = await api.get(`/api/opensource/projects/${projectId}`);
  return res.data;
};

export const createOpenSourceProject = async (data: {
  alumni_id: string;
  title: string;
  description?: string;
  repo_url?: string;
  tech_stack?: string[];
  max_contributors?: number;
  guidelines?: string;
}) => {
  const res = await api.post('/api/opensource/projects', data);
  return res.data.project;
};

export const updateOpenSourceProject = async (projectId: string, data: any) => {
  const res = await api.patch(`/api/opensource/projects/${projectId}`, data);
  return res.data.project;
};

export const applyToOpenSourceProject = async (data: {
  project_id: string;
  student_id: string;
  pitch?: string;
}) => {
  const res = await api.post('/api/opensource/apply', data);
  return res.data.application;
};

export const updateApplicationStatus = async (applicationId: string, status: string) => {
  const res = await api.patch(`/api/opensource/applications/${applicationId}/status`, { status });
  return res.data.application;
};

export const getStudentApplications = async (studentId: string) => {
  const res = await api.get(`/api/opensource/student/${studentId}/applications`);
  return res.data.applications || [];
};

export const getProjectApplicants = async (projectId: string): Promise<ProjectApplicant[]> => {
  const res = await api.get(`/api/opensource/projects/${projectId}/applicants`);
  return res.data.applicants || [];
};

export const listProjectGroups = async (projectId: string): Promise<OpenSourceGroup[]> => {
  const res = await api.get(`/api/opensource/projects/${projectId}/groups`);
  return res.data.groups || [];
};

export const createProjectGroup = async (data: {
  project_id: string;
  name: string;
  description?: string;
}) => {
  const res = await api.post('/api/opensource/groups', data);
  return res.data.group;
};

export const assignStudentToGroup = async (data: {
  group_id: string;
  student_id: string;
  role?: string;
}) => {
  const res = await api.post('/api/opensource/groups/assign', data);
  return res.data;
};

export const removeStudentFromGroup = async (groupId: string, studentId: string) => {
  const res = await api.delete(`/api/opensource/groups/${groupId}/members/${studentId}`);
  return res.data;
};

export const logStudentPerformance = async (data: {
  project_id: string;
  student_id: string;
  metric_name: string;
  score: number;
  week_label?: string;
  feedback?: string;
}) => {
  const res = await api.post('/api/opensource/performance', data);
  return res.data.log;
};

export const getStudentPerformanceGraph = async (
  projectId: string,
  studentId: string
): Promise<StudentPerformanceGraphData> => {
  const res = await api.get(`/api/opensource/performance/${projectId}/${studentId}`);
  return res.data;
};

export const getProjectMessages = async (projectId: string): Promise<ProjectMessage[]> => {
  const res = await api.get(`/api/opensource/projects/${projectId}/messages`);
  return res.data.messages || [];
};

export const sendProjectMessage = async (projectId: string, data: {
  sender_type: 'alumni' | 'student';
  sender_id: string;
  sender_name?: string;
  message: string;
}) => {
  const res = await api.post(`/api/opensource/projects/${projectId}/messages`, data);
  return res.data.message;
};

export const getOpenSourceApplicationMessages = async (applicationId: string): Promise<ProjectMessage[]> => {
  const res = await api.get(`/api/opensource/applications/${applicationId}/messages`);
  return res.data.messages || [];
};

export const sendOpenSourceApplicationMessage = async (applicationId: string, data: {
  sender_type: 'alumni' | 'student';
  sender_id: string;
  sender_name?: string;
  message: string;
}) => {
  const res = await api.post(`/api/opensource/applications/${applicationId}/messages`, data);
  return res.data.message;
};

export const deleteOpenSourceApplicationMessage = async (message_id: string) => {
  const response = await api.delete(`/api/opensource/messages/application/${message_id}`);
  return response.data;
};
export const deleteOpenSourceProjectMessage = async (message_id: string) => {
  const response = await api.delete(`/api/opensource/messages/project/${message_id}`);
  return response.data;
};
