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
const messages = document.getElementById("messages");
const userSelect = document.getElementById("userSelect"); // desplegable

// Enviar mensaje al servidor
send.onclick = () => {
  if (input.value.trim()) {
    socket.emit("chat message", { user: username, text: input.value.trim() });
    input.value = "";
  }
};

// Recibir mensajes en tiempo real
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

// actualizar lista de usuarios conectados en tiempo real
socket.on("user list", (users) => {
  userSelect.innerHTML = ""; // limpiar
  users.forEach((u) => {
    const option = document.createElement("option");
    option.textContent = u.name;
    option.style.color = u.color; // aplicar color en el desplegable
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
    // Enter solo = salto de línea normal
  }
});
