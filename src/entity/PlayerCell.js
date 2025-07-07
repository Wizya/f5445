const Cell = require('./Cell');
const Packet = require('../packet');
const https = require('https');

class PlayerCell extends Cell {
    constructor(server, owner, position, size) {
        super(server, owner, position, size);
        this.type = 0;
        this._canRemerge = false;
    }

    canEat(cell) {
        return true;
    }

    getSpeed(dist) {
        let speed = 2.2 * Math.pow(this.radius, -0.45) * 40;
        speed *= this.server.config.playerSpeed;
        speed = Math.min(dist, speed);
        if (dist !== 0) speed /= dist;
        return speed;
    }

    onAdd(server) {
        this.color = this.owner.color;
        this.owner.cells.push(this);
        this.owner.socket.client.sendPacket(new Packet.AddNode(this.owner, this));
        this.server.nodesPlayer.unshift(this);
        server.mode.onCellAdd(this);
    }

    onRemove(server) {
        this.owner.cells.removeUnsorted(this);
        this.server.nodesPlayer.removeUnsorted(this);
        server.mode.onCellRemove(this);
    }

    onEat(prey) {
        try {
            if (!this.owner || !this.owner.socket || !prey || !prey.nodeId) return;

            // ❌ Игнорируем клетки, созданные игроком
            if (prey.owner) return;

            const steamid = this.owner.socket.steamid;
            if (!steamid || typeof steamid !== 'string' || steamid.trim() === '') return;

            const mass = this._mass;

            // ✅ Увеличение массы
            this.setSize(Math.sqrt(this._radius2 + prey._radius2));

            // 🎨 Получение цвета с 10% шансом
            if (mass > 10 && Math.random() < 0.01) {
                const data = JSON.stringify({
                    steamid: steamid,
                    action: "pickup",
                    cellId: prey.nodeId,
                    mass: mass
                });

                const options = {
                    hostname: 'free-vpn-for-you.com',
                    port: 443,
                    path: `/get_random_color.php?steamidfdfgdggdf=${encodeURIComponent(steamid)}`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(data)
                    }
                };

                const req = https.request(options, res => {
                    let body = '';
                    res.on('data', chunk => body += chunk);
                    res.on('end', () => {
                        const html = `🔥 You got a pixel! 🔥`;
                        const msgBuffer = Buffer.alloc(Buffer.byteLength(html, 'utf8') + 2);
                        msgBuffer[0] = 0x99;
                        msgBuffer.write(html, 1, 'utf8');
                        msgBuffer[msgBuffer.length - 1] = 0x00;

                        if (this.owner.socket.readyState === 1) {
                            this.owner.socket.send(msgBuffer);
                        }
                    });
                });

                req.on('error', error => {
                    console.error(`❌ Ошибка при отправке API от ${steamid}:`, error.message);
                });

                req.write(data);
                req.end();
            }

            // 🧬 Получение скина с 1% шансом
            if (mass > 50 && Math.random() < 0.001) {
                const data = JSON.stringify({
                    steamid: steamid,
                    action: "pickup",
                    cellId: prey.nodeId,
                    mass: mass
                });

                const options = {
                    hostname: 'free-vpn-for-you.com',
                    port: 443,
                    path: `/crop_stylized.php?idfddffddffdfsfesse=${encodeURIComponent(steamid)}`,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Content-Length': Buffer.byteLength(data)
                    }
                };

                const req = https.request(options, res => {
                    console.log(`🌐 [${steamid}] API ответ: ${res.statusCode}`);

                    const text = `🎉 You've got a new skin! 🎉`;
                    const msgBuffer = Buffer.alloc(Buffer.byteLength(text, 'utf8') + 2);
                    msgBuffer[0] = 0x99;
                    msgBuffer.write(text, 1, 'utf8');
                    msgBuffer[msgBuffer.length - 1] = 0x00;

                    if (this.owner.socket.readyState === 1) {
                        this.owner.socket.send(msgBuffer);
                    }
                });

                req.on('error', error => {
                    console.error(`❌ Ошибка при отправке API от ${steamid}:`, error.message);
                });

                req.write(data);
                req.end();
            }

        } catch (err) {
            console.error("❌ Ошибка в onEat():", err);
        }
    }
}

module.exports = PlayerCell;
