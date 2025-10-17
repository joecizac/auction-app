document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 2];

    const auctionTitleHeading = document.getElementById('auction-title-heading');
    const backLink = document.getElementById('back-to-auction-link');
    const addTeamLink = document.getElementById('add-team-link');
    const teamsGridWrapper = document.getElementById('teams-grid-wrapper');

    let allPlayers = [];
    let allTeams = [];
    
    if (!auctionId) {
        auctionTitleHeading.textContent = 'Error: Invalid Auction';
        return;
    }

    async function initializePage() {
        backLink.href = `/admin/auction/${auctionId}`;
        addTeamLink.href = `/admin/auction/${auctionId}/teams/new`;

        try {
            const auctionRes = await fetch(`/api/auctions/${auctionId}`);
            const auction = await auctionRes.json();
            auctionTitleHeading.textContent = `Manage Teams: ${auction.title}`;

            const teamsRes = await fetch(`/api/auctions/${auctionId}/teams`);
            allTeams = await teamsRes.json();
            const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
            allPlayers = await playersRes.json();

            renderTeamCards(allTeams);

        } catch (error) {
            console.error('Failed to load team data:', error);
            teamsGridWrapper.innerHTML = '<p class="error-message">Could not load teams.</p>';
        }
    }

    function renderTeamCards(teams) {
        if (teams.length === 0) {
            teamsGridWrapper.innerHTML = '<p>No teams created for this auction yet.</p>';
        } else {
            teamsGridWrapper.innerHTML = '';
            teams.forEach(team => {
                // THE FIX #1: Correctly count players owned by the team.
                const wonPlayers = allPlayers.filter(p => p.status === 'sold' && p.owningTeamId === team.id);
                const playerCount = wonPlayers.length;

                const link = document.createElement('a');
                link.href = `/admin/auction/${auctionId}/teams/${team.id}/edit`;
                link.className = 'auction-card-link';

                const teamCard = document.createElement('div');
                teamCard.className = 'auction-card';

                const imageSection = team.logoImage
                    ? `<div class="card-image" style="background-image: url('${team.logoImage}'); background-size: contain; background-repeat: no-repeat;"></div>`
                    : `<div class="card-image-placeholder"><span>${team.name.charAt(0).toUpperCase()}</span></div>`;

                // THE FIX #2: Add Co-Manager and Captain details.
                teamCard.innerHTML = `
                    ${imageSection}
                    <div class="card-content">
                        <h3>${team.name}</h3>
                        <div class="team-card-details">
                            <p><strong>Manager:</strong> ${team.managerName || 'N/A'}</p>
                            <p><strong>Co-Manager:</strong> ${team.coManagerName || 'N/A'}</p>
                            <p><strong>Captain:</strong> ${team.captainName || 'N/A'}</p>
                        </div>
                        <p class="player-count">Players: ${playerCount}</p> 
                    </div>
                `;
                link.appendChild(teamCard);
                teamsGridWrapper.appendChild(link);
            });
        }
    }
    
    initializePage();
});