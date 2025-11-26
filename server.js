const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http, { cors: { origin: "*" } });

const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname + "/public"));

// World settings
const WORLD_W = 2400;
const WORLD_H = 1600;
const FOOD_COUNT = 60;

// game state
let players = {}; // { socketId: { x,y, size, emoji, vx, vy, name } }
let food = [];

// food types
const foodTypes = [
  { emoji: "🍎", growth: 2 },
  { emoji: "🍌", growth: 3 },
  { emoji: "🍇", growth: 4 },
  { emoji: "🍒", growth: 5 }
];

// spawn initial food
function spawnFood() {
  food = [];
  for (let i = 0; i < FOOD_COUNT; i++) {
    const f = foodTypes[Math.floor(Math.random() * foodTypes.length)];
    food.push({
      id: Math.random().toString(36).slice(2, 9),
      x: Math.random() * (WORLD_W - 40) + 20,
      y: Math.random() * (WORLD_H - 40) + 20,
      emoji: f.emoji,
      growth: f.growth
    });
  }
}
spawnFood();

io.on("connection", socket => {
  console.log("connect:", socket.id);

  // initialize player server-side
  players[socket.id] = {
    x: Math.random() * (WORLD_W - 60) + 30,
    y: Math.random() * (WORLD_H - 60) + 30,
    size: 36,
    emoji: "😎",
    vx: 0,
    vy: 0,
    name: "Player"
  };

  // send init packet
  socket.emit("init", {
    id: socket.id,
    world: { w: WORLD_W, h: WORLD_H },
    players,
    food
  });

  // broadcast new players to everyone
  io.emit("players", players);

  socket.on("ready", data => {
    if (players[socket.id]) {
      if (data && data.emoji) players[socket.id].emoji = data.emoji;
      if (data && data.name) players[socket.id].name = data.name;
      io.emit("players", players);
    }
  });

  socket.on("move", d => {
    // server trusts position but clamps/sanitizes
    if (!players[socket.id]) return;
    const p = players[socket.id];

    // sanitize numeric input
    const x = Number(d.x) || p.x;
    const y = Number(d.y) || p.y;

    // clamp inside world
    p.x = Math.max(0, Math.min(WORLD_W - p.size, x));
    p.y = Math.max(0, Math.min(WORLD_H - p.size, y));

    // check collisions with food (circle-ish)
    for (let i = 0; i < food.length; i++) {
      const f = food[i];
      const dx = (f.x) - p.x;
      const dy = (f.y) - p.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      if (dist < p.size * 0.6) { // approximate collide
        p.size += f.growth;
        // respawn that food
        const nf = foodTypes[Math.floor(Math.random()*foodTypes.length)];
        food[i] = {
          id: Math.random().toString(36).slice(2,9),
          x: Math.random() * (WORLD_W - 40) + 20,
          y: Math.random() * (WORLD_H - 40) + 20,
          emoji: nf.emoji,
          growth: nf.growth
        };
      }
    }

    // broadcast updates
    io.emit("players", players);
    io.emit("food", food);
  });

  socket.on("disconnect", () => {
    console.log("disconnect:", socket.id);
    delete players[socket.id];
    io.emit("players", players);
  });
});

// Small periodic cleanup / broadcast to keep clients in sync (optional)
setInterval(() => {
  io.emit("players", players);
  io.emit("food", food);
}, 1000);

http.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
