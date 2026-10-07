"use client";

import { useCallback, useState } from "react";
import { Upload, Film } from "lucide-react";

interface Props {
  onFilesSelected: (files: File[]) => void;
}

export default function UploadZone({ onFilesSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("video/")
      );
      if (files.length > 0) onFilesSelected(files);
    },
    [onFilesSelected]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) onFilesSelected(files);
    e.target.value = "";
  };

  return (
    <label
      htmlFor="video-upload"
      className={`upload-zone ${isDragging ? "drag-over" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      style={{ display: "flex" }}
    >
      <input
        id="video-upload"
        type="file"
        multiple
        accept="video/*"
        style={{ display: "none" }}
        onChange={handleChange}
      />
      <div className="upload-icon">
        {isDragging ? (
          <Film size={32} color="#8b5cf6" />
        ) : (
          <Upload size={32} color="#8b5cf6" />
        )}
      </div>
      <div>
        <p className="upload-title">
          {isDragging ? "Drop videos here" : "Drag & drop videos"}
        </p>
        <p className="upload-sub">or click to browse files</p>
      </div>
      <span className="upload-formats">MP4 · MKV · AVI · MOV · WEBM · M4V</span>
    </label>
  );
}
