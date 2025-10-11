document.addEventListener('DOMContentLoaded', () => {
    // --- Define the positions for each sport ---
    const sportPositions = {
        football: ['Goalkeeper', 'Striker', 'Midfielder', 'Defender'],
        cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder']
    };

    // --- Get references to the HTML elements we'll be working with ---
    const sportSelect = document.getElementById('sport-type');
    const positionLimitsContainer = document.getElementById('position-limits-rows-container');
    const positionLimitsHeading = document.getElementById('position-limits-heading');

    // --- This function redraws the position limits based on the selected sport ---
    function updatePositionLimits() {
        // Get the currently selected sport (e.g., 'football')
        const selectedSport = sportSelect.value;
        // Get the list of positions for that sport from our definition above
        const positions = sportPositions[selectedSport];

        // --- Update the heading text to reflect the current sport ---
        const capitalizedSport = selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1);
        positionLimitsHeading.textContent = `Position Limits (${capitalizedSport})`;

        // --- Clear out any old position limit rows ---
        positionLimitsContainer.innerHTML = '';

        // --- Create a new row for each position and add it to the page ---
        positions.forEach(position => {
            const row = document.createElement('div');
            // Use the same class names as your existing HTML structure
            row.className = 'form-row limit-row'; 
            row.innerHTML = `
                <label>${position}</label>
                <input type="number" placeholder="Min">
                <input type="number" placeholder="Max">
            `;
            positionLimitsContainer.appendChild(row);
        });
    }

    // --- Tell the browser to run our function whenever the dropdown changes ---
    sportSelect.addEventListener('change', updatePositionLimits);

    // --- Run the function once when the page loads to set the correct initial state ---
    updatePositionLimits();
});

