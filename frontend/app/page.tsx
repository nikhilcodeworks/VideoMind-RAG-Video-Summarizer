"use client";

import { useState, useCallback } from "react";
import {
  Zap,
  Trash2,
  FileVideo,
  ChevronRight,
  Layers,
} from "lucide-react";
import UploadZone from "@/components/UploadZone";
import VideoCard, { VideoItem, VideoStatus } from "@/components/VideoCard";
import SummaryPanel from "@/components/SummaryPanel";
import ChatBox from "@/components/ChatBox";

let idCounter = 0;
const newId = () => `vid-${++idCounter}`;

export default function HomePage() {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [summary, setSummary] = useState("");
  const [topics, setTopics] = useState<string[]>([]);
  const [isSummarizing, setIsSummarizing] = useState(false);

  const doneCount = videos.filter((v) => v.status === "done").length;
  const hasTranscripts = doneCount > 0;

  // ── Update a single video's fields ──
  const updateVideo = (id: string, patch: Partial<VideoItem>) => {
    setVideos((prev) =>
      prev.map((v) => (v.id === id ? { ...v, ...patch } : v))
    );
  };

  // ── Add files from UploadZone ──
  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: VideoItem[] = files.map((file) => ({
      id: newId(),
      file,
      savedName: "",
      status: "idle" as VideoStatus,
      transcript: "",
      errorMsg: "",
      progress: 0,
    }));
    setVideos((prev) => [...prev, ...newItems]);
  }, []);

  // ── Upload a single file to backend ──
  const uploadFile = async (video: VideoItem): Promise<string | null> => {
    updateVideo(video.id, { status: "uploading", progress: 10, errorMsg: "" });

    const formData = new FormData();
    formData.append("files", video.file);

    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok || data.errors?.length) {
        const errMsg = data.errors?.[0] || data.error || "Upload failed";
        updateVideo(video.id, { status: "error", errorMsg: errMsg, progress: 0 });
        return null;
      }

      const savedName = data.saved?.[0]?.saved ?? video.file.name;
      updateVideo(video.id, { savedName, progress: 40 });
      return savedName;
    } catch (err) {
      updateVideo(video.id, {
        status: "error",
        errorMsg: "Network error during upload. Is Flask running on port 8000?",
        progress: 0,
      });
      return null;
    }
  };

  // ── Transcribe a single video (async with polling) ──
  const transcribeSingle = async (id: string) => {
    const video = videos.find((v) => v.id === id);
    if (!video) return;

    // Step 1: Upload
    const savedName = await uploadFile(video);
    if (!savedName) return;

    // Step 2: Kick off async transcription
    updateVideo(id, { status: "transcribing", progress: 50 });

    let jobId: string;
    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: savedName }),
      });
      const data = await res.json();

      if (!res.ok && res.status !== 202) {
        updateVideo(id, {
          status: "error",
          errorMsg: data.error || `Transcription failed (${res.status})`,
          progress: 0,
        });
        return;
      }
      jobId = data.job_id;
    } catch {
      updateVideo(id, {
        status: "error",
        errorMsg: "Network error starting transcription.",
        progress: 0,
      });
      return;
    }

    // Step 3: Poll for completion
    let progress = 55;
    const poll = async (): Promise<void> => {
      try {
        const res = await fetch(`/api/transcribe/status/${jobId}`);
        const job = await res.json();

        if (job.status === "done") {
          updateVideo(id, {
            status: "done",
            transcript: job.transcript || "(empty transcript)",
            progress: 100,
          });
          return;
        }

        if (job.status === "error") {
          updateVideo(id, {
            status: "error",
            errorMsg: job.error || "Transcription failed.",
            progress: 0,
          });
          return;
        }

        // Still processing — bump progress and poll again
        progress = Math.min(progress + 3, 95);
        updateVideo(id, { progress });
        await new Promise((r) => setTimeout(r, 2000));
        return poll();
      } catch {
        updateVideo(id, {
          status: "error",
          errorMsg: "Lost connection while checking transcription status.",
          progress: 0,
        });
      }
    };

    await poll();
  };

  // ── Transcribe ALL idle/error videos ──
  const transcribeAll = async () => {
    const targets = videos.filter(
      (v) => v.status === "idle" || v.status === "error"
    );
    for (const v of targets) {
      await transcribeSingle(v.id);
    }
  };

  // ── Summarize via RAG ──
  const handleSummarize = async () => {
    setIsSummarizing(true);
    setSummary("");
    setTopics([]);
    try {
      const res = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) {
        setSummary(`Error: ${data.error}`);
      } else {
        setSummary(data.summary || "No summary generated.");
        setTopics(data.topics || []);
      }
    } catch {
      setSummary("Network error — is the backend running?");
    } finally {
      setIsSummarizing(false);
    }
  };

  // ── Reset everything ──
  const handleReset = async () => {
    try {
      await fetch("/api/reset", { method: "DELETE" });
    } catch {}
    setVideos([]);
    setSummary("");
    setTopics([]);
  };

  return (
    <main className="app-container">
      {/* Hero */}
      <header className="hero">
        <div className="hero-badge">
          <span className="dot" />
          AI-Powered · Whisper · RAG
        </div>
        <h1 className="hero-title">VideoMind</h1>
        <p className="hero-subtitle">
          Upload videos, transcribe with Whisper AI, then explore your content
          with intelligent RAG-powered summaries and Q&amp;A.
        </p>
      </header>

      {/* Stats bar (only when videos added) */}
      {videos.length > 0 && (
        <div className="stats-bar">
          <div className="stat-item">
            <FileVideo size={14} color="var(--accent-violet)" />
            <span className="stat-label">Videos:</span>
            <span className="stat-value">{videos.length}</span>
          </div>
          <div className="stat-item">
            <Layers size={14} color="var(--accent-violet)" />
            <span className="stat-label">Transcribed:</span>
            <span className="stat-value">{doneCount}</span>
          </div>
          {doneCount > 0 && (
            <div className="stat-item">
              <Zap size={14} color="var(--accent-pink)" />
              <span className="stat-label">RAG Ready</span>
            </div>
          )}
        </div>
      )}

      {/* Upload */}
      <div className="glass-card" style={{ marginBottom: 24 }}>
        <div className="section-header" style={{ marginBottom: 20 }}>
          <h2 className="section-title">
            <span className="icon-wrap">
              <FileVideo size={16} color="#8b5cf6" />
            </span>
            Upload Videos
          </h2>
          {videos.length > 0 && (
            <button
              className="btn-ghost"
              onClick={handleReset}
              title="Clear all"
            >
              <Trash2 size={14} />
              Clear all
            </button>
          )}
        </div>

        <UploadZone onFilesSelected={handleFilesSelected} />

        {/* Action bar */}
        {videos.length > 0 && (
          <div className="action-bar">
            <button
              id="transcribe-all-btn"
              className="btn-primary"
              onClick={transcribeAll}
              disabled={videos.every(
                (v) => v.status === "done" || v.status === "uploading" || v.status === "transcribing"
              )}
            >
              <Zap size={15} />
              Transcribe All
            </button>

            {hasTranscripts && (
              <button
                id="summarize-btn"
                className="btn-primary"
                onClick={handleSummarize}
                disabled={isSummarizing}
                style={{
                  background: "linear-gradient(135deg, #ec4899 0%, #7c3aed 100%)",
                }}
              >
                <ChevronRight size={15} />
                {isSummarizing ? "Summarizing…" : "Summarize All"}
              </button>
            )}
          </div>
        )}

        {/* Video list */}
        {videos.length > 0 && (
          <div className="video-list">
            {videos.map((v) => (
              <VideoCard
                key={v.id}
                video={v}
                onTranscribe={transcribeSingle}
              />
            ))}
          </div>
        )}
      </div>

      {/* Summary + Chat grid */}
      {videos.length > 0 && (
        <div className="main-grid">
          <SummaryPanel
            summary={summary}
            topics={topics}
            isLoading={isSummarizing}
            onRegenerate={handleSummarize}
            hasTranscripts={hasTranscripts}
          />
          <ChatBox hasTranscripts={hasTranscripts} />
        </div>
      )}
    </main>
  );
}
