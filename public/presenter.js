document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const presenterContent = document.getElementById('presenter-content');

    socket.on('auctionUpdate', (state) => {
        console.log('Received auction update:', state);

        switch (state.status) {
            case 'bidding':
                renderBiddingView(state);
                break;
            case 'sold':
                renderSoldView(state);
                break;
            case 'unsold':
                renderUnsoldView(state);
                break;
            case 'idle':
            default:
                renderIdleView();
                break;
        }
    });

    function renderIdleView() {
        presenterContent.className = 'presenter-idle';
        presenterContent.innerHTML = '<h1>Waiting for the next player...</h1>';
    }

    function renderTeamList(teams, showBalance, players) {
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
                    ${showBalance ? `<span class="team-balance">${new Intl.NumberFormat().format(balance)}</span>` : ''}
                </div>
            `;
        });
        teamHtml += '</div>';
        return teamHtml;
    }

    function renderBiddingView(state) {
        presenterContent.className = 'presenter-active';
        const { selectedPlayer, currentBid, biddingTeamName, teams, showBalance, players } = state;

        presenterContent.innerHTML = `
            <div class="player-info-card">
                <div class="player-name">${selectedPlayer.name}</div>
                <div class="player-details">${selectedPlayer.position} | ${selectedPlayer.experience}</div>
            </div>
            <div class="bidding-info-card">
                <div class="bid-label">Current Bid</div>
                <div class="bid-amount">${new Intl.NumberFormat().format(currentBid)}</div>
                <div class="bidding-team-label">Bidding Team</div>
                <div class="bidding-team-name">${biddingTeamName || '--'}</div>
            </div>
            ${renderTeamList(teams, showBalance, players)}
        `;
    }

    function renderSoldView(state) {
        presenterContent.className = 'presenter-sold';
        const { selectedPlayer, currentBid, winningTeamName, teams, showBalance, players } = state;
        presenterContent.innerHTML = `
            <div class="result-card">
                <div class="result-player-name">${selectedPlayer.name}</div>
                <div class="result-status-sold">SOLD TO</div>
                <div class="result-team-name">${winningTeamName}</div>
                <div class="result-final-price">${new Intl.NumberFormat().format(currentBid)}</div>
            </div>
            ${renderTeamList(teams, showBalance, players)}
        `;
    }

    function renderUnsoldView(state) {
        presenterContent.className = 'presenter-unsold';
        const { selectedPlayer, teams, showBalance, players } = state;
        presenterContent.innerHTML = `
             <div class="result-card">
                <div class="result-player-name">${selectedPlayer.name}</div>
                <div class="result-status-unsold">UNSOLD</div>
            </div>
            ${renderTeamList(teams, showBalance, players)}
        `;
    }
});

