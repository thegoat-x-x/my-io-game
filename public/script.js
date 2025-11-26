const socket = io();
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth;
canvas.height = innerHeight;

// YOUR EXACT SPRITES
const SPRITES = {
  idle: "Idle.png",
  run: "Run.png",
  jump: "Jump.png",
  attack: "Attack_1.png",
  dead: "Dead.png"
};

const imgs = {};
let loaded = 0;
for (let key in SPRITES) {
  imgs[key] = new Image();
  imgs[key].src = SPRITES[key];
  imgs[key].onload = () => loaded++;
}

let me = null;
let players = {};
let swords = [];
let cam = {x:0, y:0};
let keys = {};

function play() {
  const name = document.getElementById("name").value || "Warrior";
  document.getElementById("menu").style.display = "none";
  socket.emit("join", {name});
}

onkeydown = onkeyup = e => keys[e.key.toLowerCase()] = e.type === "keydown";
document.getElementById("chatInput").onkeydown = e => {
  if (e.key === "Enter" && e.target.value.trim()) {
    socket.emit("chat", e.target.value.trim());
    e.target.value = "";
  }
  if (e.key === "t") e.target.blur();
};

// Send input
setInterval(() => {
  if (!me) return;
  socket.emit("input", {
    left: keys.a,
    right: keys.d,
    jump: keys[" "],
    v: keys.v
  });
  if (keys.v) keys.v = false;
}, 16);

socket.on("state", data => {
  players = data.players || {};
  swords = data.swords || [];
  if (!me && Object.values(players).length) me = Object.values(players)[0];
});

socket.on("chat", msg => {
  const div = document.createElement("div");
  div.textContent = msg;
  document.getElementById("chat").appendChild(div);
  div.scrollIntoView();
});

function draw() {
  ctx.fillStyle = "#0a001f";
  ctx.fillRect(0,0,canvas.width,canvas.height);

  if (loaded < 5 || !me) {
    ctx.fillStyle = "#0ff";
    ctx.font = "40px Compas";
    ctx.textAlign = "center";
    ctx.fillText("LOADING...", canvas.width/2, canvas.height/2);
    requestAnimationFrame(draw);
    return;
  }

  cam.x += (me.x - canvas.width/2 - cam.x) * 0.1;
  cam.y += (me.y - canvas.height/2 - cam.y) * 0.1;

  ctx.save();
  ctx.translate(canvas.width/2 - cam.x, canvas.height/2 - cam.y);

  // Platforms
  ctx.fillStyle = "#222";
  [[0,1900,4000,300],[400,1500,900,60],[2000,1200,800,60],[1000,900,600,60]].forEach(p => ctx.fillRect(...p));

  // Swords
  ctx.fillStyle = "#fff";
  swords.forEach(s => ctx.fillRect(s.x-10, s.y-10, 20, 20));

  // Players
  Object.values(players).forEach(p => {
    const anim = p.attacking ? "attack" : !p.onGround ? "jump" : p.vx !== 0 ? "run" : "idle";
    const img = imgs[anim] || imgs.idle;

    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.facing < 0) ctx.scale(-1, 1);
    ctx.drawImage(img, -50, -100, 100, 200);
    ctx.restore();

    // Health
    ctx.fillStyle = "#000"; ctx.fillRect(p.x-51, p.y-130, 102, 12);
    ctx.fillStyle = "#f00"; ctx.fillRect(p.x-50, p.y-129, 100, 10);
    ctx.fillStyle = "#0f0"; ctx.fillRect(p.x-50, p.y-129, p.health, 10);

    ctx.fillStyle = "#fff";
    ctx.font = "20px Compas";
    ctx.textAlign = "center";
    ctx.fillText(p.name, p.x, p.y-140);
  });

  ctx.restore();

  // Leaderboard
  const top = Object.values(players).sort((a,b)=>b.kills-a.kills).slice(0,8);
  document.getElementById("lb").innerHTML = "<b>TOP KILLERS</b><br>" +
    top.map((p,i)=>`${i+1}. ${p.name} — ${p.kills}`).join("<br>");

  requestAnimationFrame(draw);
}
draw();
