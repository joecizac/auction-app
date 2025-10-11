document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 3];

    // Element references
    const backLink = document.getElementById('back-to-players-link');
    const playerForm = document.getElementById('player-form');
    const positionSelect = document.getElementById('player-position');
    const divisionSelect = document.getElementById('player-division');

    if (!auctionId) {
        console.error('Invalid auction ID');
        return;
    }

    // Set back link
    backLink.href = `/admin/auction/${auctionId}/players`;

    // Fetch auction rules to populate dropdowns
    try {
        const response = await fetch(`/api/auctions/${auctionId}`);
        const auction = await response.json();

        // Populate positions based on sport
        const sportPositions = {
            football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'],
            cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder']
        };
        const positions = sportPositions[auction.sport] || [];
        positions.forEach(pos => {
            const option = document.createElement('option');
            option.value = pos;
            option.textContent = pos;
            positionSelect.appendChild(option);
        });

        // Populate divisions based on allowed divisions
        const divisionLabels = {
            senior_men: 'Senior(Men)', senior_women: 'Senior(Women)',
            youth_men: 'Youth(Men)', youth_women: 'Youth(Women)',
            junior_boys: 'Junior(Boys)', junior_girls: 'Junior(Girls)',
        };
        auction.allowedDivisions.forEach(divValue => {
            const option = document.createElement('option');
            option.value = divValue;
            option.textContent = divisionLabels[divValue] || divValue;
            divisionSelect.appendChild(option);
        });

    } catch (error) {
        console.error('Failed to load auction data for form:', error);
    }

    // Handle form submission
    playerForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const playerData = {
            name: document.getElementById('player-name').value,
            position: document.getElementById('player-position').value,
            division: document.getElementById('player-division').value,
            experience: document.getElementById('player-experience').value,
            basePrice: document.getElementById('base-price').value,
            merits: document.getElementById('player-merits').value,
        };

        try {
            const response = await fetch(`/api/auctions/${auctionId}/players`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(playerData),
            });
            if (!response.ok) throw new Error('Failed to save player');
            
            alert('Player saved successfully!');
            window.location.href = `/admin/auction/${auctionId}/players`;

        } catch (error) {
            console.error('Error saving player:', error);
            alert('Failed to save player. See console for details.');
        }
    });
});
