document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const isEditing = pathParts[pathParts.length - 1] === 'edit';
    const auctionId = isEditing ? pathParts[pathParts.length - 2] : null;

    // --- Element References ---
    const formTitle = document.querySelector('.form-header h1');
    const auctionForm = document.querySelector('.auction-form');
    const submitBtn = auctionForm.querySelector('button[type="submit"]');
    const backLink = document.querySelector('.back-link');
    const deleteBtn = document.getElementById('delete-auction-btn');
    const bannerInput = document.getElementById('auction-banner-input');
    const bannerPreview = document.getElementById('banner-preview');
    const bannerPreviewText = document.getElementById('banner-preview-text');

    // Set back link dynamically
    backLink.href = isEditing ? `/admin/auction/${auctionId}` : '/admin';

    // --- Dynamic UI Logic (needs to be available for both create and edit) ---

    // Sport Position Mapping
    const sportPositions = {
        football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'],
        cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder']
    };
    const sportSelect = document.getElementById('sport-type');
    const positionLimitsHeading = document.getElementById('position-limits-heading');
    const positionLimitsContainer = document.getElementById('position-limits-rows-container');

    const updatePositionLimits = () => {
        const selectedSport = sportSelect.value;
        const positions = sportPositions[selectedSport];
        const sportName = selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1);
        positionLimitsHeading.textContent = `Position Limits (${sportName})`;
        positionLimitsContainer.innerHTML = '';
        if (positions) {
            positions.forEach(position => {
                const row = document.createElement('div');
                row.className = 'limit-row';
                row.dataset.position = position.toLowerCase().replace(' ', '_');
                row.innerHTML = `
                    <label>${position}</label>
                    <div>
                        <input type="number" placeholder="Min" min="0" max="99">
                        <input type="number" placeholder="Max" min="0" max="99">
                    </div>
                `;
                positionLimitsContainer.appendChild(row);
            });
        }
    };
    sportSelect.addEventListener('change', updatePositionLimits);

    // Division Limits Logic
    const divisionCheckboxes = document.querySelectorAll('input[name="division"]');
    const divisionLimitsContainer = document.getElementById('division-limits-container');
    const divisionLabels = {
        senior_men: 'Senior(Men)', senior_women: 'Senior(Women)',
        youth_men: 'Youth(Men)', youth_women: 'Youth(Women)',
        junior_boys: 'Junior(Boys)', junior_girls: 'Junior(Girls)',
    };

    const updateDivisionLimits = () => {
        divisionLimitsContainer.innerHTML = '';
        const checkedDivisions = Array.from(divisionCheckboxes).filter(cb => cb.checked);
        if (checkedDivisions.length > 0) {
            const heading = document.createElement('h3');
            heading.textContent = 'Division Limits';
            divisionLimitsContainer.appendChild(heading);
            checkedDivisions.forEach(checkbox => {
                const divisionValue = checkbox.value;
                const divisionLabel = divisionLabels[divisionValue];
                const row = document.createElement('div');
                row.className = 'limit-row';
                row.dataset.division = divisionValue;
                row.innerHTML = `
                    <label>${divisionLabel}</label>
                    <div>
                        <input type="number" placeholder="Min" min="0" max="99">
                        <input type="number" placeholder="Max" min="0" max="99">
                    </div>
                `;
                divisionLimitsContainer.appendChild(row);
            });
        }
    };
    divisionCheckboxes.forEach(checkbox => checkbox.addEventListener('change', updateDivisionLimits));
    
    // Bid Increments Logic
    const bidIncrementsContainer = document.getElementById('bid-increments-container');
    const addIncrementBtn = document.getElementById('add-increment-btn');
    const updateRemoveButtonsState = () => {
        const allRows = bidIncrementsContainer.querySelectorAll('.form-row.bid-increment-row');
        allRows.forEach((row, index) => {
            const removeBtn = row.querySelector('.btn-remove-increment');
            if(removeBtn) removeBtn.disabled = allRows.length <= 1;
        });
    };
    const addBidIncrementRow = () => {
        const newRow = document.createElement('div');
        newRow.className = 'form-row bid-increment-row';
        newRow.innerHTML = `<input type="number" placeholder="From"><input type="number" placeholder="To"><input type="number" placeholder="Increment by"><button type="button" class="btn-remove-increment">&times;</button>`;
        bidIncrementsContainer.appendChild(newRow);
        updateRemoveButtonsState();
    };
    addIncrementBtn.addEventListener('click', addBidIncrementRow);
    bidIncrementsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove-increment') && !event.target.disabled) {
            event.target.closest('.form-row.bid-increment-row').remove();
            updateRemoveButtonsState();
        }
    });


    bannerInput.addEventListener('change', () => {
        const file = bannerInput.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                bannerPreview.style.backgroundImage = `url('${e.target.result}')`;
                bannerPreviewText.style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Form Population and Submission ---

    if (isEditing) {
        // --- EDIT MODE ---
        formTitle.textContent = 'Edit Auction';
        submitBtn.textContent = 'Update Auction';
        deleteBtn.style.display = 'block';
        
        try {
            const response = await fetch(`/api/auctions/${auctionId}`);
            const auction = await response.json();

            if (auction.bannerImage) {
                bannerPreview.style.backgroundImage = `url('${auction.bannerImage}')`;
                bannerPreviewText.style.display = 'none';
            }

            // Populate simple fields
            document.getElementById('auction-title').value = auction.title;
            document.getElementById('sport-type').value = auction.sport;
            document.getElementById('team-budget').value = auction.budget;

            // Populate Bid Increments
            bidIncrementsContainer.innerHTML = '';
            auction.bidIncrements.forEach(inc => {
                const row = document.createElement('div');
                row.className = 'form-row bid-increment-row';
                row.innerHTML = `
                    <input type="number" placeholder="From" value="${inc.from || ''}">
                    <input type="number" placeholder="To" value="${inc.to || ''}">
                    <input type="number" placeholder="Increment by" value="${inc.increment || ''}">
                    <button type="button" class="btn-remove-increment">&times;</button>
                `;
                bidIncrementsContainer.appendChild(row);
            });

            // Populate Allowed Divisions
            divisionCheckboxes.forEach(cb => {
                cb.checked = auction.allowedDivisions.includes(cb.value);
            });

            // Trigger updates to create the limits sections
            updatePositionLimits();
            updateDivisionLimits();

            // Populate the newly created limit fields
            if (auction.divisionLimits) {
                Object.entries(auction.divisionLimits).forEach(([key, value]) => {
                    const row = divisionLimitsContainer.querySelector(`[data-division="${key}"]`);
                    if(row) {
                        row.querySelector('input[placeholder="Min"]').value = value.min;
                        row.querySelector('input[placeholder="Max"]').value = value.max;
                    }
                });
            }
             if (auction.positionLimits) {
                Object.entries(auction.positionLimits).forEach(([key, value]) => {
                    const row = positionLimitsContainer.querySelector(`[data-position="${key}"]`);
                    if(row) {
                        row.querySelector('input[placeholder="Min"]').value = value.min;
                        row.querySelector('input[placeholder="Max"]').value = value.max;
                    }
                });
            }

        } catch (error) {
            console.error('Failed to load auction data for editing:', error);
            alert('Could not load auction data.');
        }

    } else {
        // --- CREATE MODE ---
        updatePositionLimits();
        updateDivisionLimits();
    }
    updateRemoveButtonsState();


    // --- Form Submission Logic ---
    auctionForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        
        // Use FormData to send both text and file data
        const formData = new FormData();

        formData.append('title', document.getElementById('auction-title').value);
        formData.append('sport', document.getElementById('sport-type').value);
        formData.append('budget', document.getElementById('team-budget').value);

        const bidIncrements = [];
        document.querySelectorAll('#bid-increments-container .form-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            bidIncrements.push({ from: inputs[0].value, to: inputs[1].value, increment: inputs[2].value });
        });
        formData.append('bidIncrements', JSON.stringify(bidIncrements));

        const allowedDivisions = [];
        document.querySelectorAll('input[name="division"]:checked').forEach(checkbox => {
            allowedDivisions.push(checkbox.value);
        });
        formData.append('allowedDivisions', JSON.stringify(allowedDivisions));

        const divisionLimits = {};
        document.querySelectorAll('#division-limits-container .limit-row').forEach(row => {
            const division = row.dataset.division;
            const inputs = row.querySelectorAll('input');
            divisionLimits[division] = { min: inputs[0].value, max: inputs[1].value };
        });
        formData.append('divisionLimits', JSON.stringify(divisionLimits));

        const positionLimits = {};
        document.querySelectorAll('#position-limits-rows-container .limit-row').forEach(row => {
            const position = row.dataset.position;
            const inputs = row.querySelectorAll('input');
            positionLimits[position] = { min: inputs[0].value, max: inputs[1].value };
        });
        formData.append('positionLimits', JSON.stringify(positionLimits));

        if (bannerInput.files[0]) {
            formData.append('bannerImage', bannerInput.files[0]);
        }

        const url = isEditing ? `/api/auctions/${auctionId}` : '/api/auctions';
        const method = isEditing ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method: method,
                // headers: { 'Content-Type': 'application/json' }, // Not needed with FormData
                body: formData,
            });
            if (!response.ok) throw new Error('Failed to save auction');

            alert(`Auction ${isEditing ? 'updated' : 'created'} successfully!`);
            window.location.href = '/admin';
        } catch (error) {
            console.error('Error saving auction:', error);
            alert('Failed to save auction.');
        }
    });

    // --- Handle Delete Button Click ---
    deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to permanently delete this auction? All associated teams and players will also be lost. This action cannot be undone.')) {
            try {
                const response = await fetch(`/api/auctions/${auctionId}`, {
                    method: 'DELETE'
                });
                if (!response.ok) {
                    throw new Error('Failed to delete auction');
                }
                alert('Auction deleted successfully.');
                window.location.href = '/admin'; // Redirect to the dashboard
            } catch (error) {
                console.error('Error deleting auction:', error);
                alert('Failed to delete auction.');
            }
        }
    });
});

