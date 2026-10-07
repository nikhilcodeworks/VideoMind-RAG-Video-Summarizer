"use client";

import { useState } from "react";
import {
  Film,
  ChevronDown,
  ChevronUp,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";

export type VideoStatus = "idle" | "uploading" | "transcribing" | "done" | "error";

export interface VideoItem {
  id: string;
  file: File;
  savedName: string;
  status: VideoStatus;
  transcript: string;
  errorMsg: string;
  progress: number;
}

interface Props {
  video: VideoItem;
  onTranscribe: (id: string) => void;
}

const STATUS_CONFIG: Record<VideoStatus, { label: string; cls: string }> = {
  idle: { label: "Ready", cls: "status-idle" },
  uploading: { label: "Uploading…", cls: "status-processing" },
  transcribing: { label: "Transcribing…", cls: "status-processing" },
  done: { label: "Done", cls: "status-done" },
  error: { label: "Error", cls: "status-error" },
};

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VideoCard({ video, onTranscribe }: Props) {
  const [expanded, setExpanded] = useState(false);
  const sc = STATUS_CONFIG[video.status];
  const isLoading = video.status === "uploading" || video.status === "transcribing";

  return (
    <div className="video-card">
      <div className="video-card-header">
        {/* Thumb */}
        <div className="video-thumb">
          <Film size={22} color="#8b5cf6" />
        </div>

        {/* Info */}
        <div className="video-info">
          <div className="video-name" title={video.file.name}>
            {video.file.name}
          </div>
          <div className="video-meta">{formatBytes(video.file.size)}</div>
          {isLoading && (
            <div className="progress-bar-wrap">
              <div
                className="progress-bar-fill"
                style={{ width: `${video.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Status */}
        <span className={`status-badge ${sc.cls}`}>
          {isLoading && <div className="spinner" />}
          {video.status === "done" && <CheckCircle2 size={11} />}
          {video.status === "error" && <AlertCircle size={11} />}
          {video.status === "idle" && <Clock size={11} />}
          {sc.label}
        </span>

        {/* Per-file transcribe */}
        {video.status === "idle" && (
          <button
            className="btn-secondary"
            onClick={() => onTranscribe(video.id)}
            style={{ marginLeft: 8, whiteSpace: "nowrap" }}
          >
            Transcribe
          </button>
        )}

        {/* Expand toggle */}
        {video.transcript && (
          <button
            className="btn-ghost"
            onClick={() => setExpanded(!expanded)}
            title="Toggle transcript"
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
      </div>

      {video.errorMsg && (
        <div className="transcript-body">
          <div className="error-msg">⚠ {video.errorMsg}</div>
        </div>
      )}

      {expanded && video.transcript && (
        <div className="transcript-body">
          <p
            style={{
              fontSize: 12,
              color: "var(--text-muted)",
              marginBottom: 8,
              fontWeight: 600,
              letterSpacing: "0.5px",
              textTransform: "uppercase",
            }}
          >
            Transcript
          </p>
          <div className="transcript-text">{video.transcript}</div>
        </div>
      )}
    </div>
  );
}
