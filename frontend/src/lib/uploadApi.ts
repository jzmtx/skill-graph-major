import { api } from './api';

export const uploadFile = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);

  const response = await api.post('/api/upload/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data.url;
};