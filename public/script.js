// script.js - Professional Client Engine
const socket = io();
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

let me = null;
let players = {};
let food = [];
let powerups = [];
let mapSize = 5000;
let mouse = { x: 0, y: 0 };
let keys = {};
let chatVisible = false;

const skins = ["😀","😎","😈","🤡","👽","👾","🎃","💀","👻","🦁","🐯","🦄","🐉","🦈","🔥","⚡","💎","👑","🧙","🧟","🥷","🦸","🦹","🐸"];
document.getElementById("skins").innerHTML = skins.map(s => 
  `<div class="skin" onclick="selectedSkin='${s}';document.querySelectorAll('.skin').forEach(x=>x.classList.remove('active'));this.classList.add('active')">${s}</div>`
).join("");
let selectedSkin = "😎";
document.querySelector(".skin").classList.add("active");

function startGame() {
  const name = document.getElementById("nameInput").value.trim() || "Player";
  document.getElementById("menu").style.display = "none";
  socket.emit("join", { name, skin: selectedSkin });
}

function respawn() {
  document.getElementById("death").style.display = "none";
  startGame();
}

// Input
window.addEventListener("mousemove", e => { mouse.x = e.clientX; mouse.y = e.clientY; });
window.addEventListener("touchmove", e => {
  e.preventDefault();
  const touch = e.touches[0];
  mouse.x = touch.clientX;
  mouse.y = touch.clientY;
}, { passive: false });

window.addEventListener("keydown", e => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === "t") {
    document.getElementById("chatInput").focus();
    e.preventDefault();
  }
  if (e.key === " ") {
    socket.emit("split");
    e.preventDefault();
  }
});
window.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

document.getElementById("chatInput").addEventListener("keydown", e => {
  if (e.key === "Enter" && e.target.value.trim()) {
    socket.emit("chat", e.target.value.trim());
    e.target.value = "";
    e.target.blur();
  }
});

// Socket Events
socket.on("init", data => {
  me = data.id;
  players = data.players;
  food = data.food;
  powerups = data.powerups;
  mapSize = data.mapSize;
});

socket.on("gameState", data => {
  players = data.players;
  food = data.food;
  powerups = data.powerups;
});

socket.on("chat", msg => addChat(msg.name + ": " + msg.msg));
socket.on("killfeed", msg => addKillfeed(msg));

function addChat(text) {
  const div = document.createElement("div");
  div.textContent = text;
  document.getElementById("messages").appendChild(div);
  div.scrollIntoView();
}

function addKillfeed(text) {
  const div = document.createElement("div");
  div.textContent = text;
  div.className = "kill";
  document.getElementById("killfeed").appendChild(div);
  setTimeout(() => div.remove(), 4000);
}

// Game Loop
function loop() {
  ctx.fillStyle = "#0a001f";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (!players[me]) {
    ctx.fillStyle = "#0ff";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Connecting...", canvas.width / 2, canvas.height / 2);
    requestAnimationFrame(loop);
    return;
  }

  const myPlayer = players[me];
  const camX = canvas.width / 2 - myPlayer.x;
  const camY = canvas.height / 2 - myPlayer.y;

  ctx.save();
  ctx.translate(camX, camY);

  // Grid
  ctx.strokeStyle = "rgba(0,255,255,0.1)";
  for (let x = -mapSize; x < mapSize * 2; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, -mapSize);
    ctx.lineTo(x, mapSize * 2);
    ctx.stroke();
  }
  for (let y = -mapSize; y < mapSize * 2; y += 100) {
    ctx.beginPath();
    ctx.moveTo(-mapSize, y);
    ctx.lineTo(mapSize * 2, y);
    ctx.stroke();
  }

  // Food
  food.forEach(f => {
    ctx.font = "30px Arial";
    ctx.fillText(f.emoji, f.x, f.y);
  });

  // Powerups
  powerups.forEach(p => {
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 20;
    ctx.font = "50px Arial";
    ctx.fillText(p.emoji, p.x, p.y);
    ctx.shadowBlur = 0;
  });

  // Players
  Object.values(players).forEach(p => {
    p.blobs.forEach(b => {
      const x = p.x + b.x;
      const y = p.y + b.y;
      const size = Math.sqrt(b.mass) * 3;

      ctx.fillStyle = p.color + "40";
      ctx.beginPath();
      ctx.arc(x, y, size + 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = size + "px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = "#fff";
      ctx.fillText(p.skin, x, y);

      ctx.font = "16px Arial";
      ctx.fillStyle = "#0ff";
      ctx.fillText(p.name, x, y - size - 10);
    });
  });

  ctx.restore();

  // Leaderboard
  const sorted = Object.values(players).sort((a, b) => b.mass - a.mass).slice(0, 10);
  document.getElementById("leaderboard").innerHTML = "<h3>Leaderboard</h3>" + sorted.map((p, i) => 
    `${i + 1}. ${p.skin} ${p.name} — ${Math.floor(p.mass)}`
  ).join("<br>");

  // Movement
  const targetX = mouse.x - canvas.width / 2;
  const targetY = mouse.y - canvas.height / 2;
  socket.emit("move", { x: targetX, y: targetY });

  requestAnimationFrame(loop);
}
loop();

window.addEventListener("resize", () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});
