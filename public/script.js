// script.js - multi chats (Global + privados), base64 para audio e imagenes
const socket = io();

// pedir nombre de usuario obligatorio
let username = "";
while (!username) {
  username = prompt("Ingresa tu nombre de usuario:");
  if (username === null || username.trim() === "") {
    alert("Debes ingresar un nombre para entrar al chat.");
    username = "";
  } else {
    username = username.trim();
  }
}

socket.emit("set username", username);

// DOM
const app = document.getElementById("app");
const sidebarToggle = document.getElementById("sidebarToggle");
const searchUser = document.getElementById("searchUser");
const chatList = document.getElementById("chatList");
const chatTitle = document.getElementById("chatTitle");
const messages = document.getElementById("messages");
const input = document.getElementById("input");
const send = document.getElementById("send");
const record = document.getElementById("record");
const imageInput = document.getElementById("imageInput");
const userSelect = document.getElementById("userSelect");

// estado local
let usersOnline = {}; // name -> { name, color }
let chats = { Global: [] }; // chatName -> [messages]
let activeChat = "Global";

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
}

// administrar lista de chats en sidebar
function addChatToList(name) {
  if (document.querySelector(`#chatList li[data-chat="${CSS.escape(name)}"]`)) return;
  const li = document.createElement("li");
  li.className = "chat-item";
  li.dataset.chat = name;
  li.tabIndex = 0;
  li.innerHTML = `<span class="chat-emoji">💬</span><span class="chat-name">${escapeHtml(name)}</span>`;
  chatList.appendChild(li);
  li.addEventListener("click", () => openChat(name));
  li.addEventListener("keydown", (e) => { if (e.key === "Enter") openChat(name); });
}

function openChat(name) {
  activeChat = name;
  document.querySelectorAll("#chatList li").forEach(li => li.classList.remove("active"));
  const li = document.querySelector(`#chatList li[data-chat="${CSS.escape(name)}"]`);
  if (li) li.classList.add("active");
  renderMessages();
  // on mobile hide sidebar
  if (window.innerWidth <= 700) app.classList.remove("show-sidebar");
}

// actualizar select de usuarios online
function refreshUserSelect() {
  userSelect.innerHTML = "";
  Object.values(usersOnline).forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.name;
    opt.textContent = u.name;
    opt.style.color = u.color || "#000";
    userSelect.appendChild(opt);
  });
}

// eventos UI
sidebarToggle && sidebarToggle.addEventListener("click", () => {
  app.classList.toggle("show-sidebar");
});

chatList.addEventListener("click", (e) => {
  const li = e.target.closest("li[data-chat]");
  if (li) openChat(li.dataset.chat);
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

// enviar texto (global o privado)
send.addEventListener("click", () => {
  const text = input.value.trim();
  if (!text) return;
  if (activeChat === "Global") {
    socket.emit("chat message", { text });
  } else {
    socket.emit("private message", { to: activeChat, text });
    // optimista: añadir copia local
    const msg = { from: username, text, color: usersOnline[username]?.color, timestamp: Date.now() };
    chats[activeChat].push(msg);
    renderMessages();
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
          if (activeChat === "Global") {
            socket.emit("voice message", { audio: reader.result });
          } else {
            socket.emit("private voice", { to: activeChat, audio: reader.result });
            const msg = { from: username, type: "voice", audio: reader.result, color: usersOnline[username]?.color, timestamp: Date.now() };
            chats[activeChat].push(msg);
            renderMessages();
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
  if (!file) return;
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
      const msg = { from: username, type: "image", image: reader.result, color: usersOnline[username]?.color, timestamp: Date.now() };
      chats[activeChat].push(msg);
      renderMessages();
    }
    imageInput.value = "";
  };
  reader.readAsDataURL(file);
});

// SOCKET events

// lista de usuarios online
socket.on("user list", (list) => {
  usersOnline = {};
  list.forEach(u => { usersOnline[u.name] = u; });
  refreshUserSelect();

  // asegurar que chats existentes estén en la lista
  Object.keys(chats).forEach(name => {
    if (name !== "Global") addChatToList(name);
  });
});

// mensaje global
socket.on("chat message", (msg) => {
  const entry = { user: msg.user, text: msg.text, color: msg.color, timestamp: Date.now() };
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});

// voz global
socket.on("voice message", (msg) => {
  const entry = { user: msg.user, type: "voice", audio: msg.audio, color: msg.color, timestamp: Date.now() };
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});

// imagen global
socket.on("image message", (msg) => {
  const entry = { user: msg.user, type: "image", image: msg.image, color: msg.color, timestamp: Date.now() };
  chats.Global.push(entry);
  if (activeChat === "Global") renderMessages();
});

// mensaje privado (recibido)
socket.on("private message", (msg) => {
  const from = msg.from;
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
  const from = msg.from;
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
  const from = msg.from;
  if (!chats[from]) {
    chats[from] = [];
    addChatToList(from);
  }
  const entry = { from: msg.from, type: "image", image: msg.image, color: msg.color, timestamp: Date.now() };
  chats[from].push(entry);
  if (activeChat === from) renderMessages();
});

// conexión
socket.on("connect", () => {
  console.log("Socket conectado:", socket.id);
  const currentUser = document.getElementById("currentUser");
  if (currentUser) currentUser.textContent = username;
});

// desconexión
socket.on("disconnect", (reason) => {
  console.log("Socket desconectado:", reason);
});
