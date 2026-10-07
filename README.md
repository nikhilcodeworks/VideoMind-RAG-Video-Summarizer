<div align="center">

# 🎬 VideoMind

<p align="center">
  <strong>Upload videos, transcribe with Whisper AI, and query semantic context using Retrieval-Augmented Generation.</strong>
</p>

<p align="center">
  <a href="#-overview">Overview</a> •
  <a href="#-key-features">Key Features</a> •
  <a href="#-tech-stack--architecture">Tech Stack</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-getting-started">Getting Started</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Category-AI%20Audio%20%26%20Video%20Intelligence-7c3aed?style=for-the-badge" alt="Category: AI Audio & Video Intelligence" />
  <img src="https://img.shields.io/badge/Tech%20Stack-Next.js%20%7C%20Node.js%20%7C%20TypeScript-10b981?style=for-the-badge" alt="Tech Stack: Next.js | Node.js | TypeScript" />
  <img src="https://img.shields.io/badge/Status-Production%20Ready-8b5cf6?style=for-the-badge" alt="Status: Production Ready" />
  <img src="https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge" alt="License: MIT" />
</p>

</div>

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 📤 **Multi-file Upload** | Drag & drop or browse — supports MP4, MKV, AVI, MOV, WEBM, FLV, WMV, M4V |
| 🎙️ **Whisper Transcription** | Local transcription via `openai/whisper-small` with FFmpeg audio extraction |
| 🧠 **RAG Pipeline** | Transcripts chunked → embedded with `all-MiniLM-L6-v2` → indexed in FAISS |
| 📝 **AI Summarization** | Top-k relevant chunks retrieved and summarized by `facebook/bart-large-cnn` |
| 💬 **Q&A Chat** | Ask questions about your videos — answered by `Qwen/Qwen2.5-72B-Instruct` with RAG context |
| 🔑 **Key Topic Extraction** | Automatically surfaces top keywords from retrieved chunks |
| ⚡ **Async Processing** | Background transcription with real-time progress polling |

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │UploadZone│  │VideoCard │  │ Summary  │  │ ChatBox  │ │
│  │          │  │          │  │  Panel   │  │          │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘ │
│                    localhost:3000                         │
│                  (proxied to :8000)                       │
└────────────────────────┬─────────────────────────────────┘
                         │ /api/*
┌────────────────────────▼─────────────────────────────────┐
│                    Backend (Flask)                        │
│                    localhost:8000                         │
│                                                          │
│  ┌──────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  FFmpeg       │  │ Whisper-small │  │ HuggingFace   │  │
│  │  Audio Extract│  │ (local model) │  │ Inference API │  │
│  └──────────────┘  └───────────────┘  └───────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              RAG Store (rag.py)                      │ │
│  │  Chunking → Sentence-Transformers → FAISS Index     │ │
│  └──────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 📋 Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Python** | 3.9+ | Backend runtime |
| **Node.js** | 18+ | Frontend runtime |
| **FFmpeg** | Any recent | Must be on PATH |
| **HuggingFace API Key** | — | Free at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) |

### Installing FFmpeg

- **Windows:** `winget install ffmpeg` or download from [ffmpeg.org](https://ffmpeg.org/download.html)
- **macOS:** `brew install ffmpeg`
- **Linux (Debian/Ubuntu):** `sudo apt install ffmpeg`

---

## 🚀 Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/NikhilCodeWorks/xchange.git
cd xchange
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
```

Create a `.env` file in the `backend/` directory:

```env
HUGGINGFACE_API_KEY=hf_your_key_here
```

> 💡 Get a free API key at [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)

Start the backend:

```bash
python app.py
# 🚀 Server starts at http://localhost:8000
# ⏳ First run downloads Whisper model (~244 MB)
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
# ✨ Opens at http://localhost:3000
```

### 4. Open in Browser

Navigate to **http://localhost:3000** — that's it! 🎉

---

## 📖 Usage

1. **Upload** — Drag & drop video files into the upload zone (or click to browse)
2. **Transcribe** — Click **"Transcribe All"** or transcribe individual videos. Audio is extracted via FFmpeg and transcribed locally with Whisper
3. **Summarize** — Once transcription completes, click **"Summarize All"** to generate a RAG-powered summary with key topics
4. **Chat** — Ask any question about your videos in the Q&A panel. The system retrieves relevant transcript chunks and generates answers using an LLM

---

## 🔌 API Reference

All endpoints are served from `http://localhost:8000`.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + RAG chunk count |
| `POST` | `/api/upload` | Upload video files (multipart form) |
| `POST` | `/api/transcribe` | Start async transcription for a file |
| `GET` | `/api/transcribe/status/:job_id` | Poll transcription job status |
| `POST` | `/api/summarize` | RAG-based summarization of all transcripts |
| `POST` | `/api/ask` | RAG Q&A — send a question, get an answer |
| `GET` | `/api/videos` | List all indexed videos and chunk count |
| `DELETE` | `/api/reset` | Clear all data (RAG store + uploads) |

### Example: Ask a Question

```bash
curl -X POST http://localhost:8000/api/ask \
  -H "Content-Type: application/json" \
  -d '{"question": "What are the main topics discussed in the videos?"}'
```

**Response:**
```json
{
  "question": "What are the main topics discussed in the videos?",
  "answer": "The videos primarily discuss...",
  "sources": ["chunk1...", "chunk2...", "chunk3..."]
}
```

---

## 🧠 How the RAG Pipeline Works

```
Video File
    │
    ▼
┌──────────┐     ┌──────────────┐     ┌───────────────────────┐
│  FFmpeg   │────▶│ Whisper-small │────▶│   Raw Transcript      │
│  Extract  │     │ (local, 16kHz)│     │                       │
│  Audio    │     └──────────────┘     └───────────┬───────────┘
└──────────┘                                       │
                                                   ▼
                                    ┌──────────────────────────┐
                                    │  Chunking (500 words,    │
                                    │  100 word overlap)       │
                                    └────────────┬─────────────┘
                                                 │
                                                 ▼
                                    ┌──────────────────────────┐
                                    │  Embedding               │
                                    │  all-MiniLM-L6-v2        │
                                    │  (384-dim, normalized)   │
                                    └────────────┬─────────────┘
                                                 │
                                                 ▼
                                    ┌──────────────────────────┐
                                    │  FAISS Index             │
                                    │  (Inner Product / Cosine)│
                                    └────────────┬─────────────┘
                                                 │
                         ┌───────────────────────┤
                         │                       │
                         ▼                       ▼
              ┌─────────────────┐    ┌─────────────────────┐
              │  Summarization  │    │  Q&A (Chat)         │
              │  BART-large-CNN │    │  Qwen2.5-72B        │
              │  (HF API)      │    │  (HF Chat API)      │
              └─────────────────┘    └─────────────────────┘
```

---

## 📂 Project Structure

```
xchange/
├── backend/
│   ├── app.py              # Flask server — all API endpoints
│   ├── rag.py              # RAG pipeline (chunking, embedding, FAISS, retrieval)
│   ├── requirements.txt    # Python dependencies
│   ├── .env                # HuggingFace API key (not committed)
│   └── uploads/            # Uploaded video files (auto-created)
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx      # Root layout with Inter font
│   │   ├── page.tsx        # Main page — orchestrates all components
│   │   └── globals.css     # Full design system (dark glassmorphism)
│   ├── components/
│   │   ├── UploadZone.tsx  # Drag & drop file upload area
│   │   ├── VideoCard.tsx   # Individual video with status & transcript
│   │   ├── SummaryPanel.tsx# RAG summary display with key topics
│   │   └── ChatBox.tsx     # Q&A chat interface with source citations
│   ├── next.config.js      # API proxy (localhost:3000 → 8000)
│   ├── package.json        # Node dependencies
│   └── .env.local          # Frontend env config
│
└── README.md
```

---

## 🛠️ Tech Stack & Architecture

### Backend
- **Flask** — Lightweight Python web framework
- **Whisper (openai/whisper-small)** — Local speech-to-text via `transformers` pipeline
- **FFmpeg** — Audio extraction from video files
- **Sentence-Transformers (all-MiniLM-L6-v2)** — Local text embeddings (~90 MB)
- **FAISS** — Facebook AI Similarity Search for vector indexing
- **HuggingFace Inference API** — Summarization (BART) and Q&A (Qwen2.5-72B)

### Frontend
- **Next.js 14** — React framework with API proxying
- **React 18** — Component-based UI
- **Lucide React** — Beautiful icon library
- **Axios** — HTTP client

### Design
- **Glassmorphism** dark theme with purple/pink gradient accents
- **Inter** font from Google Fonts
- Custom CSS design system (no Tailwind)

---

## ⚙️ Configuration

| Variable | Location | Description |
|---|---|---|
| `HUGGINGFACE_API_KEY` | `backend/.env` | Required — HuggingFace API token for summarization & Q&A |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Backend URL (default: `http://localhost:8000`) |

---

## 📝 Notes

- **First run** downloads `openai/whisper-small` (~244 MB) and `all-MiniLM-L6-v2` (~90 MB) — subsequent runs use cached models
- **Transcription** runs locally (no audio sent to external APIs) — only summarization and Q&A use HuggingFace API
- **All data is in-memory** — restarting the backend clears the RAG index. Upload and transcribe again to rebuild
- The frontend proxies `/api/*` requests to the Flask backend via Next.js rewrites, so no CORS issues in development

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

## 📜 License

Distributed under the **MIT License**. See `LICENSE` for more information.
