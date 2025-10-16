document.addEventListener('DOMContentLoaded', async () => {
    const auctionsGrid = document.getElementById('auctions-grid');
    const noAuctionsMessage = document.getElementById('no-auctions-message');
    const hideClosedCheckbox = document.getElementById('hide-closed-checkbox');
    
    let allAuctions = []; // Store the master list of auctions

    try {
        const response = await fetch('/api/auctions');
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        allAuctions = await response.json();
        
        // Initial render
        filterAndRenderAuctions();
    } catch (error) {
        console.error('Failed to fetch auctions:', error);
        auctionsGrid.innerHTML = '<p class="error-message">Could not load auctions.</p>';
    }

    function filterAndRenderAuctions() {
        const hideClosed = hideClosedCheckbox.checked;
        const auctionsToRender = hideClosed 
            ? allAuctions.filter(auction => auction.status !== 'closed') 
            : allAuctions;

        renderAuctionCards(auctionsToRender);
    }

    function renderAuctionCards(auctions) {
        auctionsGrid.innerHTML = ''; // Clear existing cards
        
        if (auctions.length === 0) {
            // Show a different message if auctions are just hidden by the filter
            if (allAuctions.length > 0) {
                 noAuctionsMessage.textContent = 'No open auctions to display.';
            } else {
                 noAuctionsMessage.textContent = 'No auctions found. Get started by creating one!';
            }
            noAuctionsMessage.style.display = 'block';
        } else {
            noAuctionsMessage.style.display = 'none';

            auctions.forEach(auction => {
                const link = document.createElement('a');
                // THE FIX: If an auction is closed, link to a summary page (we'll build this next)
                link.href = auction.status === 'closed' 
                    ? `/admin/auction/${auction.id}/summary`
                    : `/admin/auction/${auction.id}`;
                link.className = 'auction-card-link';

                const card = document.createElement('div');
                card.className = 'auction-card';
                if (auction.status === 'closed') {
                    card.classList.add('closed');
                }
                
                const creationDate = auction.createdAt ? new Date(auction.createdAt).toLocaleDateString('en-GB') : 'N/A';
                const imageSection = auction.bannerImage ? `<div class="card-image" style="background-image: url('${auction.bannerImage}')"></div>` : `<div class="card-image-placeholder"><span>${(auction.sport || ' ').charAt(0).toUpperCase()}</span></div>`;

                card.innerHTML = `
                    ${imageSection}
                    <div class="card-content">
                        <h3>${auction.title || 'Untitled Auction'}</h3>
                        <p>${(auction.sport || 'N/A').charAt(0).toUpperCase() + (auction.sport || 'N/A').slice(1)}</p>
                        <p class="date">${creationDate}</p>
                    </div>
                    ${auction.status === 'closed' ? '<div class="closed-overlay"><div>CLOSED</div></div>' : ''}
                `;
                
                link.appendChild(card);
                auctionsGrid.appendChild(link);
            });
        }
    }

    hideClosedCheckbox.addEventListener('change', filterAndRenderAuctions);
});
