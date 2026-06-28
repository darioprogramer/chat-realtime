const socket = io(); // conecta con el servidor

// pedir nombre de usuario temporal (obligatorio)
let username = "";

while (!username) {
  username = prompt("Ingresa tu nombre de usuario:");
  if (username === null || username.trim() === "") {
    alert("Debes ingresar un nombre para entrar al chat.");
    username = ""; // fuerza a repetir el prompt
  } else {
    username = username.trim();
  }
}

// elementos del DOM
const input = document.getElementById("input");
const send = document.getElementById("send");
const messages = document.getElementById("messages");

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

  // si el mensaje es mío, uso clase "mine", si es de otro "other"
  div.className = msg.user === username ? "msg mine" : "msg other";

  div.innerHTML = `
    <span class="username">${msg.user}</span><br>
    <span class="text">${msg.text}</span>
  `;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
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
