(() => {
    const debug = (...args) => window.debugLog('loadPosts.js', ...args);
    debug('Loaded');

    (async () => {
    debug('Loading posts');
    if (typeof ethers === 'undefined') {
        await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }
    const container = document.getElementById('posts-container');
    if (!container || typeof window.postContractAddress === 'undefined') {
        debug('Container or contract address missing');
        return;
    }
    const provider = new ethers.providers.JsonRpcProvider(window.rpcUrl);
    const contract = new ethers.Contract(window.postContractAddress, window.postContractAbi, provider);
    try {
        const nextId = (await contract.nextPostId()).toNumber();
        debug('Next post id', nextId);
        for (let id = 1; id < nextId; id++) {
            const p = await contract.getPost(id);
            debug('Fetched post', id, p);
            if (!p.exists || p.blacklisted) {
                debug('Skipping post', id);
                continue;
            }
            const parts = p.contentHash.split('|');
            const title = parts[0] || '';
            const category = parts[4] || '';
            const link = document.createElement('a');
            link.href = `/post/${id}`;
            link.className = 'post-tile';
            const img = document.createElement('img');
            img.dataset.magnetId = `${id}.png`;
            img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==';
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
            debug('Added post tile', id);
        }
        if (typeof window.loadMagnets === 'function') {
            debug('Loading magnets for posts');
            window.loadMagnets();
        }
    } catch (err) {
        debug('Failed to load posts from blockchain', err);
    }
    })();
})();
