const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const { Low, JSONFile } = require('lowdb');
const multer = require('multer');
const csv = require('csv-parser');
const streamifier = require('streamifier');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Database Setup
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Multer Setup
const upload = multer({ storage: multer.memoryStorage() });

// DB Initialization
const initializeDatabase = async () => {
    await db.read();
    db.data = db.data || { auctions: [] };
    await db.write();
};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Page Routes
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password123') {
        return res.json({ success: true, redirectUrl: '/admin' });
    }
    db.read().then(() => {
        for (const auction of db.data.auctions) {
            if (auction.teams) {
                const team = auction.teams.find(t => t.username === username && t.password === password);
                if (team) {
                    return res.json({ success: true, redirectUrl: `/team-dashboard?auctionId=${auction.id}&teamId=${team.id}` });
                }
            }
        }
        return res.status(401).json({ message: 'Invalid username or password' });
    });
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin/create-auction', (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-auction.html')));
app.get('/admin/auction/:auctionId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'auction-panel.html')));
app.get('/admin/auction/:auctionId/teams', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-teams.html')));
app.get('/admin/auction/:auctionId/teams/new', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-form.html')));
app.get('/admin/auction/:auctionId/teams/:teamId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-form.html')));
app.get('/admin/auction/:auctionId/players', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-players.html')));
app.get('/admin/auction/:auctionId/players/new', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player-form.html')));
app.get('/admin/auction/:auctionId/players/:playerId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player-form.html')));
app.get('/presenter/:auctionId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'presenter.html')));
app.get('/team-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-dashboard.html')));
app.get('/admin/auction/:auctionId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-auction.html')));


// API Routes
// Auctions
app.get('/api/auctions', async (req, res) => { await db.read(); res.json(db.data.auctions); });
app.post('/api/auctions', async (req, res) => {
    const auctionData = req.body;
    auctionData.id = `auc_${Date.now()}`;
    // THE FIX: Add the creation date to every new auction
    auctionData.createdAt = new Date().toISOString();
    await db.read();
    if (!db.data.auctions) db.data.auctions = [];
    db.data.auctions.push(auctionData);
    await db.write();
    res.status(201).json(auctionData);
});
app.get('/api/auctions/:auctionId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) res.json(auction);
    else res.status(404).json({ message: 'Auction not found' });
});
app.put('/api/auctions/:auctionId', async (req, res) => {
    await db.read();
    const auctionIndex = db.data.auctions.findIndex(a => a.id === req.params.auctionId);
    if (auctionIndex !== -1) {
        db.data.auctions[auctionIndex] = { ...db.data.auctions[auctionIndex], ...req.body };
        await db.write();
        res.json(db.data.auctions[auctionIndex]);
    } else {
        res.status(404).json({ message: 'Auction not found' });
    }
});
app.delete('/api/auctions/:auctionId', async (req, res) => {
    await db.read();
    const auctionIndex = db.data.auctions.findIndex(a => a.id === req.params.auctionId);
    if (auctionIndex !== -1) {
        db.data.auctions.splice(auctionIndex, 1);
        await db.write();
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Auction not found' });
    }
});
app.put('/api/auctions/:auctionId/status', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) {
        auction.status = req.body.status;
        await db.write();
        res.json(auction);
    } else {
        res.status(404).json({ message: 'Auction not found' });
    }
});
// Teams
app.get('/api/auctions/:auctionId/teams', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) res.json(auction.teams || []);
    else res.status(404).json({ message: 'Auction not found' });
});
app.post('/api/auctions/:auctionId/teams', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (!auction.teams) auction.teams = [];
    const newTeam = req.body;
    newTeam.id = `team_${Date.now()}`;
    newTeam.username = newTeam.name.toLowerCase().replace(/\s+/g, '');
    newTeam.password = Math.random().toString(36).slice(-8);
    auction.teams.push(newTeam);
    await db.write();
    res.status(201).json(newTeam);
});
app.get('/api/auctions/:auctionId/teams/:teamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.teams) {
        const team = auction.teams.find(t => t.id === req.params.teamId);
        if (team) res.json(team);
        else res.status(404).json({ message: 'Team not found' });
    } else res.status(404).json({ message: 'Auction or teams not found' });
});
app.put('/api/auctions/:auctionId/teams/:teamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.teams) {
        const teamIndex = auction.teams.findIndex(t => t.id === req.params.teamId);
        if (teamIndex !== -1) {
            const originalTeam = auction.teams[teamIndex];
            auction.teams[teamIndex] = { ...originalTeam, ...req.body };
            await db.write();
            res.json(auction.teams[teamIndex]);
        } else res.status(404).json({ message: 'Team not found' });
    } else res.status(404).json({ message: 'Auction or teams not found' });
});
app.delete('/api/auctions/:auctionId/teams/:teamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.teams) {
        const teamIndex = auction.teams.findIndex(t => t.id === req.params.teamId);
        if (teamIndex !== -1) {
            auction.teams.splice(teamIndex, 1);
            await db.write();
            res.status(204).send();
        } else res.status(404).json({ message: 'Team not found' });
    } else res.status(404).json({ message: 'Auction or teams not found' });
});
// Players
app.delete('/api/auctions/:auctionId/players', async (req, res) => {
    const { playerIds } = req.body;
    if (!playerIds || !Array.isArray(playerIds)) {
        return res.status(400).json({ message: 'Invalid request: playerIds must be an array.' });
    }
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        auction.players = auction.players.filter(p => !playerIds.includes(p.dbId));
        await db.write();
        res.status(204).send();
    } else {
        res.status(404).json({ message: 'Auction or players not found' });
    }
});
app.get('/api/auctions/:auctionId/players', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) res.json(auction.players || []);
    else res.status(404).json({ message: 'Auction not found' });
});
app.post('/api/auctions/:auctionId/players', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (!auction.players) auction.players = [];
    const newPlayer = req.body;
    newPlayer.dbId = `player_${Date.now()}`;
    const divisionInitial = newPlayer.division.charAt(0).toUpperCase();
    const playersInDivision = auction.players.filter(p => p.division === newPlayer.division).length;
    newPlayer.id = `${divisionInitial}${playersInDivision + 1}`;
    auction.players.push(newPlayer);
    await db.write();
    res.status(201).json(newPlayer);
});
app.post('/api/auctions/:auctionId/players/upload', upload.single('playerCsv'), async (req, res) => {
    const { auctionId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });
    await db.read();
    const auction = db.data.auctions.find(a => a.id === auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (!auction.players) auction.players = [];
    const players = [];
    streamifier.createReadStream(req.file.buffer).pipe(csv())
        .on('data', (row) => {
            const newPlayer = { ...row, dbId: `player_${Date.now()}_${players.length}` };
            const divisionInitial = newPlayer.division.charAt(0).toUpperCase();
            const playersInDivision = (auction.players.filter(p => p.division === newPlayer.division).length) + (players.filter(p => p.division === newPlayer.division).length);
            newPlayer.id = `${divisionInitial}${playersInDivision + 1}`;
            players.push(newPlayer);
        }).on('end', async () => {
            try {
                auction.players.push(...players);
                await db.write();
                res.status(201).json({ message: `Successfully imported ${players.length} players.` });
            } catch (err) {
                res.status(500).json({ message: 'Error saving players to database.' });
            }
        }).on('error', (error) => res.status(500).json({ message: 'Error parsing CSV file.' }));
});
app.get('/api/auctions/:auctionId/players/:playerId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const player = auction.players.find(p => p.dbId === req.params.playerId);
        if (player) res.json(player);
        else res.status(404).json({ message: 'Player not found' });
    } else res.status(404).json({ message: 'Auction or players not found' });
});
app.put('/api/auctions/:auctionId/players/:playerId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
        if (playerIndex !== -1) {
            const originalPlayer = auction.players[playerIndex];
            auction.players[playerIndex] = { ...originalPlayer, ...req.body };
            await db.write();
            res.json(auction.players[playerIndex]);
        } else res.status(404).json({ message: 'Player not found' });
    } else res.status(404).json({ message: 'Auction or players not found' });
});
app.delete('/api/auctions/:auctionId/players/:playerId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
        if (playerIndex !== -1) {
            auction.players.splice(playerIndex, 1);
            await db.write();
            res.status(204).send();
        } else res.status(404).json({ message: 'Player not found' });
    } else res.status(404).json({ message: 'Auction or players not found' });
});
app.post('/api/auctions/:auctionId/players/:playerId/sell', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
    if (playerIndex === -1) return res.status(404).json({ message: 'Player not found' });
    if (!auction.teams || auction.teams.findIndex(t => t.id === req.body.owningTeamId) === -1) {
        return res.status(404).json({ message: 'Winning team not found' });
    }
    auction.players[playerIndex].status = 'sold';
    auction.players[playerIndex].soldPrice = req.body.soldPrice;
    auction.players[playerIndex].owningTeamId = req.body.owningTeamId;
    await db.write();
    res.status(200).json(auction.players[playerIndex]);
});
app.put('/api/auctions/:auctionId/players/:playerId/status', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
        if (playerIndex !== -1) {
            auction.players[playerIndex].status = req.body.status;
            await db.write();
            res.json(auction.players[playerIndex]);
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or players not found' });
    }
});
// Team Dashboard Data
app.get('/api/dashboard-data/:auctionId/:teamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    const team = auction.teams.find(t => t.id === req.params.teamId);
    if (!team) return res.status(404).json({ message: 'Team not found' });
    const players = (auction.players || []).filter(p => p.owningTeamId === req.params.teamId);
    res.json({ auction, team, players });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => { console.log('User disconnected'); });
    socket.on('adminAction', (state) => {
        socket.broadcast.emit('auctionUpdate', state);
    });
});

// Start Server
const startServer = async () => {
    await initializeDatabase();
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer();

