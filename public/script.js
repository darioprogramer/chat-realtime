// script.js
const socket = io(); // conecta con el servidor

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

// enviar nombre al servidor
socket.emit("set username", username);

// elementos del DOM
const input = document.getElementById("input");
const send = document.getElementById("send");
const record = document.getElementById("record");
const imageInput = document.getElementById("imageInput");
const messages = document.getElementById("messages");
const userSelect = document.getElementById("userSelect");

// helper: añadir mensaje al DOM
function appendMessage(html, scroll = true) {
  const div = document.createElement("div");
  div.innerHTML = html;
  messages.appendChild(div);
  if (scroll) messages.scrollTop = messages.scrollHeight;
}

// Enviar mensaje de texto
send.onclick = () => {
  const text = input.value.trim();
  if (text) {
    socket.emit("chat message", { text });
    input.value = "";
  }
};

// Enviar con Ctrl+Enter o Enter (Enter = enviar)
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send.click();
  }
});

// 🎤 grabar audio (base64)
let mediaRecorder;
let audioChunks = [];

record.onclick = async () => {
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
          // enviar base64
          socket.emit("voice message", { audio: reader.result });
        };
        reader.onerror = (err) => console.error("FileReader audio error:", err);
        reader.readAsDataURL(audioBlob);
      };
      mediaRecorder.start();
      record.textContent = "⏹️";
    } else {
      mediaRecorder.stop();
      record.textContent = "🎤";
    }
  } catch (err) {
    console.error("Error al acceder al micrófono:", err);
    alert("No se pudo acceder al micrófono.");
  }
};

// 📷 enviar imagen (base64)
imageInput.onchange = () => {
  const file = imageInput.files[0];
  if (!file) return;
  // opcional: limitar tamaño razonable en cliente (ej. 8MB)
  const maxSize = 8 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("La imagen es demasiado grande. Máx 8 MB.");
    imageInput.value = "";
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    // enviar base64 tal cual
    socket.emit("image message", { image: reader.result });
    imageInput.value = ""; // limpiar input para permitir reenvío
  };
  reader.onerror = (err) => {
    console.error("FileReader image error:", err);
    imageInput.value = "";
  };
  reader.readAsDataURL(file);
};

// Recibir mensajes de texto
socket.on("chat message", (msg) => {
  const isMine = msg.user === username;
  const html = `
    <div class="msg ${isMine ? "mine" : "other"}">
      <span class="username" style="color:${msg.color || "#fff"}">${msg.user || "Anon"}</span>
      <span class="text">${escapeHtml(msg.text || "")}</span>
    </div>
  `;
  appendMessage(html);
});

// Recibir mensajes de voz (base64)
socket.on("voice message", (msg) => {
  const isMine = msg.user === username;
  const html = `
    <div class="msg ${isMine ? "mine" : "other"}">
      <span class="username" style="color:${msg.color || "#fff"}">${msg.user || "Anon"}</span>
      <audio controls src="${msg.audio}"></audio>
    </div>
  `;
  appendMessage(html);
});

// Recibir mensajes de imagen (base64)
socket.on("image message", (msg) => {
  const isMine = msg.user === username;
  const html = `
    <div class="msg ${isMine ? "mine" : "other"}">
      <span class="username" style="color:${msg.color || "#fff"}">${msg.user || "Anon"}</span>
      <img src="${msg.image}" alt="imagen" class="chat-image">
    </div>
  `;
  appendMessage(html);
});

// actualizar lista de usuarios conectados
socket.on("user list", (users) => {
  userSelect.innerHTML = "";
  users.forEach((u) => {
    const option = document.createElement("option");
    option.textContent = u.name;
    option.style.color = u.color || "#fff";
    userSelect.appendChild(option);
  });
});

// util: escapar HTML en texto
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// logs para depuración
socket.on("connect", () => console.log("Socket conectado:", socket.id));
socket.on("disconnect", (reason) => console.log("Socket desconectado:", reason));
socket.on("connect_error", (err) => console.error("connect_error:", err));
