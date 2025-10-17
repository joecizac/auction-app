document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const isEditing = pathParts[pathParts.length - 1] === 'edit';
    const auctionId = isEditing ? pathParts[pathParts.length - 4] : pathParts[pathParts.length - 3];
    const teamId = isEditing ? pathParts[pathParts.length - 2] : null;
    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;


    // Element references
    const backLink = document.getElementById('back-to-teams-link');
    const formTitle = document.getElementById('form-title');
    const teamForm = document.getElementById('team-form');
    const submitBtn = document.getElementById('submit-btn');
    const deleteBtn = document.getElementById('delete-team-btn');
    const loginCredentialsContainer = document.getElementById('login-credentials-container');
    const copyCredentialsBtn = document.getElementById('copy-credentials-btn');
    const teamPlayersSection = document.getElementById('team-players-section');
    const playerListContainer = document.getElementById('team-player-list-container');
    const logoInput = document.getElementById('team-logo-input');
    const logoPreview = document.getElementById('logo-preview');
    const logoPreviewText = document.getElementById('logo-preview-text');
    const captainPositionSelect = document.getElementById('captain-position');
    const captainDivisionSelect = document.getElementById('captain-division');

    if (!auctionId) {
        console.error('Invalid auction ID');
        formTitle.textContent = "Error: Auction Not Found";
        return;
    }

    // Set back link
    backLink.href = `/admin/auction/${auctionId}/teams`;

    logoInput.addEventListener('change', () => {
        const file = logoInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                logoPreview.style.backgroundImage = `url('${e.target.result}')`;
                if(logoPreviewText) logoPreviewText.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    try {
        // Step 1: Fetch auction rules to populate captain dropdowns
        const auctionRes = await fetch(`/api/auctions/${auctionId}`);
        const auction = await auctionRes.json();
        
        const sportPositions = { football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'], cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder'] };
        const positions = sportPositions[auction.sport] || [];
        positions.forEach(pos => { captainPositionSelect.innerHTML += `<option value="${pos}">${pos}</option>`; });
        
        const divisionLabels = { senior_men: 'Senior(Men)', senior_women: 'Senior(Women)', youth_men: 'Youth(Men)', youth_women: 'Youth(Women)', junior_boys: 'Junior(Boys)', junior_girls: 'Junior(Girls)' };
        (auction.allowedDivisions || []).forEach(divValue => {
            captainDivisionSelect.innerHTML += `<option value="${divValue}">${divisionLabels[divValue] || divValue}</option>`;
        });
        
        // Step 2: If in edit mode, fetch team data and pre-fill the form
        if (isEditing) {
            formTitle.textContent = 'Edit Team';
            submitBtn.textContent = 'Update Team';
            deleteBtn.style.display = 'block';
            loginCredentialsContainer.style.display = 'block';
            teamPlayersSection.style.display = 'block';

            const teamRes = await fetch(`/api/auctions/${auctionId}/teams/${teamId}`);
            const team = await teamRes.json();
            
            if (team.logoImage) {
                logoPreview.style.backgroundImage = `url('${team.logoImage}')`;
                if(logoPreviewText) logoPreviewText.style.display = 'none';
            }
            document.getElementById('team-name').value = team.name;
            document.getElementById('manager-name').value = team.managerName;
            document.getElementById('co-manager-name').value = team.coManagerName;
            document.getElementById('captain-name').value = team.captainName;
            document.getElementById('captain-value').value = team.captainValue;
            document.getElementById('captain-position').value = team.captainPosition;
            document.getElementById('captain-division').value = team.captainDivision;
            document.getElementById('captain-experience').value = team.captainExperience;
            document.getElementById('team-username').textContent = team.username;
            document.getElementById('team-password').textContent = team.password;

            let playersHtml = '';
            (team.players || []).forEach(player => {
                const isCaptain = player.name === team.captainName;
                playersHtml += `<div class="team-player-list-item">
                                    <div class="team-player-info">
                                        <span class="player-name">${player.name} ${isCaptain ? '(C)' : ''}</span>
                                        <span class="player-price">${formatCurrency(player.soldPrice)}</span>
                                    </div>
                                    <button type="button" class="btn btn-danger btn-small remove-player-btn" 
                                            data-player-id="${player.dbId}" 
                                            ${isCaptain ? 'disabled' : ''}>Remove</button>
                                </div>`;
            });
            playerListContainer.innerHTML = playersHtml;
        } else {
            formTitle.textContent = 'Create Team';
            submitBtn.textContent = 'Create Team';
        }
    } catch (error) {
        console.error('Failed to initialize form:', error);
        alert('Could not load necessary data for this form.');
    }
    
    // Handle Form Submission (Create or Update)
    teamForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData();
        formData.append('name', document.getElementById('team-name').value);
        formData.append('managerName', document.getElementById('manager-name').value);
        formData.append('coManagerName', document.getElementById('co-manager-name').value);
        formData.append('captainName', document.getElementById('captain-name').value);
        formData.append('captainValue', document.getElementById('captain-value').value);
        formData.append('captainPosition', document.getElementById('captain-position').value);
        formData.append('captainDivision', document.getElementById('captain-division').value);
        formData.append('captainExperience', document.getElementById('captain-experience').value);
        
        if (logoInput.files[0]) {
            formData.append('logoImage', logoInput.files[0]);
        }
        
        const url = isEditing ? `/api/auctions/${auctionId}/teams/${teamId}` : `/api/auctions/${auctionId}/teams`;
        const method = isEditing ? 'PUT' : 'POST';
        try {
            const response = await fetch(url, { method: method, body: formData });
            if (!response.ok) throw new Error('Failed to save team');
            alert(`Team ${isEditing ? 'updated' : 'created'} successfully!`);
            window.location.href = `/admin/auction/${auctionId}/teams`;
        } catch (error) {
            console.error('Error saving team:', error);
            alert('Failed to save team.');
        }
    });

    // Handle Delete
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this team? This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}`, { method: 'DELETE' });
                if (!response.ok) throw new Error('Failed to delete team');

                alert('Team deleted successfully.');
                window.location.href = `/admin/auction/${auctionId}/teams`;
            } catch (error) {
                console.error('Error deleting team:', error);
                alert('Failed to delete team.');
            }
        }
    });

    // Handle Remove Player from Team
    playerListContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('remove-player-btn')) {
            const button = event.target;
            const playerId = button.dataset.playerId;
            const playerName = button.closest('.team-player-list-item').querySelector('.player-name').textContent;

            if (confirm(`Are you sure you want to remove ${playerName} from this team?`)) {
                try {
                    const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}/remove-player`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ playerId: playerId })
                    });

                    if (!response.ok) throw new Error('Failed to remove player.');

                    // On success, remove the player from the UI
                    button.closest('.team-player-list-item').remove();
                    alert(`${playerName} has been removed and is now available in the player pool.`);

                } catch (error) {
                    console.error('Error removing player:', error);
                    alert('An error occurred while removing the player.');
                }
            }
        }
    });

    // --- Handle Copy Credentials button click ---
    copyCredentialsBtn.addEventListener('click', () => {
        const username = document.getElementById('team-username').textContent;
        const password = document.getElementById('team-password').textContent;
        const textToCopy = `Username: ${username}\nPassword: ${password}`;

        // Create a temporary textarea to robustly copy text to the clipboard
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const originalText = copyCredentialsBtn.textContent;
            copyCredentialsBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyCredentialsBtn.textContent = originalText;
            }, 2000); // Revert back to original text after 2 seconds
        } catch (err) {
            console.error('Failed to copy credentials: ', err);
            alert('Failed to copy credentials. Please copy them manually.');
        }
        document.body.removeChild(textArea);
    });
});

