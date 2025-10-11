document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    if (!auctionId || !auctionId.startsWith('auc_')) {
        console.error('No valid auction ID found in URL');
        document.getElementById('auction-title-heading').textContent = 'Invalid Auction';
        return;
    }

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

        // Fetch and display players
        const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
        const players = await playersRes.json();
        playerGrid.innerHTML = '';
        if (players.length > 0) {
            players.forEach(player => {
                const playerCard = document.createElement('div');
                playerCard.className = 'player-card';
                // --- NEW: Add a data attribute to store the player's unique DB ID ---
                playerCard.dataset.playerId = player.dbId;
                playerCard.innerHTML = `
                    <div class="player-card-id">${player.id}</div>
                    <div class="player-card-name">${player.name}</div>
                    <div class="player-card-position">${player.position}</div>
                `;
                playerGrid.appendChild(playerCard);
            });
        } else {
            playerGrid.innerHTML = '<p class="empty-message">No players found.</p>';
        }

        // Fetch and display teams
        const teamsRes = await fetch(`/api/auctions/${auctionId}/teams`);
        const teams = await teamsRes.json();
        teamsList.innerHTML = '';
        if (teams.length > 0) {
            teams.forEach(team => {
                const teamItem = document.createElement('div');
                teamItem.className = 'team-list-item';
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
            teamsList.innerHTML = '<p class="empty-message">No teams found.</p>';
        }

        // --- NEW: Add click listener for selecting a player ---
        playerGrid.addEventListener('click', async (event) => {
            const selectedCard = event.target.closest('.player-card');
            if (!selectedCard) return;

            const playerId = selectedCard.dataset.playerId;

            // Remove 'selected' class from any other card
            document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
            // Add 'selected' class to the clicked card
            selectedCard.classList.add('selected');

            // Fetch full player details
            try {
                const playerRes = await fetch(`/api/auctions/${auctionId}/players/${playerId}`);
                const player = await playerRes.json();
                
                // Display player details in the panel
                playerDetailsPanel.innerHTML = `
                    <div class="current-player-details">
                        <h3 class="current-player-name">${player.name}</h3>
                        <p class="current-player-info">${player.position} | ${player.experience}</p>
                        <div class="current-player-price-info">
                            <span>Base Price</span>
                            <span class="price-value">${new Intl.NumberFormat().format(player.basePrice)}</span>
                        </div>
                         <div class="current-player-price-info current-bid">
                            <span>Current Bid</span>
                            <span class="price-value">--</span>
                        </div>
                        <p class="current-player-merits">${player.merits || ''}</p>
                    </div>
                    <div class="current-player-actions">
                        <button class="btn btn-primary" style="width: 100%;">Finalize Bid (Sell)</button>
                        <button class="btn btn-secondary" style="width: 100%;">Mark Unsold</button>
                    </div>
                `;

            } catch (err) {
                console.error('Failed to fetch player details:', err);
                playerDetailsPanel.innerHTML = '<p class="error-message">Could not load player details.</p>';
            }
        });

    } catch (error) {
        console.error('Failed to load auction details:', error);
        document.getElementById('auction-title-heading').textContent = 'Error: Auction Not Found';
    }
});

