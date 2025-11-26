const socket = io();
const canvas = document.getElementById("c");
const ctx = canvas.getContext("2d");
canvas.width = innerWidth; canvas.height = innerHeight;

const SPRITES = { idle:"Idle.png", run:"Run.png", jump:"Jump.png", attack:"Attack_1.png" };
const imgs = {};
let loaded = 0;
for (let k in SPRITES) {
  imgs[k] = new Image();
  imgs[k].src = SPRITES[k];
  imgs[k].onload = () => loaded++;
}

let me = null;
let players = {};
let swords = [];
let cam = {x:0, y:0};
let keys = {};

function play() {
  const name = document.getElementById("name").value || "Samurai";
  document.getElementById("menu").style.display = "none";
  socket.emit("join", {name});
}

onkeydown = onkeyup = e => keys[e.key.toLowerCase()] = e.type[5] === "d";
document.getElementById("chatInput").onkeydown = e => {
  if (e.key === "Enter" && e.target.value) {
    socket.emit("chat", e.target.value);
    e.target.value = "";
  }
};

setInterval(() => {
  if (!me) return;
  socket.emit("input", {
    left: keys.a, right: keys.d,
    jump: keys[" "], v: keys.v
  });
  keys.v = false;
}, 16);

socket.on("state", d => {
  players = d.players || {};
  swords = d.swords || [];
  if (!me && Object.values(players)[0]) me = Object.values(players)[0];
});

function draw() {
  ctx.fillStyle = "#0a001f"; ctx.fillRect(0,0,canvas.width,canvas.height);

  if (loaded < 4 || !me) {
    ctx.fillStyle = "#0ff"; ctx.font = "50px Compas"; ctx.textAlign = "center";
    ctx.fillText("LOADING WARRIOR...", canvas.width/2, canvas.height/2);
    requestAnimationFrame(draw); return;
  }

  cam.x += (me.x - canvas.width/2 - cam.x) * 0.1;
  cam.y += (me.y - canvas.height/2 - cam.y) * 0.1;

  ctx.save();
  ctx.translate(canvas.width/2 - cam.x, canvas.height/2 - cam.y);

  // PLATFORMS
  ctx.fillStyle = "#1a1a3d";
  [[0,1900,4000,300],[400,1500,900,60],[2000,1200,800,60],[1000,900,600,60]].forEach(p => ctx.fillRect(...p));

  // SWORDS
  ctx.fillStyle = "#ff3366";
  swords.forEach(s => { ctx.fillRect(s.x-15,s.y-15,30,30); });

  // PLAYERS
  Object.values(players).forEach(p => {
    const anim = p.attacking ? "attack" : !p.onGround ? "jump" : p.vx !== 0 ? "run" : "idle";
    const img = imgs[anim] || imgs.idle;

    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.facing < 0) ctx.scale(-1,1);
    ctx.drawImage(img, -60, -120, 120, 240);
    ctx.restore();

    // HEALTH
    ctx.fillStyle = "#000"; ctx.fillRect(p.x-55, p.y-150, 110, 16);
    ctx.fillStyle = "#c00"; ctx.fillRect(p.x-53, p.y-148, 106, 12);
    ctx.fillStyle = "#0f0"; ctx.fillRect(p.x-53, p.y-148, p.health*1.06, 12);

    ctx.fillStyle = "#fff"; ctx.font = "24px Compas"; ctx.textAlign = "center";
    ctx.fillText(p.name, p.x, p.y-160);
  });

  ctx.restore();

  // LEADERBOARD
  const top = Object.values(players).sort((a,b)=>b.kills-a.kills).slice(0,8);
  document.getElementById("lb").innerHTML = "<b>TOP WARRIORS</b><br>" +
    top.map((p,i)=>`${i+1}. ${p.name} — ${p.kills} kills`).join("<br>");

  requestAnimationFrame(draw);
}
draw();
