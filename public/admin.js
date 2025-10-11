document.addEventListener('DOMContentLoaded', async () => {
    const auctionsGrid = document.getElementById('auctions-grid');
    const noAuctionsMessage = document.getElementById('no-auctions-message');

    try {
        const response = await fetch('/api/auctions');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const auctions = await response.json();

        if (auctions.length === 0) {
            noAuctionsMessage.style.display = 'block';
            auctionsGrid.style.display = 'none';
        } else {
            noAuctionsMessage.style.display = 'none';
            auctionsGrid.style.display = 'grid';
            auctionsGrid.innerHTML = ''; // Clear any hardcoded examples

            auctions.forEach(auction => {
                // THE FIX: Create an 'a' tag to make the card a link
                const link = document.createElement('a');
                link.href = `/admin/auction/${auction.id}`; // Unique URL for each auction
                link.className = 'auction-card-link';

                const card = document.createElement('div');
                card.className = 'auction-card';
                if (auction.status === 'closed') {
                    card.classList.add('closed');
                }

                const creationDate = new Date(auction.createdAt).toLocaleDateString('en-GB');

                card.innerHTML = `
                    <div class="card-image-placeholder">
                        ${auction.status === 'closed' ? '<div class="closed-overlay">CLOSED</div>' : ''}
                        <span>${auction.sport.charAt(0).toUpperCase()}</span>
                    </div>
                    <div class="card-content">
                        <h3>${auction.title}</h3>
                        <p>${auction.sport.charAt(0).toUpperCase() + auction.sport.slice(1)}</p>
                        <p class="date">${creationDate}</p>
                    </div>
                `;
                
                // Append the card to the link, and the link to the grid
                link.appendChild(card);
                auctionsGrid.appendChild(link);
            });
        }

    } catch (error) {
        console.error('Failed to fetch auctions:', error);
        auctionsGrid.innerHTML = '<p class="error-message">Could not load auctions. Please try again later.</p>';
    }
});

