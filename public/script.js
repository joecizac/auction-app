document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Redirect to the admin dashboard on successful login
                window.location.href = result.redirectUrl;
            } else {
                alert(result.message);
            }
        } else {
            alert('An error occurred. Please try again.');
        }
    } catch (error) {
        console.error('Login failed:', error);
        alert('Could not connect to the server.');
    }
});

