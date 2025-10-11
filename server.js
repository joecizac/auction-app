// server.js - The heart of our application

// 1. Import necessary tools
const express = require('express');
const path = require('path');

// 2. Initialize the app
const app = express();
const PORT = 3000;

// 3. Set up Middleware
// This line tells Express that it can understand JSON data sent in requests
app.use(express.json());
// This line serves static files from the 'public' directory.
app.use(express.static(path.join(__dirname, 'public')));

// 4. Define Routes
// Route for the main login page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// =================== NEW SECTION START ===================

// Route to handle login attempts
app.post('/login', (req, res) => {
    // Get the username and password from the request body sent by the frontend
    const { username, password } = req.body;

    // For now, we'll hardcode the admin credentials
    // In the future, we will check these against a database
    const ADMIN_USERNAME = 'admin';
    const ADMIN_PASSWORD = 'password123';

    // Check if the provided credentials match our hardcoded admin
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        // If they match, send a success response
        res.json({ success: true, message: 'Login successful!' });
    } else {
        // If they don't match, send a failure response
        res.json({ success: false, message: 'Invalid username or password.' });
    }
});

// A placeholder route for the admin dashboard
// We will build this page in the next step
app.get('/admin', (req, res) => {
    // res.send('<h1>Welcome, Admin!</h1><p>This is the future admin dashboard.</p>');
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// =================== NEW SECTION END ===================

// 5. Start the Server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

