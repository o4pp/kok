// ============================================================
// KOTCHA Web Client Logic
// Fully Integrated with Worker DO Engine
// ============================================================

let currentWorkerUrl = "";
let currentRoomId = "";
let ownerToken = "";
let ws = null;
let userProfile = {
  id: "user_" + Math.floor(Math.random() * 10000),
  username: "Player_" + Math.floor(Math.random() * 1000),
  displayName: "لاعب تجريبي",
  avatar: null
};

// --- DOM Elements ---
const elWorkerUrl = document.getElementById("worker-url-input");
const elRoomId = document.getElementById("room-id-input");
const elOwnerToken = document.getElementById("owner-token-input");
const elConnectionDot = document.getElementById("connection-status");
const elStatusText = document.getElementById("status-text");

// Game Admin DOM
const elGameTypeSelect = document.getElementById("game-type-select");
const elWordBattleGroup = document.getElementById("word-battle-group");
const elTargetWordInput = document.getElementById("target-word-input");

// Stats DOM
const elStatViewers = document.getElementById("stat-viewers");
const elStatGameType = document.getElementById("stat-game-type");
const elStatGameActive = document.getElementById("stat-game-active");
const elStatTotalVotes = document.getElementById("stat-total-votes");

// Displays
const elVotePanel = document.getElementById("vote-panel");
const elGuessPanel = document.getElementById("guess-panel");
const elGuessInput = document.getElementById("guess-input");
const elGuessFeedback = document.getElementById("guess-feedback");
const elChatMessages = document.getElementById("chat-messages");
const elChatInput = document.getElementById("chat-input");
const elLogMessages = document.getElementById("log-messages");

// Initialize Settings
window.addEventListener("DOMContentLoaded", () => {
  elWorkerUrl.value = window.location.origin.includes("localhost") 
    ? "http://127.0.0.1:8787" 
    : window.location.origin;
  elRoomId.value = "main-room";
});

// Select Game Change Handler
elGameTypeSelect.addEventListener("change", (e) => {
  if (e.target.value === "WORD_BATTLE") {
    elWordBattleGroup.classList.remove("hidden");
  } else {
    elWordBattleGroup.classList.add("hidden");
  }
});

// --- API Helpers ---
function getApiBase() {
  currentWorkerUrl = elWorkerUrl.value.replace(/\/$/, "");
  currentRoomId = encodeURIComponent(elRoomId.value.trim());
  return `${currentWorkerUrl}/room/${currentRoomId}`;
}

function getAuthHeaders() {
  const headers = { "Content-Type": "application/json" };
  ownerToken = elOwnerToken.value.trim();
  if (ownerToken) {
    headers["Authorization"] = `Bearer ${ownerToken}`;
  }
  return headers;
}

// Log to internal display
function appendLog(msg, type = "info") {
  const div = document.createElement("div");
  div.className = "msg-item";
  const time = new Date().toLocaleTimeString();
  div.innerHTML = `<small style="color:var(--text-muted)">[${time}]</small> <span>${msg}</span>`;
  elLogMessages.prepend(div);
}

// Render Chat Message
function appendChat(user, message) {
  const div = document.createElement("div");
  div.className = "msg-item";
  div.innerHTML = `<span class="msg-user">${user.displayName || user.username}:</span> <span>${message}</span>`;
  elChatMessages.appendChild(div);
  elChatMessages.scrollTop = elChatMessages.scrollHeight;
}

// --- REST Endpoints ---

// Create Room Endpoint
document.getElementById("btn-create-room").addEventListener("click", async () => {
  try {
    const res = await fetch(`${getApiBase()}/api/room/create`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      if (data.ownerToken) {
        elOwnerToken.value = data.ownerToken;
        appendLog(`تم إنشاء الغرفة بنجاح! رمز المالك: ${data.ownerToken}`);
      } else {
        appendLog(`الغرفة موجودة بالفعل.`);
      }
      fetchRoomStatus();
    } else {
      appendLog(`خطأ: ${data.error}`, "error");
    }
  } catch (err) {
    appendLog(`فشل الاتصال بـ Worker: ${err.message}`);
  }
});

// Start Game
document.getElementById("btn-start-game").addEventListener("click", async () => {
  const gameType = elGameTypeSelect.value;
  const payload = { gameType };
  if (gameType === "WORD_BATTLE") {
    payload.word = elTargetWordInput.value.trim();
  }

  try {
    const res = await fetch(`${getApiBase()}/api/room/start-game`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      appendLog(`بدأت لعبة: ${gameType}`);
      updateGameUI(data.game);
    } else {
      appendLog(`لم يتم البدء: ${data.error}`);
    }
  } catch (err) {
    appendLog(`خطأ أثناء بدء اللعبة: ${err.message}`);
  }
});

// Stop Game
document.getElementById("btn-stop-game").addEventListener("click", async () => {
  try {
    const res = await fetch(`${getApiBase()}/api/room/stop-game`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      appendLog("تم إيقاف اللعبة.");
      elStatGameActive.innerText = "متوقفة";
    }
  } catch (err) {
    appendLog(`خطأ الإيقاف: ${err.message}`);
  }
});

// Reset Game
document.getElementById("btn-reset-game").addEventListener("click", async () => {
  try {
    const res = await fetch(`${getApiBase()}/api/room/reset`, {
      method: "POST",
      headers: getAuthHeaders()
    });
    const data = await res.json();
    if (data.success) {
      appendLog("تم تصفير اللعبة.");
      resetPanels();
    }
  } catch (err) {
    appendLog(`خطأ التصفير: ${err.message}`);
  }
});

// Get Room Status
async function fetchRoomStatus() {
  try {
    const res = await fetch(`${getApiBase()}/api/room/status`);
    const data = await res.json();
    if (data.success) {
      elStatViewers.innerText = data.viewers;
      elStatGameType.innerText = data.gameType || "لا يوجد";
      elStatGameActive.innerText = data.active ? "نشطة" : "متوقفة";
    }
  } catch (err) {
    console.error(err);
  }
}

// --- Actions (Vote & Guess) ---

// Vote Cast
document.querySelectorAll(".btn-vote").forEach(btn => {
  btn.addEventListener("click", async () => {
    const val = parseInt(btn.getAttribute("data-value"));
    try {
      const res = await fetch(`${getApiBase()}/api/vote/cast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ value: val, user: userProfile })
      });
      const data = await res.json();
      if (!data.success) {
        alert(`فشل التصويت: ${data.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  });
});

// Number Guess
document.getElementById("btn-submit-guess").addEventListener("click", async () => {
  const guessVal = parseInt(elGuessInput.value);
  if (!guessVal) return;

  try {
    const res = await fetch(`${getApiBase()}/api/number/guess`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guess: guessVal, user: userProfile })
    });
    const data = await res.json();
    if (data.success) {
      const result = data.event.result;
      if (result === "WIN") elGuessFeedback.innerText = "🎉 إجابة صحيحة! لقد فزت!";
      else if (result === "CLOSE") elGuessFeedback.innerText = "🔥 قريب جداً!";
      else if (result === "HIGHER") elGuessFeedback.innerText = "⬆️ الرقم السري أكبر!";
      else if (result === "LOWER") elGuessFeedback.innerText = "⬇️ الرقم السري أصغر!";
    } else {
      elGuessFeedback.innerText = `خطأ: ${data.error}`;
    }
  } catch (err) {
    console.error(err);
  }
});

// Chat Send
document.getElementById("btn-send-chat").addEventListener("click", sendChat);
elChatInput.addEventListener("keypress", (e) => { if (e.key === "Enter") sendChat(); });

function sendChat() {
  const text = elChatInput.value.trim();
  if (!text) return;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "CHAT_MESSAGE", message: text }));
  } else {
    // Fallback to HTTP API
    fetch(`${getApiBase()}/api/chat/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, platform: "kotcha", user: userProfile })
    });
  }
  elChatInput.value = "";
}

// --- Real-Time WebSocket Engine ---

document.getElementById("btn-connect-ws").addEventListener("click", connectWebSocket);

function connectWebSocket() {
  const base = getApiBase().replace(/^http/, "ws");
  const wsUrl = `${base}`;

  appendLog(`جاري الاتصال بـ WebSocket: ${wsUrl}`);
  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    elConnectionDot.className = "status-dot online";
    elStatusText.innerText = "متصل حي (WebSocket)";
    appendLog("تم الاتصال بـ WebSocket بنجاح.");

    // Authenticate WS
    ws.send(JSON.stringify({
      type: "AUTH",
      platform: "kotcha",
      user: userProfile,
      ownerToken: elOwnerToken.value.trim()
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWSMessage(data);
    } catch (e) {
      console.error("Invalid WS JSON", e);
    }
  };

  ws.onclose = () => {
    elConnectionDot.className = "status-dot offline";
    elStatusText.innerText = "غير متصل";
    appendLog("تم قطع الاتصال بالخادم.");
  };

  ws.onerror = (err) => {
    appendLog("حدث خطأ في اتصال WebSocket.");
  };
}

function handleWSMessage(data) {
  switch (data.type) {
    case "CONNECTED":
      elStatViewers.innerText = data.viewers;
      break;

    case "USER_JOINED":
    case "USER_LEFT":
      elStatViewers.innerText = data.viewers;
      appendLog(`تحديث التواجد: ${data.viewers} مشاهدين.`);
      break;

    case "CHAT":
      appendChat(data.data.user, data.data.message);
      break;

    case "GAME_STARTED":
      appendLog(`بدأت اللعبة: ${data.game}`);
      elStatGameType.innerText = data.game;
      elStatGameActive.innerText = "نشطة";
      if (data.game === "VOTE") showPanel(elVotePanel);
      if (data.game === "NUMBER_GUESS") showPanel(elGuessPanel);
      break;

    case "GAME_STOPPED":
    case "GAME_RESET":
      appendLog("تم إنهاء/تصفير اللعبة الحالية.");
      resetPanels();
      break;

    case "VOTE":
      updateVoteResults(data.votes, data.total);
      break;

    case "NUMBER_GUESS":
      appendLog(`تخمين من [${data.user.displayName}]: ${data.guess} -> النتيجة: ${data.result}`);
      break;
  }
}

// --- UI Dynamic Rendering ---

function resetPanels() {
  elVotePanel.classList.add("hidden");
  elGuessPanel.classList.add("hidden");
  elStatGameType.innerText = "لا يوجد";
  elStatGameActive.innerText = "متوقفة";
  elStatTotalVotes.innerText = "0";
}

function showPanel(panel) {
  resetPanels();
  panel.classList.remove("hidden");
}

function updateGameUI(game) {
  elStatGameType.innerText = game.type || "لا يوجد";
  elStatGameActive.innerText = game.active ? "نشطة" : "متوقفة";

  if (game.type === "VOTE") {
    showPanel(elVotePanel);
    updateVoteResults(game.votes, game.votes.reduce((a, b) => a + b, 0));
  } else if (game.type === "NUMBER_GUESS") {
    showPanel(elGuessPanel);
  }
}

function updateVoteResults(votes, total) {
  elStatTotalVotes.innerText = total;
  votes.forEach((count, idx) => {
    const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
    document.getElementById(`bar-${idx + 1}`).style.width = `${pct}%`;
    document.getElementById(`val-${idx + 1}`).innerText = `${count} (${pct}%)`;
  });
}
