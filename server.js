const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Serve static files (HTML, CSS, JS) from the "public" directory
app.use(express.static('public'));

// --- ROUTES ---

// Root route: Redirects to the login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handle login attempts
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    // Hardcoded admin credentials for now
    if (username === 'admin' && password === 'password123') {
        // On successful login, send a success status and the redirect URL
        res.json({ success: true, redirectUrl: '/admin' });
    } else {
        // On failure, send an error status
        res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
});

// Admin dashboard page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Create Auction page
app.get('/admin/create-auction', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'create-auction.html'));
});


// --- START THE SERVER ---

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

