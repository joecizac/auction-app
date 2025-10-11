document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    if (!auctionId || !auctionId.startsWith('auc_')) {
        console.error('No valid auction ID found in URL');
        document.getElementById('auction-title-heading').textContent = 'Invalid Auction';
        return;
    }

    // --- NEW: Element references for dynamic content ---
    const playerGrid = document.getElementById('player-grid-container');
    const teamsList = document.getElementById('teams-list-container');
    const playerDetailsPanel = document.getElementById('player-details-panel');


    try {
        const response = await fetch(`/api/auctions/${auctionId}`);
        if (!response.ok) throw new Error('Auction not found');
        const auction = await response.json();

        // Update page title and navigation links
        document.getElementById('auction-title-heading').textContent = auction.title;
        document.getElementById('manage-players-link').href = `/admin/auction/${auctionId}/players`;
        document.getElementById('manage-teams-link').href = `/admin/auction/${auctionId}/teams`;
        document.getElementById('edit-auction-link').href = `/admin/auction/${auctionId}/edit`;

        // ... (Close/Reopen button logic remains the same)

        // --- NEW: Fetch and display players ---
        const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
        const players = await playersRes.json();
        playerGrid.innerHTML = ''; // Clear placeholder
        if (players.length > 0) {
            players.forEach(player => {
                const playerCard = document.createElement('div');
                playerCard.className = 'player-card';
                playerCard.innerHTML = `
                    <div class="player-card-id">${player.id}</div>
                    <div class="player-card-name">${player.name}</div>
                    <div class="player-card-position">${player.position}</div>
                `;
                playerGrid.appendChild(playerCard);
            });
        } else {
            playerGrid.innerHTML = '<p class="empty-message">No players found. Add players via the "Manage Players" button.</p>';
        }

        // --- NEW: Fetch and display teams ---
        const teamsRes = await fetch(`/api/auctions/${auctionId}/teams`);
        const teams = await teamsRes.json();
        teamsList.innerHTML = ''; // Clear placeholder
        if (teams.length > 0) {
            teams.forEach(team => {
                const teamItem = document.createElement('div');
                teamItem.className = 'team-list-item';
                // Calculate starting balance
                const budget = parseFloat(auction.budget);
                const captainValue = parseFloat(team.captainValue);
                const balance = budget - captainValue;

                teamItem.innerHTML = `
                    <div class="team-info">
                        <span class="team-name">${team.name}</span>
                        <span class="team-budget">Balance: ${new Intl.NumberFormat().format(balance)}</span>
                    </div>
                    <div class="team-player-count">0 Players</div>
                `;
                teamsList.appendChild(teamItem);
            });
        } else {
            teamsList.innerHTML = '<p class="empty-message">No teams found. Add teams via the "Manage Teams" button.</p>';
        }


    } catch (error) {
        console.error('Failed to load auction details:', error);
        document.getElementById('auction-title-heading').textContent = 'Error: Auction Not Found';
    }
});

