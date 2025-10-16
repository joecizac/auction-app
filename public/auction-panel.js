document.addEventListener('DOMContentLoaded', async () => {
    const socket = io();
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];
    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;

    // State Management
    let liveAuctionState = {
        auction: null,
        players: [], // Master list of all players
        teams: [],
        selectedPlayer: null,
        currentBid: 0,
        biddingTeamId: null,
    };

    // Element References
    const playerGrid = document.getElementById('player-grid-container');
    const teamsList = document.getElementById('teams-list-container');
    const playerDetailsPanel = document.getElementById('player-details-panel');
    const auctionTitleHeading = document.getElementById('auction-title-heading');
    const filterPosition = document.getElementById('filter-position');
    const filterDivision = document.getElementById('filter-division');
    const filterSearch = document.getElementById('filter-search');
    const excludeSoldCheckbox = document.getElementById('exclude-sold');
    const openPresenterBtn = document.getElementById('open-presenter-btn');
    const showBalanceCheckbox = document.getElementById('show-balance-checkbox');

    if (!auctionId || !auctionId.startsWith('auc_')) {
        auctionTitleHeading.textContent = 'Invalid Auction ID in URL';
        return;
    }

    // --- Initialization ---
    async function initializePanel() {
        try {
            const auctionRes = await fetch(`/api/auctions/${auctionId}`);
            if (!auctionRes.ok) throw new Error('Auction not found');
            liveAuctionState.auction = await auctionRes.json();

            const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
            liveAuctionState.players = await playersRes.json();

            const teamsRes = await fetch(`/api/auctions/${auctionId}/teams`);
            liveAuctionState.teams = await teamsRes.json();
            
            auctionTitleHeading.textContent = liveAuctionState.auction.title;
            document.getElementById('manage-players-link').href = `/admin/auction/${auctionId}/players`;
            document.getElementById('manage-teams-link').href = `/admin/auction/${auctionId}/teams`;
            document.getElementById('edit-auction-link').href = `/admin/auction/${auctionId}/edit`;
            
            populateFilters();
            addFilterListeners();

            renderTeams();
            applyFiltersAndRenderPlayers();
            resetPlayerDetailsPanel(false); 

        } catch (error) {
            console.error('Failed to initialize panel:', error);
            auctionTitleHeading.textContent = `Error: ${error.message}`;
        }
    }

    // --- Filter Logic ---
    function populateFilters() {
        const sportPositions = { football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'], cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder'] };
        const positions = sportPositions[liveAuctionState.auction.sport] || [];
        positions.forEach(pos => { filterPosition.innerHTML += `<option value="${pos}">${pos}</option>`; });

        const divisionLabels = { senior_men: 'Senior(Men)', senior_women: 'Senior(Women)', youth_men: 'Youth(Men)', youth_women: 'Youth(Women)', junior_boys: 'Junior(Boys)', junior_girls: 'Junior(Girls)' };
        (liveAuctionState.auction.allowedDivisions || []).forEach(divValue => {
            filterDivision.innerHTML += `<option value="${divValue}">${divisionLabels[divValue] || divValue}</option>`;
        });
    }

    function addFilterListeners() {
        filterPosition.addEventListener('change', applyFiltersAndRenderPlayers);
        filterDivision.addEventListener('change', applyFiltersAndRenderPlayers);
        filterSearch.addEventListener('input', applyFiltersAndRenderPlayers);
        excludeSoldCheckbox.addEventListener('change', applyFiltersAndRenderPlayers);
    }

    function applyFiltersAndRenderPlayers() {
        const posFilter = filterPosition.value;
        const divFilter = filterDivision.value;
        const searchFilter = filterSearch.value.toLowerCase();
        const excludeSold = excludeSoldCheckbox.checked;

        const filteredPlayers = liveAuctionState.players.filter(player => {
            if (excludeSold && player.status === 'sold') return false;
            if (posFilter && player.position !== posFilter) return false;
            if (divFilter && player.division !== divFilter) return false;
            if (searchFilter && !player.name.toLowerCase().includes(searchFilter) && !player.id.toLowerCase().includes(searchFilter)) return false;
            return true;
        });
        renderPlayers(filteredPlayers);
    }

    // --- Rendering Functions ---
    function renderPlayers(playersToRender) {
        playerGrid.innerHTML = '';
        if (playersToRender && playersToRender.length > 0) {
            playersToRender.forEach(player => {
                const playerCard = document.createElement('div');
                playerCard.className = 'player-card';
                playerCard.dataset.playerId = player.dbId;
                if (player.status) playerCard.classList.add(player.status);
                if (liveAuctionState.selectedPlayer && liveAuctionState.selectedPlayer.dbId === player.dbId) {
                    playerCard.classList.add('selected');
                }
                playerCard.innerHTML = `<div class="player-card-id">${player.id}</div><div class="player-card-name">${player.name}</div><div class="player-card-position">${player.position}</div>`;
                playerGrid.appendChild(playerCard);
            });
        } else {
            playerGrid.innerHTML = '<p class="empty-message">No players match the current filters.</p>';
        }
    }
    
    function renderTeams() {
        teamsList.innerHTML = '';
        if (liveAuctionState.teams && liveAuctionState.teams.length > 0) {
            liveAuctionState.teams.forEach(team => {
                const teamItem = document.createElement('div');
                teamItem.className = 'team-list-item';
                teamItem.dataset.teamId = team.id;
                let balance = parseFloat(liveAuctionState.auction.budget) - parseFloat(team.captainValue);
                let playerCount = 1;
                (liveAuctionState.players || []).forEach(p => {
                    if (p.status === 'sold' && p.owningTeamId === team.id) {
                        balance -= parseFloat(p.soldPrice);
                        playerCount++;
                    }
                });

                const logoHtml = team.logoImage ? `<img src="${team.logoImage}" alt="${team.name} logo">` : `<span>${team.name.charAt(0).toUpperCase()}</span>`;

                teamItem.innerHTML = `
                    <div class="team-logo">${logoHtml}</div>
                    <div class="team-info">
                        <span class="team-name">${team.name}</span>
                        <span class="team-budget">Balance: ${formatCurrency(balance)}</span>
                    </div>
                    <div class="team-player-count">${playerCount} Players</div>`;
                teamsList.appendChild(teamItem);
            });
        }
    }

    function resetPlayerDetailsPanel(broadcastReset = true) {
        liveAuctionState.selectedPlayer = null;
        liveAuctionState.currentBid = 0;
        liveAuctionState.biddingTeamId = null;
        playerDetailsPanel.innerHTML = '<p class="empty-message">Select a player to auction</p>';
        document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
        document.querySelectorAll('.team-list-item.bidding').forEach(item => item.classList.remove('bidding'));
        if (broadcastReset) {
            broadcastStateUpdate();
        }
    }

    function updatePlayerDetailsPanel() {
        const { selectedPlayer, currentBid, biddingTeamId } = liveAuctionState;
        if (!selectedPlayer) {
            resetPlayerDetailsPanel(true);
            return;
        }
        
        let biddingTeamDisplay = '<span>--</span>';
        document.querySelectorAll('.team-list-item.bidding').forEach(item => item.classList.remove('bidding'));
        if (biddingTeamId) {
            const team = liveAuctionState.teams.find(t => t.id === biddingTeamId);
            if (team) {
                const teamElement = teamsList.querySelector(`[data-team-id="${biddingTeamId}"]`);
                if (teamElement) teamElement.classList.add('bidding');
                
                const logoHtml = team.logoImage ? `<img src="${team.logoImage}" alt="${team.name}" class="bidding-team-logo">` : '';
                biddingTeamDisplay = `<div class="bidding-team-display">${logoHtml}<span>${team.name}</span></div>`;
            }
        }

        const photoHtml = selectedPlayer.photoImage
            ? `<img src="${selectedPlayer.photoImage}" alt="${selectedPlayer.name}">`
            : `<span>${selectedPlayer.name.charAt(0).toUpperCase()}</span>`;

        playerDetailsPanel.innerHTML = `
            <div class="current-player-photo">${photoHtml}</div>
            <div class="current-player-details">
                <h3 class="current-player-name">${selectedPlayer.name}</h3>
                <p class="current-player-info">${selectedPlayer.position} | ${selectedPlayer.experience}</p>
                <div class="current-player-price-info"><span>Base Price</span><span class="price-value">${formatCurrency(selectedPlayer.basePrice)}</span></div>
                <div class="current-player-price-info current-bid"><span>Current Bid</span><span class="price-value">${formatCurrency(currentBid)}</span></div>
                <div class="current-player-price-info"><span>By</span><div class="price-value bidding-team-name">${biddingTeamDisplay}</div></div>
            </div>
            <div class="current-player-actions">
                <button id="finalize-bid-btn" class="btn btn-primary" style="width: 100%;">Finalize Bid (Sell)</button>
                <button id="mark-unsold-btn" class="btn btn-secondary" style="width: 100%;">Mark Unsold</button>
            </div>`;
        
        updateTeamBiddingStatus();
        broadcastStateUpdate();
    }
    
    function broadcastStateUpdate(overrideState = {}) {
        const { selectedPlayer, currentBid, biddingTeamId } = liveAuctionState;
        let biddingTeamName = null;
        if (biddingTeamId) {
            const team = liveAuctionState.teams.find(t => t.id === biddingTeamId);
            if (team) biddingTeamName = team.name;
        }

        const baseState = {
            status: selectedPlayer ? 'bidding' : 'idle',
            selectedPlayer,
            currentBid,
            biddingTeamName,
            teams: liveAuctionState.teams.map(t => ({ ...t, auctionBudget: liveAuctionState.auction.budget })),
            players: liveAuctionState.players,
            showBalance: showBalanceCheckbox ? showBalanceCheckbox.checked : false,
        };
        socket.emit('adminAction', { ...baseState, ...overrideState });
    }

    // --- Bidding Logic ---
    function updateTeamBiddingStatus() {
        if (!liveAuctionState.selectedPlayer && !liveAuctionState.currentBid) return;
        const nextBid = calculateNextBid(liveAuctionState.currentBid, liveAuctionState.biddingTeamId === null);
        liveAuctionState.teams.forEach(team => {
            const teamElement = teamsList.querySelector(`[data-team-id="${team.id}"]`);
            if (!teamElement) return;
            let balance = parseFloat(liveAuctionState.auction.budget) - parseFloat(team.captainValue);
            liveAuctionState.players.forEach(p => {
                if (p.status === 'sold' && p.owningTeamId === team.id) {
                    balance -= parseFloat(p.soldPrice);
                }
            });
            if (balance < nextBid) {
                teamElement.classList.add('disabled');
            } else {
                teamElement.classList.remove('disabled');
            }
        });
    }
    
    function calculateNextBid(currentBid, isFirstBid) {
        if (isFirstBid) return parseFloat(liveAuctionState.selectedPlayer.basePrice) || 0;
        let nextBid = currentBid;
        const bidIncrements = liveAuctionState.auction.bidIncrements || [];
        let increment = 25000;
        for (const tier of bidIncrements) {
            const from = parseFloat(tier.from);
            const to = parseFloat(tier.to) || Infinity;
            if (nextBid >= from && nextBid < to) {
                increment = parseFloat(tier.increment);
                break;
            }
        }
        if (bidIncrements.length > 0 && nextBid >= (parseFloat(bidIncrements[bidIncrements.length - 1].to) || 0)) {
             increment = parseFloat(bidIncrements[bidIncrements.length - 1].increment);
        }
        return nextBid + increment;
    }

    // --- Event Listeners ---
    playerGrid.addEventListener('click', (event) => {
        const selectedCard = event.target.closest('.player-card');
        if (!selectedCard || selectedCard.classList.contains('sold')) return;
        const playerId = selectedCard.dataset.playerId;
        if (liveAuctionState.selectedPlayer && liveAuctionState.selectedPlayer.dbId === playerId) return;
        document.querySelectorAll('.player-card.selected').forEach(card => card.classList.remove('selected'));
        selectedCard.classList.add('selected');
        const player = liveAuctionState.players.find(p => p.dbId === playerId);
        liveAuctionState.selectedPlayer = player;
        liveAuctionState.currentBid = parseFloat(player.basePrice) || 0;
        liveAuctionState.biddingTeamId = null;
        updatePlayerDetailsPanel();
    });

    teamsList.addEventListener('click', (event) => {
        const selectedTeam = event.target.closest('.team-list-item');
        if (!selectedTeam || !liveAuctionState.selectedPlayer || selectedTeam.classList.contains('disabled')) return;
        const teamId = selectedTeam.dataset.teamId;
        if (teamId === liveAuctionState.biddingTeamId) return;
        const isFirstBid = liveAuctionState.biddingTeamId === null;
        const nextBid = calculateNextBid(liveAuctionState.currentBid, isFirstBid);
        liveAuctionState.currentBid = nextBid;
        liveAuctionState.biddingTeamId = teamId;
        updatePlayerDetailsPanel();
    });

    playerDetailsPanel.addEventListener('click', async (event) => {
        const { selectedPlayer, currentBid, biddingTeamId } = liveAuctionState;
        if (event.target.id === 'mark-unsold-btn') {
            if (!selectedPlayer) return;
            if (confirm(`Are you sure you want to mark ${selectedPlayer.name} as unsold?`)) {
                try {
                    const response = await fetch(`/api/auctions/${auctionId}/players/${selectedPlayer.dbId}/status`, {
                        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'unsold' }),
                    });
                    if (!response.ok) throw new Error('Server update failed');
                    broadcastStateUpdate({ status: 'unsold' });
                    const playerIndex = liveAuctionState.players.findIndex(p => p.dbId === selectedPlayer.dbId);
                    if (playerIndex !== -1) liveAuctionState.players[playerIndex].status = 'unsold';
                    applyFiltersAndRenderPlayers();
                    resetPlayerDetailsPanel(false);
                    alert(`${selectedPlayer.name} has been marked as unsold.`);
                } catch (error) {
                    console.error('Error marking player unsold:', error);
                    alert('An error occurred.');
                }
            }
        }

        if (event.target.id === 'finalize-bid-btn') {
            if (!selectedPlayer || !biddingTeamId) return alert('A player must be selected and a team must be bidding.');
            const winningTeam = liveAuctionState.teams.find(t => t.id === biddingTeamId);
            if (!winningTeam) return alert('Error: Bidding team not found.');
            if (confirm(`Sell ${selectedPlayer.name} to ${winningTeam.name} for ${formatCurrency(currentBid)}?`)) {
                try {
                    const response = await fetch(`/api/auctions/${auctionId}/players/${selectedPlayer.dbId}/sell`, {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ soldPrice: currentBid, owningTeamId: biddingTeamId }),
                    });
                    if (!response.ok) {
                        const errData = await response.json();
                        throw new Error(errData.message || 'Server rejected the sale.');
                    }

                    // THE FIX: Update local state BEFORE broadcasting
                    const playerIndex = liveAuctionState.players.findIndex(p => p.dbId === selectedPlayer.dbId);
                    if (playerIndex !== -1) {
                        liveAuctionState.players[playerIndex].status = 'sold';
                        liveAuctionState.players[playerIndex].soldPrice = currentBid;
                        liveAuctionState.players[playerIndex].owningTeamId = biddingTeamId;
                    }
                    
                    // Now broadcast the new, correct state
                    broadcastStateUpdate({ status: 'sold', winningTeamName: winningTeam.name });
                    
                    applyFiltersAndRenderPlayers();
                    renderTeams();
                    resetPlayerDetailsPanel(false);
                    alert(`${selectedPlayer.name} sold successfully!`);
                } catch (error) {
                    console.error('Error selling player:', error);
                    alert(`An error occurred: ${error.message}`);
                }
            }
        }
    });
    
    openPresenterBtn.addEventListener('click', () => {
        window.open(`/presenter/${auctionId}`, '_blank');
    });

    showBalanceCheckbox.addEventListener('change', () => {
        broadcastStateUpdate();
    });

    socket.on('teamBidAction', (data) => {
        if (data.auctionId === auctionId) {
            const teamElement = teamsList.querySelector(`[data-team-id="${data.teamId}"]`);
            if (teamElement && !teamElement.classList.contains('disabled')) {
                teamElement.click();
            }
        }
    });

    initializePanel();
});

