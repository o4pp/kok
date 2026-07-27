// Basic helper to build endpoint URLs
function getBase() {
  const baseUrl = document.getElementById("baseUrl").value.trim();
  const roomId = document.getElementById("roomId").value.trim();
  if (!baseUrl || !roomId) {
    throw new Error("Base URL and Room ID are required.");
  }
  // Room root: /room/{roomId}/
  return {
    root: `${baseUrl.replace(/\/+$/, "")}/room/${encodeURIComponent(roomId)}`,
    roomId
  };
}

function getOwnerHeaders() {
  const token = document.getElementById("ownerToken").value.trim();
  if (!token) return {};
  return {
    Authorization: `Bearer ${token}`
  };
}

async function safeFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, data: json };
}

function setJson(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = JSON.stringify(value, null, 2);
}

function setStatus(msg, isError = false) {
  const el = document.getElementById("connectionStatus");
  el.textContent = msg;
  el.style.color = isError ? "#fecaca" : "#bbf7d0";
}

// Room info
document.getElementById("btnConnectRoom").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/");
    setJson("roomInfo", { status, data });
    setStatus("Room info loaded.");
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Room status
document.getElementById("btnRefreshStatus").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/room/status");
    setJson("roomStatus", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Game state
document.getElementById("btnGameState").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/game/state");
    setJson("gameState", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Start game
document.getElementById("btnStartGame").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const type = document.getElementById("gameType").value;
    const word = document.getElementById("wordBattleWord").value.trim();
    const body = { gameType: type };
    if (type === "WORD_BATTLE") {
      body.word = word;
    }
    const { status, data } = await safeFetch(root + "/api/room/start-game", {
      method: "POST",
      body: JSON.stringify(body),
      headers: getOwnerHeaders()
    });
    setJson("gameState", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Stop game
document.getElementById("btnStopGame").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/room/stop-game", {
      method: "POST",
      headers: getOwnerHeaders()
    });
    setJson("gameState", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Reset game
document.getElementById("btnResetGame").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/room/reset", {
      method: "POST",
      headers: getOwnerHeaders()
    });
    setJson("gameState", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Vote API
document.getElementById("btnCastVote").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const value = Number(document.getElementById("voteValue").value);
    const username = document.getElementById("voteUsername").value.trim() || "Anonymous";
    const body = {
      value,
      user: { username }
    };
    const { status, data } = await safeFetch(root + "/api/vote/cast", {
      method: "POST",
      body: JSON.stringify(body)
    });
    setJson("voteResult", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Number guess API
document.getElementById("btnSendGuess").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const guess = Number(document.getElementById("guessValue").value);
    const username = document.getElementById("guessUsername").value.trim() || "Anonymous";
    const body = {
      guess,
      user: { username }
    };
    const { status, data } = await safeFetch(root + "/api/number/guess", {
      method: "POST",
      body: JSON.stringify(body)
    });
    setJson("guessResult", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Chat send
document.getElementById("btnSendChat").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const message = document.getElementById("chatMessage").value.trim();
    const platform = document.getElementById("chatPlatform").value;
    const username = document.getElementById("chatUsername").value.trim() || "Anonymous";
    const body = {
      message,
      platform,
      user: { username }
    };
    const { status, data } = await safeFetch(root + "/api/chat/send", {
      method: "POST",
      body: JSON.stringify(body)
    });
    setJson("chatHistory", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Chat history
document.getElementById("btnLoadChatHistory").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/chat/history");
    setJson("chatHistory", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Events
document.getElementById("btnLoadEvents").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/events");
    setJson("events", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Stats
document.getElementById("btnLoadStats").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/stats");
    setJson("stats", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// Leaderboard
document.getElementById("btnLoadLeaderboard").addEventListener("click", async () => {
  try {
    const { root } = getBase();
    const { status, data } = await safeFetch(root + "/api/leaderboard");
    setJson("leaderboard", { status, data });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});

// WebSocket connection
let ws;

document.getElementById("btnConnectWS").addEventListener("click", () => {
  try {
    const { root } = getBase();
    const wsUrl = root.replace(/^http/, "ws");
    ws = new WebSocket(wsUrl);
    const logEl = document.getElementById("wsLog");

    ws.addEventListener("open", () => {
      setStatus("WebSocket connected.");
      logEl.textContent += "[OPEN]\n";
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        logEl.textContent += "[MESSAGE] " + JSON.stringify(data) + "\n";
      } catch {
        logEl.textContent += "[MESSAGE RAW] " + event.data + "\n";
      }
      logEl.scrollTop = logEl.scrollHeight;
    });

    ws.addEventListener("close", () => {
      setStatus("WebSocket closed.");
      logEl.textContent += "[CLOSE]\n";
    });

    ws.addEventListener("error", () => {
      setStatus("WebSocket error.", true);
      logEl.textContent += "[ERROR]\n";
    });
  } catch (e) {
    setStatus("Error: " + e.message, true);
  }
});
