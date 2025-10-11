document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 2];

    const auctionTitleHeading = document.getElementById('auction-title-heading');
    const backLink = document.getElementById('back-to-auction-link');
    const addTeamLink = document.getElementById('add-team-link');
    const teamsGridWrapper = document.getElementById('teams-grid-wrapper');

    if (!auctionId) {
        auctionTitleHeading.textContent = 'Error: Invalid Auction';
        return;
    }

    // Set navigation links dynamically
    backLink.href = `/admin/auction/${auctionId}`;
    addTeamLink.href = `/admin/auction/${auctionId}/teams/new`;

    try {
        // Fetch the auction details to display its name
        const auctionRes = await fetch(`/api/auctions/${auctionId}`);
        const auction = await auctionRes.json();
        auctionTitleHeading.textContent = `Manage Teams: ${auction.title}`;

        // Fetch the teams for this auction
        const teamsRes = await fetch(`/api/auctions/${auctionId}/teams`);
        const teams = await teamsRes.json();

        if (teams.length === 0) {
            teamsGridWrapper.innerHTML = '<p>No teams created for this auction yet.</p>';
        } else {
            teamsGridWrapper.innerHTML = ''; // Clear the message
            teams.forEach(team => {
                // THE FIX: Wrap the card in a link to the edit page
                const link = document.createElement('a');
                link.href = `/admin/auction/${auctionId}/teams/${team.id}/edit`;
                link.className = 'auction-card-link';

                const teamCard = document.createElement('div');
                teamCard.className = 'auction-card';
                teamCard.innerHTML = `
                    <div class="card-image-placeholder">
                        <span>${team.name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="card-content">
                        <h3>${team.name}</h3>
                        <p>Manager: ${team.managerName || 'N/A'}</p>
                        <p class="date">Players: 0</p>
                    </div>
                `;
                link.appendChild(teamCard);
                teamsGridWrapper.appendChild(link);
            });
        }
    } catch (error) {
        console.error('Failed to load team data:', error);
        teamsGridWrapper.innerHTML = '<p class="error-message">Could not load teams.</p>';
    }
});

