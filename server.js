const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
app.use(express.static("public"));

let players = {};
let swords = [];

// SAFE SPAWN POINTS (always on platforms)
const SPAWNS = [
  { x: 600, y: 1820 },   // main ground left
  { x: 2000, y: 1820 },  // main ground middle
  { x: 3400, y: 1820 },  // main ground right
  { x: 800, y: 1440 },   // upper platform
  { x: 2400, y: 1140 },  // mid platform
  { x: 1300, y: 840 }    // top platform
];

const platforms = [
  [0,1900,4000,300],      // main ground
  [400,1500,900,60],
  [2000,1200,800,60],
  [1000,900,600,60]
];

io.on("connection", socket => {
  socket.on("join", data => {
    const spawn = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
    players[socket.id] = {
      id: socket.id,
      name: data.name || "Warrior",
      x: spawn.x,
      y: spawn.y,
      vx: 0, vy: 0,
      facing: 1,
      health: 100,
      kills: 0,
      onGround: true,
      attacking: false
    };
  });

  socket.on("input", input => {
    if (!players[socket.id]) return;
    const p = players[socket.id];
    p.vx = (input.right ? 6 : 0) - (input.left ? 6 : 0);
    if (input.right) p.facing = 1;
    if (input.left) p.facing = -1;
    if (input.jump && p.onGround) p.vy = -15;
    if (input.v && !p.attacking) {
      p.attacking = true;
      swords.push({ x: p.x + p.facing*70, y: p.y-20, vx: p.facing*18, owner: socket.id });
      setTimeout(() => p.attacking = false, 300);
    }
  });

  socket.on("disconnect", () => delete players[socket.id]);
});

// 60FPS PHYSICS
setInterval(() => {
  for (let id in players) {
    const p = players[id];
    if (!p.onGround) p.vy += 0.6;
    p.x += p.vx;
    p.y += p.vy;
    p.onGround = false;

    // LAND ON PLATFORMS
    for (let plat of platforms) {
      if (p.vy > 0 &&
          p.x + 50 > plat[0] && p.x - 50 < plat[0] + plat[2] &&
          p.y + 90 > plat[1] && p.y + 90 < plat[1] + plat[3] + 50) {
        p.y = plat[1] - 90;
        p.vy = 0;
        p.onGround = true;
      }
    }

    // DEATH PIT
    if (p.y > 2500) {
      p.health = 0;
      const spawn = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
      p.x = spawn.x; p.y = spawn.y; p.vy = 0; p.health = 100;
    }
  }

  // SWORD HIT
  swords = swords.filter(s => {
    s.x += s.vx;
    if (s.x < -200 || s.x > 4200) return false;
    for (let id in players) {
      const p = players[id];
      if (id !== s.owner && Math.hypot(s.x - p.x, s.y - p.y) < 70) {
        p.health -= 40;
        if (p.health <= 0) {
          players[s.owner].kills++;
          const spawn = SPAWNS[Math.floor(Math.random() * SPAWNS.length)];
          p.x = spawn.x; p.y = spawn.y; p.health = 100; p.vy = 0;
        }
        return false;
      }
    }
    return true;
  });

  io.emit("state", { players, swords });
}, 16);

http.listen(process.env.PORT || 3000, () => console.log("FANTASY BATTLE.IO — NO FALL SPAWN FIXED 🔥"));
