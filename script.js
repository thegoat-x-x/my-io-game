// Client-side pro script
const socket = io();
let clients = {}; // remote players data
let foods = [];
let meId = null;
let meReady = false;
let meEmoji = "😎";
let meName = "";

// world size (from server init)
let WORLD = { w: 1200, h: 800 };

// Canvas setup
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// camera
let cam = { x: 0, y: 0, w: canvas.width, h: canvas.height };

// input
const keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

// assets (sprites)
const ASSETS = {
  player: null, // optional image
  food: {}
};

// try to load example images if present
function tryLoadAssets() {
  const pimg = new Image();
  pimg.onload = () => ASSETS.player = pimg;
  pimg.onerror = ()=>{ ASSETS.player = null; };
  pimg.src = "assets/player.png"; // optional, you can add this file

  // optional single food sprite
  const fimg = new Image();
  fimg.onload = () => ASSETS.food["default"] = fimg;
  fimg.onerror = ()=>{ ASSETS.food["default"] = null; };
  fimg.src = "assets/apple.png";
}
tryLoadAssets();

// UI helpers
const overlay = document.getElementById("overlay");
const nameInput = document.getElementById("nameInput");

// socket events
socket.on("init", data => {
  meId = data.id;
  clients = data.players || {};
  foods = data.food || [];
  if (data.world) WORLD = data.world;
  // set canvas to desired size (responsive could be added)
  canvas.width = Math.min(window.innerWidth, 1200);
  canvas.height = Math.min(window.innerHeight - 80, 800);
});

socket.on("players", data => {
  clients = data || {};
});

socket.on("food", data => {
  foods = data || [];
});

socket.on("update", data => {
  if (data.players) clients = data.players;
  if (data.food) foods = data.food;
});

// choose character from UI
function chooseCharacter(emoji) {
  meEmoji = emoji;
  meName = (nameInput && nameInput.value) ? nameInput.value : "Player";
  // hide overlay and show canvas
  overlay.style.display = "none";
  meReady = true;
  socket.emit("ready", { emoji: meEmoji, name: meName });
}

// movement & smooth client-side local movement
const speed = 4;
function clientUpdateLocal() {
  if (!meReady || !meId || !clients[meId]) return;
  const p = clients[meId];
  let dx = 0, dy = 0;
  if (keys["ArrowLeft"] || keys["a"]) dx -= speed;
  if (keys["ArrowRight"] || keys["d"]) dx += speed;
  if (keys["ArrowUp"] || keys["w"]) dy -= speed;
  if (keys["ArrowDown"] || keys["s"]) dy += speed;

  if (dx !== 0 || dy !== 0) {
    p.x += dx;
    p.y += dy;

    // clamp
    p.x = Math.max(0, Math.min(WORLD.w - p.size, p.x));
    p.y = Math.max(0, Math.min(WORLD.h - p.size, p.y));

    socket.emit("move", { x: p.x, y: p.y });
  }
}

// render loop
function draw() {
  // clear
  ctx.clearRect(0,0,canvas.width,canvas.height);

  if (!clients || !meId || !clients[meId]) {
    // waiting message
    ctx.fillStyle = "#fff";
    ctx.font = "18px Arial";
    ctx.fillText("Waiting for server / select a character...", 20, 30);
    requestAnimationFrame(draw);
    return;
  }

  const me = clients[meId];

  // center camera smoothly
  cam.x += ((me.x + me.size/2) - cam.x - canvas.width/2) * 0.12;
  cam.y += ((me.y + me.size/2) - cam.y - canvas.height/2) * 0.12;

  // clamp camera inside world
  cam.x = Math.max(0, Math.min(WORLD.w - canvas.width, cam.x));
  cam.y = Math.max(0, Math.min(WORLD.h - canvas.height, cam.y));

  // draw background grid
  const gridSize = 100;
  ctx.fillStyle = "#e6eef5";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  ctx.strokeStyle = "#d7e6ef";
  ctx.lineWidth = 1;
  for (let gx = 0; gx < WORLD.w; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx + 0.5, 0);
    ctx.lineTo(gx + 0.5, WORLD.h);
    ctx.stroke();
  }
  for (let gy = 0; gy < WORLD.h; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy + 0.5);
    ctx.lineTo(WORLD.w, gy + 0.5);
    ctx.stroke();
  }

  // draw food
  for (const f of foods) {
    // sprite fallback
    if (ASSETS.food["default"]) {
      ctx.drawImage(ASSETS.food["default"], f.x - 15, f.y - 15, 30, 30);
    } else {
      ctx.font = "26px Arial";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(f.emoji, f.x, f.y);
    }
  }

  // draw players
  for (const id in clients) {
    const p = clients[id];
    const drawX = p.x, drawY = p.y;
    // draw circle behind player to make emoji readable
    ctx.beginPath();
    ctx.fillStyle = (id === meId) ? "rgba(0,255,200,0.08)" : "rgba(0,0,0,0.05)";
    ctx.fillRect(drawX - 6, drawY - 6, p.size + 12, p.size + 12);

    if (ASSETS.player) {
      ctx.drawImage(ASSETS.player, drawX, drawY, p.size, p.size);
    } else {
      ctx.font = `${Math.max(12, p.size)}px Arial`;
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(p.emoji || "😃", drawX + p.size/2, drawY + p.size/2);
    }

    // name tag
    ctx.font = "14px Arial";
    ctx.fillStyle = "#222";
    ctx.fillText(p.name || "Player", drawX + p.size/2, drawY - 8);
  }

  ctx.restore();

  // draw HUD elements (leaderboard)
  updateLeaderboard();
  requestAnimationFrame(draw);
}

function updateLeaderboard() {
  const board = document.getElementById("leaderboard");
  const arr = Object.values(clients).sort((a,b) => b.size - a.size).slice(0,5);
  board.innerHTML = "<b>Leaderboard</b><br>" + arr.map(p => `${p.emoji||'😃'} ${p.name||'Player'} - ${Math.floor(p.size)}`).join("<br>");
}

// game loop (update + draw)
function tick() {
  clientUpdateLocal();
  setTimeout(tick, 1000/60); // 60hz-ish
}
tick();
draw();

// window resize handler
window.addEventListener("resize", () => {
  canvas.width = Math.min(window.innerWidth, 1200);
  canvas.height = Math.min(window.innerHeight - 80, 800);
});
