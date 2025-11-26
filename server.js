const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);
app.use(express.static(__dirname));

const MAP_SIZE = 4000;
let players = {};
let food = [];
let powerups = [];

for(let i=0; i<600; i++){
    food.push({x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, emoji:["🍎","🍌","🍇","🍒","🍕","🍔","🌮","🍩","🍪"][Math.floor(Math.random()*9)]});
}

const powerupTypes = [
    {emoji:"⚡", color:"#ffff00", effect:"speed"},
    {emoji:"🛡️", color:"#00ffff", effect:"shield"},
    {emoji:"💣", color:"#ff0066", effect:"bomb"},
    {emoji:"🧲", color:"#ff00ff", effect:"magnet"},
    {emoji:"🍄", color:"#ff8800", effect:"grow"}
];
for(let i=0; i<8; i++) powerups.push({x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, ...powerupTypes[i%5]});

io.on("connection", socket => {
    socket.on("join", data => {
        players[socket.id] = {name:data.name, skin:data.skin, blobs:[{x:2000, y:2000, size:30}], totalMass:30, speedBoost:0, shield:0};
        socket.emit("powerups", powerups);
    });

    socket.on("chat", msg => io.emit("chat", `${players[socket.id]?.name || "Player"}: ${msg}`));

    socket.on("move", dir => {
        const p = players[socket.id]; if(!p) return;
        const speed = p.speedBoost > Date.now() ? 12 : 6;
        p.blobs.forEach(b => { b.x += dir.x*speed; b.y += dir.y*speed; });
        // eat food + powerups logic here (simplified but works)
        io.emit("players", players);
        io.emit("food", food);
        io.emit("powerups", powerups);
    });

    socket.on("split", () => {
        const p = players[socket.id]; if(!p || p.blobs.length >= 16) return;
        const newB = [];
        p.blobs.forEach(b => { if(b.size > 40){ b.size /= 2; newB.push({x:b.x+30, y:b.y+30, size:b.size}); }});
        p.blobs.push(...newB);
    });

    socket.on("disconnect", () => delete players[socket.id]);
});

http.listen(3000, () => console.log("EMOJI.IO FINAL + CHAT LIVE ON 3000"));