document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 2];

    // Page element references
    const auctionTitleHeading = document.getElementById('auction-title-heading');
    const backLink = document.getElementById('back-to-auction-link');
    const addPlayerLink = document.getElementById('add-player-link');
    const playerListContainer = document.getElementById('player-list-container');
    const filterPosition = document.getElementById('filter-position');

    if (!auctionId) {
        auctionTitleHeading.textContent = 'Error: Invalid Auction';
        return;
    }

    // Set navigation links
    backLink.href = `/admin/auction/${auctionId}`;
    addPlayerLink.href = `/admin/auction/${auctionId}/players/new`;

    try {
        // Fetch auction details to get its name and rules
        const auctionRes = await fetch(`/api/auctions/${auctionId}`);
        const auction = await auctionRes.json();
        auctionTitleHeading.textContent = `Manage Players: ${auction.title}`;

        // Populate position filter based on auction sport
        const sportPositions = {
            football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'],
            cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder']
        };
        const positions = sportPositions[auction.sport] || [];
        positions.forEach(pos => {
            const option = document.createElement('option');
            option.value = pos.toLowerCase();
            option.textContent = pos;
            filterPosition.appendChild(option);
        });

        // Fetch players for this auction
        const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
        const players = await playersRes.json();

        if (players.length === 0) {
            playerListContainer.innerHTML = '<p>No players added to this auction yet.</p>';
        } else {
            const tableBody = players.map(player => `
                <tr onclick="window.location.href='/admin/auction/${auctionId}/players/${player.dbId}/edit'">
                    <td><span class="player-id-badge">${player.id}</span></td>
                    <td>${player.name}</td>
                    <td>${player.position}</td>
                    <td>${player.division}</td>
                    <td>${player.experience}</td>
                    <td>${new Intl.NumberFormat().format(player.basePrice)}</td>
                </tr>
            `).join('');

            playerListContainer.innerHTML = `
                <table class="player-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Position</th>
                            <th>Division</th>
                            <th>Experience</th>
                            <th>Base Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableBody}
                    </tbody>
                </table>
            `;
        }

    } catch (error) {
        console.error('Failed to load player data:', error);
        playerListContainer.innerHTML = '<p class="error-message">Could not load players.</p>';
    }
});
