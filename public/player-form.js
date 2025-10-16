document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const isEditing = pathParts[pathParts.length - 1] === 'edit';
    const auctionId = isEditing ? pathParts[pathParts.length - 4] : pathParts[pathParts.length - 3];
    const playerId = isEditing ? pathParts[pathParts.length - 2] : null;

    // Element references
    const backLink = document.getElementById('back-to-players-link');
    const formTitle = document.getElementById('form-title');
    const playerForm = document.getElementById('player-form');
    const submitBtn = document.getElementById('submit-btn');
    const deleteBtn = document.getElementById('delete-player-btn');
    const positionSelect = document.getElementById('player-position');
    const divisionSelect = document.getElementById('player-division');
    const photoInput = document.getElementById('player-photo-input');
    const photoPreview = document.getElementById('photo-preview');
    const photoPreviewText = document.getElementById('photo-preview-text');

    if (!auctionId) {
        console.error('Invalid auction ID');
        formTitle.textContent = "Error: Auction Not Found";
        return;
    }

    // THE FIX: Set back link here so it works in both modes
    backLink.href = `/admin/auction/${auctionId}/players`;

    photoInput.addEventListener('change', () => {
        const file = photoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                photoPreview.style.backgroundImage = `url('${e.target.result}')`;
                if(photoPreviewText) photoPreviewText.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // THE FIX: Fetch auction data and populate dropdowns *before* checking for edit mode
    try {
        const auctionRes = await fetch(`/api/auctions/${auctionId}`);
        const auction = await auctionRes.json();
        
        const sportPositions = { football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'], cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder'] };
        const positions = sportPositions[auction.sport] || [];
        positions.forEach(pos => { positionSelect.innerHTML += `<option value="${pos}">${pos}</option>`; });
        
        const divisionLabels = { senior_men: 'Senior(Men)', senior_women: 'Senior(Women)', youth_men: 'Youth(Men)', youth_women: 'Youth(Women)', junior_boys: 'Junior(Boys)', junior_girls: 'Junior(Girls)' };
        (auction.allowedDivisions || []).forEach(divValue => {
            divisionSelect.innerHTML += `<option value="${divValue}">${divisionLabels[divValue] || divValue}</option>`;
        });
        
        if (isEditing) {
            formTitle.textContent = 'Edit Player';
            submitBtn.textContent = 'Update Player';
            deleteBtn.style.display = 'block';

            const playerRes = await fetch(`/api/auctions/${auctionId}/players/${playerId}`);
            const player = await playerRes.json();

            if (player.photoImage) {
                photoPreview.style.backgroundImage = `url('${player.photoImage}')`;
                if(photoPreviewText) photoPreviewText.style.display = 'none';
            }
            document.getElementById('player-name').value = player.name;
            document.getElementById('player-position').value = player.position;
            document.getElementById('player-division').value = player.division;
            document.getElementById('player-experience').value = player.experience;
            document.getElementById('base-price').value = player.basePrice;
            document.getElementById('player-merits').value = player.merits;

        } else {
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
        const formData = new FormData();
        formData.append('name', document.getElementById('player-name').value);
        formData.append('position', document.getElementById('player-position').value);
        formData.append('division', document.getElementById('player-division').value);
        formData.append('experience', document.getElementById('player-experience').value);
        formData.append('basePrice', document.getElementById('base-price').value);
        formData.append('merits', document.getElementById('player-merits').value);
        if (photoInput.files[0]) {
            formData.append('photoImage', photoInput.files[0]);
        }

        const url = isEditing ? `/api/auctions/${auctionId}/players/${playerId}` : `/api/auctions/${auctionId}/players`;
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, { method: method, body: formData });
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


