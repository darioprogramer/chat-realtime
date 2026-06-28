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

// objeto para guardar usuarios conectados
let users = {};

io.on("connection", (socket) => {
  console.log("Un usuario se conectó");

  // recibir nombre de usuario
  socket.on("set username", (username) => {
    users[socket.id] = username;
    // enviar lista actualizada a TODOS
    io.emit("user list", Object.values(users));
  });

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg);
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se desconectó");
    delete users[socket.id];
    // enviar lista actualizada a TODOS
    io.emit("user list", Object.values(users));
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
