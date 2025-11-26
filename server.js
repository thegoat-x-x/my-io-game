const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);
app.use(express.static("public"));

let players = {};
let projectiles = [];

const MAP_WIDTH = 3000;
const MAP_HEIGHT = 2000;
const GRAVITY = 0.5;
const JUMP = -12;
const SPEED = 5;

io.on("connection", socket => {
  socket.on("join", data => {
    players[socket.id] = {
      id: socket.id,
      name: data.name || "Ninja",
      skin: data.skin || "🥷",
      x: 200 + Math.random() * (MAP_WIDTH - 400),
      y: 100,
      vx: 0, vy: 0,
      facing: 1,
      health: 100,
      kills: 0,
      onGround: false
    };
  });

  socket.on("input", keys => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.vx = 0;
    if (keys.left) p.vx = -SPEED, p.facing = -1;
    if (keys.right) p.vx = SPEED, p.facing = 1;
    if (keys.jump && p.onGround) p.vy = JUMP;
    if (keys.attack) {
      projectiles.push({
        x: p.x + (p.facing * 30),
        y: p.y - 20,
        vx: p.facing * 15,
        owner: socket.id
      });
      keys.attack = false;
    }
  });

  socket.on("chat", msg => io.emit("chat", `${players[socket.id]?.name}: ${msg}`));

  socket.on("disconnect", () => delete players[socket.id]);
});

// Physics + Projectiles
setInterval(() => {
  for (let id in players) {
    const p = players[id];
    p.vy += GRAVITY;
    p.x += p.vx;
    p.y += p.vy;

    // Floor
    if (p.y > 1600) {
      p.y = 1600;
      p.vy = 0;
      p.onGround = true;
    } else p.onGround = false;

    // Walls
    if (p.x < 0) p.x = 0;
    if (p.x > MAP_WIDTH - 50) p.x = MAP_WIDTH - 50;

    // Platforms (simple)
    if (p.y > 1000 && p.y < 1020 && p.x > 800 && p.x < 2200) {
      p.y = 1000;
      p.vy = 0;
      p.onGround = true;
    }
  }

  // Projectiles
  projectiles = projectiles.filter(proj => {
    proj.x += proj.vx;
    if (proj.x < -100 || proj.x > MAP_WIDTH + 100) return false;

    for (let id in players) {
      const p = players[id];
      if (id === proj.owner) continue;
      if (Math.hypot(proj.x - p.x, proj.y - p.y) < 40) {
        p.health -= 34;
        if (p.health <= 0) {
          players[proj.owner].kills++;
          players[proj.owner].skin = p.skin; // steal skin!
          io.emit("killfeed", `${players[proj.owner].name} ⚔️ ${p.name}`);
          p.x = 200 + Math.random() * 2400;
          p.y = 100;
          p.health = 100;
        }
        return false;
      }
    }
    return true;
  });

  io.emit("state", { players, projectiles });
}, 1000/60);

server.listen(process.env.PORT || 3000, () => console.log("NINJA.IO LIVE — gobattle.io KILLER 🔥"));
