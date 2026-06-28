// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);

// permitir payloads grandes (imágenes base64)
const io = new Server(server, {
  maxHttpBufferSize: 1e8 // 100 MB
});

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "Index.html"));
});

let users = {};        // socketId -> { name, color }
let usersByName = {};  // name -> socketId

function randomColor() {
  const colors = [
    "#bdb766ef", "#efe1b8", "#d9c79a", "#c9b58a",
    "#a78f5a", "#f0e6c8", "#e6dcc8", "#bfae7a", "#9f8b5a"
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on("connection", (socket) => {
  console.log("Un usuario se conectó:", socket.id);

  socket.on("set username", (username) => {
    if (!username) return;
    username = String(username).trim();
    users[socket.id] = { name: username, color: randomColor() };
    usersByName[username] = socket.id;
    io.emit("user list", Object.values(users));
  });

  // GLOBAL text
  socket.on("chat message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#9f8b5a" };
    io.emit("chat message", { user: userData.name, text: msg.text, color: userData.color });
  });

  // GLOBAL voice
  socket.on("voice message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#9f8b5a" };
    io.emit("voice message", { user: userData.name, audio: msg.audio, color: userData.color });
  });

  // GLOBAL image
  socket.on("image message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#9f8b5a" };
    io.emit("image message", { user: userData.name, image: msg.image, color: userData.color });
  });

  // PRIVATE text
  socket.on("private message", ({ to, text }) => {
    const fromUser = users[socket.id];
    if (!fromUser || !to) return;
    const toSocketId = usersByName[to];
    // enviar al destinatario
    if (toSocketId) {
      io.to(toSocketId).emit("private message", { from: fromUser.name, text, color: fromUser.color });
    }
    // enviar confirmación al remitente (self) con campo 'to' para que el cliente lo coloque en el chat correcto
    socket.emit("private message", { to, text, color: fromUser.color, self: true });
  });

  // PRIVATE voice
  socket.on("private voice", ({ to, audio }) => {
    const fromUser = users[socket.id];
    if (!fromUser || !to) return;
    const toSocketId = usersByName[to];
    if (toSocketId) {
      io.to(toSocketId).emit("private voice", { from: fromUser.name, audio, color: fromUser.color });
    }
    socket.emit("private voice", { to, audio, color: fromUser.color, self: true });
  });

  // PRIVATE image
  socket.on("private image", ({ to, image }) => {
    const fromUser = users[socket.id];
    if (!fromUser || !to) return;
    const toSocketId = usersByName[to];
    if (toSocketId) {
      io.to(toSocketId).emit("private image", { from: fromUser.name, image, color: fromUser.color });
    }
    socket.emit("private image", { to, image, color: fromUser.color, self: true });
  });

  socket.on("disconnecting", () => {
    const userData = users[socket.id];
    if (userData) {
      delete usersByName[userData.name];
      delete users[socket.id];
    }
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
