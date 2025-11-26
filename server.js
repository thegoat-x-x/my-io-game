// server.js — Fantasy Battle.IO Server (gobattle.io inspired: knights/ninjas platformer royale)
const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

const MAP_W = 4000;
const MAP_H = 2000;
const GRAVITY = 0.6;
const JUMP = -15;
const SPEED = 5;
const THROW_SPEED = 20;

let players = {};
let projectiles = [];
const platforms = [
  {x: 0, y: MAP_H - 100, w: MAP_W, h: 100}, // ground
  {x: 200, y: 1500, w: 600, h: 50},
  {x: 1000, y: 1200, w: 800, h: 50},
  {x: 2200, y: 900, w: 500, h: 50},
  {x: 800, y: 600, w: 400, h: 50},
  {x: 2800, y: 400, w: 600, h: 50}
];

io.on("connection", socket => {
  console.log("Warrior joined:", socket.id);

  socket.on("join", data => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "Warrior",
      skin: data.skin || "🥷", // ninja/knight emoji fallback
      x: 500 + Math.random() * 3000,
      y: 100,
      vx: 0, vy: 0,
      facing: 1,
      health: 100,
      kills: 0,
      onGround: false,
      anim: "idle",
      frame: 0
    };
    socket.emit("init", { platforms, map: {w: MAP_W, h: MAP_H} });
  });

  socket.on("input", input => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.vx = 0;
    if (input.left) p.vx = -SPEED, p.facing = -1;
    if (input.right) p.vx = SPEED, p.facing = 1;
    if (input.jump && p.onGround) p.vy = JUMP;
    if (input.attack) {
      projectiles.push({
        x: p.x + (p.facing * 50),
        y: p.y,
        vx: p.facing * THROW_SPEED,
        type: "shuriken" // or sword throw for knights
      });
      p.anim = "attack";
    }
    p.anim = p.vx !== 0 ? "run" : p.onGround ? "idle" : "jump";
  });

  socket.on("chat", msg => {
    if (msg.trim()) io.emit("chat", `${players[socket.id]?.name || "Anon"}: ${msg}`);
  });

  socket.on("disconnect", () => {
    delete players[socket.id];
    io.emit("playerLeft", socket.id);
  });
});

// Game Loop — Physics & Collisions
setInterval(() => {
  for (let id in players) {
    const p = players[id];
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    // Platform Collisions
    p.onGround = false;
    for (let plat of platforms) {
      if (p.vy > 0 && p.x + 40 > plat.x && p.x < plat.x + plat.w &&
          p.y + 80 > plat.y && p.y + 20 < plat.y + plat.h) {
        p.y = plat.y - 80;
        p.vy = 0;
        p.onGround = true;
      }
    }

    // Boundaries & Death Pits
    if (p.x < 0) p.x = 0;
    if (p.x > MAP_W - 40) p.x = MAP_W - 40;
    if (p.y > MAP_H) {
      p.health = 0; // fall death
    }
  }

  // Projectiles
  projectiles = projectiles.filter(proj => {
    proj.x += proj.vx;
    if (proj.x < 0 || proj.x > MAP_W) return false;

    for (let id in players) {
      const p = players[id];
      if (Math.hypot(proj.x - p.x, proj.y - p.y) < 50) {
        p.health -= 25;
        if (p.health <= 0) {
          // Kill logic
          const killer = players[proj.owner] || {name: "Unknown"};
          killer.kills++;
          p.skin = killer.skin; // steal skin
          io.emit("killfeed", `${killer.name} SLAYED ${p.name}!`);
          p.x = 500 + Math.random() * 3000;
          p.y = 100;
          p.health = 100;
          p.vy = 0;
        }
        return false;
      }
    }
    return true;
  });

  io.emit("state", { players, projectiles });
}, 1000/60);

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => console.log(`FANTASY BATTLE.IO LIVE ON ${PORT} — KNIGHTS VS NINJAS ROYALE 🔥`));
