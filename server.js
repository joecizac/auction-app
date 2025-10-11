const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// MIDDLEWARE
// This line allows the server to understand incoming JSON data
app.use(express.json());
// This line serves static files (HTML, CSS, JS) from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));


// ROUTES
// Handles the POST request when a user tries to log in
app.post('/login', (req, res) => { // This line must have (req, res)
    const { username, password } = req.body;

    if (username === 'admin' && password === 'password123') {
        res.json({ success: true, redirectUrl: '/admin' });
    } else {
        res.status(401).json({ message: 'Invalid username or password' });
    }
});

// Serves the admin dashboard page
app.get('/admin', (req, res) => { // This line must have (req, res)
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Serves the "Create Auction" form page
app.get('/admin/create-auction', (req, res) => { // This line must have (req, res)
    res.sendFile(path.join(__dirname, 'public', 'create-auction.html'));
});

// API ROUTE: Handles saving the new auction data
app.post('/api/auctions', (req, res) => { // This line must have (req, res)
    const auctionData = req.body;
    console.log('Received new auction data:');
    console.log(JSON.stringify(auctionData, null, 2)); // Pretty-prints the JSON data

    // Later, we'll save this to a database.
    res.status(201).json({ message: 'Auction created successfully!', auction: auctionData });
});


// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

