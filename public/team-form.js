document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const isEditing = pathParts[pathParts.length - 1] === 'edit';

    let auctionId, teamId;

    if (isEditing) {
        // URL is /admin/auction/:auctionId/teams/:teamId/edit
        teamId = pathParts[pathParts.length - 2];
        auctionId = pathParts[pathParts.length - 4];
    } else {
        // URL is /admin/auction/:auctionId/teams/new
        auctionId = pathParts[pathParts.length - 3];
        teamId = null;
    }

    // Element references
    const backLink = document.getElementById('back-to-teams-link');
    const formTitle = document.getElementById('form-title');
    const teamForm = document.getElementById('team-form');
    const submitBtn = document.getElementById('submit-btn');
    const deleteBtn = document.getElementById('delete-team-btn');
    const loginCredentialsContainer = document.getElementById('login-credentials-container');
    const copyCredentialsBtn = document.getElementById('copy-credentials-btn');
    const playersSection = document.getElementById('players-section');
    const teamPlayersList = document.getElementById('team-players-list');

    if (!auctionId) {
        console.error('Invalid auction ID');
        formTitle.textContent = "Error: Auction Not Found";
        return;
    }

    // Set back link
    backLink.href = `/admin/auction/${auctionId}/teams`;

    if (isEditing) {
        // --- EDIT MODE ---
        formTitle.textContent = 'Edit Team';
        submitBtn.textContent = 'Update Team';
        deleteBtn.style.display = 'block';
        loginCredentialsContainer.style.display = 'block';
        playersSection.style.display = 'block';

        // Fetch existing team data and populate the form
        try {
            const [teamRes, auctionRes] = await Promise.all([
                fetch(`/api/auctions/${auctionId}/teams/${teamId}`),
                fetch(`/api/auctions/${auctionId}`)
            ]);
            
            if (!teamRes.ok || !auctionRes.ok) throw new Error('Could not load team or auction data');

            const team = await teamRes.json();
            const auction = await auctionRes.json();
            const teamPlayers = (auction.players || []).filter(p => p.owningTeamId === team.id);
            document.getElementById('team-name').value = team.name;
            document.getElementById('manager-name').value = team.managerName;
            document.getElementById('co-manager-name').value = team.coManagerName;
            document.getElementById('captain-name').value = team.captainName;
            document.getElementById('captain-value').value = team.captainValue;
            document.getElementById('team-username').textContent = team.username;
            document.getElementById('team-password').textContent = team.password;
            // Render the list of players
            renderTeamPlayers(team, teamPlayers);
        } catch (error) {
            console.error('Failed to fetch team data:', error);
            alert('Could not load team data.');
        }

    } else {
        // --- CREATE MODE ---
        formTitle.textContent = 'Create Team';
        submitBtn.textContent = 'Create Team';
    }

    function renderTeamPlayers(team, players) {
        teamPlayersList.innerHTML = ''; // Clear previous list
        
        // Add captain as the first item
        const captainItem = document.createElement('div');
        captainItem.className = 'team-player-list-item';
        captainItem.innerHTML = `
            <div class="team-player-info">
                <span class="player-name">${team.captainName} (Captain)</span>
                <span class="player-price">${new Intl.NumberFormat().format(team.captainValue)}</span>
            </div>
        `;
        teamPlayersList.appendChild(captainItem);

        // Add sold players
        players.forEach(player => {
            const playerItem = document.createElement('div');
            playerItem.className = 'team-player-list-item';
            playerItem.innerHTML = `
                <div class="team-player-info">
                    <span class="player-name">${player.name}</span>
                    <span class="player-price">${new Intl.NumberFormat().format(player.soldPrice)}</span>
                </div>
                <button type="button" class="btn btn-danger btn-small remove-player-btn" data-player-id="${player.dbId}">Remove</button>
            `;
            teamPlayersList.appendChild(playerItem);
        });
    }

    // Handle Form Submission (Create or Update)
    teamForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const teamData = {
            name: document.getElementById('team-name').value,
            managerName: document.getElementById('manager-name').value,
            coManagerName: document.getElementById('co-manager-name').value,
            captainName: document.getElementById('captain-name').value,
            captainValue: document.getElementById('captain-value').value,
        };

        const url = isEditing ? `/api/auctions/${auctionId}/teams/${teamId}` : `/api/auctions/${auctionId}/teams`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teamData),
            });
            if (!response.ok) throw new Error('Failed to save team');

            alert(`Team ${isEditing ? 'updated' : 'created'} successfully!`);
            window.location.href = `/admin/auction/${auctionId}/teams`;

        } catch (error) {
            console.error('Error saving team:', error);
            alert('Failed to save team.');
        }
    });

    // Handle Delete
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete team');

                alert('Team deleted successfully.');
                window.location.href = `/admin/auction/${auctionId}/teams`;
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Failed to delete team.');
            }
        }
    });

    // Handle Remove Player from Team
    teamPlayersList.addEventListener('click', async (event) => {
        if (event.target.classList.contains('remove-player-btn')) {
            const playerToRemoveId = event.target.dataset.playerId;
            const playerName = event.target.closest('.team-player-list-item').querySelector('.player-name').textContent;
            
            if (confirm(`Are you sure you want to remove ${playerName} from this team? The player will be marked as 'unsold'.`)) {
                try {
                    const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}/players/${playerToRemoveId}`, {
                        method: 'DELETE',
                    });
                    if (!response.ok) throw new Error('Failed to remove player.');
                    
                    alert(`${playerName} has been removed from the team.`);
                    // Refresh the page to show the updated player list
                    window.location.reload();

                } catch (error) {
                    console.error('Error removing player:', error);
                    alert('Failed to remove player.');
                }
            }
        }
    });

    // --- Handle Copy Credentials button click ---
    copyCredentialsBtn.addEventListener('click', () => {
        const username = document.getElementById('team-username').textContent;
        const password = document.getElementById('team-password').textContent;
        const textToCopy = `Username: ${username}\nPassword: ${password}`;

        // Create a temporary textarea to robustly copy text to the clipboard
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const originalText = copyCredentialsBtn.textContent;
            copyCredentialsBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyCredentialsBtn.textContent = originalText;
            }, 2000); // Revert back to original text after 2 seconds
        } catch (err) {
            console.error('Failed to copy credentials: ', err);
            alert('Failed to copy credentials. Please copy them manually.');
        }
        document.body.removeChild(textArea);
    });
});

