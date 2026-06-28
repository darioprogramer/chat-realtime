// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// Aumentar buffer para payloads grandes (base64 de imágenes)
const io = new Server(server, {
  maxHttpBufferSize: 1e8 // 100 MB, ajustar según necesidad
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Index.html"));
});

// objeto para guardar usuarios conectados con color
let users = {};

// función para generar un color aleatorio
function randomColor() {
  const colors = [
    "rgba(107, 180, 79, 0.94)", "#bdb766ef", "#ff0000ef", "#008db1ef",
    "#1100ffef", "#ff00ffef", "#ff4f7bef", "#a0b34cef", "#747474ef"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on("connection", (socket) => {
  console.log("Un usuario se conectó:", socket.id);

  socket.on("set username", (username) => {
    users[socket.id] = { name: username, color: randomColor() };
    io.emit("user list", Object.values(users));
  });

  socket.on("chat message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#fff" };
    // retransmitir tal cual (texto)
    io.emit("chat message", { user: userData.name, text: msg.text, color: userData.color });
  });

  socket.on("voice message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#fff" };
    // msg.audio es base64 DataURL; retransmitir tal cual
    io.emit("voice message", { user: userData.name, audio: msg.audio, color: userData.color });
  });

  socket.on("image message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#fff" };
    // msg.image es base64 DataURL; retransmitir tal cual
    io.emit("image message", { user: userData.name, image: msg.image, color: userData.color });
  });

  socket.on("disconnecting", () => {
    // eliminar antes de emitir lista para que la lista sea correcta
    delete users[socket.id];
  });

  socket.on("disconnect", (reason) => {
    console.log("Un usuario se desconectó:", socket.id, reason);
    io.emit("user list", Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
