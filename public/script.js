const socket = io();
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth; canvas.height = innerHeight;

let me = null;
let players = {};
let food = [];
let cam = {x:0, y:0};

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

let keys = {};
onkeydown = onkeyup = e => keys[e.key.toLowerCase()] = e.type[5];

setInterval(() => {
  if (!me || !players[me]) return;
  let dx = 0, dy = 0;
  if (keys.a || keys.arrowleft) dx--;
  if (keys.d || keys.arrowright) dx++;
  if (keys.w || keys.arrowup) dy--;
  if (keys.s || keys.arrowdown) dy++;
  if (dx || dy) {
    const len = Math.hypot(dx, dy);
    socket.emit("move", {x: dx/len, y: dy/len});
  }
  if (keys[" "]) { socket.emit("split"); keys[" "] = false; }
  if (keys.t) { document.getElementById("msg").focus(); keys.t = false; }
}, 16);

document.getElementById("msg").onkeydown = e => {
  if (e.key === "Enter" && e.target.value.trim()) {
    socket.emit("chat", e.target.value.trim());
    e.target.value = "";
  }
};

socket.on("state", data => {
  players = data.players || {};
  food = data.food || [];
  if (!me && Object.keys(players).length) me = Object.keys(players).find(id => players[id]);
});

function loop() {
  ctx.fillStyle = "#111";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (!players[me]) {
    ctx.fillStyle = "#fff";
    ctx.font = "30px Arial";
    ctx.fillText("Loading...", canvas.width/2-100, canvas.height/2);
    requestAnimationFrame(loop);
    return;
  }

  const p = players[me];
  cam.x += (p.x + p.blobs[0].x - canvas.width/2 - cam.x) * 0.1;
  cam.y += (p.y + p.blobs[0].y - canvas.height/2 - cam.y) * 0.1;

  ctx.save();
  ctx.translate(-cam.x + canvas.width/2, -cam.y + canvas.height/2);

  food.forEach(f => {
    ctx.font = "30px Arial";
    ctx.fillText(f.emoji, f.x, f.y);
  });

  for (let id in players) {
    const pl = players[id];
    pl.blobs.forEach(b => {
      const x = pl.x + b.x;
      const y = pl.y + b.y;
      ctx.font = b.size + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = id === me ? "#0f0" : "#fff";
      ctx.fillText(pl.skin, x, y);
      ctx.font = "16px Arial";
      ctx.fillStyle = "#aaa";
      ctx.fillText(pl.name, x, y - b.size/2 - 10);
    });
  }

  ctx.restore();

  // Leaderboard
  const top = Object.values(players).sort((a,b) => b.size - a.size).slice(0,8);
  document.getElementById("lb").innerHTML = top.map((p,i) => `${i+1}. ${p.skin} ${p.name} — ${Math.floor(p.size)}`).join("<br>");

  requestAnimationFrame(loop);
}
loop();
