function getBase() {
  const baseUrl = document.getElementById("baseUrl").value.trim();
  const roomId = document.getElementById("roomId").value.trim();
  if (!baseUrl || !roomId) throw new Error("يجب إدخال عنوان الـ Worker ورقم الغرفة.");
  return `${baseUrl.replace(/\/+$/, "")}/room/${encodeURIComponent(roomId)}`;
}

function ownerHeaders() {
  const token = document.getElementById("ownerToken").value.trim();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function api(path, options = {}) {
  const root = getBase();
  const res = await fetch(root + path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
  return { status: res.status, data };
}

function setStatus(msg, error = false) {
  const el = document.getElementById("statusBar");
  el.textContent = msg;
  el.style.color = error ? "#fecaca" : "#bbf7d0";
}

function playSound(id) {
  const el = document.getElementById(id);
  if (el) el.currentTime = 0, el.play().catch(() => {});
}

// تهيئة الغرفة
document.getElementById("btnInitRoom").addEventListener("click", async () => {
  try {
    const { status, data } = await api("/api/room/create", {
      method: "POST",
      headers: ownerHeaders()
    });
    setStatus(status === 200 ? "تم تهيئة الغرفة بنجاح." : "حدث خطأ في التهيئة.");
    console.log("createRoom", data);
    playSound("soundStart");
  } catch (e) {
    setStatus("خطأ: " + e.message, true);
  }
});

// اختيار المنصة
let currentPlatform = null;
document.querySelectorAll(".platform-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".platform-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentPlatform = btn.dataset.platform;
    document.getElementById("platformStatus").textContent =
      `منصة البث النشطة: ${btn.textContent}`;
    playSound("soundClick");
  });
});

// تفعيل الاشتراك (محاكاة)
let hasSubscription = false;
document.getElementById("btnActivateSub").addEventListener("click", () => {
  if (!currentPlatform) {
    setStatus("اختر منصة البث أولاً.", true);
    return;
  }
  hasSubscription = true;
  document.getElementById("platformStatus").textContent =
    `اشتراك نشط على المنصة: ${currentPlatform.toUpperCase()} – يمكنك تشغيل الألعاب الآن.`;
  playSound("soundEvent");
});

// تشغيل الألعاب عبر /api/room/start-game
document.getElementById("gamesGrid").addEventListener("click", async (e) => {
  const btn = e.target.closest(".play-btn");
  if (!btn) return;
  if (!hasSubscription) {
    setStatus("لا يوجد اشتراك بث نشط – فعّل الاشتراك أولاً.", true);
    return;
  }
  if (!currentPlatform) {
    setStatus("اختر منصة البث أولاً.", true);
    return;
  }

  const card = btn.closest(".game-card");
  const gameType = card.dataset.game;
  const body = { gameType };

  if (gameType === "WORD_BATTLE") {
    const wordInput = card.querySelector(".word-input");
    const word = (wordInput.value || "").trim();
    if (!word) {
      setStatus("أدخل الكلمة المستهدفة للـ WORD_BATTLE.", true);
      return;
    }
    body.word = word;
  }

  try {
    const { status, data } = await api("/api/room/start-game", {
      method: "POST",
      body: JSON.stringify(body),
      headers: ownerHeaders()
    });
    setStatus(status === 200 ? `تم تشغيل اللعبة: ${gameType}` : "تعذر تشغيل اللعبة.");
    console.log("startGame", data);
    playSound("soundStart");
  } catch (err) {
    setStatus("خطأ في تشغيل اللعبة: " + err.message, true);
  }
});

// شات
document.getElementById("btnSendChat").addEventListener("click", async () => {
  try {
    const username = document.getElementById("chatUsername").value.trim() || "Anonymous";
    const message = document.getElementById("chatMessage").value.trim();
    if (!message) {
      setStatus("الرسالة فارغة.", true);
      return;
    }
    const platform = currentPlatform || "kotcha";
    const { status, data } = await api("/api/chat/send", {
      method: "POST",
      body: JSON.stringify({
        message,
        platform,
        user: { username }
      })
    });
    document.getElementById("chatOutput").textContent =
      JSON.stringify({ status, data }, null, 2);
    playSound("soundClick");
  } catch (e) {
    setStatus("خطأ في إرسال الشات: " + e.message, true);
  }
});

document.getElementById("btnLoadChat").addEventListener("click", async () => {
  try {
    const { status, data } = await api("/api/chat/history");
    document.getElementById("chatOutput").textContent =
      JSON.stringify({ status, data }, null, 2);
  } catch (e) {
    setStatus("خطأ في تحميل الشات: " + e.message, true);
  }
});

// الأحداث / الإحصائيات / لوحة الصدارة
document.getElementById("btnLoadEvents").addEventListener("click", async () => {
  try {
    const { status, data } = await api("/api/events");
    document.getElementById("eventsOutput").textContent =
      JSON.stringify({ status, data }, null, 2);
    playSound("soundEvent");
  } catch (e) {
    setStatus("خطأ في تحميل الأحداث: " + e.message, true);
  }
});

document.getElementById("btnLoadStats").addEventListener("click", async () => {
  try {
    const { status, data } = await api("/api/stats");
    document.getElementById("statsOutput").textContent =
      JSON.stringify({ status, data }, null, 2);
  } catch (e) {
    setStatus("خطأ في تحميل الإحصائيات: " + e.message, true);
  }
});

document.getElementById("btnLoadLeaderboard").addEventListener("click", async () => {
  try {
    const { status, data } = await api("/api/leaderboard");
    document.getElementById("leaderboardOutput").textContent =
      JSON.stringify({ status, data }, null, 2);
  } catch (e) {
    setStatus("خطأ في تحميل لوحة الصدارة: " + e.message, true);
  }
});

// WebSocket
let ws;
document.getElementById("btnConnectWS").addEventListener("click", () => {
  try {
    const root = getBase();
    const wsUrl = root.replace(/^http/, "ws");
    ws = new WebSocket(wsUrl);
    const log = document.getElementById("wsLog");

    ws.addEventListener("open", () => {
      log.textContent += "[OPEN]\n";
      setStatus("تم الاتصال بـ WebSocket.");
    });

    ws.addEventListener("message", (event) => {
      try {
        const data = JSON.parse(event.data);
        log.textContent += "[MSG] " + JSON.stringify(data) + "\n";
        playSound("soundEvent");
      } catch {
        log.textContent += "[RAW] " + event.data + "\n";
      }
      log.scrollTop = log.scrollHeight;
    });

    ws.addEventListener("close", () => {
      log.textContent += "[CLOSE]\n";
      setStatus("تم إغلاق WebSocket.");
    });

    ws.addEventListener("error", () => {
      log.textContent += "[ERROR]\n";
      setStatus("خطأ في WebSocket.", true);
    });
  } catch (e) {
    setStatus("خطأ في الاتصال بـ WebSocket: " + e.message, true);
  }
});
