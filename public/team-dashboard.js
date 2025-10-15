document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const urlParams = new URLSearchParams(window.location.search);
    const auctionId = urlParams.get('auctionId');
    const myTeamId = urlParams.get('teamId');

    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;

    // Element References
    const myTeamPanel = document.getElementById('my-team-panel');
    const biddingArea = document.getElementById('bidding-area');
    const otherTeamsContainer = document.getElementById('other-teams-container');
    const divisionLabels = { senior_men: 'Senior Men', senior_women: 'Senior Women', youth_men: 'Youth Men', youth_women: 'Youth Women', junior_boys: 'Junior Boys', junior_girls: 'Junior Girls' };

    if (!auctionId || !myTeamId) {
        document.body.innerHTML = '<h1>Error: Invalid Link</h1>';
        return;
    }

    let auctionData = null;
    let myTeamData = null; 

    // --- INITIAL DATA LOAD ---
    async function initializeView() {
        try {
            const response = await fetch(`/api/full-dashboard-data/${auctionId}/${myTeamId}`);
            if (!response.ok) throw new Error('Could not load dashboard data.');
            
            const data = await response.json();
            auctionData = data.auction;
            myTeamData = data.myTeam;
            
            renderAllPanels(data);

        } catch (error) {
            console.error('Failed to load dashboard:', error);
            document.body.innerHTML = '<h1>Error loading data.</h1>';
        }
    }

    // --- RENDER FUNCTIONS ---
    function renderAllPanels(data) {
        renderMyTeamPanel(data);
        renderOtherTeamsPanel(data);
    }

    function renderMyTeamPanel({ myTeam, allPlayers }) {
        const myPlayers = allPlayers.filter(p => p.owningTeamId === myTeam.id);
        const captainValue = parseFloat(myTeam.captainValue);
        let amountSpent = captainValue;
        myPlayers.forEach(p => { amountSpent += parseFloat(p.soldPrice); });
        const balance = parseFloat(auctionData.budget) - amountSpent;

        let playersHtml = `<div class="my-team-header">
                               <div class="team-logo-placeholder"></div>
                               <h2>${myTeam.name}</h2>
                               <div class="my-team-balance">${formatCurrency(balance)}</div>
                               <div class="my-team-spent">Spent: ${formatCurrency(amountSpent)}</div>
                           </div>
                           <div class="my-team-squad-list">`;
        
        playersHtml += `<div class="squad-list-item captain"><div class="player-info"><span class="player-name">${myTeam.captainName} (C)</span><span class="player-role">Captain</span></div><span class="player-price">${formatCurrency(captainValue)}</span></div>`;

        myPlayers.forEach(player => {
            const divisionColorClass = `division-${(player.division || '').split('_')[0]}`;
            const formattedDivision = divisionLabels[player.division] || player.division;
            playersHtml += `<div class="squad-list-item ${divisionColorClass}">
                                <div class="player-info">
                                    <span class="player-name">${player.name}</span>
                                    <span class="player-role">${formattedDivision} | ${player.position}</span>
                                </div>
                                <span class="player-price">${formatCurrency(player.soldPrice)}</span>
                            </div>`;
        });
        
        playersHtml += '</div>';
        myTeamPanel.innerHTML = playersHtml;
    }

    function renderOtherTeamsPanel({ allTeams, allPlayers, myTeam }) {
        const otherTeams = allTeams.filter(t => t.id !== myTeam.id);
        let teamsHtml = '';
        otherTeams.forEach(team => {
            const teamPlayers = allPlayers.filter(p => p.owningTeamId === team.id);
            const captainValue = parseFloat(team.captainValue);
            let amountSpent = captainValue;
            teamPlayers.forEach(p => { amountSpent += parseFloat(p.soldPrice); });
            const balance = parseFloat(auctionData.budget) - amountSpent;
            
            teamsHtml += `<div class="other-team-card">
                            <div class="other-team-name">${team.name}</div>
                            <div class="other-team-stats">
                                <div class="stat-item">
                                    <span class="stat-label">Balance</span>
                                    <span class="stat-value">${formatCurrency(balance)}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Spent</span>
                                    <span class="stat-value">${formatCurrency(amountSpent)}</span>
                                </div>
                                <div class="stat-item">
                                    <span class="stat-label">Players</span>
                                    <span class="stat-value">${teamPlayers.length + 1}</span>
                                </div>
                            </div>
                        </div>`;
        });
        otherTeamsContainer.innerHTML = teamsHtml;
    }

    // --- REAL-TIME UPDATES ---
    socket.on('auctionUpdate', (state) => {
        if (!auctionData || !myTeamData) return;
        if (state.status === 'sold') {
            initializeView(); 
        }
        if (state.status === 'bidding') {
            renderBiddingView(state);
        } else if (state.status === 'sold') {
            renderSoldView(state);
        } else if (state.status === 'unsold') {
            renderUnsoldView(state);
        } else {
            renderIdleView();
        }
    });

    function renderIdleView() { biddingArea.innerHTML = '<h2>Waiting for next player...</h2>'; }

    function renderBiddingView(state) {
        const { selectedPlayer, currentBid, biddingTeamName } = state;        
        const isFirstBid = !biddingTeamName;
        const nextBid = isFirstBid ? currentBid : calculateNextBid(currentBid);
        
        let myCurrentBalance = 0;
        const myTeamBalanceEl = document.querySelector('.my-team-balance');
        if (myTeamBalanceEl) {
            myCurrentBalance = parseFloat(myTeamBalanceEl.textContent.replace(/₹|,/g, ''));
        }
        
        const isMyBid = biddingTeamName === myTeamData.name;
        const canAfford = myCurrentBalance >= nextBid;
        const isButtonDisabled = isMyBid || !canAfford;

        biddingArea.innerHTML = `
            <div class="player-name">${selectedPlayer.name}</div>
            <div class="player-details">${selectedPlayer.position} | ${selectedPlayer.experience}</div>
            <div class="bid-info">
                <div class="bid-info-item"><span class="bid-info-label">Current Bid</span><span class="bid-info-value">${formatCurrency(currentBid)}</span></div>
                <div class="bid-info-item">
                    <span class="bid-info-label">Bidding Team</span>
                    <span class="bid-info-value">${biddingTeamName || '--'}</span>
                </div>
            </div>
            <button id="bid-btn" class="btn btn-primary" ${isButtonDisabled ? 'disabled' : ''}>BID ${formatCurrency(nextBid)}</button>`;
    }

    function renderSoldView(state) {
        const amIWinner = state.winningTeamName === myTeamData.name;
        biddingArea.innerHTML = `<h2>${state.selectedPlayer.name} has been sold!</h2><p>Winning Team: ${state.winningTeamName}</p><p>Final Price: ${new Intl.NumberFormat().format(state.currentBid)}</p>${amIWinner ? '<h3>Congratulations! This player is now on your team.</h3>' : ''}`;
    }

    function renderUnsoldView(state) {
        biddingArea.innerHTML = `<h2>${state.selectedPlayer.name} went UNSOLD</h2><p>This player may be re-nominated later in the auction.</p>`;
    }
    
    biddingArea.addEventListener('click', (event) => {
        if (event.target.id === 'bid-btn' && !event.target.disabled) {
            socket.emit('teamBid', { auctionId, teamId: myTeamId });
        }
    });
    
    function calculateNextBid(currentBid) {
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

    initializeView();
});

