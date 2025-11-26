const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
app.use(express.static("public"));

const MAP = 5000;
let players = {};
let food = [];

for (let i = 0; i < 1200; i++) {
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
  });

  socket.on("move", dir => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    const speed = 5 + (1000 / p.size); // bigger = slower
    p.blobs.forEach(b => {
      b.x += dir.x * speed;
      b.y += dir.y * speed;
    });

    // eat food
    food = food.filter(f => {
      for (let b of p.blobs) {
        if (Math.hypot(f.x - (p.x + b.x), f.y - (p.y + b.y)) < p.size / 2) {
          p.size += 3;
          b.size += 3;
          return false;
        }
      }
      return true;
    });

    // eat players
    for (let id in players) {
      if (id === socket.id) continue;
      const other = players[id];
      for (let b1 of p.blobs) {
        for (let b2 of other.blobs) {
          if (Math.hypot((p.x + b1.x) - (other.x + b2.x), (p.y + b1.y) - (other.y + b2.y)) < p.size / 2 &&
              p.size > other.size * 1.1) {
            p.size += other.size / 5;
            b1.size += other.size / 5;
            delete players[id];
            io.emit("killfeed", `${p.name} ate ${other.name}`);
            return;
          }
        }
      }
    }

    while (food.length < 1200) {
      food.push({x: Math.random()*MAP, y: Math.random()*MAP, emoji: "🍎"});
    }

    io.emit("state", {players, food});
  });

  socket.on("split", () => {
    if (!players[socket.id] || players[socket.id].blobs.length >= 16) return;
    const p = players[socket.id];
    const newBlobs = [];
    p.blobs.forEach(b => {
      if (b.size > 35) {
        b.size /= 2;
        newBlobs.push({x: b.x + 30, y: b.y + 30, size: b.size});
      }
    });
    p.blobs.push(...newBlobs);
  });

  socket.on("chat", msg => {
    if (msg.trim()) io.emit("chat", `${players[socket.id]?.name}: ${msg}`);
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

setInterval(() => io.emit("state", {players, food}), 1000/60);

server.listen(process.env.PORT || 3000, () => {
  console.log("CLEAN .IO GAME LIVE — NO LAG, NO NEON, NO BULLSHIT");
});
