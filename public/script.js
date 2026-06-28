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

// Enviar mensaje de texto
send.onclick = () => {
  if (input.value.trim()) {
    socket.emit("chat message", { user: username, text: input.value.trim() });
    input.value = "";
  }
};

// 🎤 grabar audio
let mediaRecorder;
let audioChunks = [];

record.onclick = async () => {
  if (!mediaRecorder || mediaRecorder.state === "inactive") {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.ondataavailable = (e) => audioChunks.push(e.data);
    mediaRecorder.onstop = () => {
      const audioBlob = new Blob(audioChunks, { type: "audio/webm" });
      audioChunks = [];
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("voice message", { user: username, audio: reader.result });
      };
      reader.readAsArrayBuffer(audioBlob);
    };
    mediaRecorder.start();
    record.textContent = "⏹️";
  } else {
    mediaRecorder.stop();
    record.textContent = "🎤";
  }
};

// 📷 enviar imagen (corregido)
imageInput.onchange = () => {
  const file = imageInput.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = () => {
      socket.emit("image message", { user: username, image: reader.result });
      imageInput.value = ""; // 🔑 limpiar input para permitir nuevas fotos
    };
    reader.readAsDataURL(file); // usar base64 en lugar de ArrayBuffer
  }
};

// Recibir mensajes de texto
socket.on("chat message", (msg) => {
  const div = document.createElement("div");
  div.className = msg.user === username ? "msg mine" : "msg other";
  div.innerHTML = `
    <span class="username" style="color:${msg.color}">${msg.user}</span><br>
    <span class="text">${msg.text}</span>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// Recibir mensajes de voz
socket.on("voice message", (msg) => {
  const div = document.createElement("div");
  div.className = `voice-message ${msg.user === username ? "mine" : "other"}`;
  const audioBlob = new Blob([msg.audio], { type: "audio/webm" });
  const audioURL = URL.createObjectURL(audioBlob);
  div.innerHTML = `
    <span class="username" style="color:${msg.color}">${msg.user}</span>
    <audio controls src="${audioURL}"></audio>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// Recibir mensajes de imagen (corregido para base64)
socket.on("image message", (msg) => {
  const div = document.createElement("div");
  div.className = `image-message ${msg.user === username ? "mine" : "other"}`;
  div.innerHTML = `
    <span class="username" style="color:${msg.color}">${msg.user}</span><br>
    <img src="${msg.image}" alt="imagen" class="chat-image">
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});

// actualizar lista de usuarios conectados
socket.on("user list", (users) => {
  userSelect.innerHTML = "";
  users.forEach((u) => {
    const option = document.createElement("option");
    option.textContent = u.name;
    option.style.color = u.color;
    userSelect.appendChild(option);
  });
});

// Manejo de Enter y Ctrl+Enter
input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    if (e.ctrlKey) {
      e.preventDefault();
      send.click();
    }
  }
});
