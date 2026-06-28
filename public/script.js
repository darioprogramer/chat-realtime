// script.js - correcciones: teclado móvil no abre sidebar, grabación robusta, compresión imágenes
const socket = io();

// DOM
const app = document.getElementById("app");
const sidebarToggle = document.getElementById("sidebarToggle");
const backToChats = document.getElementById("backToChats");
const searchUser = document.getElementById("searchUser");
const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");
const chatParticipants = document.getElementById("chatParticipants");
const messages = document.getElementById("messages");
const input = document.getElementById("input");
const send = document.getElementById("send");
const record = document.getElementById("record");
const imageInput = document.getElementById("imageInput");
const userSelect = document.getElementById("userSelect");
const currentUserSpan = document.getElementById("currentUser");

// estado
let username = "";
let usersOnline = {};
let chats = { Global: [] };
let activeChat = "Global";
let connected = false;
let isProcessingMedia = false;
let lastWindowWidth = window.innerWidth;

// util
function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
function appendElement(el) {
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}
function renderParticipants(name) {
  if (name === "Global") {
    const count = Object.keys(usersOnline).length;
    chatParticipants.textContent = `${count} online`;
  } else {
    const other = name;
    const otherOnline = usersOnline[other] ? "●" : "○";
    const meOnline = usersOnline[username] ? "●" : "○";
    chatParticipants.textContent = `${username} ${meOnline} · ${other} ${otherOnline}`;
  }
}
function renderMessages() {
  messages.innerHTML = "";
  const list = chats[activeChat] || [];
  list.forEach((msg) => {
    let el;
    if (msg.type === "voice") {
      el = document.createElement("div");
      el.className = `voice-message ${msg.user === username || msg.from === username ? "mine" : "other"}`;
      const name = document.createElement("div");
      name.className = "username";
      if (msg.color) name.style.color = msg.color;
      name.textContent = msg.user || msg.from || "Anon";
      const audio = document.createElement("audio");
      audio.controls = true;
      audio.src = msg.audio;
      el.appendChild(name);
      el.appendChild(audio);
    } else if (msg.type === "image") {
      el = document.createElement("div");
      el.className = `image-message ${msg.user === username || msg.from === username ? "mine" : "other"}`;
      const name = document.createElement("div");
      name.className = "username";
      if (msg.color) name.style.color = msg.color;
      name.textContent = msg.user || msg.from || "Anon";
      const img = document.createElement("img");
      img.className = "chat-image";
      img.src = msg.image;
      img.alt = "imagen";
      el.appendChild(name);
      el.appendChild(img);
    } else {
      el = document.createElement("div");
      el.className = `msg ${msg.user === username || msg.from === username ? "mine" : "other"}`;
      const name = document.createElement("span");
      name.className = "username";
      if (msg.color) name.style.color = msg.color;
      name.textContent = msg.user || msg.from || "Anon";
      const text = document.createElement("div");
      text.className = "text";
      text.innerHTML = escapeHtml(msg.text || "");
      el.appendChild(name);
      el.appendChild(text);
    }
    appendElement(el);
  });
  chatTitle.textContent = activeChat === "Global" ? "Chat Global" : activeChat;
  renderParticipants(activeChat);
}

// sidebar / chats
function addChatToList(name) {
  if (!name || name === username) return;
  if (document.querySelector(`#chatList li[data-chat="${CSS.escape(name)}"]`)) return;
  const li = document.createElement("li");
  li.className = "chat-item";
  li.dataset.chat = name;
  li.tabIndex = 0;
  li.innerHTML = `<span class="chat-emoji">💬</span><span class="chat-name">${escapeHtml(name)}</span>`;
  chatList.appendChild(li);
}
function openChat(name) {
  if (!name) return;
  activeChat = name;
  document.querySelectorAll("#chatList li").forEach(li => li.classList.remove("active"));
  const li = document.querySelector(`#chatList li[data-chat="${CSS.escape(name)}"]`);
  if (li) li.classList.add("active");
  renderMessages();
  if (window.innerWidth <= 700) {
    app.classList.remove("show-sidebar");
    const chatWindow = document.getElementById("chatWindow");
    if (chatWindow) chatWindow.style.display = "flex";
  }
}

// UI events
function ensureMobileStart(initial = false) {
  const chatWindow = document.getElementById("chatWindow");
  const w = window.innerWidth;
  // On initial load, force sidebar visible on small screens.
  if (initial) {
    if (w <= 700) {
      app.classList.add("show-sidebar");
      if (chatWindow) chatWindow.style.display = "none";
    } else {
      app.classList.remove("show-sidebar");
      if (chatWindow) chatWindow.style.display = "flex";
    }
    lastWindowWidth = w;
    return;
  }
  // On resize, only react if width changed significantly (avoid keyboard resize)
  if (Math.abs(w - lastWindowWidth) > 80) {
    if (w <= 700) {
      app.classList.add("show-sidebar");
      if (chatWindow) chatWindow.style.display = "none";
    } else {
      app.classList.remove("show-sidebar");
      if (chatWindow) chatWindow.style.display = "flex";
    }
    lastWindowWidth = w;
  }
}
document.addEventListener("DOMContentLoaded", () => ensureMobileStart(true));
window.addEventListener("resize", () => ensureMobileStart(false));

sidebarToggle && sidebarToggle.addEventListener("click", () => {
  app.classList.toggle("show-sidebar");
  const chatWindow = document.getElementById("chatWindow");
  if (app.classList.contains("show-sidebar")) {
    if (chatWindow) chatWindow.style.display = "none";
  } else {
    if (chatWindow) chatWindow.style.display = "flex";
  }
});
backToChats && backToChats.addEventListener("click", () => {
  app.classList.add("show-sidebar");
  const chatWindow = document.getElementById("chatWindow");
  if (chatWindow && window.innerWidth <= 700) chatWindow.style.display = "none";
});

// delegation for chat list
chatList.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-chat]");
  if (li) openChat(li.dataset.chat);
});
chatList.addEventListener("keydown", (e) => {
  const li = e.target.closest("li[data-chat]");
  if (li && e.key === "Enter") openChat(li.dataset.chat);
});

// search/create chat
searchUser.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const name = searchUser.value.trim();
    if (!name) return;
    if (name === username) {
      alert("No puedes abrir un chat privado contigo mismo.");
      searchUser.value = "";
      return;
    }
    if (!chats[name]) chats[name] = [];
    addChatToList(name);
    openChat(name);
    searchUser.value = "";
  }
});
userSelect.addEventListener("change", () => {
  const name = userSelect.value;
  if (!name || name === username) return;
  if (!chats[name]) chats[name] = [];
  addChatToList(name);
  openChat(name);
});

// send text (no optimistic push)
send.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text || !connected || isProcessingMedia) return;
  if (activeChat === "Global") {
    socket.emit("chat message", { text });
  } else {
    socket.emit("private message", { to: activeChat, text });
  }
  input.value = "";
});
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send.click();
  }
});

// --- IMAGE: compress and send ---
async function compressImageFile(file, maxDim = 1024, quality = 0.75) {
  const bitmap = await createImageBitmap(file);
  let { width, height } = bitmap;
  const ratio = width / height;
  if (width > maxDim || height > maxDim) {
    if (ratio > 1) {
      width = maxDim;
      height = Math.round(maxDim / ratio);
    } else {
      height = maxDim;
      width = Math.round(maxDim * ratio);
    }
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close && bitmap.close();
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve(blob);
    }, "image/jpeg", quality);
  });
}

imageInput.addEventListener("change", async () => {
  const file = imageInput.files[0];
  if (!file || !connected || isProcessingMedia) {
    imageInput.value = "";
    return;
  }
  isProcessingMedia = true;
  disableControls(true);
  try {
    const compressedBlob = await compressImageFile(file, 1024, 0.75);
    const finalMax = 10 * 1024 * 1024;
    if (compressedBlob.size > finalMax) {
      alert("La imagen sigue siendo muy grande después de comprimir. Elige otra más pequeña.");
      imageInput.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (activeChat === "Global") {
        socket.emit("image message", { image: dataUrl });
      } else {
        socket.emit("private image", { to: activeChat, image: dataUrl });
      }
      imageInput.value = "";
    };
    reader.onerror = () => {
      console.error("Error leyendo la imagen");
      imageInput.value = "";
    };
    reader.readAsDataURL(compressedBlob);
  } catch (err) {
    console.error("Error procesando imagen:", err);
    alert("No se pudo procesar la imagen.");
  } finally {
    isProcessingMedia = false;
    disableControls(false);
  }
});

// --- AUDIO: record and send robustly ---
let mediaRecorder;
let audioChunks = [];

record.addEventListener("click", async () => {
  if (!connected) {
    alert("Aún no estás conectado al servidor. Espera un momento e intenta de nuevo.");
    return;
  }
  if (isProcessingMedia) return;
  try {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = async () => {
        isProcessingMedia = true;
        disableControls(true);
        try {
          const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
          const reader = new FileReader();
          reader.onload = () => {
            const dataUrl = reader.result;
            if (activeChat === "Global") {
              socket.emit("voice message", { audio: dataUrl });
            } else {
              socket.emit("private voice", { to: activeChat, audio: dataUrl });
            }
          };
          reader.onerror = () => console.error("Error leyendo audio");
          reader.readAsDataURL(audioBlob);
        } catch (err) {
          console.error("Error procesando audio:", err);
        } finally {
          isProcessingMedia = false;
          disableControls(false);
        }
      };
      mediaRecorder.start();
      record.textContent = "⏹️";
    } else {
      mediaRecorder.stop();
      record.textContent = "🎤";
    }
  } catch (err) {
    console.error("Mic error:", err);
    alert("No se pudo acceder al micrófono. Revisa permisos y vuelve a intentarlo.");
  }
});

// disable/enable controls while processing
function disableControls(disable) {
  send.disabled = disable;
  record.disabled = disable;
  imageInput.disabled = disable;
  searchUser.disabled = disable;
  userSelect.disabled = disable;
  if (disable) {
    send.style.opacity = "0.6";
    record.style.opacity = "0.6";
  } else {
    send.style.opacity = "";
    record.style.opacity = "";
  }
}

// SOCKET events & connection
socket.on("connect", () => {
  connected = true;
  console.log("Socket conectado:", socket.id);
  if (!username) {
    while (!username) {
      const n = prompt("Ingresa tu nombre de usuario:");
      if (n === null) {
        username = `Anon-${Math.floor(Math.random()*1000)}`;
        break;
      }
      if (n.trim() === "") {
        alert("Debes ingresar un nombre para entrar al chat.");
        continue;
      }
      username = n.trim();
    }
    socket.emit("set username", username);
    if (currentUserSpan) currentUserSpan.textContent = username;
  }
});

socket.on("user list", (list) => {
  usersOnline = {};
  list.forEach(u => { if (u && u.name) usersOnline[u.name] = u; });
  refreshUserSelect();
  Object.keys(chats).forEach(name => { if (name !== "Global") addChatToList(name); });
  renderParticipants(activeChat);
});

function refreshUserSelect() {
  userSelect.innerHTML = '<option value="">Selecciona un usuario</option>';
  Object.values(usersOnline).forEach(u => {
    if (u.name === username) return;
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    opt.style.color = u.color || "#000";
    userSelect.appendChild(opt);
  });
}

// GLOBAL handlers
socket.on("chat message", (msg) => {
  if (!msg || !msg.user) return;
  const entry = { user: msg.user, text: msg.text, color: msg.color, timestamp: Date.now() };
  if (!chats.Global) chats.Global = [];
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});
socket.on("voice message", (msg) => {
  if (!msg || !msg.user) return;
  const entry = { user: msg.user, type: "voice", audio: msg.audio, color: msg.color, timestamp: Date.now() };
  if (!chats.Global) chats.Global = [];
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});
socket.on("image message", (msg) => {
  if (!msg || !msg.user) return;
  const entry = { user: msg.user, type: "image", image: msg.image, color: msg.color, timestamp: Date.now() };
  if (!chats.Global) chats.Global = [];
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});

// PRIVATE handlers
socket.on("private message", (msg) => {
  if (!msg) return;
  if (msg.self && msg.to) {
    const to = msg.to;
    if (!chats[to]) chats[to] = [];
    const entry = { from: username, text: msg.text, color: msg.color, timestamp: Date.now() };
    chats[to].push(entry);
    if (activeChat === to) renderMessages();
    return;
  }
  const from = msg.from;
  if (!from || from === username) return;
  if (!chats[from]) { chats[from] = []; addChatToList(from); }
  const entry = { from: msg.from, text: msg.text, color: msg.color, timestamp: Date.now() };
  chats[from].push(entry);
  if (activeChat === from) renderMessages();
});
socket.on("private voice", (msg) => {
  if (!msg) return;
  if (msg.self && msg.to) {
    const to = msg.to;
    if (!chats[to]) chats[to] = [];
    const entry = { from: username, type: "voice", audio: msg.audio, color: msg.color, timestamp: Date.now() };
    chats[to].push(entry);
    if (activeChat === to) renderMessages();
    return;
  }
  const from = msg.from;
  if (!from || from === username) return;
  if (!chats[from]) { chats[from] = []; addChatToList(from); }
  const entry = { from: msg.from, type: "voice", audio: msg.audio, color: msg.color, timestamp: Date.now() };
  chats[from].push(entry);
  if (activeChat === from) renderMessages();
});
socket.on("private image", (msg) => {
  if (!msg) return;
  if (msg.self && msg.to) {
    const to = msg.to;
    if (!chats[to]) chats[to] = [];
    const entry = { from: username, type: "image", image: msg.image, color: msg.color, timestamp: Date.now() };
    chats[to].push(entry);
    if (activeChat === to) renderMessages();
    return;
  }
  const from = msg.from;
  if (!from || from === username) return;
  if (!chats[from]) { chats[from] = []; addChatToList(from); }
  const entry = { from: msg.from, type: "image", image: msg.image, color: msg.color, timestamp: Date.now() };
  chats[from].push(entry);
  if (activeChat === from) renderMessages();
});

socket.on("disconnect", (reason) => {
  connected = false;
  console.log("Socket desconectado:", reason);
});
