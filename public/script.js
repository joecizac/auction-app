// public/script.js - This code runs in the user's browser

// Wait until the HTML document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Find the login form in our HTML
    const loginForm = document.getElementById('login-form');

    // Add an event listener for when the form is submitted
    loginForm.addEventListener('submit', async (event) => {
        // Prevent the form from doing its default browser action (reloading the page)
        event.preventDefault();

        // Get the values from the input fields
        const username = event.target.username.value;
        const password = event.target.password.value;

        // Send the login data to our server
        // We use the 'fetch' API to make a POST request to the '/login' route
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        // Get the server's response
        const result = await response.json();

        // Check if the login was successful
        if (result.success) {
            // If successful, redirect the user to the admin dashboard
            // We will create this page in the next step
            window.location.href = '/admin';
        } else {
            // If it failed, show an alert message
            // In a real app, we'd show a nicer message, but this is good for now
            alert(result.message);
        }
    });
});
