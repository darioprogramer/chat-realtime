const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("Un usuario se conectó");

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg); // msg incluye {user, text}
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se desconectó");
  });
});

server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});
