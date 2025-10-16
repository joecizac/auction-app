const express = require('express');
const path = require('path');
const http = require('http');
const { Server } = require("socket.io");
const { Low, JSONFile } = require('lowdb');
const multer = require('multer');
const csv = require('csv-parser');
const streamifier = require('streamifier');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3000;

// Database Setup
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);

// Multer Setup
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const dir = 'uploads/';
        // Create the directory if it doesn't exist
        if (!fs.existsSync(dir)){
            fs.mkdirSync(dir);
        }
        cb(null, dir);
    },
    filename: function (req, file, cb) {
        // Create a unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

// DB Initialization
const initializeDatabase = async () => {
    await db.read();
    db.data = db.data || { auctions: [] };
    await db.write();
};

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- NEW: Reusable Helper Function for Player ID Generation ---
const getNextPlayerIdForDivision = (players, divisionInitial, excludePlayerDbId = null) => {
    let maxNumber = 0;
    players.forEach(p => {
        // When updating, we exclude the player being updated from the check
        if (p.dbId === excludePlayerDbId) return;

        if (p.id && p.id.startsWith(divisionInitial)) {
            const numberPart = parseInt(p.id.substring(1), 10);
            if (!isNaN(numberPart) && numberPart > maxNumber) {
                maxNumber = numberPart;
            }
        }
    });
    return `${divisionInitial}${maxNumber + 1}`;
};


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
app.get('/admin/auction/:auctionId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'create-auction.html')));
app.get('/admin/auction/:auctionId/teams', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-teams.html')));
app.get('/admin/auction/:auctionId/teams/new', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-form.html')));
app.get('/admin/auction/:auctionId/teams/:teamId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-form.html')));
app.get('/admin/auction/:auctionId/players', (req, res) => res.sendFile(path.join(__dirname, 'public', 'manage-players.html')));
app.get('/admin/auction/:auctionId/players/new', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player-form.html')));
app.get('/admin/auction/:auctionId/players/:playerId/edit', (req, res) => res.sendFile(path.join(__dirname, 'public', 'player-form.html')));
app.get('/presenter/:auctionId', (req, res) => res.sendFile(path.join(__dirname, 'public', 'presenter.html')));
app.get('/team-dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'team-dashboard.html')));
app.get('/admin/auction/:auctionId/summary', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auction-summary.html'));
});


// API Routes
// Auctions
app.get('/api/auctions', async (req, res) => { await db.read(); res.json(db.data.auctions); });
app.get('/api/auctions/:auctionId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) res.json(auction);
    else res.status(404).json({ message: 'Auction not found' });
});
app.post('/api/auctions', upload.single('bannerImage'), async (req, res) => {
    const auctionData = req.body;
    auctionData.id = `auc_${Date.now()}`;
    auctionData.createdAt = new Date().toISOString();
    
    if (req.file) {
        auctionData.bannerImage = `/uploads/${req.file.filename}`;
    }

    // This part is also crucial: it converts the text fields back into objects/arrays
    auctionData.bidIncrements = JSON.parse(auctionData.bidIncrements || '[]');
    auctionData.allowedDivisions = JSON.parse(auctionData.allowedDivisions || '[]');
    auctionData.divisionLimits = JSON.parse(auctionData.divisionLimits || '{}');
    auctionData.positionLimits = JSON.parse(auctionData.positionLimits || '{}');

    await db.read();
    if (!db.data.auctions) db.data.auctions = [];
    db.data.auctions.push(auctionData);
    await db.write();
    res.status(201).json(auctionData);
});
app.put('/api/auctions/:auctionId', upload.single('bannerImage'), async (req, res) => {
    await db.read();
    const auctionIndex = db.data.auctions.findIndex(a => a.id === req.params.auctionId);
    if (auctionIndex !== -1) {
        const updatedData = req.body;
        if (req.file) {
            updatedData.bannerImage = `/uploads/${req.file.filename}`;
        }
        
        updatedData.bidIncrements = JSON.parse(updatedData.bidIncrements || '[]');
        updatedData.allowedDivisions = JSON.parse(updatedData.allowedDivisions || '[]');
        updatedData.divisionLimits = JSON.parse(updatedData.divisionLimits || '{}');
        updatedData.positionLimits = JSON.parse(updatedData.positionLimits || '{}');

        db.data.auctions[auctionIndex] = { ...db.data.auctions[auctionIndex], ...updatedData };
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
app.post('/api/auctions/:auctionId/teams', upload.single('logoImage'), async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (!auction.teams) auction.teams = [];
    const newTeam = req.body;
    if (req.file) {
        newTeam.logoImage = `/uploads/${req.file.filename}`;
    }
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
        if (team) {
            const players = (auction.players || []).filter(p => p.owningTeamId === req.params.teamId);
            res.json({ ...team, players });
        } else res.status(404).json({ message: 'Team not found' });
    } else res.status(404).json({ message: 'Auction or teams not found' });
});
app.get('/api/full-dashboard-data/:auctionId/:myTeamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) {
        return res.status(404).json({ message: 'Auction not found' });
    }

    const myTeam = (auction.teams || []).find(t => t.id === req.params.myTeamId);
    if (!myTeam) {
        return res.status(404).json({ message: 'Your team was not found in this auction.' });
    }

    const allTeams = auction.teams || [];
    // Only send players who are actually sold to calculate team stats
    const allPlayers = (auction.players || []).filter(p => p.status === 'sold');
    
    res.json({ auction, myTeam, allTeams, allPlayers });
});
app.put('/api/auctions/:auctionId/teams/:teamId', upload.single('logoImage'), async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.teams) {
        const teamIndex = auction.teams.findIndex(t => t.id === req.params.teamId);
        if (teamIndex !== -1) {
            const updatedData = req.body;
            if (req.file) {
                updatedData.logoImage = `/uploads/${req.file.filename}`;
            }
            const originalTeam = auction.teams[teamIndex];
            auction.teams[teamIndex] = { ...originalTeam, ...updatedData };
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
app.delete('/api/auctions/:auctionId/teams/:teamId/players/:playerId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
        if (playerIndex !== -1) {
            auction.players[playerIndex].status = 'unsold';
            delete auction.players[playerIndex].soldPrice;
            delete auction.players[playerIndex].owningTeamId;
            await db.write();
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or players not found' });
    }
});
app.post('/api/auctions/:auctionId/teams/:teamId/remove-player', async (req, res) => {
    const { playerId } = req.body;
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === playerId);
        if (playerIndex !== -1) {
            auction.players[playerIndex].status = 'unsold';
            delete auction.players[playerIndex].owningTeamId;
            delete auction.players[playerIndex].soldPrice;
            await db.write();
            res.status(200).json({ message: 'Player removed successfully.' });
        } else res.status(404).json({ message: 'Player not found' });
    } else res.status(404).json({ message: 'Auction or players not found' });
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
        // Filter out the players that need to be deleted
        auction.players = auction.players.filter(p => !playerIds.includes(p.dbId));
        await db.write();
        res.status(204).send(); // Success with no content
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
app.post('/api/auctions/:auctionId/players', upload.single('photoImage'), async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });
    if (!auction.players) auction.players = [];
    const newPlayer = req.body;
    if (req.file) {
        newPlayer.photoImage = `/uploads/${req.file.filename}`;
    }
    newPlayer.dbId = `player_${Date.now()}`;
    const divisionInitial = newPlayer.division.charAt(0).toUpperCase();
    newPlayer.id = getNextPlayerIdForDivision(auction.players, divisionInitial);
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
            
            // THE FIX: Using the new helper function
            newPlayer.id = getNextPlayerIdForDivision([...auction.players, ...players], divisionInitial);
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
app.put('/api/auctions/:auctionId/players/:playerId', upload.single('photoImage'), async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
        if (playerIndex !== -1) {
            const updatedData = req.body;
            if (req.file) {
                updatedData.photoImage = `/uploads/${req.file.filename}`;
            }
            const originalPlayer = auction.players[playerIndex];
            if (updatedData.division && updatedData.division !== originalPlayer.division) {
                const divisionInitial = updatedData.division.charAt(0).toUpperCase();
                updatedData.id = getNextPlayerIdForDivision(auction.players, divisionInitial, originalPlayer.dbId);
            }
            auction.players[playerIndex] = { ...originalPlayer, ...updatedData };
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
app.get('/api/full-dashboard-data/:auctionId/:myTeamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) return res.status(404).json({ message: 'Auction not found' });

    const myTeam = (auction.teams || []).find(t => t.id === req.params.myTeamId);
    if (!myTeam) return res.status(404).json({ message: 'Your team was not found in this auction.' });

    const allTeams = auction.teams || [];
    const allPlayers = (auction.players || []).filter(p => p.status === 'sold');
    
    res.json({ auction, myTeam, allTeams, allPlayers });
});


// Socket.IO
io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => { console.log('User disconnected'); });
    socket.on('adminAction', (state) => {
        socket.broadcast.emit('auctionUpdate', state);
    });

    // Listen for bids FROM a team client
    socket.on('teamBid', (data) => {
        // Broadcast this bid event to the admin panel
        console.log(`Received bid from team ${data.teamId}`);
        io.emit('teamBidAction', data);
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

