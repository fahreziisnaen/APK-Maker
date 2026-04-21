'use client';
import { useDropzone } from 'react-dropzone';
import { Upload, X } from 'lucide-react';
import Image from 'next/image';
import clsx from 'clsx';

interface Props {
  label: string;
  hint?: string;
  value?: File;
  onChange: (file: File | undefined) => void;
}

export function ImageDropzone({ label, hint, value, onChange }: Props) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDropAccepted: (files) => onChange(files[0]),
  });

  const preview = value ? URL.createObjectURL(value) : null;

  return (
    <div>
      <span className="label">{label}</span>
      {hint && <p className="mb-2 text-xs text-slate-400">{hint}</p>}
      <div
        {...getRootProps()}
        className={clsx(
          'relative flex min-h-[100px] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-center transition-colors',
          isDragActive ? 'border-brand-500 bg-brand-50' : 'border-slate-200 bg-slate-50 hover:border-brand-400 hover:bg-brand-50/50'
        )}
      >
        <input {...getInputProps()} />
        {preview ? (
          <>
            <div className="relative h-16 w-16 overflow-hidden rounded-lg">
              <img src={preview} alt="preview" className="h-full w-full object-contain" />
            </div>
            <p className="text-xs text-slate-500">{value?.name}</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
              className="absolute right-2 top-2 rounded-full bg-white p-1 shadow hover:bg-red-50 text-slate-400 hover:text-red-500"
            >
              <X size={12} />
            </button>
          </>
        ) : (
          <>
            <Upload size={20} className="text-slate-400" />
            <p className="text-sm text-slate-500">
              {isDragActive ? 'Drop it here' : 'Drag & drop or click to upload'}
            </p>
            <p className="text-xs text-slate-400">PNG, JPG up to 5 MB</p>
          </>
        )}
      </div>
    </div>
  );
}
