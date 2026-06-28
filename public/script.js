const socket = io(); // conecta con el servidor

const input = document.getElementById('input');
const send = document.getElementById('send');
const messages = document.getElementById('messages');

// Enviar mensaje al servidor
send.onclick = () => {
  if (input.value.trim()) {
    socket.emit("chat message", input.value.trim());
    input.value = "";
  }
};

// Recibir mensajes en tiempo real
socket.on("chat message", (msg) => {
  const div = document.createElement("div");
  div.textContent = msg;
  div.className = "msg other"; // puedes diferenciar según usuario
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
