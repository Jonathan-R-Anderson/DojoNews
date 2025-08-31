// Front page forum tiles loader
// Requires ethers.js and a deployed Forum contract

async function loadForumTiles() {
    const container = document.getElementById('board-tiles');
    if (!container || !window.ethereum) return;

    const provider = new ethers.BrowserProvider(window.ethereum);
    const abiResponse = await fetch('/abi/Forum.json');
    const abiJson = await abiResponse.json();
    const forumAddress = window.FORUM_ADDRESS || '0x0000000000000000000000000000000000000000';
    const forum = new ethers.Contract(forumAddress, abiJson.abi, provider);

    const boards = await forum.getBoards();
    boards.forEach((b, idx) => {
        const tile = document.createElement('div');
        tile.className = 'forum-tile';
        tile.style.backgroundImage = `url(${b.latestImage})`;
        tile.innerHTML = `<div class="forum-tile-overlay"><span class="forum-tile-title">${b.name}</span></div>`;
        tile.addEventListener('click', () => {
            window.location.href = `/board/${idx}`;
        });
        container.appendChild(tile);
    });
}

document.addEventListener('DOMContentLoaded', loadForumTiles);
