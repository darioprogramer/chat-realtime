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

let users = {};

function randomColor() {
  const colors = [
    "#bdb766ef", // beige/amarillo suave
    "#efe1b8",
    "#d9c79a",
    "#c9b58a",
    "#a78f5a",
    "#f0e6c8",
    "#e6dcc8",
    "#bfae7a",
    "#9f8b5a"
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
    const userData = users[socket.id] || { name: "Anon", color: "#9f8b5a" };
    io.emit("chat message", { user: userData.name, text: msg.text, color: userData.color });
  });

  socket.on("voice message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#9f8b5a" };
    io.emit("voice message", { user: userData.name, audio: msg.audio, color: userData.color });
  });

  socket.on("image message", (msg) => {
    const userData = users[socket.id] || { name: "Anon", color: "#9f8b5a" };
    io.emit("image message", { user: userData.name, image: msg.image, color: userData.color });
  });

  socket.on("disconnecting", () => {
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
