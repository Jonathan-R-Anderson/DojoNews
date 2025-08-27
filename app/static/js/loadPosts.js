(async () => {
    if (typeof ethers === 'undefined') {
        await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }
    const container = document.getElementById('posts-container');
    if (!container || typeof window.postContractAddress === 'undefined') return;
    const provider = new ethers.providers.JsonRpcProvider(window.rpcUrl);
    const contract = new ethers.Contract(window.postContractAddress, window.postContractAbi, provider);
    try {
        const nextId = (await contract.nextPostId()).toNumber();
        for (let id = 1; id < nextId; id++) {
            const p = await contract.getPost(id);
            if (!p.exists || p.blacklisted) continue;
            const parts = p.contentHash.split('|');
            const title = parts[0] || '';
            const category = parts[4] || '';
            const link = document.createElement('a');
            link.href = `/post/${id}`;
            link.className = 'post-tile';
            const img = document.createElement('img');
            img.dataset.magnetId = `${id}.png`;
            img.alt = title;
            img.className = 'select-none';
            link.appendChild(img);
            const overlay = document.createElement('div');
            overlay.className = 'tile-overlay';
            const catSpan = document.createElement('span');
            catSpan.className = 'tile-category';
            catSpan.textContent = category;
            const titleEl = document.createElement('h2');
            titleEl.className = 'tile-title';
            titleEl.textContent = title;
            overlay.appendChild(catSpan);
            overlay.appendChild(titleEl);
            link.appendChild(overlay);
            container.appendChild(link);
        }
        if (typeof window.loadMagnets === 'function') {
            window.loadMagnets();
        }
    } catch (err) {
        console.error('Failed to load posts from blockchain', err);
    }
})();
