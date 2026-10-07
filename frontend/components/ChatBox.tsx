"use client";

import { useEffect, useRef, useState } from "react";
import { MessageSquare, Send, Bot, User } from "lucide-react";

interface Message {
  role: "user" | "ai";
  text: string;
  sources?: string[];
}

interface Props {
  hasTranscripts: boolean;
}

export default function ChatBox({ hasTranscripts }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "ai",
      text: "Hello! I'm your video analyst. Ask me anything about the videos you've transcribed — I'll search through the content using RAG to give you precise answers.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || isThinking || !hasTranscripts) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: question }]);
    setIsThinking(true);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", text: `⚠ Error: ${data.error || "Unknown error"}` },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            text: data.answer,
            sources: data.sources,
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "ai",
          text: "⚠ Network error. Make sure the backend server is running on port 8000.",
        },
      ]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="glass-card" style={{ height: "100%" }}>
      <div className="section-header" style={{ marginBottom: 16 }}>
        <h2 className="section-title">
          <span className="icon-wrap">
            <MessageSquare size={16} color="#8b5cf6" />
          </span>
          Ask About Your Videos
        </h2>
        <span
          style={{
            fontSize: 11,
            color: "var(--text-muted)",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            padding: "3px 10px",
            borderRadius: 100,
          }}
        >
          RAG-powered
        </span>
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className={`chat-msg ${msg.role}`}>
            <div className={`chat-avatar ${msg.role}`}>
              {msg.role === "ai" ? <Bot size={15} /> : <User size={15} />}
            </div>
            <div>
              <div className="chat-bubble">{msg.text}</div>
              {msg.sources && msg.sources.length > 0 && (
                <details
                  style={{
                    marginTop: 6,
                    fontSize: 11,
                    color: "var(--text-muted)",
                  }}
                >
                  <summary
                    style={{ cursor: "pointer", marginLeft: 4, listStyle: "none" }}
                  >
                    📄 {msg.sources.length} source chunk
                    {msg.sources.length > 1 ? "s" : ""}
                  </summary>
                  {msg.sources.map((s, si) => (
                    <div
                      key={si}
                      style={{
                        marginTop: 4,
                        padding: "6px 10px",
                        background: "rgba(0,0,0,0.25)",
                        borderRadius: 6,
                        fontStyle: "italic",
                        lineHeight: 1.6,
                      }}
                    >
                      "{s.slice(0, 200)}…"
                    </div>
                  ))}
                </details>
              )}
            </div>
          </div>
        ))}

        {isThinking && (
          <div className="chat-msg ai">
            <div className="chat-avatar ai">
              <Bot size={15} />
            </div>
            <div className="chat-bubble" style={{ padding: "14px 20px" }}>
              <div className="thinking-dots">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!hasTranscripts ? (
        <div
          style={{
            textAlign: "center",
            padding: "12px",
            color: "var(--text-muted)",
            fontSize: 13,
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: "var(--radius-md)",
          }}
        >
          Transcribe at least one video to start chatting
        </div>
      ) : (
        <div className="chat-input-row">
          <input
            id="chat-input"
            className="chat-input"
            type="text"
            placeholder="Ask anything about your videos… (Enter to send)"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isThinking}
          />
          <button
            id="chat-send-btn"
            className="btn-primary"
            onClick={sendMessage}
            disabled={isThinking || !input.trim()}
            style={{ padding: "12px 20px" }}
          >
            <Send size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
