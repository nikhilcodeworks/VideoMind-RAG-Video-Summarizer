"""
Flask Backend - Video Transcript & RAG API
Endpoints:
  POST /api/upload     - Upload video files
  POST /api/transcribe - Transcribe a video via FFmpeg + HuggingFace Whisper API
  POST /api/summarize  - RAG-based summarization via HuggingFace API
  POST /api/ask        - RAG Q&A via HuggingFace API
  DELETE /api/reset    - Clear the RAG store
"""

import os
import uuid
import subprocess
import threading
from transformers import pipeline as hf_pipeline
import requests
from pathlib import Path
from flask import Flask, request, jsonify
from flask_cors import CORS
from werkzeug.utils import secure_filename
from dotenv import load_dotenv
from rag import rag_store

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

UPLOAD_FOLDER = Path(__file__).parent / "uploads"
UPLOAD_FOLDER.mkdir(exist_ok=True)

HF_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")
HF_HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}

ALLOWED_EXTENSIONS = {"mp4", "avi", "mkv", "mov", "webm", "flv", "wmv", "m4v"}

# HuggingFace model endpoints (remote — for summarization & Q&A)
SUMMARIZE_URL = "https://router.huggingface.co/hf-inference/models/facebook/bart-large-cnn"

# In-memory job store for async transcription
# job_id -> {status, filename, transcript, error, chunk_count}
jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()

# Local Whisper pipeline (lazy-loaded on first use)
_whisper_pipe = None

def get_whisper_pipe():
    """Load Whisper pipeline once and reuse across requests."""
    global _whisper_pipe
    if _whisper_pipe is None:
        print("[WHISPER] Loading openai/whisper-small locally (first-time download ~244MB)...")
        _whisper_pipe = hf_pipeline(
            "automatic-speech-recognition",
            model="openai/whisper-small",
            chunk_length_s=30,          # handle long audio by chunking
            stride_length_s=5,
            generate_kwargs={"language": "en", "task": "transcribe"},
        )
        print("[WHISPER] Model loaded ✓")
    return _whisper_pipe


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_audio(video_path: Path) -> Path:
    """Extract audio from video as WAV using FFmpeg."""
    audio_path = video_path.with_suffix(".wav")
    cmd = [
        "ffmpeg", "-y",
        "-i", str(video_path),
        "-ar", "16000",     # 16kHz sample rate (Whisper standard)
        "-ac", "1",          # Mono channel
        "-f", "wav",
        str(audio_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg error: {result.stderr}")
    return audio_path


def hf_transcribe(audio_path: Path):
    """Transcribe audio locally using openai/whisper-small via transformers pipeline."""
    try:
        print(f"[WHISPER] Transcribing {audio_path.name} ({audio_path.stat().st_size / 1024 / 1024:.2f} MB)...")
        pipe = get_whisper_pipe()
        result = pipe(str(audio_path), return_timestamps=False)
        transcript = result.get("text", "").strip()
        print(f"[WHISPER] Done. Transcript length: {len(transcript)} chars")
        return transcript, None
    except Exception as e:
        print(f"[WHISPER ERROR] {e}")
        return None, f"Transcription failed: {str(e)}"


def hf_summarize(text: str) -> str:
    """Summarize text using HuggingFace BART API."""
    # BART max input is ~1024 tokens. We'll send top retrieved context
    payload = {
        "inputs": text[:3000],  # Truncate safely
        "parameters": {
            "max_length": 300,
            "min_length": 80,
            "do_sample": False
        }
    }
    response = requests.post(
        SUMMARIZE_URL,
        headers=HF_HEADERS,
        json=payload,
        timeout=60
    )
    if response.status_code != 200:
        return f"Summarization error: {response.status_code} - {response.text}"
    result = response.json()
    if isinstance(result, list) and len(result) > 0:
        return result[0].get("summary_text", "")
    return str(result)


def hf_qa(context: str, question: str) -> str:
    """Q&A using HuggingFace Chat Completions API (OpenAI-compatible) with RAG context."""
    messages = [
        {
            "role": "system",
            "content": "You are an expert video content analyst. Answer the following question based ONLY on the provided transcript context. Be concise and accurate."
        },
        {
            "role": "user",
            "content": f"Context from video transcripts:\n{context}\n\nQuestion: {question}"
        }
    ]

    payload = {
        "model": "Qwen/Qwen2.5-72B-Instruct",
        "messages": messages,
        "max_tokens": 400,
        "temperature": 0.3,
    }
    response = requests.post(
        "https://router.huggingface.co/v1/chat/completions",
        headers=HF_HEADERS,
        json=payload,
        timeout=90
    )
    if response.status_code != 200:
        return f"Q&A error: {response.status_code} - {response.text}"
    result = response.json()
    try:
        return result["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        return str(result)


# ─────────────────────────── ROUTES ───────────────────────────

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "rag_chunks": len(rag_store.all_chunks)})


@app.route("/api/upload", methods=["POST"])
def upload():
    """Handle multi-file upload. Returns list of saved filenames."""
    if "files" not in request.files:
        return jsonify({"error": "No files part in request"}), 400

    files = request.files.getlist("files")
    if not files:
        return jsonify({"error": "No files selected"}), 400

    saved = []
    errors = []
    for file in files:
        if file.filename == "":
            continue
        if not allowed_file(file.filename):
            errors.append(f"{file.filename}: unsupported format")
            continue
        safe_name = secure_filename(file.filename)
        # Add unique prefix to avoid collisions
        unique_name = f"{uuid.uuid4().hex[:8]}_{safe_name}"
        save_path = UPLOAD_FOLDER / unique_name
        file.save(str(save_path))
        saved.append({"original": file.filename, "saved": unique_name})

    return jsonify({"saved": saved, "errors": errors}), 200


def _transcribe_worker(job_id: str, filename: str, video_path: Path):
    """Background worker: extract audio → transcribe → add to RAG store."""
    try:
        with jobs_lock:
            jobs[job_id]["status"] = "processing"

        # Step 1: Extract audio
        audio_path = extract_audio(video_path)

        # Step 2: Transcribe with local Whisper
        transcript, error = hf_transcribe(audio_path)

        # Cleanup audio file
        try:
            audio_path.unlink()
        except Exception:
            pass

        if error:
            with jobs_lock:
                jobs[job_id].update({"status": "error", "error": error})
            return

        # Step 3: Add to RAG store
        if transcript:
            rag_store.add_transcript(filename, transcript)

        with jobs_lock:
            jobs[job_id].update({
                "status": "done",
                "transcript": transcript or "",
                "chunk_count": len(rag_store.video_chunks.get(filename, [])),
            })
    except Exception as e:
        with jobs_lock:
            jobs[job_id].update({"status": "error", "error": str(e)})


@app.route("/api/transcribe", methods=["POST"])
def transcribe():
    """Kick off async transcription. Returns { "job_id": "..." } immediately."""
    data = request.get_json()
    if not data or "filename" not in data:
        return jsonify({"error": "Missing 'filename' in body"}), 400

    filename = data["filename"]
    video_path = UPLOAD_FOLDER / filename

    if not video_path.exists():
        return jsonify({"error": f"File not found: {filename}"}), 404

    job_id = uuid.uuid4().hex[:12]
    with jobs_lock:
        jobs[job_id] = {
            "status": "queued",
            "filename": filename,
            "transcript": "",
            "error": "",
            "chunk_count": 0,
        }

    thread = threading.Thread(
        target=_transcribe_worker,
        args=(job_id, filename, video_path),
        daemon=True,
    )
    thread.start()

    return jsonify({"job_id": job_id}), 202


@app.route("/api/transcribe/status/<job_id>", methods=["GET"])
def transcribe_status(job_id: str):
    """Poll transcription job status."""
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job), 200


@app.route("/api/summarize", methods=["POST"])
def summarize():
    """
    RAG-based summarization of all processed transcripts.
    Optionally accepts { "focus": "..." } for topic-focused summary.
    """
    if not rag_store.all_chunks:
        return jsonify({"error": "No transcripts indexed yet. Please transcribe videos first."}), 400

    data = request.get_json() or {}
    focus = data.get("focus", "the main concepts, key ideas, and important points")

    # Retrieve relevant context via RAG
    query = f"Summary of {focus}"
    context_chunks = rag_store.retrieve(query, k=8)
    context = " ".join(context_chunks)

    # Summarize via HF API
    summary = hf_summarize(context)

    # Extract key topics (simple keyword extraction)
    words = context.lower().split()
    stopwords = {"the", "a", "an", "is", "it", "in", "on", "at", "to", "of", "and", "or",
                 "but", "for", "with", "this", "that", "was", "are", "were", "be", "been",
                 "have", "has", "had", "do", "did", "will", "would", "could", "should",
                 "i", "we", "you", "he", "she", "they", "them", "their", "our", "your",
                 "so", "if", "as", "by", "from", "not", "can", "its", "also", "about",
                 "which", "when", "what", "how", "all", "more", "one", "two", "three"}
    word_freq = {}
    for word in words:
        word = word.strip(".,!?;:\"'()")
        if len(word) > 4 and word not in stopwords:
            word_freq[word] = word_freq.get(word, 0) + 1
    topics = sorted(word_freq, key=word_freq.get, reverse=True)[:10]

    return jsonify({
        "summary": summary,
        "topics": topics,
        "context_chunks_used": len(context_chunks)
    }), 200


@app.route("/api/ask", methods=["POST"])
def ask():
    """
    RAG Q&A endpoint.
    Expects JSON: { "question": "..." }
    """
    data = request.get_json()
    if not data or "question" not in data:
        return jsonify({"error": "Missing 'question' in body"}), 400

    question = data["question"].strip()
    if not question:
        return jsonify({"error": "Question cannot be empty"}), 400

    if not rag_store.all_chunks:
        return jsonify({"error": "No transcripts indexed yet."}), 400

    # Retrieve relevant context
    context_chunks = rag_store.retrieve(question, k=5)
    context = "\n\n---\n\n".join(context_chunks)

    # Generate answer via HF Mistral API
    answer = hf_qa(context, question)

    return jsonify({
        "question": question,
        "answer": answer,
        "sources": context_chunks[:3]  # Return top 3 source chunks for transparency
    }), 200


@app.route("/api/reset", methods=["DELETE"])
def reset():
    """Clear all indexed transcripts and uploaded files."""
    rag_store.clear()
    # Optionally clean upload folder
    for f in UPLOAD_FOLDER.iterdir():
        try:
            f.unlink()
        except Exception:
            pass
    return jsonify({"message": "RAG store cleared"}), 200


@app.route("/api/videos", methods=["GET"])
def list_videos():
    """List all currently indexed video chunks."""
    return jsonify({
        "videos": list(rag_store.video_chunks.keys()),
        "total_chunks": len(rag_store.all_chunks)
    }), 200


if __name__ == "__main__":
    print("🚀 Starting Video Transcript & RAG Backend on http://localhost:8000")
    print(f"📁 Upload folder: {UPLOAD_FOLDER}")
    print(f"🔑 HuggingFace API key: {'SET ✓' if HF_API_KEY else 'NOT SET ✗ — add to .env'}")
    # Pre-load Whisper so first transcription request doesn't time out
    print("⏳ Pre-loading Whisper model (downloads ~244MB on first run)...")
    get_whisper_pipe()
    print("✅ Whisper ready — starting server")
    # use_reloader=False: prevents Flask from restarting mid-request during long model loads
    app.run(host="0.0.0.0", port=8000, debug=True, use_reloader=False)
