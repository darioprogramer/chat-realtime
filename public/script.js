// script.js - cliente revisado: espera connect antes de pedir nombre, mobile fixes, no duplicados
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

// estado local
let username = "";
let usersOnline = {}; // name -> { name, color }
let chats = { Global: [] }; // chatName -> [messages]
let activeChat = "Global";
let connected = false;

// helpers
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

// administrar lista de chats en sidebar (delegación)
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

// abrir chat
function openChat(name) {
  if (!name) return;
  activeChat = name;
  document.querySelectorAll("#chatList li").forEach(li => li.classList.remove("active"));
  const li = document.querySelector(`#chatList li[data-chat="${CSS.escape(name)}"]`);
  if (li) li.classList.add("active");
  renderMessages();
  // on mobile hide sidebar and show chatWindow
  if (window.innerWidth <= 700) {
    app.classList.remove("show-sidebar");
    const chatWindow = document.getElementById("chatWindow");
    if (chatWindow) chatWindow.style.display = "flex";
  }
}

// actualizar select de usuarios online
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

// UI events

// ensure mobile starts showing only sidebar (chat list)
function ensureMobileStart() {
  const chatWindow = document.getElementById("chatWindow");
  if (window.innerWidth <= 700) {
    app.classList.add("show-sidebar");
    if (chatWindow) chatWindow.style.display = "none";
  } else {
    app.classList.remove("show-sidebar");
    if (chatWindow) chatWindow.style.display = "flex";
  }
}
document.addEventListener("DOMContentLoaded", ensureMobileStart);
window.addEventListener("resize", ensureMobileStart);

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

// Delegación de clicks en chatList (incluye Global)
chatList.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-chat]");
  if (li) {
    const name = li.dataset.chat;
    openChat(name);
  }
});
chatList.addEventListener("keydown", (e) => {
  const li = e.target.closest("li[data-chat]");
  if (li && e.key === "Enter") openChat(li.dataset.chat);
});

// buscar / crear chat con Enter
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

// seleccionar usuario del select crea/abre chat
userSelect.addEventListener("change", () => {
  const name = userSelect.value;
  if (!name) return;
  if (name === username) return;
  if (!chats[name]) chats[name] = [];
  addChatToList(name);
  openChat(name);
});

// enviar texto (global o privado) - no optimistic push
send.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text || !connected) return;
  if (activeChat === "Global") {
    socket.emit("chat message", { text });
  } else {
    socket.emit("private message", { to: activeChat, text });
  }
  input.value = "";
});

// Enter para enviar (sin Shift)
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send.click();
  }
});

// GRABAR AUDIO (base64)
let mediaRecorder;
let audioChunks = [];

record.addEventListener("click", async () => {
  try {
    if (!mediaRecorder || mediaRecorder.state === "inactive") {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder = new MediaRecorder(stream);
      audioChunks = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) audioChunks.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onload = () => {
          if (!connected) return;
          if (activeChat === "Global") {
            socket.emit("voice message", { audio: reader.result });
          } else {
            socket.emit("private voice", { to: activeChat, audio: reader.result });
          }
        };
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorder.start();
      record.textContent = "⏹️";
    } else {
      mediaRecorder.stop();
      record.textContent = "🎤";
    }
  } catch (err) {
    console.error("Mic error:", err);
    alert("No se pudo acceder al micrófono.");
  }
});

// ENVIAR IMAGEN (base64)
imageInput.addEventListener("change", () => {
  const file = imageInput.files[0];
  if (!file || !connected) return;
  const maxSize = 8 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("La imagen es demasiado grande. Máx 8 MB.");
    imageInput.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    if (activeChat === "Global") {
      socket.emit("image message", { image: reader.result });
    } else {
      socket.emit("private image", { to: activeChat, image: reader.result });
    }
    imageInput.value = "";
  };
  reader.readAsDataURL(file);
});

// SOCKET events

// Conexión: pedir username aquí para asegurar mapping en servidor
socket.on("connect", () => {
  connected = true;
  console.log("Socket conectado:", socket.id);

  // pedir nombre de usuario obligatorio (ahora que estamos conectados)
  if (!username) {
    while (!username) {
      const n = prompt("Ingresa tu nombre de usuario:");
      if (n === null) {
        // si cancela, usar un anon con timestamp
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

// lista de usuarios online
socket.on("user list", (list) => {
  usersOnline = {};
  list.forEach(u => { if (u && u.name) usersOnline[u.name] = u; });
  refreshUserSelect();

  // asegurar que chats existentes estén en la lista
  Object.keys(chats).forEach(name => {
    if (name !== "Global") addChatToList(name);
  });

  // actualizar participantes si estás en un chat privado
  renderParticipants(activeChat);
});

// actualizar select de usuarios online
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

// mensaje global (servidor emite a todos, incluido remitente)
socket.on("chat message", (msg) => {
  if (!msg || !msg.user) return;
  const entry = { user: msg.user, text: msg.text, color: msg.color, timestamp: Date.now() };
  if (!chats.Global) chats.Global = [];
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});

// voz global
socket.on("voice message", (msg) => {
  if (!msg || !msg.user) return;
  const entry = { user: msg.user, type: "voice", audio: msg.audio, color: msg.color, timestamp: Date.now() };
  if (!chats.Global) chats.Global = [];
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});

// imagen global
socket.on("image message", (msg) => {
  if (!msg || !msg.user) return;
  const entry = { user: msg.user, type: "image", image: msg.image, color: msg.color, timestamp: Date.now() };
  if (!chats.Global) chats.Global = [];
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});

// mensaje privado (recibido por destinatario OR confirmation to sender with self:true)
socket.on("private message", (msg) => {
  if (!msg) return;

  // confirmation to sender: { to, text, color, self:true }
  if (msg.self && msg.to) {
    const to = msg.to;
    if (!chats[to]) chats[to] = [];
    const entry = { from: username, text: msg.text, color: msg.color, timestamp: Date.now() };
    chats[to].push(entry);
    if (activeChat === to) renderMessages();
    return;
  }

  const from = msg.from;
  if (!from) return;
  if (from === username) return; // safety
  if (!chats[from]) {
    chats[from] = [];
    addChatToList(from);
  }
  const entry = { from: msg.from, text: msg.text, color: msg.color, timestamp: Date.now() };
  chats[from].push(entry);
  if (activeChat === from) renderMessages();
});

// voz privada
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
  if (!from) return;
  if (from === username) return;
  if (!chats[from]) {
    chats[from] = [];
    addChatToList(from);
  }
  const entry = { from: msg.from, type: "voice", audio: msg.audio, color: msg.color, timestamp: Date.now() };
  chats[from].push(entry);
  if (activeChat === from) renderMessages();
});

// imagen privada
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
  if (!from) return;
  if (from === username) return;
  if (!chats[from]) {
    chats[from] = [];
    addChatToList(from);
  }
  const entry = { from: msg.from, type: "image", image: msg.image, color: msg.color, timestamp: Date.now() };
  chats[from].push(entry);
  if (activeChat === from) renderMessages();
});

// desconexión
socket.on("disconnect", (reason) => {
  connected = false;
  console.log("Socket desconectado:", reason);
});
