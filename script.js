const socket = io();
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const chatBox = document.getElementById("chatBox");
const chatInput = document.getElementById("chatInput");

let playerId = null;
let players = {};
let food = [];
let powerups = [];
let mapSize = 4000;
let camera = {x:0, y:0};
let myName = "Player";
let mySkin = "😎";
let dead = false;
let keys = {};

const skins = ["😎","😈","🤡","👽","👾","🤖","🎃","💀","👻","🦁","🐯","🦄","🐉","🦈","🔥","⚡","💎","👑","🧟","🥷","😡","😤","🐸","😋"];
const grid = document.getElementById("skinGrid");
skins.forEach(s => {
    const d = document.createElement("div");
    d.className = "skin";
    d.textContent = s;
    d.onclick = () => { mySkin = s; document.querySelectorAll(".skin").forEach(x=>x.classList.remove("selected")); d.classList.add("selected"); };
    grid.appendChild(d);
});
document.querySelector(".skin").classList.add("selected");

function showShop(){ document.getElementById("menu").style.display="none"; document.getElementById("shop").style.display="flex"; }
function back(){ document.getElementById("shop").style.display="none"; document.getElementById("menu").style.display="flex"; }
function play(){
    myName = document.getElementById("nameInput").value.trim() || "Player";
    document.getElementById("menu").style.display="none";
    socket.emit("join", {name:myName, skin:mySkin});
}
function respawn(){
    dead = false;
    document.getElementById("death").style.display="none";
    socket.emit("join", {name:myName, skin:mySkin});
}

// CHAT
document.addEventListener("keydown", e => {
    if(e.key === "t" || e.key === "T") { chatInput.focus(); }
    if(e.key === "Enter" && document.activeElement === chatInput && chatInput.value.trim()){
        socket.emit("chat", chatInput.value.trim());
        chatInput.value = "";
    }
});
socket.on("chat", msg => {
    const div = document.createElement("div");
    div.textContent = msg;
    div.style.margin = "2px 0";
    chatBox.appendChild(div);
    chatBox.scrollTop = chatBox.scrollHeight;
});

// MOVEMENT
document.addEventListener("keydown", e => keys[e.key.toLowerCase()]=true);
document.addEventListener("keyup", e => keys[e.key.toLowerCase()]=false);
document.addEventListener("keydown", e => { if(e.code==="Space"){ e.preventDefault(); if(!dead) socket.emit("split"); }});

setInterval(() => {
    if(dead || !players[playerId]) return;
    let dx=0, dy=0;
    if(keys["a"]||keys["arrowleft"]) dx--;
    if(keys["d"]||keys["arrowright"]) dx++;
    if(keys["w"]||keys["arrowup"]) dy--;
    if(keys["s"]||keys["arrowdown"]) dy++;
    if(dx||dy) socket.emit("move", {x:dx/Math.hypot(dx,dy), y:dy/Math.hypot(dx,dy)});
}, 16);

socket.on("players", p => { players = p; if(!playerId) playerId = socket.id; });
socket.on("food", f => food = f);
socket.on("powerups", p => powerups = p);
socket.on("playerEaten", d => {
    if(d.victimId === playerId){
        dead = true;
        document.getElementById("killer").textContent = `EATEN BY ${d.killerName} ${d.killerSkin}`;
        document.getElementById("death").style.display = "flex";
    }
});

function cam(){
    if(!players[playerId]?.blobs?.length) return;
    const avg = players[playerId].blobs.reduce((a,b)=>({x:a.x+b.x, y:a.y+b.y}), {x:0,y:0});
    avg.x /= players[playerId].blobs.length;
    avg.y /= players[playerId].blobs.length;
    camera.x += (avg.x - canvas.width/2 - camera.x)*0.1;
    camera.y += (avg.y - canvas.height/2 - camera.y)*0.1;
}

function draw(){
    ctx.fillStyle = "#000811";
    ctx.fillRect(0,0,canvas.width,canvas.height);
    cam();

    // GRID
    ctx.strokeStyle = "rgba(0,255,255,0.1)";
    for(let i = -10; i < 50; i++){
        const x = i*100 - (camera.x % 100);
        const y = i*100 - (camera.y % 100);
        ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke();
    }

    // FOOD
    food.forEach(f => {
        const x = f.x - camera.x;
        const y = f.y - camera.y;
        if(x > -100 && x < canvas.width+100 && y > -100 && y < canvas.height+100){
            ctx.font = "30px Arial";
            ctx.fillText(f.emoji, x, y);
        }
    });

    // POWERUPS
    powerups.forEach(p => {
        const x = p.x - camera.x;
        const y = p.y - camera.y;
        ctx.font = "50px Arial";
        ctx.shadowColor = p.color || "#fff";
        ctx.shadowBlur = 30;
        ctx.fillText(p.emoji, x, y);
        ctx.shadowBlur = 0;
    });

    // PLAYERS
    for(let id in players){
        players[id].blobs.forEach(b => {
            const x = b.x - camera.x;
            const y = b.y - camera.y;
            const skin = id === playerId ? mySkin : players[id].skin;
            ctx.font = b.size + "px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.shadowColor = id === playerId ? "#0ff" : "#fff";
            ctx.shadowBlur = 20;
            ctx.fillText(skin, x, y);
            ctx.font = "18px Arial";
            ctx.fillStyle = "#0ff";
            ctx.fillText(players[id].name, x, y - b.size/2 - 15);
        });
    }

    // LEADERBOARD
    const top = Object.values(players).sort((a,b)=>b.totalMass-a.totalMass).slice(0,8);
    document.getElementById("lb").innerHTML = "<b>TOP 8</b><br>" + top.map((p,i)=>`${i+1}. ${p.name} ${p.skin} ${Math.floor(p.totalMass)}`).join("<br>");

    requestAnimationFrame(draw);
}
draw();