// script.js — Gobattle.io Style Fantasy Platformer Royale
const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let gameState = 'menu';
let currentSkin = '🥷';
let playerName = '';
let players = {};
let projectiles = [];
let platforms = [];
let camera = { x: 0, y: 0 };
let keys = {};

let spriteSheets = {};
let animationFrames = {};
let currentAnimations = {};

// Load Your Sprites (exact filenames)
const spriteConfigs = {
  Idle: { frames: 6, speed: 10 },
  Run: { frames: 8, speed: 6 },
  Jump: { frames: 11, speed: 8 },
  Attack_1: { frames: 4, speed: 5 },
  Attack_2: { frames: 4, speed: 5 },
  Attack_3: { frames: 4, speed: 5 },
  Dead: { frames: 6, speed: 10 },
  Hurt: { frames: 3, speed: 8 },
  Shield: { frames: 4, speed: 10 },
  Walk: { frames: 8, speed: 8 }
};

function loadSprites() {
  for (let name in spriteConfigs) {
    const img = new Image();
    img.src = name + ".png";
    spriteSheets[name] = img;
    animationFrames[name] = { current: 0, timer: 0 };
  }
}

loadSprites();

// Input Handling
document.addEventListener("keydown", (e) => {
  keys[e.key.toLowerCase()] = true;
  if (e.key === 't') document.getElementById("chatInput").focus();
  if (e.key === ' ') e.preventDefault();
});
document.addEventListener("keyup", (e) => keys[e.key.toLowerCase()] = false);

document.getElementById("chatInput").addEventListener("keypress", (e) => {
  if (e.key === 'Enter') {
    socket.emit("chat", e.target.value);
    e.target.value = '';
  }
});

function selectSkin(skin) {
  currentSkin = skin;
}

function startGame() {
  playerName = document.getElementById("nameInput").value || "Warrior";
  gameState = 'playing';
  document.getElementById("menu").style.display = "none";
  socket.emit("join", { name: playerName, skin: currentSkin });
}

// Game Loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (gameState === 'menu') {
    drawMenu();
  } else {
    updateCamera();
    drawWorld();
    drawPlayers();
    drawProjectiles();
    updateUI();
  }

  requestAnimationFrame(gameLoop);
}

// Menu Drawing
function drawMenu() {
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  ctx.font = "60px 'Bunkasai', Arial";
  ctx.textAlign = "center";
  ctx.fillText("FANTASY BATTLE.IO", canvas.width / 2, canvas.height / 2 - 100);

  // Skin preview (simple)
  ctx.font = "120px Arial";
  ctx.fillText(currentSkin, canvas.width / 2, canvas.height / 2);

  ctx.font = "24px Arial";
  ctx.fillText("WASD Move | Space Jump | Mouse Attack", canvas.width / 2, canvas.height / 2 + 100);
}

// World Drawing
function drawWorld() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#1a1a2e");
  gradient.addColorStop(1, "#16213e");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 4000, 2000);

  // Platforms
  ctx.fillStyle = "#4a5568";
  platforms.forEach(plat => ctx.fillRect(plat.x, plat.y, plat.w, plat.h));

  ctx.restore();
}

// Player Drawing with Sprite Animation
function drawPlayers() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  for (let id in players) {
    const p = players[id];
    const animKey = getAnimationKey(p);
    const config = spriteConfigs[animKey];
    if (!config) return;

    const sheet = spriteSheets[animKey];
    if (!sheet || !sheet.complete) {
      // Fallback to emoji if sprite not loaded
      ctx.font = "60px Arial";
      ctx.textAlign = "center";
      ctx.fillText(p.skin, p.x, p.y);
      return;
    }

    const frameWidth = sheet.width / config.frames;
    const frameIndex = Math.floor(Date.now() / (1000 / config.speed)) % config.frames;

    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.facing < 0) ctx.scale(-1, 1);

    ctx.drawImage(
      sheet,
      frameIndex * frameWidth, 0, frameWidth, sheet.height,
      -frameWidth / 2, -sheet.height / 2,
      frameWidth, sheet.height
    );
    ctx.restore();

    // Health bar
    ctx.fillStyle = "#000"; ctx.fillRect(p.x - 41, p.y - 90, 82, 8);
    ctx.fillStyle = "#f00"; ctx.fillRect(p.x - 40, p.y - 89, 80, 6);
    ctx.fillStyle = "#0f0"; ctx.fillRect(p.x - 40, p.y - 89, 80 * (p.health / 100), 6);
    ctx.fillStyle = "#fff"; ctx.font = "16px Arial"; ctx.textAlign = "center";
    ctx.fillText(p.name, p.x, p.y - 100);
  }

  ctx.restore();
}

// Get animation key based on state
function getAnimationKey(player) {
  if (player.health <= 0) return "Dead";
  if (player.hurt) return "Hurt";
  if (player.blocking) return "Shield";
  if (player.attacking) return "Attack_" + (player.attackType || 1);
  if (!player.onGround) return "Jump";
  if (player.vx !== 0) return "Run";
  return "Idle";
}

// Projectiles Drawing
function drawProjectiles() {
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  projectiles.forEach(proj => {
    ctx.fillStyle = "#ffd700";
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, 8, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

// UI Update
function updateUI() {
  const topPlayers = Object.values(players).sort((a, b) => b.kills - a.kills).slice(0, 10);
  document.getElementById("leaderboard").innerHTML = "<h3>Leaderboard</h3>" + topPlayers.map((p, i) => `${i+1}. ${p.name} (${p.kills} kills)`).join("<br>");

  // Chat
  // (chat logic here, omitted for brevity)

  // Killfeed
  // (killfeed logic here)
}

// Camera Update
function updateCamera() {
  if (!me) return;
  camera.x += (me.x - canvas.width / 2 - camera.x) * 0.1;
  camera.y += (me.y - canvas.height / 2 - camera.y) * 0.1;
}

// Socket Events
socket.on("state", data => {
  players = data.players || {};
  projectiles = data.projectiles || [];
  platforms = data.platforms || [];
});

socket.on("chat", msg => {
  const div = document.createElement("div");
  div.textContent = msg;
  document.getElementById("chatMessages").appendChild(div);
  div.scrollIntoView();
});

gameLoop();
