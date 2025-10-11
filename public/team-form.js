document.addEventListener('DOMContentLoaded', () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 3];

    const backLink = document.getElementById('back-to-teams-link');
    const teamForm = document.getElementById('team-form');

    if (!auctionId) {
        console.error('Invalid auction ID');
        return;
    }

    // Set back link dynamically
    backLink.href = `/admin/auction/${auctionId}/teams`;

    teamForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const teamData = {
            name: document.getElementById('team-name').value,
            managerName: document.getElementById('manager-name').value,
            coManagerName: document.getElementById('co-manager-name').value,
            captainName: document.getElementById('captain-name').value,
            captainValue: document.getElementById('captain-value').value,
        };

        try {
            const response = await fetch(`/api/auctions/${auctionId}/teams`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(teamData),
            });

            if (!response.ok) {
                throw new Error('Failed to create team');
            }

            alert('Team created successfully!');
            window.location.href = `/admin/auction/${auctionId}/teams`;

        } catch (error) {
            console.error('Error creating team:', error);
            alert('Failed to create team. See console for details.');
        }
    });
});
