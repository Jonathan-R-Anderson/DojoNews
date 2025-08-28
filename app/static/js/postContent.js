const debug = (...args) => window.debugLog('postContent.js', ...args);
debug('Loaded');

(async () => {
    debug('Loading post content');
    if (typeof ethers === 'undefined') {
        await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js';
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }
    if (typeof marked === 'undefined') {
        await new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = 'https://cdn.jsdelivr.net/npm/marked/marked.min.js';
            s.onload = resolve;
            document.head.appendChild(s);
        });
    }
    const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(postContractAddress, postContractAbi, provider);
    try {
        const p = await contract.getPost(postUrlID);
        debug('Fetched post', p);
        const content = p.contentHash;
        const contentEl = document.getElementById('post-content');
        if (contentEl) {
            contentEl.innerHTML = marked.parse(content);
            debug('Rendered content');
        }
        const cleanText = content.replace(/<[^>]+>/g, '');
        const words = cleanText.trim().split(/\s+/).filter(Boolean).length;
        const minutes = Math.max(1, Math.ceil(words / 200));
        const rtEl = document.getElementById('reading-time');
        if (rtEl) {
            rtEl.textContent = minutes.toString();
            debug('Reading time set', minutes);
        }
    } catch (err) {
        debug('Failed to load post content', err);
    }
})();
