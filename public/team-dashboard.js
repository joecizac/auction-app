document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auctionId');
    const teamId = urlParams.get('teamId');

    // Element references
    const teamNameHeading = document.getElementById('team-name-heading');
    const teamBalanceEl = document.getElementById('team-balance');
    const teamPlayerCountEl = document.getElementById('team-player-count');
    const biddingArea = document.getElementById('bidding-area');

    if (!auctionId || !teamId) {
        teamNameHeading.textContent = 'Error: Invalid Link';
        return;
    }

    let teamData = null; // Store our team's full data

    // Initial data load
    async function initializeDashboard() {
        try {
            const response = await fetch(`/api/dashboard-data/${auctionId}/${teamId}`);
            if (!response.ok) throw new Error('Could not load dashboard data.');
            const data = await response.json();
            
            teamData = data.team;
            const { auction, players } = data;

            teamNameHeading.textContent = teamData.name;
            updateTeamStats(auction, players);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            teamNameHeading.textContent = 'Error loading data.';
        }
    }

    function updateTeamStats(auction, players) {
        const totalBudget = parseFloat(auction.budget);
        const captainValue = parseFloat(teamData.captainValue);
        let amountSpent = captainValue;
        let playerCount = 1; // For the captain

        players.forEach(p => {
            amountSpent += parseFloat(p.soldPrice);
            playerCount++;
        });
        const remainingBalance = totalBudget - amountSpent;

        teamBalanceEl.textContent = new Intl.NumberFormat().format(remainingBalance);
        teamPlayerCountEl.textContent = playerCount;
    }

    // Listen for live auction updates from the server
    socket.on('auctionUpdate', (state) => {
        if (!teamData) return; // Don't render until we know who we are

        if (state.status === 'bidding') {
            renderBiddingView(state);
        } else if (state.status === 'sold') {
            renderSoldView(state);
            // If we won the player, refetch our stats
            if (state.winningTeamName === teamData.name) {
                initializeDashboard();
            }
        } else {
            renderIdleView();
        }
    });

    function renderIdleView() {
        biddingArea.innerHTML = '<h2>Waiting for the next player...</h2>';
    }

    function renderBiddingView(state) {
        const { selectedPlayer, currentBid, biddingTeamName } = state;
        const nextBid = calculateNextBid(currentBid, biddingTeamName === '--');
        const myBalance = parseFloat(teamBalanceEl.textContent.replace(/,/g, ''));
        
        const isMyBid = biddingTeamName === teamData.name;
        const canAfford = myBalance >= nextBid;
        const isButtonDisabled = isMyBid || !canAfford;

        biddingArea.innerHTML = `
            <div class="player-name">${selectedPlayer.name}</div>
            <div class="player-details">${selectedPlayer.position} | ${selectedPlayer.experience}</div>
            <div class="bid-info">
                <div class="bid-info-item">
                    <span class="bid-info-label">Current Bid</span>
                    <span class="bid-info-value">${new Intl.NumberFormat().format(currentBid)}</span>
                </div>
                <div class="bid-info-item">
                    <span class="bid-info-label">Bidding Team</span>
                    <span class="bid-info-value">${biddingTeamName}</span>
                </div>
            </div>
            <button id="bid-btn" class="btn btn-primary" ${isButtonDisabled ? 'disabled' : ''}>
                BID ${new Intl.NumberFormat().format(nextBid)}
            </button>
        `;
    }

    function renderSoldView(state) {
        const amIWinner = state.winningTeamName === teamData.name;
        biddingArea.innerHTML = `
            <h2>${state.selectedPlayer.name} has been sold!</h2>
            <p>Winning Team: ${state.winningTeamName}</p>
            <p>Final Price: ${new Intl.NumberFormat().format(state.currentBid)}</p>
            ${amIWinner ? '<h3>Congratulations! This player is now on your team.</h3>' : ''}
        `;
    }

    // --- Action: Send a bid to the server ---
    biddingArea.addEventListener('click', (event) => {
        if (event.target.id === 'bid-btn' && !event.target.disabled) {
            socket.emit('teamBid', { auctionId, teamId });
        }
    });
    
    // --- Helper function (must be kept in sync with admin panel) ---
    function calculateNextBid(currentBid, isFirstBid) {
        // This is simplified and assumes a default increment. A real app would get this from auction data.
        if (isFirstBid) return currentBid;
        return currentBid + 25000;
    }

    initializeDashboard();
});
