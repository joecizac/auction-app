const express = require('express');
const path = require('path');
// --- NEW: Import lowdb ---
const { Low, JSONFile } = require('lowdb');
// --- FIX: Steno is no longer imported directly ---

const app = express();
const PORT = 3000;

// --- NEW: Database Setup ---
// Use a JSON file for our database
const file = path.join(__dirname, 'db.json');
// --- FIX: Simplified the adapter. Steno is used automatically by JSONFile. ---
const adapter = new JSONFile(file);
const db = new Low(adapter);

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

// --- NEW API ROUTE to GET all auctions ---
app.get('/api/auctions', async (req, res) => {
    await db.read();
    res.json(db.data.auctions);
});


// Start the server
const startServer = async () => {
    await initializeDatabase();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

startServer();
