// YT Insight — Popup Script
// ─────────────────────────────────────────────────────────────────────────────

const $ = (sel, ctx = document) => ctx.querySelector(sel);
const $$ = (sel, ctx = document) => [...ctx.querySelectorAll(sel)];

// ─── State ───────────────────────────────────────────────────────────────────
const state = {
  videoId: null,
  loading: false,
  chatHistory: [],
};

// ─── Elements ────────────────────────────────────────────────────────────────
const el = {
  statusDot:         $("#statusDot .dot"),
  statusLabel:       $("#statusLabel"),
  screenLoad:        $("#screenLoad"),
  screenChat:        $("#screenChat"),
  videoUrl:          $("#videoUrl"),
  pasteBtn:          $("#pasteBtn"),
  loadBtn:           $("#loadBtn"),
  loadLoader:        $("#loadLoader"),
  loaderText:        $("#loaderText"),
  loadError:         $("#loadError"),
  videoIdDisplay:    $("#videoIdDisplay"),
  chunkCount:        $("#chunkCount"),
  newVideoBtn:       $("#newVideoBtn"),
  transcriptToggle:  $("#transcriptToggle"),
  transcriptPreview: $("#transcriptPreview"),
  chatWindow:        $("#chatWindow"),
  questionInput:     $("#questionInput"),
  sendBtn:           $("#sendBtn"),
  chatError:         $("#chatError"),
  quickActions:      $("#quickActions"),
};

// ─── Server Health Check ─────────────────────────────────────────────────────
function checkHealth() {
  chrome.runtime.sendMessage({ type: "HEALTH_CHECK" }, (resp) => {
    if (resp && resp.ok) {
      el.statusDot.className = "dot online";
      el.statusLabel.textContent = "server online";
    } else {
      el.statusDot.className = "dot offline";
      el.statusLabel.textContent = "server offline";
    }
  });
}

// ─── Show / Hide Screens ─────────────────────────────────────────────────────
function showScreen(name) {
  el.screenLoad.classList.toggle("active",  name === "load");
  el.screenLoad.classList.toggle("hidden",  name !== "load");
  el.screenChat.classList.toggle("active",  name === "chat");
  el.screenChat.classList.toggle("hidden",  name !== "chat");
}

// ─── Error Helpers ───────────────────────────────────────────────────────────
function showError(el_, msg) {
  el_.textContent = `⚠ ${msg}`;
  el_.classList.remove("hidden");
}
function hideError(el_) { el_.classList.add("hidden"); }

// ─── Load Loader ─────────────────────────────────────────────────────────────
const loadingMessages = [
  "fetching transcript...",
  "splitting into chunks...",
  "generating embeddings...",
  "building vector store...",
  "almost there...",
];
let loaderInterval;

function startLoader() {
  let i = 0;
  el.loadLoader.classList.remove("hidden");
  el.loaderText.textContent = loadingMessages[0];
  loaderInterval = setInterval(() => {
    i = (i + 1) % loadingMessages.length;
    el.loaderText.textContent = loadingMessages[i];
  }, 1800);
}
function stopLoader() {
  clearInterval(loaderInterval);
  el.loadLoader.classList.add("hidden");
}

// ─── Load Video ───────────────────────────────────────────────────────────────
el.loadBtn.addEventListener("click", loadVideo);
el.videoUrl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loadVideo();
});

el.pasteBtn.addEventListener("click", async () => {
  try {
    const text = await navigator.clipboard.readText();
    el.videoUrl.value = text;
  } catch {
    el.videoUrl.focus();
  }
});

function loadVideo() {
  const url = el.videoUrl.value.trim();
  if (!url) {
    showError(el.loadError, "Please enter a YouTube URL or video ID.");
    return;
  }
  if (state.loading) return;

  hideError(el.loadError);
  state.loading = true;
  el.loadBtn.disabled = true;
  startLoader();

  chrome.runtime.sendMessage({ type: "LOAD_VIDEO", url }, (resp) => {
    stopLoader();
    state.loading = false;
    el.loadBtn.disabled = false;

    if (chrome.runtime.lastError || !resp) {
      showError(el.loadError, "Could not connect to extension. Try reloading.");
      return;
    }
    if (!resp.ok || resp.data?.error) {
      showError(el.loadError, resp.data?.error || resp.error || "Unknown error.");
      return;
    }

    const data = resp.data;
    state.videoId = data.video_id;

    // Update UI
    el.videoIdDisplay.textContent = data.video_id;
    el.chunkCount.textContent = `${data.chunk_count} chunks`;
    el.transcriptPreview.textContent = data.preview || "";

    // Reset chat
    resetChat();
    showScreen("chat");

    // Save to storage
    chrome.storage.session.set({
      currentVideoId: data.video_id,
      transcriptPreview: data.preview,
      chunkCount: data.chunk_count,
    });
  });
}

// ─── Reset Chat ───────────────────────────────────────────────────────────────
function resetChat() {
  state.chatHistory = [];
  el.chatWindow.innerHTML = `
    <div class="welcome-msg">
      <div class="welcome-icon">◈</div>
      <p>Video loaded. Ask me anything about it.</p>
      <div class="quick-actions" id="quickActions">
        <button class="quick-btn" data-q="Give me a complete summary of this video">Summary</button>
        <button class="quick-btn" data-q="What are the key takeaways from this video?">Key points</button>
        <button class="quick-btn" data-q="What topics are covered in this video?">Topics</button>
        <button class="quick-btn" data-q="Explain the main concept discussed in this video">Main concept</button>
      </div>
    </div>`;

  // Re-bind quick buttons
  $$(".quick-btn", el.chatWindow).forEach((btn) => {
    btn.addEventListener("click", () => {
      const q = btn.getAttribute("data-q");
      el.questionInput.value = q;
      sendQuestion();
    });
  });
}

// ─── New Video ────────────────────────────────────────────────────────────────
el.newVideoBtn.addEventListener("click", () => {
  state.videoId = null;
  el.videoUrl.value = "";
  showScreen("load");
  hideError(el.loadError);
});

// ─── Transcript Toggle ────────────────────────────────────────────────────────
el.transcriptToggle.addEventListener("click", () => {
  const hidden = el.transcriptPreview.classList.toggle("hidden");
  el.transcriptToggle.innerHTML = hidden
    ? "<span>▸ transcript preview</span>"
    : "<span>▾ transcript preview</span>";
});

// ─── Auto-grow Textarea ────────────────────────────────────────────────────────
el.questionInput.addEventListener("input", () => {
  el.questionInput.style.height = "auto";
  el.questionInput.style.height = Math.min(el.questionInput.scrollHeight, 80) + "px";
});

el.questionInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendQuestion();
  }
});

el.sendBtn.addEventListener("click", sendQuestion);

// ─── Append Message ───────────────────────────────────────────────────────────
function appendMessage(role, text, sources = []) {
  // Remove welcome message if present
  const welcome = el.chatWindow.querySelector(".welcome-msg");
  if (welcome) welcome.remove();

  const wrapper = document.createElement("div");
  wrapper.className = `msg msg-${role}`;

  const label = document.createElement("div");
  label.className = "msg-label";
  label.textContent = role === "user" ? "YOU" : "AI";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.textContent = text;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);

  if (role === "ai" && sources.length) {
    const srcRow = document.createElement("div");
    srcRow.className = "msg-sources";
    sources.slice(0, 3).forEach((s) => {
      const chip = document.createElement("div");
      chip.className = "source-chip";
      chip.textContent = s;
      chip.title = s;
      srcRow.appendChild(chip);
    });
    wrapper.appendChild(srcRow);
  }

  el.chatWindow.appendChild(wrapper);
  el.chatWindow.scrollTop = el.chatWindow.scrollHeight;
  return wrapper;
}

function appendThinking() {
  const wrapper = document.createElement("div");
  wrapper.className = "msg msg-ai";
  wrapper.id = "thinkingBubble";

  const label = document.createElement("div");
  label.className = "msg-label";
  label.textContent = "AI";

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble thinking-bubble";
  bubble.innerHTML = `
    <div class="thinking-dot"></div>
    <div class="thinking-dot"></div>
    <div class="thinking-dot"></div>`;

  wrapper.appendChild(label);
  wrapper.appendChild(bubble);
  el.chatWindow.appendChild(wrapper);
  el.chatWindow.scrollTop = el.chatWindow.scrollHeight;
}

function removeThinking() {
  const t = document.getElementById("thinkingBubble");
  if (t) t.remove();
}

// ─── Send Question ────────────────────────────────────────────────────────────
function sendQuestion() {
  const question = el.questionInput.value.trim();
  if (!question || !state.videoId) return;

  hideError(el.chatError);
  el.questionInput.value = "";
  el.questionInput.style.height = "auto";
  el.sendBtn.disabled = true;

  appendMessage("user", question);
  appendThinking();

  state.chatHistory.push({ role: "user", content: question });

  chrome.runtime.sendMessage(
    { type: "ASK_QUESTION", video_id: state.videoId, question },
    (resp) => {
      removeThinking();
      el.sendBtn.disabled = false;

      if (chrome.runtime.lastError || !resp) {
        showError(el.chatError, "Connection error. Is the server running?");
        return;
      }
      if (!resp.ok || resp.data?.error) {
        showError(el.chatError, resp.data?.error || resp.error || "LLM error.");
        return;
      }

      const { answer, sources } = resp.data;
      appendMessage("ai", answer, sources || []);
      state.chatHistory.push({ role: "assistant", content: answer });
    }
  );
}

// ─── Auto-detect YouTube tab ──────────────────────────────────────────────────
function autoFillFromActiveTab() {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs.length) return;
    const url = tabs[0].url || "";
    if (url.includes("youtube.com/watch") || url.includes("youtu.be/")) {
      el.videoUrl.value = url;
    }
  });
}

// ─── Init ────────────────────────────────────────────────────────────────────
checkHealth();
setInterval(checkHealth, 15000);
autoFillFromActiveTab();

// Restore session state if we were already on a video
chrome.storage.session.get(["currentVideoId", "transcriptPreview", "chunkCount"], (data) => {
  if (data.currentVideoId) {
    state.videoId = data.currentVideoId;
    el.videoIdDisplay.textContent = data.currentVideoId;
    el.chunkCount.textContent = `${data.chunkCount || "?"} chunks`;
    el.transcriptPreview.textContent = data.transcriptPreview || "";
    resetChat();
    showScreen("chat");
  }
});
