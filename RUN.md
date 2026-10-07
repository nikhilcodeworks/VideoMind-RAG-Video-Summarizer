# 🚀 How to Run — VideoMind-RAG-Video-Summarizer

This application consists of a dual-service architecture:
- **Backend Service**: `backend/` (API & Data Engine)
- **Frontend Client**: `frontend/` (User Interface)

---

## ⚡ Option 1: 1-Click Instant Run (Windows)

Simply double-click the **`run.bat`** file inside this folder!

It automatically:
1. Spawns the **Backend** in its own titled terminal window.
2. Waits for the API to initialize.
3. Spawns the **Frontend** in its own titled terminal window.
4. Automatically opens [`http://localhost:3000`](http://localhost:3000) in your default browser.

---

## 🛠️ Option 2: Manual Terminal Execution

You will need **two terminal tabs**:

### Terminal 1: Backend Service
```bash
cd VideoMind-RAG-Video-Summarizer/backend
pip install -r requirements.txt
python main.py
```
*Backend runs on port 8000 (e.g. `http://localhost:8000`)*

### Terminal 2: Frontend Client
```bash
cd VideoMind-RAG-Video-Summarizer/frontend
npm install
npm start
# Or if Next.js: npm run dev
```
*Frontend runs on `http://localhost:3000`*

---

## 🌐 Ports & Services

| Service | Directory | Local Port / URL |
| :--- | :--- | :--- |
| **Frontend Web** | `frontend/` | `http://localhost:3000` |
| **Backend API** | `backend/` | `http://localhost:8000` |

---

## ❓ Troubleshooting

- **Backend fails to connect?**
  Ensure any required environment variables (like MongoDB or API keys in `.env`) are configured if applicable.
- **Port Conflict?**
  If port 3000 or 8000 is occupied, close the background process before re-running.
