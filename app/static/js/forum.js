// Front page board tiles loader
// Loads boards from the on-chain Board contract using ethers.js.

async function loadForumTiles() {
    const container = document.getElementById('board-tiles');
    if (
        !container ||
        !window.ethereum ||
        !window.boardContractAddress ||
        !window.boardContractAbi
    ) {
        return;
    }

    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const board = new ethers.Contract(
        window.boardContractAddress,
        window.boardContractAbi,
        provider
    );

    const count = Number(await board.boardCount());
    for (let i = 0; i < count; i++) {
        const info = await board.getBoard(i);
        const tile = document.createElement('div');
        tile.className = 'forum-tile';
        if (info.banner) {
            tile.style.backgroundImage = `url(${info.banner})`;
        }
        tile.innerHTML = `<div class="forum-tile-overlay"><span class="forum-tile-title">${info.name}</span></div>`;
        tile.addEventListener('click', () => {
            window.location.href = `/board`;
        });
        container.appendChild(tile);
    }
}

document.addEventListener('DOMContentLoaded', loadForumTiles);
