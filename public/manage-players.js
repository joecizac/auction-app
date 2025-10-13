document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 2];

    // --- State Management ---
    let allPlayers = []; // This will hold the master list of players

    // --- Element References ---
    const auctionTitleHeading = document.getElementById('auction-title-heading');
    const backLink = document.getElementById('back-to-auction-link');
    const addPlayerLink = document.getElementById('add-player-link');
    const uploadCsvBtn = document.getElementById('upload-csv-btn');
    const csvFileInput = document.getElementById('csv-file-input');
    const playerListContainer = document.getElementById('player-list-container');
    const filterPosition = document.getElementById('filter-position');
    const filterDivision = document.getElementById('filter-division');
    const filterExperience = document.getElementById('filter-experience');
    const filterSearch = document.getElementById('search-player');

    if (!auctionId) {
        auctionTitleHeading.textContent = 'Error: Invalid Auction';
        return;
    }

    // --- Initialization ---
    async function initializePage() {
        // Set navigation links
        backLink.href = `/admin/auction/${auctionId}`;
        addPlayerLink.href = `/admin/auction/${auctionId}/players/new`;

        try {
            // Fetch auction details to get its name and rules
            const auctionRes = await fetch(`/api/auctions/${auctionId}`);
            const auction = await auctionRes.json();
            auctionTitleHeading.textContent = `Manage Players: ${auction.title}`;

            // Populate filters based on auction rules
            populateFilters(auction);
            addFilterListeners();

            // Fetch players for this auction
            const playersRes = await fetch(`/api/auctions/${auctionId}/players`);
            allPlayers = await playersRes.json(); // Store in master list

            // Initial render
            applyFiltersAndRenderPlayers();

        } catch (error) {
            console.error('Failed to load player data:', error);
            playerListContainer.innerHTML = '<p class="error-message">Could not load players.</p>';
        }
    }

    // --- Filter Logic ---
    function populateFilters(auction) {
        // THE FIX: Clear existing options and add a default with an empty value
        filterPosition.innerHTML = '<option value="">All Positions</option>';
        const sportPositions = { football: ['Goalkeeper', 'Defender', 'Midfielder', 'Striker'], cricket: ['Wicketkeeper', 'Bowler', 'Batter', 'All-rounder'] };
        const positions = sportPositions[auction.sport] || [];
        positions.forEach(pos => {
            filterPosition.innerHTML += `<option value="${pos}">${pos}</option>`;
        });

        // THE FIX: Clear existing options and add a default with an empty value
        filterDivision.innerHTML = '<option value="">All Divisions</option>';
        const divisionLabels = { senior_men: 'Senior(Men)', senior_women: 'Senior(Women)', youth_men: 'Youth(Men)', youth_women: 'Youth(Women)', junior_boys: 'Junior(Boys)', junior_girls: 'Junior(Girls)' };
        (auction.allowedDivisions || []).forEach(divValue => {
            filterDivision.innerHTML += `<option value="${divValue}">${divisionLabels[divValue] || divValue}</option>`;
        });
        
        // THE FIX: Clear existing options and add a default with an empty value
        filterExperience.innerHTML = '<option value="">All Experience</option>';
        ['Novice', 'Intermediate', 'Professional'].forEach(exp => {
             filterExperience.innerHTML += `<option value="${exp.toLowerCase()}">${exp}</option>`;
        });
    }

    function addFilterListeners() {
        filterPosition.addEventListener('change', applyFiltersAndRenderPlayers);
        filterDivision.addEventListener('change', applyFiltersAndRenderPlayers);
        filterExperience.addEventListener('change', applyFiltersAndRenderPlayers);
        filterSearch.addEventListener('input', applyFiltersAndRenderPlayers);
    }

    function applyFiltersAndRenderPlayers() {
        const posFilter = filterPosition.value;
        const divFilter = filterDivision.value;
        const expFilter = filterExperience.value;
        const searchFilter = filterSearch.value.toLowerCase();

        const filteredPlayers = allPlayers.filter(player => {
            if (posFilter && player.position !== posFilter) return false;
            if (divFilter && player.division !== divFilter) return false;
            if (expFilter && player.experience !== expFilter) return false;
            if (searchFilter && !player.name.toLowerCase().includes(searchFilter) && !player.id.toLowerCase().includes(searchFilter)) return false;
            return true;
        });
        renderPlayers(filteredPlayers);
    }
    
    function renderPlayers(playersToRender) {
        if (playersToRender.length === 0) {
            playerListContainer.innerHTML = '<p>No players match the current filters.</p>';
            return;
        }

        const tableBody = playersToRender.map(player => `
            <tr onclick="window.location.href='/admin/auction/${auctionId}/players/${player.dbId}/edit'" style="cursor: pointer;">
                <td><span class="player-id-badge">${player.id}</span></td>
                <td>${player.name}</td>
                <td>${player.position}</td>
                <td>${player.division}</td>
                <td>${player.experience}</td>
                <td>${new Intl.NumberFormat().format(player.basePrice)}</td>
            </tr>
        `).join('');

        playerListContainer.innerHTML = `
            <table class="player-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Position</th>
                        <th>Division</th>
                        <th>Experience</th>
                        <th>Base Price</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableBody}
                </tbody>
            </table>
        `;
    }

    uploadCsvBtn.addEventListener('click', () => {
        csvFileInput.click(); // Open the file selection dialog
    });

    csvFileInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('playerCsv', file);

        try {
            uploadCsvBtn.textContent = 'Uploading...';
            uploadCsvBtn.disabled = true;

            const response = await fetch(`/api/auctions/${auctionId}/players/upload`, {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errorResult = await response.json();
                throw new Error(errorResult.message || 'Upload failed');
            }

            const result = await response.json();
            alert(result.message);
            window.location.reload(); // Reload the page to see the new players

        } catch (error) {
            console.error('Error uploading CSV:', error);
            alert(`Upload failed: ${error.message}`);
        } finally {
            uploadCsvBtn.textContent = 'Upload CSV';
            uploadCsvBtn.disabled = false;
            csvFileInput.value = ''; // Reset the file input
        }
    });

    // --- Initial Load ---
    initializePage();
});

