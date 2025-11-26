const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
app.use(express.static("public"));

let players = {};
let swords = [];
const platforms = [[0,1900,4000,300],[400,1500,900,60],[2000,1200,800,60],[1000,900,600,60]];

io.on("connection", s => {
  s.on("join", d => {
    players[s.id] = {
      id:s.id, name:d.name, x:Math.random()*3000+500, y:100, vx:0, vy:0, facing:1, health:100, kills:0, onGround:false, attacking:false
    };
  });

  s.on("input", i => {
    if (!players[s.id]) return;
    const p = players[s.id];
    p.vx = (i.right?5:0) - (i.left?5:0);
    if (i.right) p.facing = 1;
    if (i.left) p.facing = -1;
    if (i.jump && p.onGround) p.vy = -14;
    if (i.v) {
      p.attacking = true;
      swords.push({x:p.x+p.facing*60, y:p.y, vx:p.facing*15, owner:s.id});
      setTimeout(() => p.attacking = false, 300);
    }
  });
});

setInterval(() => {
  for (let id in players) {
    const p = players[id];
    p.vy += 0.5; p.x += p.vx; p.y += p.vy;
    p.onGround = false;
    platforms.forEach(plat => {
      if (p.vy>0 && p.x+40>plat[0] && p.x<plat[0]+plat[2] && p.y+80>plat[1] && p.y<plat[1]+plat[3]) {
        p.y = plat[1]-80; p.vy = 0; p.onGround = true;
      }
    });
    if (p.y > 2200) { p.health = 0; }
  }

  swords = swords.filter(sw => {
    sw.x += sw.vx;
    for (let id in players) {
      const p = players[id];
      if (id !== sw.owner && Math.hypot(sw.x-p.x, sw.y-p.y)<60) {
        p.health -= 35;
        if (p.health <= 0) {
          players[sw.owner].kills++;
          p.x = Math.random()*3000+500; p.y = 100; p.health = 100;
        }
        return false;
      }
    }
    return sw.x > -100 && sw.x < 5000;
  });

  io.emit("state", {players, swords});
}, 16);

http.listen(process.env.PORT || 3000);
