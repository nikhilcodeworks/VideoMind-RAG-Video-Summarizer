"use client";

import { Brain, RefreshCw, Sparkles, BookOpen } from "lucide-react";

interface Props {
  summary: string;
  topics: string[];
  isLoading: boolean;
  onRegenerate: () => void;
  hasTranscripts: boolean;
}

export default function SummaryPanel({
  summary,
  topics,
  isLoading,
  onRegenerate,
  hasTranscripts,
}: Props) {
  return (
    <div className="glass-card" style={{ height: "100%" }}>
      <div className="section-header">
        <h2 className="section-title">
          <span className="icon-wrap">
            <Brain size={16} color="#8b5cf6" />
          </span>
          RAG Summary
        </h2>
        {hasTranscripts && (
          <button
            className="btn-secondary"
            onClick={onRegenerate}
            disabled={isLoading}
          >
            <RefreshCw size={13} className={isLoading ? "spin-icon" : ""} />
            {isLoading ? "Generating…" : "Regenerate"}
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="empty-state">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <div className="thinking-dots">
              <span />
              <span />
              <span />
            </div>
          </div>
          <p>Building RAG context and generating summary…</p>
        </div>
      ) : summary ? (
        <>
          <div className="summary-text">{summary}</div>
          {topics.length > 0 && (
            <>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "1px",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 8,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Sparkles size={12} /> Key Topics
              </p>
              <div className="topics-wrap">
                {topics.map((t) => (
                  <span key={t} className="topic-chip">
                    {t}
                  </span>
                ))}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="empty-state">
          <BookOpen size={40} />
          <p>
            {hasTranscripts
              ? 'Click "Regenerate" to generate a RAG-powered summary of all transcripts.'
              : "Transcribe one or more videos first, then click Summarize All."}
          </p>
        </div>
      )}

      <style jsx>{`
        .spin-icon {
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
