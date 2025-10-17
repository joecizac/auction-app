document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const presenterContainer = document.getElementById('presenter-container');

    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;
    const divisionLabels = {
        senior_men: 'Senior (Men)', senior_women: 'Senior (Women)',
        youth_men: 'Youth (Men)', youth_women: 'Youth (Women)',
        junior_boys: 'Junior (Boys)', junior_girls: 'Junior (Girls)',
    };
    const experienceLabels = {
        novice: 'Novice', intermediate: 'Intermediate', professional: 'Professional'
    };

    socket.on('auctionUpdate', (state) => {
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
        presenterContainer.innerHTML = `<div class="presenter-idle"><h1>Waiting for next player...</h1></div>`;
    }

    function renderTeamList(teams, players, showBalance) {
        if (!teams || !showBalance) return '';
        let teamHtml = '<div class="presenter-teams-list-revamped">';
        teams.forEach(team => {
            let balance = parseFloat(team.auctionBudget) - parseFloat(team.captainValue);
            (players || []).forEach(p => {
                if (p.status === 'sold' && p.owningTeamId === team.id) {
                    balance -= parseFloat(p.soldPrice);
                }
            });
            const logoHtml = team.logoImage ? `<img src="${team.logoImage}" alt="${team.name}">` : `<span>${team.name.charAt(0)}</span>`;
            teamHtml += `<div class="presenter-team-item"><div class="presenter-team-logo">${logoHtml}</div><span class="team-name">${team.name}</span><span class="team-balance">${formatCurrency(balance)}</span></div>`;
        });
        teamHtml += '</div>';
        return teamHtml;
    }

    function renderBiddingView(state) {
        const { selectedPlayer, currentBid, biddingTeamName, teams, showBalance, players } = state;
        const photoHtml = selectedPlayer.photoImage ? `<img src="${selectedPlayer.photoImage}" alt="${selectedPlayer.name}">` : `<span>${selectedPlayer.name.charAt(0)}</span>`;
        const formattedExperience = experienceLabels[selectedPlayer.experience] || selectedPlayer.experience;
        
        const biddingTeam = teams.find(t => t.name === biddingTeamName);
        const biddingTeamDisplay = biddingTeam
            ? `<div class="presenter-bidding-team">${biddingTeam.logoImage ? `<img src="${biddingTeam.logoImage}" alt="${biddingTeam.name}">` : ''}<span>${biddingTeam.name}</span></div>`
            : '<span class="no-bidder">--</span>';

        presenterContainer.innerHTML = `
            <div class="presenter-main-content">
                <div class="presenter-player-card">
                    <div class="presenter-player-photo">${photoHtml}</div>
                    <h1 class="presenter-player-name">${selectedPlayer.name}</h1>
                    <p class="presenter-player-details">${selectedPlayer.position} | ${formattedExperience}</p>
                </div>
                <div class="presenter-bid-card">
                    <div class="bid-box">
                        <span class="bid-label">Current Bid</span>
                        <span class="bid-amount">${formatCurrency(currentBid)}</span>
                    </div>
                    <div class="team-box">
                        <span class="bid-label">Bidding Team</span>
                        <div class="bidding-team-name">${biddingTeamDisplay}</div>
                    </div>
                </div>
            </div>
            ${renderTeamList(teams, players, showBalance)}
        `;
    }

    function renderSoldView(state) {
        const { selectedPlayer, currentBid, winningTeamName } = state;
        presenterContainer.innerHTML = `<div class="presenter-result-view sold"><h1>${selectedPlayer.name}</h1><h2>SOLD TO</h2><h3>${winningTeamName}</h3><h4>${formatCurrency(currentBid)}</h4></div>`;
    }

    function renderUnsoldView(state) {
        const { selectedPlayer } = state;
        presenterContainer.innerHTML = `<div class="presenter-result-view unsold"><h1>${selectedPlayer.name}</h1><h2>UNSOLD</h2></div>`;
    }
});

