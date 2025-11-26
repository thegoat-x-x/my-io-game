const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io")(server);

app.use(express.static("public"));

const MAP_SIZE = 4000;
let players = {};
let food = [];
const foodTypes = ["🍎","🍌","🍇","🍒","🍕","🍔","🌮","🍩","🍪"];
for(let i=0; i<800; i++) food.push({x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, emoji:foodTypes[Math.floor(Math.random()*foodTypes.length)]});

const powerupTypes = [{emoji:"⚡", color:"#ffff00", effect:"speed"}, {emoji:"🛡️", color:"#00ffff", effect:"shield"}, {emoji:"💣", color:"#ff0066", effect:"bomb"}, {emoji:"🧲", color:"#ff00ff", effect:"magnet"}, {emoji:"🍄", color:"#ff8800", effect:"grow"}];
let powerups = [];
for(let i=0; i<8; i++) {
    const type = powerupTypes[Math.floor(Math.random()*powerupTypes.length)];
    powerups.push({x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, ...type});
}

io.on("connection", socket => {
    console.log("Player connected:", socket.id);

    socket.on("ready", data => {
        players[socket.id] = {x:Math.random()*(MAP_SIZE-60)+30, y:Math.random()*(MAP_SIZE-60)+30, size:30, emoji:data.emoji, name:data.name || "Player"};
        socket.emit("init", {id:socket.id, players, food, powerups, world:{w:MAP_SIZE, h:MAP_SIZE}});
        io.emit("players", players);
        io.emit("food", food);
        io.emit("powerups", powerups);
    });

    socket.on("move", data => {
        if(players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;

            // eat food
            food = food.filter(f => {
                const dist = Math.hypot(f.x - players[socket.id].x, f.y - players[socket.id].y);
                if(dist < players[socket.id].size / 2 + 15) {
                    players[socket.id].size += 4;
                    return false;
                }
                return true;
            });

            // eat powerups
            powerups = powerups.filter(pu => {
                const dist = Math.hypot(pu.x - players[socket.id].x, pu.y - players[socket.id].y);
                if(dist < players[socket.id].size / 2 + 30) return false;
                return true;
            });

            // respawn
            while(food.length < 800) food.push({x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, emoji:foodTypes[Math.floor(Math.random()*foodTypes.length)]});
            while(powerups.length < 8) {
                const type = powerupTypes[Math.floor(Math.random()*powerupTypes.length)];
                powerups.push({x:Math.random()*MAP_SIZE, y:Math.random()*MAP_SIZE, ...type});
            }

            // eat players
            for(let id in players) {
                if(id === socket.id) continue;
                const other = players[id];
                const dist = Math.hypot(other.x - players[socket.id].x, other.y - players[socket.id].y);
                if(dist < (players[socket.id].size + other.size)/2 && players[socket.id].size > other.size * 1.2) {
                    players[socket.id].size += other.size / 4;
                    delete players[id];
                    io.emit("playerEaten", {victimId: id, killerId: socket.id});
                }
            }

            io.emit("players", players);
            io.emit("food", food);
            io.emit("powerups", powerups);
        }
    });

    socket.on("split", () => {
        if(players[socket.id] && players[socket.id].size > 40) {
            players[socket.id].size /= 2;
        }
    });

    socket.on("chat", msg => io.emit("chat", `${players[socket.id]?.name || "Anon"}: ${msg}`));

    socket.on("disconnect", () => {
        delete players[socket.id];
        io.emit("players", players);
    });
});

server.listen(process.env.PORT || 3000, () => console.log("EMOJI.IO LIVE - NO FREEZE 🔥"));
