document.addEventListener('DOMContentLoaded', () => {
    const socket = io();
    const presenterContent = document.getElementById('presenter-content');

    // This function will be called when the server sends an 'auctionUpdate' event
    socket.on('auctionUpdate', (state) => {
        console.log('Received auction update:', state);

        if (!state.selectedPlayer) {
            presenterContent.className = 'presenter-idle';
            presenterContent.innerHTML = '<h1>Waiting for the next player...</h1>';
            return;
        }

        presenterContent.className = 'presenter-active';

        const { selectedPlayer, currentBid, biddingTeamName } = state;

        presenterContent.innerHTML = `
            <div class="player-info-card">
                <div class="player-name">${selectedPlayer.name}</div>
                <div class="player-details">${selectedPlayer.position} | ${selectedPlayer.experience}</div>
            </div>
            <div class="bidding-info-card">
                <div class="bid-label">Current Bid</div>
                <div class="bid-amount">${new Intl.NumberFormat().format(currentBid)}</div>
                <div class="bidding-team-label">Bidding Team</div>
                <div class="bidding-team-name">${biddingTeamName || '--'}</div>
            </div>
        `;
    });
});
