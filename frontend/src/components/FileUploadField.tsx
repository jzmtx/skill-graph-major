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
      <label className="block text-xs font-semibold text-stone-700 mb-1">{label}</label>
      <label className="flex items-center gap-2 w-full p-2.5 border border-stone-300 border-dashed rounded-lg cursor-pointer hover:border-emerald-700 hover:bg-stone-50 transition-colors bg-white">
        <input type="file" className="hidden" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 text-emerald-800 animate-spin" />
            <span className="text-xs text-stone-500">Uploading document...</span>
          </>
        ) : value ? (
          <>
            <CheckCircle2 className="w-4 h-4 text-emerald-800" />
            <span className="text-xs text-stone-800 font-medium truncate">{fileName || 'File attached'}</span>
          </>
        ) : (
          <>
            <Upload className="w-4 h-4 text-stone-400" />
            <span className="text-xs text-stone-500">Click to attach document (PDF, PNG, JPG, or DOC)</span>
          </>
        )}
      </label>
      {error && <p className="text-xs text-rose-700 mt-1">{error}</p>}
    </div>
  );
}