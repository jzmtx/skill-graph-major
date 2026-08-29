"use client";

import React, { useState } from 'react';
import { uploadFile } from '@/lib/uploadApi';
import { Upload, CheckCircle2, Loader2 } from 'lucide-react';

interface FileUploadFieldProps {
  label: string;
  onUploaded: (url: string) => void;
  value?: string;
}

export default function FileUploadField({ label, onUploaded, value }: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fileName, setFileName] = useState('');

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setUploading(true);
    setError('');

    try {
      const url = await uploadFile(file);
      onUploaded(url);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Upload failed');
      setFileName('');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <label className="flex items-center gap-2 w-full p-2 border border-slate-300 border-dashed rounded-lg cursor-pointer hover:border-indigo-400 transition-colors">
        <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-500">Uploading...</span>
          </>
        ) : value ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <span className="text-sm text-slate-700 truncate">{fileName || 'File uploaded'}</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-slate-400" />
            <span className="text-sm text-slate-500">Click to browse a file (PDF, image, or Word doc)</span>
          </>
        )}
      </label>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}