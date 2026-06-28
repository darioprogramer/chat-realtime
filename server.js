const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// usar la carpeta public para archivos estáticos
app.use(express.static("public"));

// ruta principal: servir index.html
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/public/Index.html");
});

// socket.io
io.on("connection", (socket) => {
  console.log("Un usuario se conectó");

  socket.on("chat message", (msg) => {
    io.emit("chat message", msg); // msg incluye {user, text}
  });

  socket.on("disconnect", () => {
    console.log("Un usuario se desconectó");
  });
});

// Render necesita que uses process.env.PORT
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
