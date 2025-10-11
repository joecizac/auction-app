document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    // --- State Management ---
    // This object will hold the live state of the auction panel
    let liveAuctionState = {
        auction: null,
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

    try {
        // --- Initial Data Fetching ---
        const auctionRes = await fetch(`/api/auctions/${auctionId}`);
        liveAuctionState.auction = await auctionRes.json();
        const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
        const players = await playersRes.json();
        const teamsRes = await fetch(`/api/auctions/${auctionId}/teams`);
        const teams = await teamsRes.json();
        
        // --- Render Initial UI ---
        auctionTitleHeading.textContent = liveAuctionState.auction.title;
        document.getElementById('manage-players-link').href = `/admin/auction/${auctionId}/players`;
        document.getElementById('manage-teams-link').href = `/admin/auction/${auctionId}/teams`;
        document.getElementById('edit-auction-link').href = `/admin/auction/${auctionId}/edit`;

        // Render Players
        playerGrid.innerHTML = '';
        if (players.length > 0) {
            players.forEach(player => {
                const playerCard = document.createElement('div');
                playerCard.className = 'player-card';
                playerCard.dataset.playerId = player.dbId;
                playerCard.innerHTML = `<div class="player-card-id">${player.id}</div><div class="player-card-name">${player.name}</div><div class="player-card-position">${player.position}</div>`;
                playerGrid.appendChild(playerCard);
            });
        } else {
            playerGrid.innerHTML = '<p class="empty-message">No players found.</p>';
        }

        // Render Teams
        teamsList.innerHTML = '';
        if (teams.length > 0) {
            teams.forEach(team => {
                const teamItem = document.createElement('div');
                teamItem.className = 'team-list-item';
                teamItem.dataset.teamId = team.id;
                const balance = parseFloat(liveAuctionState.auction.budget) - parseFloat(team.captainValue);
                teamItem.innerHTML = `<div class="team-info"><span class="team-name">${team.name}</span><span class="team-budget">Balance: ${new Intl.NumberFormat().format(balance)}</span></div><div class="team-player-count">0 Players</div>`;
                teamsList.appendChild(teamItem);
            });
        } else {
            teamsList.innerHTML = '<p class="empty-message">No teams found.</p>';
        }

        // --- Event Listeners for Bidding ---

        // 1. Select a Player
        playerGrid.addEventListener('click', async (event) => {
            const selectedCard = event.target.closest('.player-card');
            if (!selectedCard) return;

            const playerId = selectedCard.dataset.playerId;
            document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
            selectedCard.classList.add('selected');

            const playerRes = await fetch(`/api/auctions/${auctionId}/players/${playerId}`);
            liveAuctionState.selectedPlayer = await playerRes.json();
            liveAuctionState.currentBid = parseFloat(liveAuctionState.selectedPlayer.basePrice);
            liveAuctionState.biddingTeamId = null; // Reset bidding team

            updatePlayerDetailsPanel();
        });

        // 2. Place a Bid by clicking a Team
        teamsList.addEventListener('click', (event) => {
            const selectedTeam = event.target.closest('.team-list-item');
            if (!selectedTeam || !liveAuctionState.selectedPlayer) return; // Can't bid without a selected player

            const teamId = selectedTeam.dataset.teamId;
            
            // Calculate the next bid
            let nextBid = liveAuctionState.currentBid;
            const bidIncrements = liveAuctionState.auction.bidIncrements || [];
            let increment = 25000; // Default increment
            
            for (const tier of bidIncrements) {
                const from = parseFloat(tier.from);
                const to = parseFloat(tier.to);
                if (nextBid >= from && nextBid < to) {
                    increment = parseFloat(tier.increment);
                    break;
                }
            }
            // A simple fallback for bids over the highest tier
            if (bidIncrements.length > 0 && nextBid >= parseFloat(bidIncrements[bidIncrements.length - 1].to)) {
                 increment = parseFloat(bidIncrements[bidIncrements.length - 1].increment);
            }

            nextBid += increment;

            // Update state
            liveAuctionState.currentBid = nextBid;
            liveAuctionState.biddingTeamId = teamId;

            updatePlayerDetailsPanel();
        });

    } catch (error) {
        console.error('Failed to load auction details:', error);
        auctionTitleHeading.textContent = 'Error: Auction Not Found';
    }

    // --- UI Update Function ---
    function updatePlayerDetailsPanel() {
        if (!liveAuctionState.selectedPlayer) {
            playerDetailsPanel.innerHTML = '<p class="empty-message">Select a player to auction</p>';
            return;
        }

        const { selectedPlayer, currentBid, biddingTeamId } = liveAuctionState;
        
        let biddingTeamName = '--';
        if (biddingTeamId) {
            const teamElement = teamsList.querySelector(`[data-team-id="${biddingTeamId}"]`);
            biddingTeamName = teamElement.querySelector('.team-name').textContent;
            
            // Highlight bidding team
            document.querySelectorAll('.team-list-item.bidding').forEach(item => item.classList.remove('bidding'));
            teamElement.classList.add('bidding');
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
                <button class="btn btn-primary" style="width: 100%;">Finalize Bid (Sell)</button>
                <button class="btn btn-secondary" style="width: 100%;">Mark Unsold</button>
            </div>
        `;
    }
});

