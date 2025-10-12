const express = require('express');
const path = require('path');
const http = require('http');
const fs = require('fs');
const { Server } = require("socket.io");
const { Low, JSONFile } = require('lowdb');
const multer = require('multer');
const csv = require('csv-parser');
const streamifier = require('streamifier');

const app = express();
const server = http.createServer(app); // Create an HTTP server from our Express app
const io = new Server(server); // Initialize Socket.IO on the HTTP server
const PORT = 3000;

// --- Database Setup ---
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// --- Multer Setup for File Uploads ---
const upload = multer({ storage: multer.memoryStorage() });


// Function to initialize database
const initializeDatabase = async () => {
    await db.read();
    db.data = db.data || { auctions: [] };
    await db.write();
};

// MIDDLEWARE
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Real-Time Logic with Socket.IO ---
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });

    // Listen for updates from the admin panel
    socket.on('adminAction', (state) => {
        // Broadcast the update to all other clients (like the presenter view)
        socket.broadcast.emit('auctionUpdate', state);
    });
});


// PAGE ROUTES
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password123') {
        res.json({ success: true, redirectUrl: '/admin' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/admin/create-auction', (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-auction.html')));
app.get('/admin/auction/:auctionId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'auction-panel.html')));
app.get('/admin/auction/:auctionId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-auction.html')));
app.get('/admin/auction/:auctionId/teams', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-teams.html')));
app.get('/admin/auction/:auctionId/teams/new', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-form.html')));
app.get('/admin/auction/:auctionId/teams/:teamId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-form.html')));
app.get('/admin/auction/:auctionId/players', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-players.html')));
app.get('/admin/auction/:auctionId/players/new', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player-form.html')));
app.get('/admin/auction/:auctionId/players/:playerId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player-form.html')));
app.get('/presenter/:auctionId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'presenter.html')));

// --- API ROUTES ---

// Auctions
app.get('/api/auctions', async (req, res) => {
    await db.read();
    res.json(db.data.auctions);
});
app.post('/api/auctions', async (req, res) => {
    const auctionData = req.body;
    auctionData.id = `auc_${Date.now()}`;
    auctionData.createdAt = new Date().toISOString();
    auctionData.status = 'upcoming';
    await db.read();
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
        const originalAuction = db.data.auctions[auctionIndex];
        db.data.auctions[auctionIndex] = { ...originalAuction, ...req.body };
        await db.write();
        res.json(db.data.auctions[auctionIndex]);
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

app.post('/api/auctions/:auctionId/players/upload', upload.single('playerCsv'), async (req, res) => {
    const { auctionId } = req.params;
    if (!req.file) return res.status(400).json({ message: 'No file uploaded.' });

    await db.read();
    const auction = db.data.auctions.find(a => a.id === auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (!auction.players) auction.players = [];

    const players = [];
    streamifier.createReadStream(req.file.buffer)
        .pipe(csv())
        .on('data', (row) => {
            const newPlayer = { ...row, dbId: `player_${Date.now()}_${players.length}` };
            const divisionInitial = newPlayer.division.charAt(0).toUpperCase();
            const playersInDivision = (auction.players.filter(p => p.division === newPlayer.division).length) + (players.filter(p => p.division === newPlayer.division).length);
            newPlayer.id = `${divisionInitial}${playersInDivision + 1}`;
            players.push(newPlayer);
        })
        .on('end', async () => {
            try {
                auction.players.push(...players);
                await db.write();
                res.status(201).json({ message: `Successfully imported ${players.length} players.` });
            } catch (err) {
                res.status(500).json({ message: 'Error saving players to database.' });
            }
        })
        .on('error', (error) => res.status(500).json({ message: 'Error parsing CSV file.' }));
});

// Live Auction Actions
app.put('/api/auctions/:auctionId/players/:playerId/sell', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
        if (playerIndex !== -1) {
            auction.players[playerIndex].status = 'sold';
            auction.players[playerIndex].owningTeamId = req.body.owningTeamId;
            auction.players[playerIndex].soldPrice = req.body.soldPrice;
            await db.write();
            res.json(auction.players[playerIndex]);
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or players not found' });
    }
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


// Start the server
const startServer = async () => {
    await initializeDatabase();
    server.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer();

