// public/script.js — 100% MATCHES YOUR FILES
const socket = io();
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

// YOUR EXACT SPRITE NAMES
const SPRITES = {
  idle:   { file: "Idle.png",     frames: 6,  speed: 10 },
  run:    { file: "Run.png",      frames: 8,  speed: 6  },
  walk:   { file: "Walk.png",     frames: 8,  speed: 8  },  // if you wanna use Walk instead of Run
  jump:   { file: "Jump.png",     frames: 11, speed: 8  },
  attack: { file: "Attack_1.png", frames: 4,  speed: 5  },
  attack2:{ file: "Attack_2.png", frames: 4,  speed: 5  },
  attack3:{ file: "Attack_3.png", frames: 4,  speed: 5  },
  hurt:   { file: "Hurt.png",     frames: 3,  speed: 8  },
  dead:   { file: "Dead.png",     frames: 6,  speed: 10 },
  shield: { file: "Shield.png",   frames: 4,  speed: 10 }
};

const imgs = {};
let loaded = 0;
const total = Object.keys(SPRITES).length;

for (const [key, spr] of Object.entries(SPRITES)) {
  imgs[key] = new Image();
  imgs[key].src = spr.file;
  imgs[key].onload = () => loaded++;
}

let me, players = {}, shurikens = [], cam = {x:0,y:0};
let keys = {}, mouseDown = false;

// Input
window.addEventListener("mousedown", () => mouseDown = true);
window.addEventListener("mouseup", () => mouseDown = false);
onkeydown = e => keys[e.key.toLowerCase()] = true;
onkeyup = e => keys[e.key.toLowerCase()] = false;

// Send input 60 times/sec
setInterval(() => {
  socket.emit("input", {
    left: keys.a || keys.arrowleft,
    right: keys.d || keys.arrowright,
    jump: keys[" "] || keys.w || keys.arrowup,
    throw: mouseDown
  });
  mouseDown = false;
}, 16);

socket.on("state", data => {
  players = data.players || {};
  shurikens = data.shurikens || [];
});

function drawPlayer(p) {
  let anim = "idle";
  if (!p.onGround) anim = "jump";
  else if (p.vx !== 0) anim = "run";
  if (p.throwing) anim = "attack";
  if (p.health <= 0) anim = "dead";

  const spr = SPRITES[anim];
  if (!imgs[anim]?.complete) return;

  const frameWidth = imgs[anim].width / spr.frames;
  const frame = Math.floor(Date.now() / (1000 / spr.speed)) % spr.frames;

  ctx.save();
  ctx.translate(p.x, p.y - 40);
  if (p.facing < 0) ctx.scale(-1, 1);

  ctx.drawImage(
    imgs[anim],
    frame * frameWidth, 0, frameWidth, imgs[anim].height,
    -frameWidth/2, -imgs[anim].height/2,
    frameWidth, imgs[anim].height
  );
  ctx.restore();

  // Health bar
  ctx.fillStyle = "#000"; ctx.fillRect(p.x-41, p.y-110, 82, 14);
  ctx.fillStyle = "#c00"; ctx.fillRect(p.x-40, p.y-109, 80, 12);
  ctx.fillStyle = "#0f0"; ctx.fillRect(p.x-40, p.y-109, 80 * (p.health/100), 12);
  ctx.fillStyle = "#fff"; ctx.font = "18px Arial"; ctx.textAlign = "center";
  ctx.fillText(p.name, p.x, p.y-120);
}

function loop() {
  ctx.fillStyle = "#0a0a1a";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (loaded < total) {
    ctx.fillStyle = "#0ff"; ctx.font = "40px Arial"; ctx.textAlign = "center";
    ctx.fillText(`Loading ${loaded}/${total}...`, canvas.width/2, canvas.height/2);
    requestAnimationFrame(loop); return;
  }

  const myPlayer = Object.values(players).find(p => p.id === socket.id);
  if (myPlayer) {
    cam.x += (myPlayer.x - canvas.width/2 - cam.x) * 0.12;
    cam.y += (myPlayer.y - canvas.height/2 - cam.y) * 0.12;
  }

  ctx.save();
  ctx.translate(canvas.width/2 - cam.x, canvas.height/2 - cam.y);

  // Floor
  ctx.fillStyle = "#1a2333"; ctx.fillRect(0, 1800, 4000, 400);

  // Shurikens
  ctx.fillStyle = "#88f";
  shurikens.forEach(s => ctx.fillRect(s.x-8, s.y-8, 16, 16));

  // Players
  Object.values(players).forEach(drawPlayer);

  ctx.restore();
  requestAnimationFrame(loop);
}
loop();
