document.addEventListener('DOMContentLoaded', () => {

    // --- Form Submission Logic ---
    const auctionForm = document.querySelector('.auction-form');
    auctionForm.addEventListener('submit', async (event) => {
        event.preventDefault(); // Prevent the default page reload

        // --- Complete Data Collection ---
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
        document.querySelectorAll('.bid-increment-row').forEach(row => {
            const inputs = row.querySelectorAll('input[type="number"]');
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
        document.querySelectorAll('#division-limits-rows-container .limit-row').forEach(row => {
            const division = row.dataset.division;
            const inputs = row.querySelectorAll('input[type="number"]');
            formData.divisionLimits[division] = {
                min: inputs[0].value,
                max: inputs[1].value
            };
        });

        // Collect Position Limits
        document.querySelectorAll('#position-limits-rows-container .limit-row').forEach(row => {
            const position = row.dataset.position;
            const inputs = row.querySelectorAll('input[type="number"]');
            formData.positionLimits[position] = {
                min: inputs[0].value,
                max: inputs[1].value
            };
        });


        console.log("Sending complete data to server:", formData);

        try {
            const response = await fetch('/api/auctions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();
            console.log('Server response:', result);
            alert('Auction created successfully!');
            window.location.href = '/admin'; // Redirect back to the dashboard

        } catch (error) {
            console.error('Error creating auction:', error);
            alert('Failed to create auction. See console for details.');
        }
    });


    // --- Dynamic UI Logic ---
    const sportSelect = document.getElementById('sport-type');
    const positionLimitsHeading = document.getElementById('position-limits-heading');
    const positionLimitsContainer = document.getElementById('position-limits-rows-container');
    
    const sportPositions = {
        football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'],
        cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder']
    };

    const updatePositionLimits = () => {
        const selectedSport = sportSelect.value;
        const positions = sportPositions[selectedSport] || [];
        
        // Update heading
        positionLimitsHeading.textContent = `Position Limits (${selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1)})`;
        
        // Clear current rows
        positionLimitsContainer.innerHTML = '';
        
        // Add new rows
        positions.forEach(position => {
            const row = document.createElement('div');
            row.className = 'form-row limit-row';
            row.dataset.position = position.toLowerCase(); // for data collection
            row.innerHTML = `
                <label>${position}</label>
                <input type="number" placeholder="Min">
                <input type="number" placeholder="Max">
            `;
            positionLimitsContainer.appendChild(row);
        });
    };

    sportSelect.addEventListener('change', updatePositionLimits);
    

    // --- Dynamic Division Limits Logic ---
    const divisionCheckboxes = document.querySelectorAll('input[name="division"]');
    const divisionLimitsContainer = document.getElementById('division-limits-rows-container');

    const updateDivisionLimits = () => {
        divisionLimitsContainer.innerHTML = ''; // Clear existing rows
        divisionCheckboxes.forEach(checkbox => {
            if (checkbox.checked) {
                const labelText = checkbox.parentElement.textContent.trim();
                const divisionValue = checkbox.value;

                const row = document.createElement('div');
                row.className = 'form-row limit-row';
                row.dataset.division = divisionValue; // for data collection
                row.innerHTML = `
                    <label>${labelText}</label>
                    <input type="number" placeholder="Min">
                    <input type="number" placeholder="Max">
                `;
                divisionLimitsContainer.appendChild(row);
            }
        });
    };

    divisionCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', updateDivisionLimits);
    });

    // --- Dynamic Bid Increments Logic ---
    const bidIncrementsContainer = document.getElementById('bid-increments-container');
    const addIncrementBtn = document.getElementById('add-increment-btn');

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
    };

    addIncrementBtn.addEventListener('click', addBidIncrementRow);

    bidIncrementsContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('btn-remove-increment')) {
            if (bidIncrementsContainer.children.length > 1) {
                event.target.closest('.bid-increment-row').remove();
            }
        }
    });

    // Initial population of dynamic fields on page load
    updatePositionLimits();
    updateDivisionLimits();
});
