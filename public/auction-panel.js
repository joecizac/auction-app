document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    // --- State Management ---
    let liveAuctionState = {
        auction: null,
        players: [],
        teams: [],
        selectedPlayer: null,
        currentBid: 0,
        biddingTeamId: null,
    };

    // --- Element References ---
    const playerGrid = document.getElementById('player-grid-container');
    const teamsList = document.getElementById('teams-list-container');
    const playerDetailsPanel = document.getElementById('player-details-panel');
    const auctionTitleHeading = document.getElementById('auction-title-heading');

    if (!auctionId || !auctionId.startsWith('auc_')) {
        auctionTitleHeading.textContent = 'Invalid Auction';
        return;
    }

    async function initializePanel() {
        try {
            // --- Initial Data Fetching ---
            const auctionRes = await fetch(`/api/auctions/${auctionId}`);
            liveAuctionState.auction = await auctionRes.json();
            const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
            liveAuctionState.players = await playersRes.json();
            const teamsRes = await fetch(`/api/auctions/${auctionId}/teams`);
            liveAuctionState.teams = await teamsRes.json();
            
            // --- Render Initial UI ---
            auctionTitleHeading.textContent = liveAuctionState.auction.title;
            document.getElementById('manage-players-link').href = `/admin/auction/${auctionId}/players`;
            document.getElementById('manage-teams-link').href = `/admin/auction/${auctionId}/teams`;
            document.getElementById('edit-auction-link').href = `/admin/auction/${auctionId}/edit`;

            renderPlayers();
            renderTeams();
            resetPlayerDetailsPanel();

        } catch (error) {
            console.error('Failed to initialize auction panel:', error);
            auctionTitleHeading.textContent = 'Error: Auction Not Found';
        }
    }

    // --- UI Render Functions ---
    function renderPlayers() {
        playerGrid.innerHTML = '';
        if (liveAuctionState.players.length > 0) {
            liveAuctionState.players.forEach(player => {
                const playerCard = document.createElement('div');
                playerCard.className = 'player-card';
                playerCard.dataset.playerId = player.dbId;
                if (player.status === 'sold') playerCard.classList.add('sold');
                if (player.status === 'unsold') playerCard.classList.add('unsold');
                
                playerCard.innerHTML = `<div class="player-card-id">${player.id}</div><div class="player-card-name">${player.name}</div><div class="player-card-position">${player.position}</div>`;
                playerGrid.appendChild(playerCard);
            });
        } else {
            playerGrid.innerHTML = '<p class="empty-message">No players found.</p>';
        }
    }

    function renderTeams() {
        teamsList.innerHTML = '';
        if (liveAuctionState.teams.length > 0) {
            liveAuctionState.teams.forEach(team => {
                const teamItem = document.createElement('div');
                teamItem.className = 'team-list-item';
                teamItem.dataset.teamId = team.id;
                
                const budget = parseFloat(liveAuctionState.auction.budget);
                const captainValue = parseFloat(team.captainValue);
                let spent = 0;
                liveAuctionState.players.forEach(p => {
                    if (p.owningTeamId === team.id) {
                        spent += parseFloat(p.soldPrice);
                    }
                });
                const balance = budget - captainValue - spent;
                const playerCount = liveAuctionState.players.filter(p => p.owningTeamId === team.id).length;

                teamItem.innerHTML = `<div class="team-info"><span class="team-name">${team.name}</span><span class="team-budget">Balance: ${new Intl.NumberFormat().format(balance)}</span></div><div class="team-player-count">${playerCount + 1} Players</div>`;
                teamsList.appendChild(teamItem);
            });
        } else {
            teamsList.innerHTML = '<p class="empty-message">No teams found.</p>';
        }
    }

    function resetPlayerDetailsPanel() {
        liveAuctionState.selectedPlayer = null;
        liveAuctionState.currentBid = 0;
        liveAuctionState.biddingTeamId = null;
        playerDetailsPanel.innerHTML = '<p class="empty-message">Select a player to auction</p>';
        document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.team-list-item.bidding').forEach(item => item.classList.remove('bidding'));
    }

    function updatePlayerDetailsPanel() {
        if (!liveAuctionState.selectedPlayer) {
            resetPlayerDetailsPanel();
            return;
        }

        const { selectedPlayer, currentBid, biddingTeamId } = liveAuctionState;
        
        // FIX #2: Always clear existing bidding class before processing the new state
        document.querySelectorAll('.team-list-item.bidding').forEach(item => item.classList.remove('bidding'));

        let biddingTeamName = '--';
        if (biddingTeamId) {
            const teamElement = teamsList.querySelector(`[data-team-id="${biddingTeamId}"]`);
            if (teamElement) {
                biddingTeamName = teamElement.querySelector('.team-name').textContent;
                teamElement.classList.add('bidding');
            }
        }

        playerDetailsPanel.innerHTML = `
            <div class="current-player-details">
                <h3 class="current-player-name">${selectedPlayer.name}</h3>
                <p class="current-player-info">${selectedPlayer.position} | ${selectedPlayer.experience}</p>
                <div class="current-player-price-info">
                    <span>Base Price</span>
                    <span class="price-value">${new Intl.NumberFormat().format(selectedPlayer.basePrice)}</span>
                </div>
                 <div class="current-player-price-info current-bid">
                    <span>Current Bid</span>
                    <span class="price-value">${new Intl.NumberFormat().format(currentBid)}</span>
                </div>
                <div class="current-player-price-info">
                    <span>By</span>
                    <span class="price-value bidding-team-name">${biddingTeamName}</span>
                </div>
                <p class="current-player-merits">${selectedPlayer.merits || ''}</p>
            </div>
            <div class="current-player-actions">
                <!-- FIX #1: Added id attributes to buttons -->
                <button id="finalize-bid-btn" class="btn btn-primary" style="width: 100%;">Finalize Bid (Sell)</button>
                <button id="mark-unsold-btn" class="btn btn-secondary" style="width: 100%;">Mark Unsold</button>
            </div>
        `;
    }

    // --- Event Listeners ---
    playerGrid.addEventListener('click', async (event) => {
        const selectedCard = event.target.closest('.player-card');
        if (!selectedCard || selectedCard.classList.contains('sold')) return; // Ignore clicks on sold players

        const playerId = selectedCard.dataset.playerId;
        document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
        selectedCard.classList.add('selected');

        try {
            const playerRes = await fetch(`/api/auctions/${auctionId}/players/${playerId}`);
            liveAuctionState.selectedPlayer = await playerRes.json();
            liveAuctionState.currentBid = parseFloat(liveAuctionState.selectedPlayer.basePrice);
            liveAuctionState.biddingTeamId = null; // Reset bidding team on new player selection
            updatePlayerDetailsPanel();
        } catch(err) {
            console.error("Could not fetch player details", err);
        }
    });

    teamsList.addEventListener('click', (event) => {
        const selectedTeam = event.target.closest('.team-list-item');
        if (!selectedTeam || !liveAuctionState.selectedPlayer) return;

        const teamId = selectedTeam.dataset.teamId;
        
        let nextBid = liveAuctionState.currentBid;
        const bidIncrements = liveAuctionState.auction.bidIncrements || [];
        let increment = 25000;
        
        for (const tier of bidIncrements) {
            const from = parseFloat(tier.from);
            const to = parseFloat(tier.to);
            if (nextBid >= from && nextBid < to) {
                increment = parseFloat(tier.increment);
                break;
            }
        }
        if (bidIncrements.length > 0 && nextBid >= parseFloat(bidIncrements[bidIncrements.length - 1].to)) {
             increment = parseFloat(bidIncrements[bidIncrements.length - 1].increment);
        }

        nextBid += increment;

        liveAuctionState.currentBid = nextBid;
        liveAuctionState.biddingTeamId = teamId;
        updatePlayerDetailsPanel();
    });

    playerDetailsPanel.addEventListener('click', async (event) => {
        const { selectedPlayer, currentBid, biddingTeamId } = liveAuctionState;

        if (event.target.id === 'finalize-bid-btn') {
            if (!selectedPlayer || !biddingTeamId) {
                alert('A player must be selected and a team must have placed a bid to finalize.');
                return;
            }
            try {
                const response = await fetch(`/api/auctions/${auctionId}/players/${selectedPlayer.dbId}/sell`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ owningTeamId: biddingTeamId, soldPrice: currentBid }),
                });
                if (!response.ok) throw new Error('Failed to sell player');
                
                alert(`${selectedPlayer.name} sold successfully!`);
                initializePanel();

            } catch (error) {
                console.error('Error selling player:', error);
                alert('Error selling player.');
            }
        }

        if (event.target.id === 'mark-unsold-btn') {
            if (!selectedPlayer) {
                alert('Please select a player first.');
                return;
            }
             try {
                const response = await fetch(`/api/auctions/${auctionId}/players/${selectedPlayer.dbId}/status`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: 'unsold' }),
                });
                if (!response.ok) throw new Error('Failed to mark player as unsold');
                
                alert(`${selectedPlayer.name} marked as unsold.`);
                initializePanel();

            } catch (error) {
                console.error('Error marking player unsold:', error);
                alert('Error marking player as unsold.');
            }
        }
    });

    // --- Initial Load ---
    initializePanel();
});

