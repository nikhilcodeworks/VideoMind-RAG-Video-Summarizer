"""
RAG Pipeline: Chunking + Embedding + FAISS + Retrieval
Uses local sentence-transformers for embeddings (lightweight, ~90MB)
All LLM inference (transcription, summarization, Q&A) goes via HuggingFace API
"""

import numpy as np
import faiss
from sentence_transformers import SentenceTransformer

# Load once on import
_embedder = None

def get_embedder():
    global _embedder
    if _embedder is None:
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder


def chunk_text(text: str, chunk_size: int = 500, overlap: int = 100) -> list[str]:
    """Split transcript into overlapping chunks."""
    words = text.split()
    chunks = []
    i = 0
    while i < len(words):
        chunk = " ".join(words[i : i + chunk_size])
        chunks.append(chunk)
        i += chunk_size - overlap
        if i + chunk_size > len(words) and i < len(words):
            # Last partial chunk
            last = " ".join(words[i:])
            if last and last != chunks[-1]:
                chunks.append(last)
            break
    return chunks


def embed_chunks(chunks: list[str]) -> np.ndarray:
    """Embed chunks using local sentence-transformers (all-MiniLM-L6-v2)."""
    embedder = get_embedder()
    embeddings = embedder.encode(chunks, show_progress_bar=False, normalize_embeddings=True)
    return np.array(embeddings, dtype=np.float32)


def build_faiss_index(embeddings: np.ndarray) -> faiss.IndexFlatIP:
    """Build a FAISS inner-product (cosine) index from embeddings."""
    dim = embeddings.shape[1]
    index = faiss.IndexFlatIP(dim)
    index.add(embeddings)
    return index


def retrieve(query: str, index: faiss.Index, chunks: list[str], k: int = 5) -> list[str]:
    """Retrieve top-k most relevant chunks for a query."""
    embedder = get_embedder()
    q_emb = embedder.encode([query], normalize_embeddings=True)
    q_emb = np.array(q_emb, dtype=np.float32)
    distances, indices = index.search(q_emb, min(k, len(chunks)))
    return [chunks[i] for i in indices[0] if i < len(chunks)]


class RAGStore:
    """Holds the in-memory FAISS index and chunks for all processed videos."""

    def __init__(self):
        self.all_chunks: list[str] = []
        self.all_embeddings: np.ndarray | None = None
        self.index: faiss.Index | None = None
        self.video_chunks: dict[str, list[str]] = {}  # filename -> chunks

    def add_transcript(self, filename: str, transcript: str):
        """Add a transcript to the store and rebuild the index."""
        chunks = chunk_text(transcript)
        self.video_chunks[filename] = chunks
        self.all_chunks.extend(chunks)
        embeddings = embed_chunks(chunks)
        if self.all_embeddings is None:
            self.all_embeddings = embeddings
        else:
            self.all_embeddings = np.vstack([self.all_embeddings, embeddings])
        self.index = build_faiss_index(self.all_embeddings)

    def retrieve(self, query: str, k: int = 5) -> list[str]:
        if self.index is None or not self.all_chunks:
            return []
        return retrieve(query, self.index, self.all_chunks, k)

    def get_all_text(self) -> str:
        return " ".join(self.all_chunks)

    def clear(self):
        self.all_chunks = []
        self.all_embeddings = None
        self.index = None
        self.video_chunks = {}


# Global store instance
rag_store = RAGStore()
