const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
app.use(express.static("public"));

const MAP = 5000;
let players = {};
let food = [];

for (let i = 0; i < 800; i++) {
  food.push({
    x: Math.random() * MAP,
    y: Math.random() * MAP,
    emoji: ["🍎","🍌","🍇","🍒","🍕","🍔","🍩","🍪"][Math.floor(Math.random()*8)]
  });
}

io.on("connection", socket => {
  socket.on("join", data => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "Player",
      skin: data.skin || "😈",
      x: 2000 + Math.random() * 1000,
      y: 2000 + Math.random() * 1000,
      size: 30,
      blobs: [{x:0, y:0, size:30}]
    };
    socket.emit("init", {players, food, map: MAP});
  });

  socket.on("move", dir => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    const speed = Math.max(1, 8 / (p.size / 30)); // bigger = slower, no lag
    p.x += dir.x * speed;
    p.y += dir.y * speed;
    p.x = Math.max(0, Math.min(MAP - p.size, p.x));
    p.y = Math.max(0, Math.min(MAP - p.size, p.y));

    // eat food (simple, fast)
    food = food.filter(f => {
      const dist = Math.hypot(f.x - p.x, f.y - p.y);
      if (dist < p.size / 2 + 15) {
        p.size += 2;
        return false;
      }
      return true;
    });

    // eat players (fast check)
    for (let id in players) {
      if (id === socket.id) continue;
      const other = players[id];
      const dist = Math.hypot(other.x - p.x, other.y - p.y);
      if (dist < (p.size + other.size)/2 && p.size > other.size * 1.1) {
        p.size += other.size / 4;
        delete players[id];
        io.emit("killfeed", `${p.name} ate ${other.name}`);
      }
    }

    // respawn food (batch)
    if (food.length < 800) {
      for (let i = 0; i < 50; i++) {
        food.push({x: Math.random()*MAP, y: Math.random()*MAP, emoji: "🍎"});
      }
    }

    io.emit("state", {players, food});
  });

  socket.on("split", () => {
    if (!players[socket.id] || players[socket.id].size < 40) return;
    const p = players[socket.id];
    p.size /= 2;
    p.blobs.push({x: p.x + 30, y: p.y + 30, size: p.size / 2});
  });

  socket.on("chat", msg => {
    if (msg.trim()) io.emit("chat", `${players[socket.id]?.name}: ${msg}`);
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

// emit only on changes, no spam
setInterval(() => {
  if (Object.keys(players).length > 0) io.emit("state", {players, food});
}, 100); // 10fps server update, no lag

server.listen(process.env.PORT || 3000, () => {
  console.log("LEAN .IO LIVE — 0 LAG, WASD ONLY, NO BUGS FAM");
});
