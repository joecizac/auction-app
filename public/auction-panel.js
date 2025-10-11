document.addEventListener('DOMContentLoaded', async () => {
    // Get the auction's unique ID from the page URL
    // e.g., from a URL like /admin/auction/auc_123456789
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 1];

    if (!auctionId || !auctionId.startsWith('auc_')) {
        console.error('No valid auction ID found in URL');
        document.getElementById('auction-title-heading').textContent = 'Invalid Auction';
        return;
    }

    try {
        const response = await fetch(`/api/auctions/${auctionId}`);
        if (!response.ok) {
            throw new Error('Auction not found');
        }
        const auction = await response.json();

        // Update the main heading with the auction's title
        const titleHeading = document.getElementById('auction-title-heading');
        if (titleHeading) {
            titleHeading.textContent = auction.title;
        }

        // Dynamically set the URLs for the management buttons
        const managePlayersLink = document.getElementById('manage-players-link');
        const manageTeamsLink = document.getElementById('manage-teams-link');

        if (managePlayersLink) {
            managePlayersLink.href = `/admin/auction/${auctionId}/players`;
        }
        if (manageTeamsLink) {
            manageTeamsLink.href = `/admin/auction/${auctionId}/teams`;
        }

    } catch (error) {
        console.error('Failed to load auction details:', error);
        document.getElementById('auction-title-heading').textContent = 'Error: Auction Not Found';
    }
});
