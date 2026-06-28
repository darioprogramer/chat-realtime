const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/Index.html");
});

// objeto para guardar usuarios conectados con color
let users = {};

// función para generar un color aleatorio
function randomColor() {
  const colors = ["rgba(72, 255, 0, 0.94)", "#ffee00ef", "#ff0000ef", "#00fff2ef", "#1100ffef", "#ff00ffef", "#ff4f7bef", "#e1ff5bef","#747474ef"];
  return colors[Math.floor(Math.random() * colors.length)];
}

io.on("connection", (socket) => {
  console.log("Un usuario se conectó");

  socket.on("set username", (username) => {
    users[socket.id] = { name: username, color: randomColor() };
    io.emit("user list", Object.values(users)); // enviar lista actualizada
  });

  socket.on("chat message", (msg) => {
    const userData = users[socket.id];
    if (userData) {
      io.emit("chat message", { user: userData.name, text: msg.text, color: userData.color });
    }
  });

  socket.on("disconnecting", () => {
    delete users[socket.id];
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se desconectó");
    io.emit("user list", Object.values(users)); // actualizar lista
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
