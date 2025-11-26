const socket = io();
let clients = {};
let foods = [];
let powerups = [];
let meId = null;
let meReady = false;
let meEmoji = "😎";
let meName = "";
let WORLD = { w: 1200, h: 800 };
let dead = false;
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
let cam = { x: 0, y: 0, w: canvas.width, h: canvas.height };
const keys = {};

window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

document.addEventListener("keydown", e => {
    if (e.key === "t" || e.key === "T") { e.preventDefault(); document.getElementById("chatInput").focus(); }
    if (e.key === "Enter" && document.activeElement === document.getElementById("chatInput") && document.getElementById("chatInput").value.trim()) {
        socket.emit("chat", document.getElementById("chatInput").value.trim());
        document.getElementById("chatInput").value = "";
        document.getElementById("chatInput").blur();
    }
    if (e.code === "Space") { e.preventDefault(); if (meReady && !dead) socket.emit("split"); }
});

socket.on("chat", msg => {
    const div = document.createElement("div");
    div.textContent = msg;
    document.getElementById("chatBox").appendChild(div);
    document.getElementById("chatBox").scrollTop = document.getElementById("chatBox").scrollHeight;
});

const overlay = document.getElementById("overlay");
const nameInput = document.getElementById("nameInput");

function chooseCharacter(emoji) {
    meEmoji = emoji;
    meName = nameInput.value || "Player";
    overlay.style.display = "none";
    socket.emit("ready", { emoji: meEmoji, name: meName });
}

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
        p.x = Math.max(0, Math.min(WORLD.w - p.size, p.x));
        p.y = Math.max(0, Math.min(WORLD.h - p.size, p.y));
        socket.emit("move", { x: p.x, y: p.y });
    }
}

socket.on("init", data => {
    meId = data.id;
    clients = data.players || {};
    foods = data.food || [];
    powerups = data.powerups || [];
    WORLD = data.world || WORLD;
    canvas.width = Math.min(window.innerWidth, 1200);
    canvas.height = Math.min(window.innerHeight - 80, 800);
    meReady = true;
});

socket.on("players", data => clients = data || {});
socket.on("food", data => foods = data || {});
socket.on("powerups", data => powerups = data || {});

function draw() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    if (!clients || !meId || !clients[meId]) {
        ctx.fillStyle = "#fff";
        ctx.font = "18px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Joining game... (WASD to move)", canvas.width/2, canvas.height/2);
        requestAnimationFrame(draw);
        return;
    }
    const me = clients[meId];
    cam.x += ((me.x + me.size/2) - cam.x - canvas.width/2) * 0.12;
    cam.y += ((me.y + me.size/2) - cam.y - canvas.height/2) * 0.12;
    cam.x = Math.max(0, Math.min(WORLD.w - canvas.width, cam.x));
    cam.y = Math.max(0, Math.min(WORLD.h - canvas.height, cam.y));

    ctx.fillStyle = "#000814";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.save();
    ctx.translate(-cam.x, -cam.y);
    ctx.strokeStyle = "rgba(0,255,255,0.1)";
    ctx.lineWidth = 1;
    const gridSize = 100;
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

    // food
    foods.forEach(f => {
        ctx.font = "26px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(f.emoji, f.x, f.y);
    });

    // powerups
    powerups.forEach(pu => {
        ctx.font = "40px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = pu.color || "#fff";
        ctx.shadowBlur = 20;
        ctx.fillText(pu.emoji, pu.x, pu.y);
        ctx.shadowBlur = 0;
    });

    // players
    for (let id in clients) {
        const p = clients[id];
        const drawX = p.x, drawY = p.y;
        ctx.beginPath();
        ctx.fillStyle = (id === meId) ? "rgba(0,255,200,0.08)" : "rgba(0,0,0,0.05)";
        ctx.fillRect(drawX - 6, drawY - 6, p.size + 12, p.size + 12);
        ctx.font = `${Math.max(12, p.size)}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.shadowColor = id === meId ? "#0ff" : "#fff";
        ctx.shadowBlur = 20;
        ctx.fillText(p.emoji || "😈", drawX + p.size/2, drawY + p.size/2);
        ctx.font = "14px Arial";
        ctx.fillStyle = "#0ff";
        ctx.shadowBlur = 0;
        ctx.fillText(p.name || "Player", drawX + p.size/2, drawY - 8);
    }
    ctx.restore();
    updateLeaderboard();
    requestAnimationFrame(draw);
}

function updateLeaderboard() {
    const board = document.getElementById("leaderboard");
    const arr = Object.values(clients).sort((a,b) => b.size - a.size).slice(0,5);
    board.innerHTML = "<b>Leaderboard</b><br>" + arr.map(p => `${p.emoji||'😈'} ${p.name||'Player'} - ${Math.floor(p.size)}`).join("<br>");
}

function tick() {
    clientUpdateLocal();
    setTimeout(tick, 1000/60);
}
tick();
draw();

window.addEventListener("resize", () => {
    canvas.width = Math.min(window.innerWidth, 1200);
    canvas.height = Math.min(window.innerHeight - 80, 800);
});
