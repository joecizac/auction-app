document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const presenterContent = document.getElementById('presenter-content');
    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;

    socket.on('auctionUpdate', (state) => {
        console.log('Received auction update:', state);

        // THE FIX: Add a class to the container based on whether to show the teams list
        const layoutClass = state.showBalance ? 'with-teams' : 'no-teams';

        switch (state.status) {
            case 'bidding':
                presenterContent.className = `presenter-active ${layoutClass}`;
                renderBiddingView(state);
                break;
            case 'sold':
                presenterContent.className = `presenter-sold ${layoutClass}`;
                renderSoldView(state);
                break;
            case 'unsold':
                presenterContent.className = `presenter-unsold ${layoutClass}`;
                renderUnsoldView(state);
                break;
            case 'idle':
            default:
                presenterContent.className = `presenter-idle`;
                renderIdleView();
                break;
        }
    });

    function renderIdleView() {
        presenterContent.innerHTML = '<h1>Waiting for the next player...</h1>';
    }

    function renderTeamList(teams, players) {
        if (!teams || teams.length === 0) return '';
        let teamHtml = '<div class="presenter-teams-list"><h3>Teams</h3>';
        teams.forEach(team => {
            let balance = parseFloat(team.auctionBudget) - parseFloat(team.captainValue);
            (players || []).forEach(p => {
                if (p.status === 'sold' && p.owningTeamId === team.id) {
                    balance -= parseFloat(p.soldPrice);
                }
            });
            teamHtml += `
                <div class="presenter-team-item">
                    <span class="team-name">${team.name}</span>
                    <span class="team-balance">${formatCurrency(balance)}</span>
                </div>
            `;
        });
        teamHtml += '</div>';
        return teamHtml;
    }

    function renderBiddingView(state) {
        const { selectedPlayer, currentBid, biddingTeamName, teams, showBalance, players } = state;
        presenterContent.innerHTML = `
            <div class="player-info-card">
                <div class="player-name">${selectedPlayer.name}</div>
                <div class="player-details">${selectedPlayer.position} | ${selectedPlayer.experience}</div>
            </div>
            <div class="bidding-info-card">
                <div class="bid-label">Current Bid</div>
                <div class="bid-amount">${formatCurrency(currentBid)}</div>
                <div class="bidding-team-label">Bidding Team</div>
                <div class="bidding-team-name">${biddingTeamName || '--'}</div>
            </div>
            ${showBalance ? renderTeamList(teams, players) : ''}
        `;
    }

    function renderSoldView(state) {
        const { selectedPlayer, currentBid, winningTeamName, teams, showBalance, players } = state;
        presenterContent.innerHTML = `
            <div class="result-card">
                <div class="result-player-name">${selectedPlayer.name}</div>
                <div class="result-status-sold">SOLD TO</div>
                <div class="result-team-name">${winningTeamName}</div>
                <div class="result-final-price">${formatCurrency(currentBid)}</div>
            </div>
            ${showBalance ? renderTeamList(teams, players) : ''}
        `;
    }

    function renderUnsoldView(state) {
        const { selectedPlayer, teams, showBalance, players } = state;
        presenterContent.innerHTML = `
             <div class="result-card">
                <div class="result-player-name">${selectedPlayer.name}</div>
                <div class="result-status-unsold">UNSOLD</div>
            </div>
            ${showBalance ? renderTeamList(teams, players) : ''}
        `;
    }
});

