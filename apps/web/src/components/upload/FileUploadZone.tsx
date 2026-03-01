"use client";

/**
 * File Upload Zone Component
 * Drag-and-drop file upload zone with visual feedback
 */

import { useState } from "react";

interface FileUploadZoneProps {
  label: string;
  description: string;
  accept: string;
  multiple?: boolean;
  required?: boolean;
  onFiles: (files: FileList | null) => void;
}

export function FileUploadZone({
  label,
  description,
  accept,
  multiple = false,
  required = false,
  onFiles,
}: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files?.length) {
      onFiles(files);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded border-2 border-dashed p-6 text-center transition ${
        isDragging
          ? "border-blue-500 theme-card"
          : "theme-border theme-muted"
      }`}
    >
      <div className="flex items-center gap-2">
        <p className="text-sm font-medium theme-text">
          {label}
          {required && <span className="ml-1 text-red-400">*</span>}
        </p>
      </div>
      <p className="mt-1 text-xs theme-text-muted">{description}</p>

      <label className="mt-3 cursor-pointer">
        <div className="btn btn-primary btn-sm btn-pill">
          Choose File
        </div>
        <input
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
    </div>
  );
}
