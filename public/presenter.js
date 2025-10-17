document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const presenterContent = document.getElementById('presenter-content');
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
            
            const logoHtml = team.logoImage
                ? `<img src="${team.logoImage}" alt="${team.name}">`
                : `<span>${team.name.charAt(0)}</span>`;

            teamHtml += `
                <div class="presenter-team-item">
                    <div class="presenter-team-id">
                        <div class="presenter-team-logo">${logoHtml}</div>
                        <span class="team-name">${team.name}</span>
                    </div>
                    ${showBalance ? `<span class="team-balance">${formatCurrency(balance)}</span>` : ''}
                </div>
            `;
        });
        teamHtml += '</div>';
        return teamHtml;
    }

    function renderBiddingView(state) {
        presenterContent.className = `presenter-active ${state.showBalance ? 'with-teams' : 'no-teams'}`;
        const { selectedPlayer, currentBid, biddingTeamName, teams, showBalance, players } = state;
        
        const photoHtml = selectedPlayer.photoImage
            ? `<img src="${selectedPlayer.photoImage}" alt="${selectedPlayer.name}">`
            : `<span>${selectedPlayer.name.charAt(0)}</span>`;

        const formattedDivision = divisionLabels[selectedPlayer.division] || selectedPlayer.division;
        const formattedExperience = experienceLabels[selectedPlayer.experience] || selectedPlayer.experience;
        const biddingTeam = teams.find(t => t.name === biddingTeamName);
        const biddingTeamDisplay = biddingTeam
            ? `<div class="presenter-bidding-team">
                   ${biddingTeam.logoImage ? `<img src="${biddingTeam.logoImage}" alt="${biddingTeam.name}">` : ''}
                   <span>${biddingTeam.name}</span>
               </div>`
            : '<span>--</span>';

        presenterContent.innerHTML = `
            <div class="player-info-card">
                <div class="presenter-player-photo">${photoHtml}</div>
                <div class="player-name">${selectedPlayer.name}</div>
                <div class="player-details">${selectedPlayer.position} | ${formattedExperience}</div>
            </div>
            <div class="bidding-info-card">
                <div class="bid-label">Current Bid</div>
                <div class="bid-amount">${formatCurrency(currentBid)}</div>
                <div class="bidding-team-label">Bidding Team</div>
                <div class="bidding-team-name">${biddingTeamDisplay}</div>
            </div>
            ${showBalance ? renderTeamList(teams, players) : ''}
        `;
    }

    function renderSoldView(state) {
        presenterContent.className = `presenter-sold ${state.showBalance ? 'with-teams' : 'no-teams'}`;
        const { selectedPlayer, currentBid, winningTeamName, teams, showBalance, players } = state;

        const photoHtml = selectedPlayer.photoImage
            ? `<img src="${selectedPlayer.photoImage}" alt="${selectedPlayer.name}">`
            : `<span>${selectedPlayer.name.charAt(0)}</span>`;

        const winningTeam = teams.find(t => t.name === winningTeamName);
        const winningTeamDisplay = winningTeam
            ? `<div class="presenter-bidding-team">
                   ${winningTeam.logoImage ? `<img src="${winningTeam.logoImage}" alt="${winningTeam.name}">` : ''}
                   <span>${winningTeam.name}</span>
               </div>`
            : `<span>${winningTeamName}</span>`;

        presenterContent.innerHTML = `
            <div class="result-card">
                 <div class="presenter-player-photo">${photoHtml}</div>
                <div class="result-player-name">${selectedPlayer.name}</div>
                <div class="result-status-sold">SOLD TO</div>
                <div class="result-team-name">${winningTeamDisplay}</div>
                <div class="result-final-price">${formatCurrency(currentBid)}</div>
            </div>
            ${showBalance ? renderTeamList(teams, players) : ''}
        `;
    }

    function renderUnsoldView(state) {
        presenterContent.className = `presenter-unsold ${state.showBalance ? 'with-teams' : 'no-teams'}`;
        const { selectedPlayer, teams, showBalance, players } = state;

        const photoHtml = selectedPlayer.photoImage
            ? `<img src="${selectedPlayer.photoImage}" alt="${selectedPlayer.name}">`
            : `<span>${selectedPlayer.name.charAt(0)}</span>`;

        presenterContent.innerHTML = `
             <div class="result-card">
                <div class="presenter-player-photo">${photoHtml}</div>
                <div class="result-player-name">${selectedPlayer.name}</div>
                <div class="result-status-unsold">UNSOLD</div>
            </div>
            ${showBalance ? renderTeamList(teams, players) : ''}
        `;
    }
});

