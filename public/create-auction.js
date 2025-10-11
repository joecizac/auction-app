document.addEventListener('DOMContentLoaded', () => {

    // --- Form Submission Logic ---
    const auctionForm = document.querySelector('.auction-form');
    auctionForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default page reload

        const formData = {
            title: document.getElementById('auction-title').value,
            sport: document.getElementById('sport-type').value,
            budget: document.getElementById('team-budget').value,
            bidIncrements: [],
            allowedDivisions: [],
            divisionLimits: {},
            positionLimits: {}
        };

        // Collect Bid Increments
        document.querySelectorAll('#bid-increments-container .form-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            formData.bidIncrements.push({
                from: inputs[0].value,
                to: inputs[1].value,
                increment: inputs[2].value
            });
        });

        // Collect Allowed Divisions
        document.querySelectorAll('input[name="division"]:checked').forEach(checkbox => {
            formData.allowedDivisions.push(checkbox.value);
        });
        
        // Collect Division Limits
        document.querySelectorAll('#division-limits-container .limit-row').forEach(row => {
            const division = row.dataset.division;
            const inputs = row.querySelectorAll('input');
            formData.divisionLimits[division] = {
                min: inputs[0].value,
                max: inputs[1].value
            };
        });

        // Collect Position Limits
        document.querySelectorAll('#position-limits-rows-container .limit-row').forEach(row => {
            const position = row.dataset.position;
            const inputs = row.querySelectorAll('input');
            formData.positionLimits[position] = {
                min: inputs[0].value,
                max: inputs[1].value
            };
        });


        console.log("Sending data to server:", JSON.stringify(formData, null, 2));

        try {
            const response = await fetch('/api/auctions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            alert('Auction created successfully!');
            window.location.href = '/admin'; // Redirect back to the dashboard

        } catch (error) {
            console.error('Error creating auction:', error);
            alert('Failed to create auction. See console for details.');
        }
    });


    // --- Dynamic UI Logic ---

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
    };

    sportSelect.addEventListener('change', updatePositionLimits);
    updatePositionLimits();


    // Division Limits Logic
    const divisionCheckboxes = document.querySelectorAll('input[name="division"]');
    const divisionLimitsContainer = document.getElementById('division-limits-container');

    const divisionLabels = {
        senior_men: 'Senior(Men)',
        senior_women: 'Senior(Women)',
        youth_men: 'Youth(Men)',
        youth_women: 'Youth(Women)',
        junior_boys: 'Junior(Boys)',
        junior_girls: 'Junior(Girls)',
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
    updateDivisionLimits();


    // Bid Increments Logic
    const bidIncrementsContainer = document.getElementById('bid-increments-container');
    const addIncrementBtn = document.getElementById('add-increment-btn');

    const updateRemoveButtonsState = () => {
        const allRows = bidIncrementsContainer.querySelectorAll('.form-row.bid-increment-row');
        const allRemoveButtons = bidIncrementsContainer.querySelectorAll('.btn-remove-increment');

        if (allRows.length <= 1) {
            allRemoveButtons.forEach(button => button.disabled = true);
        } else {
            allRemoveButtons.forEach(button => button.disabled = false);
        }
    };

    const addBidIncrementRow = () => {
        const newRow = document.createElement('div');
        newRow.className = 'form-row bid-increment-row';
        newRow.innerHTML = `
            <input type="number" placeholder="From">
            <input type="number" placeholder="To">
            <input type="number" placeholder="Increment by">
            <button type="button" class="btn-remove-increment">&times;</button>
        `;
        bidIncrementsContainer.appendChild(newRow);
        updateRemoveButtonsState();
    };

    addIncrementBtn.addEventListener('click', addBidIncrementRow);

    bidIncrementsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove-increment')) {
            if (!event.target.disabled) {
                event.target.closest('.form-row.bid-increment-row').remove();
                updateRemoveButtonsState();
            }
        }
    });

    updateRemoveButtonsState(); // Initial call
});

