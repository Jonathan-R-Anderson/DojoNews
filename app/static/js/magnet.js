(() => {
    const debug = (...args) => window.debugLog('magnet.js', ...args);
    debug('Loaded');

    let provider;
    let contract;
    let client;

    async function initMagnetClient() {
        debug('initMagnetClient start');
        if (client) return;
        if (typeof WebTorrent === "undefined") {
            await new Promise((resolve) => {
                const s = document.createElement("script");
                s.src = "https://cdn.jsdelivr.net/npm/webtorrent@latest/webtorrent.min.js";
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
        if (typeof ethers === "undefined") {
            await new Promise((resolve) => {
                const s = document.createElement("script");
                s.src = "https://cdn.jsdelivr.net/npm/ethers@5.7.2/dist/ethers.umd.min.js";
                s.onload = resolve;
                document.head.appendChild(s);
            });
        }
        const url = typeof window !== "undefined" ? window.rpcUrl : undefined;
        if (!url) {
            debug("RPC URL is not defined");
            return;
        }
        provider = new ethers.providers.JsonRpcProvider(url);
        contract = new ethers.Contract(
            window.postContractAddress,
            window.postContractAbi,
            provider
        );
        client = new WebTorrent();
        debug('initMagnetClient complete');
    }

    async function fetchMagnet(img) {
        debug('fetchMagnet', img);
        if (!img || img.dataset.magnetLoaded) return;
        const id = img.dataset.magnetId;
        if (!id) return;
        await initMagnetClient();
        try {
            const magnet = await contract.getImageMagnet(id);
            debug('magnet URI', magnet);
            if (magnet) {
                client.add(magnet, async (torrent) => {
                    try {
                        debug('torrent added', torrent.infoHash);
                        const blob = await torrent.files[0].blob();
                        const newUrl = URL.createObjectURL(blob);
                        if (img.src && img.src.startsWith("blob:")) {
                            URL.revokeObjectURL(img.src);
                        }
                        img.src = newUrl;
                        img.dataset.magnetLoaded = "true";
                        debug('image updated', id);
                    } catch (err) {
                        debug("Failed to load magnet", id, err);
                    }
                });
            } else {
                debug("No magnet URI returned for", id);
            }
        } catch (e) {
            debug("Failed to load magnet", id, e);
        }
    }

    async function loadMagnets() {
        debug('loadMagnets start');
        await initMagnetClient();
        const images = document.querySelectorAll("[data-magnet-id]");
        debug('found images', images.length);
        images.forEach(fetchMagnet);
    }

    function observeNewImages() {
        const observer = new MutationObserver((mutations) => {
            debug('DOM mutations', mutations.length);
            for (const mutation of mutations) {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== 1) return;
                    if (node.dataset && node.dataset.magnetId) {
                        debug('new image node', node.dataset.magnetId);
                        fetchMagnet(node);
                    }
                    node
                        .querySelectorAll?.("[data-magnet-id]")
                        .forEach((el) => fetchMagnet(el));
                });
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        debug('observer attached');
    }

    if (typeof window !== "undefined") {
        window.loadMagnets = loadMagnets;
        loadMagnets().then(observeNewImages);
    }
})();
