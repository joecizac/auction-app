document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const isEditing = pathParts[pathParts.length - 1] === 'edit';

    let auctionId, playerId;

    if (isEditing) {
        playerId = pathParts[pathParts.length - 2];
        auctionId = pathParts[pathParts.length - 4];
    } else {
        auctionId = pathParts[pathParts.length - 3];
        playerId = null;
    }

    // Element references
    const backLink = document.getElementById('back-to-players-link');
    const formTitle = document.getElementById('form-title');
    const playerForm = document.getElementById('player-form');
    const submitBtn = document.getElementById('submit-btn');
    const deleteBtn = document.getElementById('delete-player-btn');
    const positionSelect = document.getElementById('player-position');
    const divisionSelect = document.getElementById('player-division');

    if (!auctionId) {
        console.error('Invalid auction ID');
        formTitle.textContent = "Error: Auction Not Found";
        return;
    }

    // THE FIX: Set back link here so it works in both modes
    backLink.href = `/admin/auction/${auctionId}/players`;

    // THE FIX: Fetch auction data and populate dropdowns *before* checking for edit mode
    try {
        const auctionRes = await fetch(`/api/auctions/${auctionId}`);
        const auction = await auctionRes.json();
        
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
        
        if (isEditing) {
            // --- EDIT MODE ---
            formTitle.textContent = 'Edit Player';
            submitBtn.textContent = 'Update Player';
            deleteBtn.style.display = 'block';

            // Fetch existing player data to populate form
            const playerRes = await fetch(`/api/auctions/${auctionId}/players/${playerId}`);
            const player = await playerRes.json();

            document.getElementById('player-name').value = player.name;
            document.getElementById('player-position').value = player.position;
            document.getElementById('player-division').value = player.division;
            document.getElementById('player-experience').value = player.experience;
            // THE FIX: Changed 'player.baseprice' to 'player.basePrice'
            document.getElementById('base-price').value = player.basePrice;
            document.getElementById('player-merits').value = player.merits;

        } else {
            // --- CREATE MODE ---
            formTitle.textContent = 'Add Player';
            submitBtn.textContent = 'Add Player';
        }
    } catch (error) {
        console.error('Failed to initialize form:', error);
        alert('Could not load necessary data. Please return to the previous page and try again.');
    }

    // Handle Form Submission (Create or Update)
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

        const url = isEditing ? `/api/auctions/${auctionId}/players/${playerId}` : `/api/auctions/${auctionId}/players`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method: method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(playerData) });
            if (!response.ok) throw new Error('Failed to save player');
            
            alert(`Player ${isEditing ? 'updated' : 'added'} successfully!`);
            window.location.href = `/admin/auction/${auctionId}/players`;
        } catch (error) {
            console.error('Error saving player:', error);
            alert('Failed to save player.');
        }
    });

    // Handle Delete
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this player?')) {
            try {
                const response = await fetch(`/api/auctions/${auctionId}/players/${playerId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete player');

                alert('Player deleted successfully.');
                window.location.href = `/admin/auction/${auctionId}/players`;
            } catch (error) {
                console.error('Error deleting player:', error);
                alert('Failed to delete player.');
            }
        }
    });
});


