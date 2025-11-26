const socket = io();
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth; canvas.height = innerHeight;

let me = null;
let players = {};
let food = [];
let cam = {x:0, y:0};
let keys = {};

const skins = ["😀","😎","😈","🤡","👽","🤖","🎃","💀","👻","🦁","🐉","🔥","💎","👑","🥷"];
document.getElementById("skins").innerHTML = skins.map(s => 
  `<div class="skin" onclick="skin='${s}';document.querySelectorAll('.skin').forEach(x=>x.classList.remove('s'));this.classList.add('s')">${s}</div>`
).join("");
let skin = "😈";
document.querySelector(".skin").classList.add("s");

function play() {
  const name = document.getElementById("name").value || "Player";
  document.getElementById("menu").style.display = "none";
  socket.emit("join", {name, skin});
}

onkeydown = onkeyup = e => keys[e.key.toLowerCase()] = e.type[5];

setInterval(() => {
  if (!me || !players[me]) return;
  let dx = 0, dy = 0;
  if (keys.a || keys.arrowleft) dx = -1;
  if (keys.d || keys.arrowright) dx = 1;
  if (keys.w || keys.arrowup) dy = -1;
  if (keys.s || keys.arrowdown) dy = 1;
  if (dx || dy) {
    const len = Math.hypot(dx, dy) || 1;
    socket.emit("move", {x: dx/len, y: dy/len});
  }
  if (keys[" "]) { socket.emit("split"); keys[" "] = false; }
  if (keys.t) { document.getElementById("msg").focus(); keys.t = false; }
}, 50); // 20fps input, no lag

document.getElementById("msg").onkeydown = e => {
  if (e.key === "Enter" && e.target.value.trim()) {
    socket.emit("chat", e.target.value.trim());
    e.target.value = "";
  }
};

socket.on("init", data => {
  players = data.players || {};
  food = data.food || [];
  me = Object.keys(players)[0] || null;
});

socket.on("state", data => {
  players = data.players || {};
  food = data.food || [];
});

socket.on("chat", msg => {
  const div = document.createElement("div");
  div.textContent = msg;
  document.getElementById("chat").appendChild(div);
  document.getElementById("chat").scrollTop = document.getElementById("chat").scrollHeight;
});

socket.on("killfeed", msg => {
  const div = document.createElement("div");
  div.textContent = msg;
  div.style.color = "#f00";
  document.getElementById("lb").appendChild(div);
  setTimeout(() => div.remove(), 3000);
});

function loop() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (!players[me]) {
    ctx.fillStyle = "#fff";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Loading...", canvas.width/2, canvas.height/2);
    requestAnimationFrame(loop);
    return;
  }

  const p = players[me];
  cam.x += (p.x - canvas.width/2 - cam.x) * 0.1;
  cam.y += (p.y - canvas.height/2 - cam.y) * 0.1;

  ctx.save();
  ctx.translate(-cam.x, -cam.y);

  food.forEach(f => {
    ctx.font = "28px Arial";
    ctx.fillText(f.emoji, f.x, f.y);
  });

  for (let id in players) {
    const pl = players[id];
    const x = pl.x, y = pl.y;
    ctx.font = pl.size + "px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = id === me ? "#0f0" : "#ccc";
    ctx.fillText(pl.skin, x, y);
    ctx.font = "14px Arial";
    ctx.fillStyle = "#aaa";
    ctx.fillText(pl.name, x, y - pl.size/2 - 10);
  }

  ctx.restore();

  // leaderboard
  const top = Object.values(players).sort((a,b) => b.size - a.size).slice(0,8);
  document.getElementById("lb").innerHTML = "<b>Top 8</b><br>" + top.map((p,i) => `${i+1}. ${p.skin} ${p.name} ${p.size}`).join("<br>");

  requestAnimationFrame(loop);
}
loop();
