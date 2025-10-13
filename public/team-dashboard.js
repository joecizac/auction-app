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

    let teamData = null;
    let auctionData = null;

    // Initial data load
    async function initializeDashboard() {
        try {
            const response = await fetch(`/api/dashboard-data/${auctionId}/${teamId}`);
            if (!response.ok) throw new Error('Could not load dashboard data.');
            const data = await response.json();
            
            teamData = data.team;
            auctionData = data.auction;
            const { players } = data;

            teamNameHeading.textContent = teamData.name;
            updateTeamStats(auctionData, players);
        } catch (error) {
            console.error('Failed to load dashboard:', error);
            teamNameHeading.textContent = 'Error loading data.';
        }
    }

    function updateTeamStats(auction, players) {
        const totalBudget = parseFloat(auction.budget);
        const captainValue = parseFloat(teamData.captainValue);
        let amountSpent = captainValue;
        let playerCount = 1;

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
        if (!teamData || !auctionData) return;

        // THE FIX: Use a switch statement to handle all states correctly
        switch (state.status) {
            case 'bidding':
                renderBiddingView(state);
                break;
            case 'sold':
                renderSoldView(state);
                if (state.winningTeamName === teamData.name) {
                    initializeDashboard();
                }
                break;
            case 'unsold':
                renderUnsoldView(state);
                break;
            default:
                renderIdleView();
                break;
        }
    });

    function renderIdleView() {
        biddingArea.innerHTML = '<h2>Waiting for the next player...</h2>';
    }

    function renderBiddingView(state) {
        const { selectedPlayer, currentBid, biddingTeamName } = state;
        const isFirstBid = biddingTeamName === '--';
        const nextBid = calculateNextBid(currentBid, isFirstBid);
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

    // --- NEW: Function to render the unsold state ---
    function renderUnsoldView(state) {
        biddingArea.innerHTML = `
            <h2>${state.selectedPlayer.name} went UNSOLD</h2>
            <p>This player may be re-nominated later in the auction.</p>
        `;
    }

    biddingArea.addEventListener('click', (event) => {
        if (event.target.id === 'bid-btn' && !event.target.disabled) {
            socket.emit('teamBid', { auctionId, teamId });
        }
    });
    
    function calculateNextBid(currentBid, isFirstBid) {
        if (isFirstBid) {
            return currentBid;
        }
        let nextBid = currentBid;
        const bidIncrements = auctionData.bidIncrements || [];
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

    initializeDashboard();
});

