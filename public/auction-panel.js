document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    if (!auctionId || !auctionId.startsWith('auc_')) {
        console.error('No valid auction ID found in URL');
        document.getElementById('auction-title-heading').textContent = 'Invalid Auction';
        return;
    }

    try {
        const response = await fetch(`/api/auctions/${auctionId}`);
        if (!response.ok) throw new Error('Auction not found');
        const auction = await response.json();

        const titleHeading = document.getElementById('auction-title-heading');
        if (titleHeading) titleHeading.textContent = auction.title;

        // Dynamically set the URLs for the management buttons
        document.getElementById('manage-players-link').href = `/admin/auction/${auctionId}/players`;
        document.getElementById('manage-teams-link').href = `/admin/auction/${auctionId}/teams`;
        document.getElementById('edit-auction-link').href = `/admin/auction/${auctionId}/edit`;

        // --- NEW: Add logic for the "Close Auction" button ---
        const closeAuctionBtn = document.getElementById('close-auction-btn');
        if (auction.status === 'closed') {
            closeAuctionBtn.textContent = 'Reopen Auction';
        }

        closeAuctionBtn.addEventListener('click', async () => {
            const newStatus = auction.status === 'closed' ? 'upcoming' : 'closed';
            const action = newStatus === 'closed' ? 'close' : 'reopen';

            if (confirm(`Are you sure you want to ${action} this auction?`)) {
                try {
                    const updateRes = await fetch(`/api/auctions/${auctionId}/status`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ status: newStatus }),
                    });
                    if (!updateRes.ok) throw new Error(`Failed to ${action} auction`);
                    alert(`Auction has been ${action}d.`);
                    window.location.reload();
                } catch (err) {
                    alert(`Error: ${err.message}`);
                }
            }
        });

    } catch (error) {
        console.error('Failed to load auction details:', error);
        document.getElementById('auction-title-heading').textContent = 'Error: Auction Not Found';
    }
});

