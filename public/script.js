const socket = io();
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth; canvas.height = innerHeight;

let me = null;
let players = {};
let projectiles = [];
let cam = {x:0, y:0};
let keys = {};

const skins = ["🥷","⚔️","👺","🐱‍👤","🎭","🗡️","🔪","💀","👹","🤺","🧙","🦹"];
document.getElementById("skins").innerHTML = skins.map(s => 
  `<div class="skin" onclick="skin='${s}'">${s}</div>`
).join("");
let skin = "🥷";

function play() {
  const name = document.getElementById("name").value || "Ninja";
  document.getElementById("menu").style.display = "none";
  document.getElementById("mobile").style.display = "block";
  socket.emit("join", {name, skin});
}

onkeydown = e => { if ("awsd ".includes(e.key.toLowerCase())) keys[e.key.toLowerCase()] = true; if (e.key === "t") document.getElementById("msg").focus(); };
onkeyup = e => { if ("awsd ".includes(e.key.toLowerCase())) keys[e.key.toLowerCase()] = false; };

document.getElementById("msg").onkeydown = e => {
  if (e.key === "Enter" && e.target.value.trim()) {
    socket.emit("chat", e.target.value.trim());
    e.target.value = "";
  }
};

socket.on("state", data => {
  players = data.players || {};
  projectiles = data.projectiles || [];
  if (!me && Object.keys(players).length) me = Object.keys(players)[0];
});

socket.on("chat", msg => {
  const d = document.createElement("div");
  d.textContent = msg;
  document.getElementById("chat").appendChild(d);
  d.scrollTop = d.scrollHeight;
});

socket.on("killfeed", msg => {
  const d = document.createElement("div");
  d.textContent = msg;
  d.style.color = "#f33";
  document.getElementById("lb").appendChild(d);
  setTimeout(() => d.remove(), 4000);
});

setInterval(() => {
  if (!me || !players[me]) return;
  socket.emit("input", {
    left: keys.a || keys.left,
    right: keys.d || keys.right,
    jump: keys[" "] || keys.w || keys.jump,
    attack: keys.attack || false
  });
  keys.attack = false;
}, 16);

function loop() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (!players[me]) {
    ctx.fillStyle = "#fff";
    ctx.font = "40px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading...", canvas.width/2, canvas.height/2);
    requestAnimationFrame(loop);
    return;
  }

  const p = players[me];
  cam.x += (p.x - canvas.width/2 - cam.x) * 0.1;
  cam.y += (p.y - canvas.height/2 - cam.y) * 0.1;

  ctx.save();
  ctx.translate(-cam.x + canvas.width/2, -cam.y + canvas.height/2);

  // Platforms
  ctx.fillStyle = "#333";
  ctx.fillRect(800, 1020, 1400, 80);

  // Projectiles
  ctx.fillStyle = "#fff";
  projectiles.forEach(pr => {
    ctx.fillRect(pr.x - 5, pr.y - 5, 10, 10);
  });

  // Players
  for (let id in players) {
    const pl = players[id];
    ctx.font = "60px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = id === me ? "#0f0" : "#ccc";
    ctx.fillText(pl.skin, pl.x, pl.y - 30);
    ctx.fillStyle = "#f00";
    ctx.fillRect(pl.x - 30, pl.y - 80, 60 * (pl.health/100), 8);
    ctx.fillStyle = "#fff";
    ctx.font = "16px Arial";
    ctx.fillText(pl.name, pl.x, pl.y - 100);
  }

  ctx.restore();

  // Leaderboard
  const top = Object.values(players).sort((a,b) => b.kills - a.kills).slice(0,8);
  document.getElementById("lb").innerHTML = "<b>KILLS</b><br>" + top.map((p,i) => `${i+1}. ${p.skin} ${p.name} — ${p.kills}`).join("<br>");

  requestAnimationFrame(loop);
}
loop();
