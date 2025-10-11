// server.js - The heart of our application

// 1. Import necessary tools
// 'express' is the web framework that makes creating a server easy.
// 'path' helps us work with file and directory paths.
const express = require('express');
const path = require('path');

// 2. Initialize the app
// We create an instance of an express application.
const app = express();
// We define a port for our server to listen on. 3000 is a common choice.
const PORT = 3000;

// 3. Set up Middleware
// This line tells Express to serve static files (like HTML, CSS, JS)
// from the 'public' directory. This is how users will get our login page.
app.use(express.static(path.join(__dirname, 'public')));

// 4. Define Routes
// This is a basic route. When a user visits our site's root URL (e.g., http://localhost:3000),
// we send them the index.html file.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 5. Start the Server
// This tells our server to start listening for connections on the specified port.
// The message in the console lets us know it's running.
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log('Open your browser and navigate to the link above to see the login page.');
});
