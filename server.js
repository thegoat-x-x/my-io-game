// server.js - Professional .io Game Server
const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static("public"));

const MAP_SIZE = 5000;
const FOOD_COUNT = 1000;
const POWERUP_COUNT = 10;

let players = {};
let food = [];
let powerups = [];

// Generate food
function spawnFood(count = FOOD_COUNT) {
  const foods = ["🍎", "🍌", "🍇", "🍒", "🍕", "🍔", "🌮", "🍩", "🍪", "🥝", "🍓", "🍉"];
  for (let i = 0; i < count; i++) {
    food.push({
      id: Math.random(),
      x: Math.random() * MAP_SIZE,
      y: Math.random() * MAP_SIZE,
      emoji: foods[Math.floor(Math.random() * foods.length)]
    });
  }
}

// Power-up types
const powerupTypes = [
  { emoji: "⚡", color: "#ffff00", name: "Speed", duration: 8000 },
  { emoji: "🛡️", color: "#00ffff", name: "Shield", duration: 10000 },
  { emoji: "💣", color: "#ff0066", name: "Bomb", duration: 100 },
  { emoji: "❄️", color: "#00ffff", name: "Freeze", duration: 5000 },
  { emoji: "🍄", color: "#ff8800", name: "Grow", duration: 100 },
  { emoji: "🧲", color: "#ff00ff", name: "Magnet", duration: 8000 }
];

function spawnPowerup() {
  const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
  powerups.push({
    id: Math.random(),
    x: Math.random() * MAP_SIZE,
    y: Math.random() * MAP_SIZE,
    ...type
  });
}

spawnFood();
for (let i = 0; i < POWERUP_COUNT; i++) spawnPowerup();

io.on("connection", (socket) => {
  console.log("Player connected:", socket.id);

  socket.on("join", (data) => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "Player",
      skin: data.skin || "😎",
      x: 1000 + Math.random() * 3000,
      y: 1000 + Math.random() * 3000,
      mass: 50,
      blobs: [{ x: 0, y: 0, mass: 50 }],
      color: `hsl(${Math.random() * 360}, 100%, 70%)`,
      powerup: null,
      powerupEnd: 0
    };
    socket.emit("init", { id: socket.id, players, food, powerups, mapSize: MAP_SIZE });
  });

  socket.on("move", (mouse) => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    const speed = 3.5 / Math.pow(p.mass, 0.2);
    p.blobs.forEach(blob => {
      const dx = mouse.x - blob.x;
      const dy = mouse.y - blob.y;
      const dist = Math.hypot(dx, dy) || 1;
      blob.x += (dx / dist) * speed;
      blob.y += (dy / dist) * speed;
    });
  });

  socket.on("split", () => {
    if (!players[socket.id] || players[socket.id].blobs.length >= 16) return;
    const p = players[socket.id];
    const newBlobs = [];
    p.blobs.forEach(b => {
      if (b.mass > 20) {
        b.mass /= 2;
        newBlobs.push({ x: b.x + 20, y: b.y + 20, mass: b.mass });
      }
    });
    p.blobs.push(...newBlobs);
  });

  socket.on("chat", (msg) => {
    if (msg.trim()) {
      io.emit("chat", { name: players[socket.id]?.name || "??", msg: msg.trim() });
    }
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});

// Game loop
setInterval(() => {
  if (Object.keys(players).length === 0) return;

  // Eat food & powerups
  for (let id in players) {
    const p = players[id];
    p.mass = p.blobs.reduce((a, b) => a + b.mass, 0);

    p.blobs = p.blobs.filter(b => b.mass > 10);

    food = food.filter(f => {
      for (let blob of p.blobs) {
        if (Math.hypot(f.x - (p.x + blob.x), f.y - (p.y + blob.y)) < p.mass / 3) {
          blob.mass += 2;
          return false;
        }
      }
      return true;
    });

    powerups = powerups.filter(pu => {
      for (let blob of p.blobs) {
        if (Math.hypot(pu.x - (p.x + blob.x), pu.y - (p.y + blob.y)) < p.mass / 2) {
          p.powerup = pu.name;
          p.powerupEnd = Date.now() + pu.duration;
          io.emit("killfeed", `${p.name} got ${pu.name}!`);
          return false;
        }
      }
      return true;
    });
  }

  // Respawn food & powerups
  while (food.length < FOOD_COUNT) spawnFood(10);
  while (powerups.length < POWERUP_COUNT) spawnPowerup();

  io.emit("gameState", { players, food, powerups });
}, 1000 / 60);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 EMOJI.IO LIVE ON PORT ${PORT} — BEST .IO GAME EVER MADE 🔥`);
});
