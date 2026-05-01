<div align="center">

```
██╗   ██╗████████╗    ██╗███╗   ██╗███████╗██╗ ██████╗ ██╗  ██╗████████╗
╚██╗ ██╔╝╚══██╔══╝    ██║████╗  ██║██╔════╝██║██╔════╝ ██║  ██║╚══██╔══╝
 ╚████╔╝    ██║       ██║██╔██╗ ██║███████╗██║██║  ███╗███████║   ██║   
  ╚██╔╝     ██║       ██║██║╚██╗██║╚════██║██║██║   ██║██╔══██║   ██║   
   ██║      ██║       ██║██║ ╚████║███████║██║╚██████╔╝██║  ██║   ██║   
   ╚═╝      ╚═╝       ╚═╝╚═╝  ╚═══╝╚══════╝╚═╝ ╚═════╝ ╚═╝  ╚═╝   ╚═╝   
```

### Ask anything about any YouTube video — powered by RAG + HuggingFace AI


https://github.com/user-attachments/assets/7c4347cd-04ba-4639-9e72-93879a79491a



[![Python](https://img.shields.io/badge/Python-3.10%2B-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?style=flat-square&logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![LangChain](https://img.shields.io/badge/LangChain-0.2%2B-1C3C3C?style=flat-square&logo=langchain&logoColor=white)](https://langchain.com)
[![HuggingFace](https://img.shields.io/badge/HuggingFace-Inference_API-FFD21E?style=flat-square&logo=huggingface&logoColor=black)](https://huggingface.co)
[![Chrome](https://img.shields.io/badge/Chrome-Extension_MV3-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions)
[![License](https://img.shields.io/badge/License-MIT-00ff88?style=flat-square)](LICENSE)

<br/>

<img src="https://img.shields.io/badge/NO%20LOCAL%20MODEL%20DOWNLOADS-✓-00ff88?style=for-the-badge" />
<img src="https://img.shields.io/badge/FREE%20TIER%20FRIENDLY-✓-00ff88?style=for-the-badge" />
<img src="https://img.shields.io/badge/WORKS%20ON%20WINDOWS-✓-00ff88?style=for-the-badge" />

</div>

---

## ✦ What is YT Insight?

**YT Insight** is a Chrome Extension + Flask backend that lets you have a full AI conversation about any YouTube video. Paste a video URL, hit Load, and ask anything — summaries, key points, specific concepts explained, timestamps — all answered from the actual video transcript using a RAG (Retrieval-Augmented Generation) pipeline.

> Built as a college project using **LangChain + HuggingFace** instead of OpenAI — completely free to run.

---

## ✦ Demo

```
User  → https://youtube.com/watch?v=Gfr50f6ZBvo
       [LOAD VIDEO]

AI    → ✅ Loaded! 87 chunks indexed.

User  → Give me a summary of this video

AI    → This video covers DeepMind's history and key breakthroughs,
        starting from its founding in London in 2010...

User  → Was nuclear fusion discussed?

AI    → Yes — around the midpoint of the video, the presenter discusses
        DeepMind's AlphaFold contribution and briefly mentions...

User  → Explain what AlphaFold is in simple terms

AI    → AlphaFold is an AI system that predicts the 3D shape of proteins.
        Think of proteins like origami — the same paper folds differently...
```

---

## ✦ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Chrome Extension                       │
│  ┌──────────────┐      ┌────────────────────────────┐  │
│  │  popup.html  │─────▶│  service_worker.js (MV3)   │  │
│  │  popup.css   │      │  handles fetch/messaging    │  │
│  │  popup.js    │◀─────│                            │  │
│  └──────────────┘      └────────────┬───────────────┘  │
└───────────────────────────────────────────────────────── ┘
                                      │ HTTP
                                      ▼
┌─────────────────────────────────────────────────────────┐
│                Flask Backend  (localhost:5000)            │
│                                                          │
│   POST /load                    POST /ask               │
│   ┌─────────────────────┐      ┌──────────────────────┐ │
│   │ 1. Extract video ID │      │ 1. Embed question    │ │
│   │ 2. Fetch transcript │      │ 2. Cosine similarity │ │
│   │ 3. Split → chunks   │      │ 3. Top-4 chunks      │ │
│   │ 4. Embed via HF API │      │ 4. LLM → answer      │ │
│   │ 5. Store in RAM     │      └──────────────────────┘ │
│   └─────────────────────┘                               │
└─────────────────────────────────────────────────────────┘
                    │                        │
                    ▼                        ▼
      ┌─────────────────────┐    ┌─────────────────────────┐
      │  HuggingFace API    │    │  HuggingFace Router     │
      │  Embeddings         │    │  LLM Chat Completions   │
      │  all-MiniLM-L6-v2  │    │  Llama-3.1-8B:cerebras  │
      └─────────────────────┘    └─────────────────────────┘
```

---

## ✦ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Chrome Extension** | Manifest V3, Vanilla JS | UI popup + service worker |
| **Backend** | Python 3.10+, Flask, Flask-CORS | REST API server |
| **Transcript** | `youtube-transcript-api` v0.7+ | Fetch video captions |
| **Chunking** | `langchain-text-splitters` | Split transcript into 800-char chunks |
| **Embeddings** | HF Inference API · `all-MiniLM-L6-v2` | Semantic vector search |
| **Vector Search** | NumPy cosine similarity | Find relevant chunks |
| **LLM** | HF Router · `Llama-3.1-8B:cerebras` | Generate answers |
| **Zero Downloads** | Pure API calls | No local model files |

---

## ✦ Project Structure

```
yt-rag-extension/
│
├── 📄 manifest.json              # Chrome MV3 extension config
├── 🐍 server.py                  # Flask RAG backend (run this!)
├── 📦 requirements.txt           # Python dependencies
├── 📖 README.md                  # You are here
│
├── 📁 popup/
│   ├── popup.html                # Extension UI shell
│   ├── popup.css                 # Terminal dark aesthetic styles
│   └── popup.js                  # All interaction + Chrome messaging logic
│
├── 📁 background/
│   └── service_worker.js         # MV3 background fetch handler
│
└── 📁 icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## ✦ Setup Guide

### Prerequisites

- Python 3.10 or higher
- Google Chrome browser
- A HuggingFace account (free)

---

### Step 1 — Get HuggingFace API Token

1. Go to → [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens)
2. Click **New Token** → name it anything → select **Read** permission
3. Copy the token (starts with `hf_...`)

---

### Step 2 — Install Python Dependencies

```bash
pip install flask flask-cors youtube-transcript-api langchain-text-splitters numpy requests
```

---

### Step 3 — Start the Backend Server

**Windows (PowerShell):**
```powershell
$env:HF_API_KEY = "hf_your_token_here"
python server.py
```

**Mac / Linux:**
```bash
export HF_API_KEY="hf_your_token_here"
python server.py
```

You should see:
```
🚀 YT Insight backend running on http://localhost:5000
```

> Keep this terminal open while using the extension.

---

### Step 4 — Load the Chrome Extension

1. Open Chrome → go to `chrome://extensions/`
2. Enable **Developer Mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `yt-rag-extension/` folder
5. Pin **YT Insight** from the extensions toolbar

---

### Step 5 — Use It!

1. Open any YouTube video
2. Click the **YT Insight** icon — URL auto-fills
3. Click **LOAD VIDEO** and wait ~5–15 seconds
4. Ask anything about the video

---

## ✦ API Reference

The Flask backend exposes 3 endpoints:

### `GET /health`
Check if the server is running.
```json
{ "status": "ok" }
```

---

### `POST /load`
Load a YouTube video and build the RAG index.

**Request:**
```json
{ "url": "https://www.youtube.com/watch?v=Gfr50f6ZBvo" }
```

**Response:**
```json
{
  "video_id": "Gfr50f6ZBvo",
  "chunk_count": 87,
  "preview": "In this video we explore the history of DeepMind...",
  "cached": false
}
```

---

### `POST /ask`
Ask a question about a loaded video.

**Request:**
```json
{
  "video_id": "Gfr50f6ZBvo",
  "question": "What is AlphaFold?"
}
```

**Response:**
```json
{
  "answer": "AlphaFold is an AI system developed by DeepMind that predicts...",
  "sources": [
    "...AlphaFold represents a major breakthrough in protein structure...",
    "...the system achieved human-expert level accuracy on the CASP14..."
  ]
}
```

---

### `GET /transcript?video_id=...`
Get the full raw transcript text.

---

## ✦ Example Questions to Ask

```
📋  Give me a complete summary of this video
🔑  What are the top 5 key takeaways?
🧠  Explain [concept] in simple terms
⏱️  What was discussed around the 10-minute mark?
🔍  Was [topic] mentioned in this video?
📊  What statistics or numbers were mentioned?
👤  Who are the people mentioned in this video?
❓  What problem does this video try to solve?
```

---

## ✦ How RAG Works (Simple Explanation)

```
Your Question
     │
     ▼
  Embed question → [0.23, -0.87, 0.41, ...]  (384 numbers)
     │
     ▼
  Compare with all chunk embeddings using cosine similarity
     │
     ▼
  Pick top 4 most relevant chunks from transcript
     │
     ▼
  Send chunks + question to LLM:
  "Answer this question using ONLY this context: ..."
     │
     ▼
  Answer ✓
```

This means the AI **cannot hallucinate** facts not in the video — it only uses what's actually said.

---

## ✦ Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| 🔴 Server offline (red dot) | Flask not running | Run `python server.py` |
| ⚠ No transcript available | Video has no captions | Try a video with CC enabled |
| ⚠ 404 Embedding error | Wrong HF endpoint | Check `EMBED_MODEL` in server.py |
| ⚠ 400 LLM error | Model format wrong | Ensure model name has `:cerebras` suffix |
| Model stuck at 0% | Windows symlink issue | Use `$env:HF_HOME = "D:\hf_cache"` |
| `export` not recognized | You're on PowerShell | Use `$env:HF_API_KEY = "..."` |
| `langchain.text_splitter` not found | Old LangChain | Use `langchain_text_splitters` |

---

## ✦ Customization

### Change the LLM Model
In `server.py`, edit:
```python
LLM_MODEL = "meta-llama/Llama-3.1-8B-Instruct"
```

Other fast free options:
```python
LLM_MODEL = "Qwen/Qwen2.5-7B-Instruct"       # Great for multilingual
LLM_MODEL = "google/gemma-2-2b-it"            # Very lightweight
LLM_MODEL = "mistralai/Mistral-7B-Instruct-v0.3"  # Good reasoning
```

When calling, append `:cerebras` or `:auto`:
```python
"model": f"{LLM_MODEL}:cerebras"   # Fast Cerebras hardware
"model": f"{LLM_MODEL}:auto"       # HF auto-picks best provider
```

### Change Chunk Size
```python
# Smaller = more precise, more API calls
# Larger = more context per chunk, fewer calls
RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
```

---

## ✦ Limitations

- Videos must have **English captions** (auto-generated captions work too)
- Free HuggingFace tier has **rate limits** — long videos may be slow
- Video index is stored **in memory** — restarting server clears the cache
- Works only while the **Flask server is running** locally

---

## ✦ What Makes This Different

| Feature | This Project | Basic Q&A |
|---------|-------------|-----------|
| Answers from actual video | ✅ | ❌ |
| No hallucination | ✅ (RAG grounded) | ❌ |
| Works on any length video | ✅ | ❌ |
| Shows source chunks | ✅ | ❌ |
| Free (no OpenAI needed) | ✅ | ❌ |
| No local GPU required | ✅ | ❌ |
| Chrome Extension UI | ✅ | ❌ |

---

## ✦ Built With

- [Flask](https://flask.palletsprojects.com/) — lightweight Python web framework
- [LangChain](https://langchain.com/) — text splitting utilities
- [youtube-transcript-api](https://github.com/jdepoix/youtube-transcript-api) — transcript fetching
- [HuggingFace Inference API](https://huggingface.co/docs/inference-providers) — embeddings + LLM
- [NumPy](https://numpy.org/) — vector math for similarity search

---

## ✦ License

MIT License — free to use, modify, and distribute.

---

<div align="center">

Made with 🟢 and too many API errors

**[⭐ Star this repo](https://github.com/yourusername/yt-rag-extension)** if it helped you!

</div>
