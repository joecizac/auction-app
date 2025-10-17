document.addEventListener('DOMContentLoaded', async () => {
    const pathParts = window.location.pathname.split('/');
    const auctionId = pathParts[pathParts.length - 2];

    const auctionTitleHeading = document.getElementById('auction-title-heading');
    const summaryContainer = document.getElementById('summary-container');
    const exportCsvBtn = document.getElementById('export-csv-btn');
    const manageAuctionBtn = document.getElementById('manage-auction-btn');
    const formatCurrency = (amount) => `₹${new Intl.NumberFormat('en-IN').format(amount)}`;
    const divisionLabels = {
        senior_men: 'Senior (Men)',
        senior_women: 'Senior (Women)',
        youth_men: 'Youth (Men)',
        youth_women: 'Youth (Women)',
        junior_boys: 'Junior (Boys)',
        junior_girls: 'Junior (Girls)',
    };

    if (!auctionId) {
        auctionTitleHeading.textContent = 'Error: Invalid Auction Link';
        return;
    }

    if (manageAuctionBtn) {
        manageAuctionBtn.href = `/admin/auction/${auctionId}`;
    }

    let auctionDataForExport = null;

    try {
        const auctionRes = await fetch(`/api/auctions/${auctionId}`);
        const auction = await auctionRes.json();
        auctionTitleHeading.textContent = `Summary: ${auction.title}`;

        const teams = auction.teams || [];
        const soldPlayers = (auction.players || []).filter(p => p.status === 'sold');

        auctionDataForExport = { auction, teams, soldPlayers };

        if (teams.length === 0) {
            summaryContainer.innerHTML = '<p>No teams participated in this auction.</p>';
            exportCsvBtn.style.display = 'none';
            return;
        }

        let summaryHtml = '';
        teams.forEach(team => {
            const teamPlayers = soldPlayers.filter(p => p.owningTeamId === team.id);
            let amountSpent = 0;
            teamPlayers.forEach(p => { amountSpent += parseFloat(p.soldPrice); });
            const balance = parseFloat(auction.budget) - amountSpent;

            summaryHtml += `
                <div class="card team-summary-card">
                    <div class="team-summary-header">
                        <h2>${team.name}</h2>
                        <div class="team-summary-stats">
                            <span>Spent: <strong>${formatCurrency(amountSpent)}</strong></span>
                            <span>Balance: <strong>${formatCurrency(balance)}</strong></span>
                        </div>
                    </div>
                    <table class="player-table">
                        <thead>
                            <tr>
                                <th>Player</th>
                                <th>Division</th>
                                <th>Position</th>
                                <th>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${teamPlayers.map(player => {
                                const isCaptain = player.name === team.captainName && parseFloat(player.soldPrice) === parseFloat(team.captainValue);
                                const rowClass = isCaptain ? 'captain-row' : '';
                                return `
                                <tr class="${rowClass}">
                                    <td>${player.name} ${isCaptain ? '(C)' : ''}</td>
                                    <td>${divisionLabels[player.division] || player.division}</td>
                                    <td>${player.position}</td>
                                    <td>${formatCurrency(player.soldPrice)}</td>
                                </tr>
                            `}).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        });
        summaryContainer.innerHTML = summaryHtml;

    } catch (error) {
        console.error('Failed to load summary:', error);
        summaryContainer.innerHTML = '<p class="error-message">Could not load auction summary.</p>';
    }

    exportCsvBtn.addEventListener('click', () => {
        if (!auctionDataForExport) {
            alert('Data is not ready for export.');
            return;
        }
        generateAndDownloadCsv(auctionDataForExport);
    });

    function generateAndDownloadCsv({ auction, teams, soldPlayers }) {
        let csvContent = "Team,Player,Division,Position,Price\n";

        teams.forEach(team => {
            const teamPlayers = soldPlayers.filter(p => p.owningTeamId === team.id);
            teamPlayers.forEach(player => {
                const isCaptain = player.name === team.captainName && parseFloat(player.soldPrice) === parseFloat(team.captainValue);
                const playerName = `${player.name}${isCaptain ? ' (C)' : ''}`;
                const formattedDivision = divisionLabels[player.division] || player.division;
                csvContent += `"${team.name}","${playerName}","${formattedDivision}","${player.position}",${player.soldPrice}\n`;
            });
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${auction.title.replace(/\s+/g, '_')}_summary.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
});

