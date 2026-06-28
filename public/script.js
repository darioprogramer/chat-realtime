// script.js (base64 para imagen y audio, mantiene colores y clases)
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

const input = document.getElementById("input");
const send = document.getElementById("send");
const record = document.getElementById("record");
const imageInput = document.getElementById("imageInput");
const messages = document.getElementById("messages");
const userSelect = document.getElementById("userSelect");

function appendElement(el) {
  messages.appendChild(el);
  messages.scrollTop = messages.scrollHeight;
}

// Enviar texto
send.onclick = () => {
  const text = input.value.trim();
  if (!text) return;
  socket.emit("chat message", { text });
  input.value = "";
};

// Enter para enviar (sin Shift)
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    send.click();
  }
});

// Grabar audio (base64)
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
          socket.emit("voice message", { audio: reader.result });
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
};

// Enviar imagen (base64)
imageInput.onchange = () => {
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
    socket.emit("image message", { image: reader.result });
    imageInput.value = "";
  };
  reader.readAsDataURL(file);
};

// Recibir texto
socket.on("chat message", (msg) => {
  const el = document.createElement("div");
  el.className = `msg ${msg.user === username ? "mine" : "other"}`;
  const name = document.createElement("span");
  name.className = "username";
  if (msg.color) name.style.color = msg.color;
  name.textContent = msg.user || "Anon";
  const text = document.createElement("div");
  text.className = "text";
  text.textContent = msg.text || "";
  el.appendChild(name);
  el.appendChild(text);
  appendElement(el);
});

// Recibir audio
socket.on("voice message", (msg) => {
  const el = document.createElement("div");
  el.className = `voice-message ${msg.user === username ? "mine" : "other"}`;
  const name = document.createElement("div");
  name.className = "username";
  if (msg.color) name.style.color = msg.color;
  name.textContent = msg.user || "Anon";
  const audio = document.createElement("audio");
  audio.controls = true;
  audio.src = msg.audio;
  el.appendChild(name);
  el.appendChild(audio);
  appendElement(el);
});

// Recibir imagen
socket.on("image message", (msg) => {
  const el = document.createElement("div");
  el.className = `image-message ${msg.user === username ? "mine" : "other"}`;
  const name = document.createElement("div");
  name.className = "username";
  if (msg.color) name.style.color = msg.color;
  name.textContent = msg.user || "Anon";
  const img = document.createElement("img");
  img.className = "chat-image";
  img.src = msg.image;
  img.alt = "imagen";
  el.appendChild(name);
  el.appendChild(img);
  appendElement(el);
});

// Lista de usuarios
socket.on("user list", (users) => {
  userSelect.innerHTML = "";
  users.forEach(u => {
    const opt = document.createElement("option");
    opt.textContent = u.name;
    opt.style.color = u.color || "#000";
    userSelect.appendChild(opt);
  });
});

// logs
socket.on("connect", () => console.log("Conectado:", socket.id));
socket.on("disconnect", (r) => console.log("Desconectado:", r));
