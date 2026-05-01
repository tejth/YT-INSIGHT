"""
YT Insight Backend — Flask RAG Server (Fixed for Python 3.14 + Windows)
No local model downloads. Everything via HuggingFace Inference API.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from youtube_transcript_api import YouTubeTranscriptApi
from langchain_text_splitters import RecursiveCharacterTextSplitter
import requests
import numpy as np
import re
import os

app = Flask(__name__)
CORS(app)

# ─── CONFIG ───────────────────────────────────────────────────────────────────
HF_API_KEY  = os.environ.get("HF_API_KEY", "")
EMBED_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LLM_MODEL   = "meta-llama/Llama-3.1-8B-Instruct"
HF_HEADERS  = {"Authorization": f"Bearer {HF_API_KEY}", "Content-Type": "application/json"}

VIDEO_CACHE = {}


# ─── HELPERS ──────────────────────────────────────────────────────────────────

def extract_video_id(url_or_id):
    patterns = [
        r"(?:v=|youtu\.be/|embed/|shorts/)([A-Za-z0-9_-]{11})",
        r"^([A-Za-z0-9_-]{11})$",
    ]
    for p in patterns:
        m = re.search(p, url_or_id)
        if m:
            return m.group(1)
    return None


def get_transcript(video_id):
    try:
        ytt = YouTubeTranscriptApi()
        fetched = ytt.fetch(video_id, languages=["en"])
        return " ".join(snippet.text for snippet in fetched)
    except Exception:
        try:
            ytt = YouTubeTranscriptApi()
            tlist = ytt.list(video_id)
            t = next(iter(tlist))
            fetched = t.fetch()
            return " ".join(snippet.text for snippet in fetched)
        except Exception as e:
            raise ValueError(f"No transcript available: {e}")

def get_embeddings(texts):
    url  = f"https://router.huggingface.co/hf-inference/models/{EMBED_MODEL}/pipeline/feature-extraction"
    resp = requests.post(
        url, headers=HF_HEADERS,
        json={"inputs": texts, "options": {"wait_for_model": True}},
        timeout=60
    )
    resp.raise_for_status()
    arr = np.array(resp.json(), dtype=np.float32)
    if arr.ndim == 3:
        arr = arr.mean(axis=1)
    return arr

def cosine_similarity(a, b):
    a = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-10)
    b = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-10)
    return np.dot(a, b.T)


def build_index(text):
    splitter = RecursiveCharacterTextSplitter(chunk_size=800, chunk_overlap=150)
    chunks   = splitter.split_text(text)
    print(f"  → {len(chunks)} chunks, embedding via HF API...")
    all_embs = []
    batch_size = 32
    for i in range(0, len(chunks), batch_size):
        batch = chunks[i:i+batch_size]
        embs  = get_embeddings(batch)
        all_embs.append(embs)
        print(f"  → embedded {min(i+batch_size, len(chunks))}/{len(chunks)}")
    return chunks, np.vstack(all_embs)


def retrieve(query, chunks, matrix, k=4):
    q_emb = get_embeddings([query])
    sims  = cosine_similarity(q_emb, matrix)[0]
    top_k = np.argsort(sims)[::-1][:k]
    return [chunks[i] for i in top_k]


def query_llm(context, question):
    resp = requests.post(
        "https://router.huggingface.co/v1/chat/completions",
        headers=HF_HEADERS,
        json={
            "model": f"{LLM_MODEL}:cerebras",
            "messages": [
                {"role": "system", "content": "You answer questions about YouTube videos using only the transcript context provided. If the answer is not in the context, say 'This topic is not covered in the video.'"},
                {"role": "user", "content": f"CONTEXT:\n{context}\n\nQUESTION: {question}"}
            ],
            "max_tokens": 512,
            "temperature": 0.3
        },
        timeout=120,
    )
    resp.raise_for_status()
    return resp.json()["choices"][0]["message"]["content"].strip()


# ─── ROUTES ───────────────────────────────────────────────────────────────────

@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/load", methods=["POST"])
def load_video():
    body     = request.get_json(force=True)
    url      = body.get("url", "").strip()
    video_id = extract_video_id(url)

    if not video_id:
        return jsonify({"error": "Could not extract a valid YouTube video ID."}), 400

    if video_id in VIDEO_CACHE:
        c = VIDEO_CACHE[video_id]
        return jsonify({"video_id": video_id, "chunk_count": len(c["chunks"]), "preview": c["preview"], "cached": True})

    try:
        print(f"Fetching transcript for {video_id}...")
        transcript = get_transcript(video_id)
    except ValueError as e:
        return jsonify({"error": str(e)}), 422

    try:
        print("Building index via HF API...")
        chunks, matrix = build_index(transcript)
    except Exception as e:
        return jsonify({"error": f"Embedding error: {e}"}), 500

    preview = transcript[:300] + "..." if len(transcript) > 300 else transcript
    VIDEO_CACHE[video_id] = {"chunks": chunks, "embeddings": matrix, "preview": preview, "transcript": transcript}

    print(f"Video {video_id} ready — {len(chunks)} chunks")
    return jsonify({"video_id": video_id, "chunk_count": len(chunks), "preview": preview, "cached": False})


@app.route("/ask", methods=["POST"])
def ask():
    body     = request.get_json(force=True)
    video_id = body.get("video_id", "").strip()
    question = body.get("question", "").strip()

    if not video_id or not question:
        return jsonify({"error": "video_id and question are required."}), 400
    if video_id not in VIDEO_CACHE:
        return jsonify({"error": "Video not loaded. Call /load first."}), 404

    cache = VIDEO_CACHE[video_id]
    try:
        docs    = retrieve(question, cache["chunks"], cache["embeddings"])
        context = "\n\n".join(docs)
        answer  = query_llm(context, question)
    except Exception as e:
        return jsonify({"error": f"Error: {e}"}), 500

    return jsonify({"answer": answer, "sources": [d[:120] + "..." for d in docs]})


@app.route("/transcript", methods=["GET"])
def get_full_transcript():
    video_id = request.args.get("video_id", "").strip()
    if not video_id or video_id not in VIDEO_CACHE:
        return jsonify({"error": "Video not loaded."}), 404
    return jsonify({"transcript": VIDEO_CACHE[video_id]["transcript"]})


if __name__ == "__main__":
    print("🚀 YT Insight backend running on http://localhost:5000")
    app.run(debug=True, port=5000)
