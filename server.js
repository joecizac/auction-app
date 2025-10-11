const express = require('express');
const path = require('path');
const { Low, JSONFile } = require('lowdb');
const multer = require('multer');
const csv = require('csv-parser');
const streamifier = require('streamifier'); 


const app = express();
const PORT = 3000;

// --- NEW: Database Setup ---
// Use a JSON file for our database
const file = path.join(__dirname, 'db.json');
const adapter = new JSONFile(file);
const db = new Low(adapter);
const upload = multer({ storage: multer.memoryStorage() });

// Function to initialize database with default structure if it's empty
const initializeDatabase = async () => {
    await db.read();
    db.data = db.data || { auctions: [], teams: [], players: [] }; // Default structure
    await db.write();
};


// MIDDLEWARE
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));


// ROUTES
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'password123') {
        res.json({ success: true, redirectUrl: '/admin' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.get('/admin/create-auction', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-auction.html'));
});


// --- ROUTE for the specific Auction Admin Panel ---
app.get('/admin/auction/:auctionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auction-panel.html'));
});

// --- ROUTE for editing an auction ---
app.get('/admin/auction/:auctionId/edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-auction.html'));
});


// --- UPDATED API ROUTE to SAVE the auction ---
app.post('/api/auctions', async (req, res) => {
    const auctionData = req.body;

    // Add a unique ID and creation date
    auctionData.id = `auc_${Date.now()}`;
    auctionData.createdAt = new Date().toISOString();
    auctionData.status = 'upcoming'; // 'upcoming', 'live', 'closed'

    await db.read();
    db.data.auctions.push(auctionData);
    await db.write();

    console.log('Successfully saved new auction:', auctionData.title);
    res.status(201).json({ message: 'Auction created successfully!', auction: auctionData });
});

// --- PUT route to update an auction's main details ---
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

// --- PUT route to update only the auction's status (for closing/reopening) ---
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

// --- DELETE route to permanently delete an auction ---
app.delete('/api/auctions/:auctionId', async (req, res) => {
    await db.read();
    const auctionIndex = db.data.auctions.findIndex(a => a.id === req.params.auctionId);
    if (auctionIndex !== -1) {
        db.data.auctions.splice(auctionIndex, 1);
        await db.write();
        res.status(204).send(); // Success with no content
    } else {
        res.status(404).json({ message: 'Auction not found' });
    }
});


// --- NEW API ROUTE to GET all auctions ---
app.get('/api/auctions', async (req, res) => {
    await db.read();
    res.json(db.data.auctions);
});

// --- API ROUTE to GET a SINGLE auction ---
app.get('/api/auctions/:auctionId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) {
        res.json(auction);
    } else {
        res.status(404).json({ message: 'Auction not found' });
    }
});


// --- ROUTES for Team Management ---
// Serves the page to manage teams for a specific auction
app.get('/admin/auction/:auctionId/teams', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manage-teams.html'));
});

// Serves the form to create a new team for a specific auction
app.get('/admin/auction/:auctionId/teams/new', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'team-form.html'));
});

// --- Serves the form to edit a team ---
app.get('/admin/auction/:auctionId/teams/:teamId/edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'team-form.html'));
});


// --- API ROUTES for Team Management ---

// GET all teams for a specific auction
app.get('/api/auctions/:auctionId/teams', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) {
        res.json(auction.teams || []); // Return teams array or empty array if it doesn't exist
    } else {
        res.status(404).json({ message: 'Auction not found' });
    }
});

// --- GET a single team by ID ---
app.get('/api/auctions/:auctionId/teams/:teamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.teams) {
        const team = auction.teams.find(t => t.id === req.params.teamId);
        if (team) {
            res.json(team);
        } else {
            res.status(404).json({ message: 'Team not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or teams not found' });
    }
});

// POST a new team to a specific auction
app.post('/api/auctions/:auctionId/teams', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) {
        return res.status(404).json({ message: 'Auction not found' });
    }

    // Initialize teams array if it doesn't exist
    if (!auction.teams) {
        auction.teams = [];
    }

    const newTeam = req.body;
    newTeam.id = `team_${Date.now()}`;
    // In a real app, you would generate a more secure password
    newTeam.username = newTeam.name.toLowerCase().replace(/\s+/g, '');
    newTeam.password = Math.random().toString(36).slice(-8);

    auction.teams.push(newTeam);
    await db.write();

    console.log(`Team "${newTeam.name}" added to auction "${auction.title}"`);
    res.status(201).json(newTeam);
});

// --- PUT (update) an existing team ---
app.put('/api/auctions/:auctionId/teams/:teamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.teams) {
        const teamIndex = auction.teams.findIndex(t => t.id === req.params.teamId);
        if (teamIndex !== -1) {
            // Update team data but keep original ID and credentials
            const originalTeam = auction.teams[teamIndex];
            auction.teams[teamIndex] = { ...originalTeam, ...req.body };
            await db.write();
            res.json(auction.teams[teamIndex]);
        } else {
            res.status(404).json({ message: 'Team not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or teams not found' });
    }
});

// --- DELETE a team ---
app.delete('/api/auctions/:auctionId/teams/:teamId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.teams) {
        const teamIndex = auction.teams.findIndex(t => t.id === req.params.teamId);
        if (teamIndex !== -1) {
            auction.teams.splice(teamIndex, 1);
            await db.write();
            res.status(204).send(); // 204 No Content success status
        } else {
            res.status(404).json({ message: 'Team not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or teams not found' });
    }
});


// --- ROUTES for Player Management ---
// Serves the page to manage players for a specific auction
app.get('/admin/auction/:auctionId/players', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'manage-players.html'));
});

// Serves the form to add a new player to a specific auction
app.get('/admin/auction/:auctionId/players/new', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player-form.html'));
});

// Serves the form to edit a player
app.get('/admin/auction/:auctionId/players/:playerId/edit', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'player-form.html'));
});


// --- API ROUTES for Player Management ---

// GET all players for a specific auction
app.get('/api/auctions/:auctionId/players', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction) {
        res.json(auction.players || []);
    } else {
        res.status(404).json({ message: 'Auction not found' });
    }
});

// --- GET a single player by ID ---
app.get('/api/auctions/:auctionId/players/:playerId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const player = auction.players.find(p => p.dbId === req.params.playerId);
        if (player) {
            res.json(player);
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or players not found' });
    }
});

// POST a new player to a specific auction
app.post('/api/auctions/:auctionId/players', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (!auction) {
        return res.status(404).json({ message: 'Auction not found' });
    }

    if (!auction.players) {
        auction.players = [];
    }

    const newPlayer = req.body;
    // Generate a unique ID (e.g., S1, Y2)
    const divisionInitial = newPlayer.division.charAt(0).toUpperCase();
    const playersInDivision = auction.players.filter(p => p.division === newPlayer.division).length;
    newPlayer.id = `${divisionInitial}${playersInDivision + 1}`;
    newPlayer.dbId = `player_${Date.now()}`;

    auction.players.push(newPlayer);
    await db.write();

    console.log(`Player "${newPlayer.name}" added to auction "${auction.title}"`);
    res.status(201).json(newPlayer);
});

// --- PUT (update) an existing player ---
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
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or players not found' });
    }
});

// --- DELETE a player ---
app.delete('/api/auctions/:auctionId/players/:playerId', async (req, res) => {
    await db.read();
    const auction = db.data.auctions.find(a => a.id === req.params.auctionId);
    if (auction && auction.players) {
        const playerIndex = auction.players.findIndex(p => p.dbId === req.params.playerId);
        if (playerIndex !== -1) {
            auction.players.splice(playerIndex, 1);
            await db.write();
            res.status(204).send();
        } else {
            res.status(404).json({ message: 'Player not found' });
        }
    } else {
        res.status(404).json({ message: 'Auction or players not found' });
    }
});

// --- POST route for bulk player upload via CSV ---
app.post('/api/auctions/:auctionId/players/upload', upload.single('playerCsv'), async (req, res) => {
    const { auctionId } = req.params;
    
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    await db.read();
    const auction = db.data.auctions.find(a => a.id === auctionId);
    if (!auction) {
        return res.status(404).json({ message: 'Auction not found' });
    }
    if (!auction.players) {
        auction.players = [];
    }

    const players = [];
    // Create a readable stream from the uploaded file's buffer
    const stream = streamifier.createReadStream(req.file.buffer);
    stream.pipe(csv())
        .on('data', (row) => {
            // Assumes CSV headers match these keys: name, position, division, experience, basePrice, merits
            const newPlayer = {
                ...row,
                dbId: `player_${Date.now()}_${players.length}`,
            };

            // Generate display ID
            const divisionInitial = newPlayer.division.charAt(0).toUpperCase();
            const playersInDivision = auction.players.filter(p => p.division === newPlayer.division).length + players.filter(p => p.division === newPlayer.division).length;
            newPlayer.id = `${divisionInitial}${playersInDivision + 1}`;

            players.push(newPlayer);
        })
        .on('end', async () => {
            try {
                auction.players.push(...players);
                await db.write();
                console.log(`Successfully imported ${players.length} players to auction "${auction.title}"`);
                res.status(201).json({ message: `Successfully imported ${players.length} players.` });
            } catch (err) {
                console.error("Error writing to database:", err);
                res.status(500).json({ message: 'Error saving players to database.' });
            }
        })
        .on('error', (error) => {
            console.error("Error parsing CSV:", error);
            res.status(500).json({ message: 'Error parsing CSV file.' });
        });
});


// Start the server
const startServer = async () => {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer();
